// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import {
  useAttestation,
  useAttestationsFor,
  useIsValid,
  useSchema,
  useSchemaAttestationCount,
  astrolabeQueryKeys,
  attestationQueryOptions,
  schemaQueryOptions,
  isValidQueryOptions,
  attestationsForSubjectQueryOptions,
  schemaAttestationCountQueryOptions,
} from "../src/react.js";
import type { Astrolabe } from "../src/client.js";

function fakeClient(overrides: Partial<Astrolabe>): Astrolabe {
  return overrides as Astrolabe;
}

describe("react hooks", () => {
  it("useAttestation resolves data", async () => {
    const client = fakeClient({
      getAttestation: vi.fn().mockResolvedValue({ subject: "GABC" }),
    });
    const { result } = renderHook(() => useAttestation(client, "ab12"));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual({ subject: "GABC" });
    expect(result.current.error).toBeUndefined();
  });

  it("useAttestation with no uid returns null without calling the client", async () => {
    const getAttestation = vi.fn();
    const client = fakeClient({ getAttestation });
    const { result } = renderHook(() => useAttestation(client, undefined));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBeNull();
    expect(getAttestation).not.toHaveBeenCalled();
  });

  it("useIsValid surfaces errors", async () => {
    const client = fakeClient({
      isValid: vi.fn().mockRejectedValue(new Error("rpc down")),
    });
    const { result } = renderHook(() => useIsValid(client, "cd34"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error?.message).toBe("rpc down");
  });

  it("useAttestationsFor resolves subject attestations", async () => {
    const client = fakeClient({
      attestationsForSubject: vi.fn().mockResolvedValue(["uid1", "uid2"]),
    });
    const { result } = renderHook(() => useAttestationsFor(client, "GABC"));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual(["uid1", "uid2"]);
    expect(result.current.error).toBeUndefined();
  });

  it("useAttestationsFor with no subject returns empty array", async () => {
    const attestationsForSubject = vi.fn();
    const client = fakeClient({ attestationsForSubject });
    const { result } = renderHook(() => useAttestationsFor(client, undefined));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual([]);
    expect(attestationsForSubject).not.toHaveBeenCalled();
  });

  it("useIsValid with no uid returns false without calling client", async () => {
    const isValid = vi.fn();
    const client = fakeClient({ isValid });
    const { result } = renderHook(() => useIsValid(client, undefined));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBe(false);
    expect(isValid).not.toHaveBeenCalled();
  });

  it("useAttestation refetch triggers a reload", async () => {
    let callCount = 0;
    const client = fakeClient({
      getAttestation: vi.fn().mockImplementation(async () => {
        callCount++;
        return { subject: `GABC_${callCount}` };
      }),
    });
    const { result } = renderHook(() => useAttestation(client, "ab12"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual({ subject: "GABC_1" });

    result.current.refetch();
    await waitFor(() => expect(result.current.data).toEqual({ subject: "GABC_2" }));
  });

  it("useAttestationsFor surfaces errors", async () => {
    const client = fakeClient({
      attestationsForSubject: vi.fn().mockRejectedValue(new Error("failed subject query")),
    });
    const { result } = renderHook(() => useAttestationsFor(client, "GABC"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error?.message).toBe("failed subject query");
  });

  it("useSchema resolves schema data and handles undefined uid", async () => {
    const mockSchema = {
      authority: "GABC",
      name: "KYC",
      definition: "string name, bool verified",
      revocable: true,
      resolver: undefined,
    };
    const getSchema = vi.fn().mockResolvedValue(mockSchema);
    const client = fakeClient({ getSchema });

    // Undefined uid
    const { result: noUidResult } = renderHook(() => useSchema(client, undefined));
    await waitFor(() => expect(noUidResult.current.loading).toBe(false));
    expect(noUidResult.current.data).toBeNull();
    expect(getSchema).not.toHaveBeenCalled();

    // Defined uid
    const { result } = renderHook(() => useSchema(client, "01".repeat(32)));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual(mockSchema);
    expect(result.current.error).toBeUndefined();
    expect(getSchema).toHaveBeenCalledTimes(1);
  });

  it("useSchemaAttestationCount resolves count and surfaces errors", async () => {
    const client = fakeClient({
      schemaAttestationCount: vi.fn().mockResolvedValue(1337n),
    });

    const { result } = renderHook(() =>
      useSchemaAttestationCount(client, "02".repeat(32)),
    );
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBe(1337n);
    expect(result.current.error).toBeUndefined();

    // Undefined uid
    const { result: noUidResult } = renderHook(() =>
      useSchemaAttestationCount(client, undefined),
    );
    await waitFor(() => expect(noUidResult.current.loading).toBe(false));
    expect(noUidResult.current.data).toBeNull();

    // Error case
    const errorClient = fakeClient({
      schemaAttestationCount: vi.fn().mockRejectedValue(new Error("contract failure")),
    });
    const { result: errResult } = renderHook(() =>
      useSchemaAttestationCount(errorClient, "03".repeat(32)),
    );
    await waitFor(() => expect(errResult.current.loading).toBe(false));
    expect(errResult.current.error?.message).toBe("contract failure");
  });
});

describe("TanStack React Query adapters", () => {
  it("generates deterministic query keys for cache targeting", () => {
    expect(astrolabeQueryKeys.all).toEqual(["astrolabe"]);
    expect(astrolabeQueryKeys.attestation("abc")).toEqual([
      "astrolabe",
      "attestation",
      "abc",
    ]);
    expect(astrolabeQueryKeys.attestation(undefined)).toEqual([
      "astrolabe",
      "attestation",
      null,
    ]);
    expect(
      astrolabeQueryKeys.attestation(new Uint8Array([0xde, 0xad])),
    ).toEqual(["astrolabe", "attestation", "dead"]);

    expect(astrolabeQueryKeys.schema("xyz")).toEqual([
      "astrolabe",
      "schema",
      "xyz",
    ]);
    expect(astrolabeQueryKeys.isValid("xyz")).toEqual([
      "astrolabe",
      "isValid",
      "xyz",
    ]);
    expect(astrolabeQueryKeys.attestationsForSubject("GABC")).toEqual([
      "astrolabe",
      "attestationsForSubject",
      "GABC",
    ]);
    expect(astrolabeQueryKeys.schemaAttestationCount("xyz")).toEqual([
      "astrolabe",
      "schemaAttestationCount",
      "xyz",
    ]);
  });

  it("attestationQueryOptions returns proper queryKey, enabled, and queryFn", async () => {
    const mockAttestation = { subject: "GABC" } as never;
    const client = fakeClient({
      getAttestation: vi.fn().mockResolvedValue(mockAttestation),
    });

    const opts = attestationQueryOptions(client, "11".repeat(32));
    expect(opts.enabled).toBe(true);
    expect(opts.queryKey).toEqual([
      "astrolabe",
      "attestation",
      "11".repeat(32),
    ]);

    const result = await opts.queryFn();
    expect(result).toEqual(mockAttestation);
    expect(client.getAttestation).toHaveBeenCalledWith("11".repeat(32));

    const disabledOpts = attestationQueryOptions(client, undefined);
    expect(disabledOpts.enabled).toBe(false);
    const nullRes = await disabledOpts.queryFn();
    expect(nullRes).toBeNull();
  });

  it("schemaQueryOptions returns proper queryKey, enabled, and queryFn", async () => {
    const mockSchema = { name: "KYC" } as never;
    const client = fakeClient({
      getSchema: vi.fn().mockResolvedValue(mockSchema),
    });

    const opts = schemaQueryOptions(client, "22".repeat(32));
    expect(opts.enabled).toBe(true);
    expect(opts.queryKey).toEqual(["astrolabe", "schema", "22".repeat(32)]);

    const result = await opts.queryFn();
    expect(result).toEqual(mockSchema);

    const disabledOpts = schemaQueryOptions(client, undefined);
    expect(disabledOpts.enabled).toBe(false);
    expect(await disabledOpts.queryFn()).toBeNull();
  });

  it("isValidQueryOptions returns proper queryKey, enabled, and queryFn", async () => {
    const client = fakeClient({
      isValid: vi.fn().mockResolvedValue(true),
    });

    const opts = isValidQueryOptions(client, "33".repeat(32));
    expect(opts.enabled).toBe(true);
    expect(opts.queryKey).toEqual(["astrolabe", "isValid", "33".repeat(32)]);

    const result = await opts.queryFn();
    expect(result).toBe(true);

    const disabledOpts = isValidQueryOptions(client, undefined);
    expect(disabledOpts.enabled).toBe(false);
    expect(await disabledOpts.queryFn()).toBe(false);
  });

  it("attestationsForSubjectQueryOptions returns proper queryKey, enabled, and queryFn", async () => {
    const client = fakeClient({
      attestationsForSubject: vi.fn().mockResolvedValue(["id1", "id2"]),
    });

    const opts = attestationsForSubjectQueryOptions(client, "GABC");
    expect(opts.enabled).toBe(true);
    expect(opts.queryKey).toEqual([
      "astrolabe",
      "attestationsForSubject",
      "GABC",
    ]);

    const result = await opts.queryFn();
    expect(result).toEqual(["id1", "id2"]);

    const disabledOpts = attestationsForSubjectQueryOptions(client, undefined);
    expect(disabledOpts.enabled).toBe(false);
    expect(await disabledOpts.queryFn()).toEqual([]);
  });

  it("schemaAttestationCountQueryOptions returns proper queryKey, enabled, and queryFn", async () => {
    const client = fakeClient({
      schemaAttestationCount: vi.fn().mockResolvedValue(100n),
    });

    const opts = schemaAttestationCountQueryOptions(client, "44".repeat(32));
    expect(opts.enabled).toBe(true);
    expect(opts.queryKey).toEqual([
      "astrolabe",
      "schemaAttestationCount",
      "44".repeat(32),
    ]);

    const result = await opts.queryFn();
    expect(result).toBe(100n);

    const disabledOpts = schemaAttestationCountQueryOptions(client, undefined);
    expect(disabledOpts.enabled).toBe(false);
    expect(await disabledOpts.queryFn()).toBeNull();
  });
});
