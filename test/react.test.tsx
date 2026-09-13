// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useAttestation, useIsValid } from "../src/react.js";
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
});
