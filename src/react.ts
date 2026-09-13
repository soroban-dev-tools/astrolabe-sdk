// Copyright 2026 The Astrolabe Authors
// Licensed under the Apache License, Version 2.0.

/**
 * React hooks for reading Astrolabe attestations. These wrap the read methods
 * of an `Astrolabe` client in the usual `{ data, loading, error, refetch }`
 * shape. `react` is a peer dependency.
 */

import { useCallback, useEffect, useState } from "react";
import type { Astrolabe, Uid } from "./client.js";
import type { Attestation } from "./generated/attestation.js";

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
