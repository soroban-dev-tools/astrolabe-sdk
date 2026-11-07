// Copyright 2026 The Astrolabe Authors
// Licensed under the Apache License, Version 2.0.

/**
 * React hooks for reading Astrolabe attestations. These wrap the read methods
 * of an `Astrolabe` client in the usual `{ data, loading, error, refetch }`
 * shape. `react` is a peer dependency.
 */

import { useCallback, useEffect, useState } from "react";
import type { Astrolabe, Uid } from "./client.js";
import { bytesToHex } from "./encoding.js";
import type { Attestation } from "./generated/attestation.js";
import type { Schema } from "./generated/schema-registry.js";

export interface QueryState<T> {
  data: T | undefined;
  loading: boolean;
  error: Error | undefined;
  refetch: () => void;
}

function useAsync<T>(
  run: () => Promise<T>,
  deps: readonly unknown[],
): QueryState<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(undefined);
    run()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [...deps, tick]);

  return { data, loading, error, refetch };
}

/** Fetch a single attestation by uid. */
export function useAttestation(
  client: Astrolabe,
  uid: Uid | undefined,
): QueryState<Attestation | null> {
  const key = typeof uid === "string" ? uid : uid ? String(uid) : "";
  return useAsync<Attestation | null>(
    () => (uid ? client.getAttestation(uid) : Promise.resolve(null)),
    [client, key],
  );
}

/** Fetch the capped recent attestation uids for a subject. */
export function useAttestationsFor(
  client: Astrolabe,
  subject: string | undefined,
): QueryState<string[]> {
  return useAsync<string[]>(
    () =>
      subject ? client.attestationsForSubject(subject) : Promise.resolve([]),
    [client, subject ?? ""],
  );
}

/** Check whether an attestation is currently valid. */
export function useIsValid(
  client: Astrolabe,
  uid: Uid | undefined,
): QueryState<boolean> {
  const key = typeof uid === "string" ? uid : uid ? String(uid) : "";
  return useAsync<boolean>(
    () => (uid ? client.isValid(uid) : Promise.resolve(false)),
    [client, key],
  );
}

/** Fetch a single schema by uid. */
export function useSchema(
  client: Astrolabe,
  uid: Uid | undefined,
): QueryState<Schema | null> {
  const key = typeof uid === "string" ? uid : uid ? String(uid) : "";
  return useAsync<Schema | null>(
    () => (uid ? client.getSchema(uid) : Promise.resolve(null)),
    [client, key],
  );
}

/** Fetch the total attestation count for a schema. */
export function useSchemaAttestationCount(
  client: Astrolabe,
  uid: Uid | undefined,
): QueryState<bigint | null> {
  const key = typeof uid === "string" ? uid : uid ? String(uid) : "";
  return useAsync<bigint | null>(
    () => (uid ? client.schemaAttestationCount(uid) : Promise.resolve(null)),
    [client, key],
  );
}

/** Standard query options contract matching TanStack React Query / SWR shapes without hard dependencies. */
export interface AstrolabeQueryOptions<
  TData,
  TKey extends readonly unknown[] = readonly unknown[],
> {
  queryKey: TKey;
  queryFn: () => Promise<TData>;
  enabled: boolean;
}

function uidToKey(uid: Uid | undefined): string | null {
  if (!uid) return null;
  return typeof uid === "string" ? uid : bytesToHex(uid);
}

/** Query key factory for cache management and invalidation. */
export const astrolabeQueryKeys = {
  all: ["astrolabe"] as const,
  attestation: (uid: Uid | undefined) =>
    ["astrolabe", "attestation", uidToKey(uid)] as const,
  schema: (uid: Uid | undefined) =>
    ["astrolabe", "schema", uidToKey(uid)] as const,
  isValid: (uid: Uid | undefined) =>
    ["astrolabe", "isValid", uidToKey(uid)] as const,
  attestationsForSubject: (subject: string | undefined) =>
    ["astrolabe", "attestationsForSubject", subject ?? null] as const,
  schemaAttestationCount: (uid: Uid | undefined) =>
    ["astrolabe", "schemaAttestationCount", uidToKey(uid)] as const,
};

/** Query options for fetching a single attestation by UID with TanStack Query. */
export function attestationQueryOptions(
  client: Astrolabe,
  uid: Uid | undefined,
): AstrolabeQueryOptions<
  Attestation | null,
  ReturnType<typeof astrolabeQueryKeys.attestation>
> {
  return {
    queryKey: astrolabeQueryKeys.attestation(uid),
    queryFn: async () => {
      if (!uid) return null;
      return client.getAttestation(uid);
    },
    enabled: Boolean(uid),
  };
}

/** Query options for fetching a schema by UID with TanStack Query. */
export function schemaQueryOptions(
  client: Astrolabe,
  uid: Uid | undefined,
): AstrolabeQueryOptions<
  Schema | null,
  ReturnType<typeof astrolabeQueryKeys.schema>
> {
  return {
    queryKey: astrolabeQueryKeys.schema(uid),
    queryFn: async () => {
      if (!uid) return null;
      return client.getSchema(uid);
    },
    enabled: Boolean(uid),
  };
}

/** Query options for checking attestation validity with TanStack Query. */
export function isValidQueryOptions(
  client: Astrolabe,
  uid: Uid | undefined,
): AstrolabeQueryOptions<
  boolean,
  ReturnType<typeof astrolabeQueryKeys.isValid>
> {
  return {
    queryKey: astrolabeQueryKeys.isValid(uid),
    queryFn: async () => {
      if (!uid) return false;
      return client.isValid(uid);
    },
    enabled: Boolean(uid),
  };
}

/** Query options for fetching subject attestations with TanStack Query. */
export function attestationsForSubjectQueryOptions(
  client: Astrolabe,
  subject: string | undefined,
): AstrolabeQueryOptions<
  string[],
  ReturnType<typeof astrolabeQueryKeys.attestationsForSubject>
> {
  return {
    queryKey: astrolabeQueryKeys.attestationsForSubject(subject),
    queryFn: async () => {
      if (!subject) return [];
      return client.attestationsForSubject(subject);
    },
    enabled: Boolean(subject),
  };
}

/** Query options for fetching schema attestation count with TanStack Query. */
export function schemaAttestationCountQueryOptions(
  client: Astrolabe,
  uid: Uid | undefined,
): AstrolabeQueryOptions<
  bigint | null,
  ReturnType<typeof astrolabeQueryKeys.schemaAttestationCount>
> {
  return {
    queryKey: astrolabeQueryKeys.schemaAttestationCount(uid),
    queryFn: async () => {
      if (!uid) return null;
      return client.schemaAttestationCount(uid);
    },
    enabled: Boolean(uid),
  };
}
