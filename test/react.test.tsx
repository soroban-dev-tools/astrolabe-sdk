// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useAttestation, useAttestationsFor, useIsValid } from "../src/react.js";
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
});
