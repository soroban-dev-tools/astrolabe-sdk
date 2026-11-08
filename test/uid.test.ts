import { describe, it, expect, vi } from "vitest";
import { parseUid, InvalidUidError, AstrolabeError, Astrolabe } from "../src/index.js";

describe("uid validation", () => {
  const validHex = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  const validBytes = new Uint8Array(Buffer.from(validHex, "hex"));

  it("parses 64-character hex strings", () => {
    const buf = parseUid(validHex);
    expect(buf.length).toBe(32);
    expect(buf.toString("hex")).toBe(validHex);
  });

  it("parses 0x-prefixed 64-character hex strings", () => {
    const buf = parseUid(`0x${validHex}`);
    expect(buf.length).toBe(32);
    expect(buf.toString("hex")).toBe(validHex);
  });

  it("parses 32-byte Uint8Array and Buffer", () => {
    const buf = parseUid(validBytes);
    expect(buf.length).toBe(32);
    expect(buf.toString("hex")).toBe(validHex);
  });

  it("rejects non-hex characters in string uid", () => {
    const invalidHex = "z".repeat(64);
    expect(() => parseUid(invalidHex, "customUid")).toThrow(InvalidUidError);
    expect(() => parseUid(invalidHex, "customUid")).toThrow(
      "customUid must be a 32-byte hex string (64 characters)",
    );
  });

  it("rejects incorrect string lengths", () => {
    expect(() => parseUid("abcd", "schemaUid")).toThrow(InvalidUidError);
    expect(() => parseUid(validHex + "00", "schemaUid")).toThrow(InvalidUidError);
    expect(() => parseUid("", "schemaUid")).toThrow(InvalidUidError);
  });

  it("rejects incorrect byte lengths", () => {
    expect(() => parseUid(new Uint8Array(16), "refUid")).toThrow(InvalidUidError);
    expect(() => parseUid(new Uint8Array(16), "refUid")).toThrow(
      "refUid must be 32 bytes",
    );
    expect(() => parseUid(new Uint8Array(64), "refUid")).toThrow(InvalidUidError);
  });

  it("InvalidUidError inherits from AstrolabeError", () => {
    const err = new InvalidUidError("uid", "must be 32 bytes");
    expect(err).toBeInstanceOf(AstrolabeError);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("InvalidUidError");
  });

  it("client read methods reject malformed uids before making RPC calls", async () => {
    const client = new Astrolabe();
    const spySchema = vi.spyOn(client.schemaRegistry, "get_schema");
    const spyAttestation = vi.spyOn(client.attestation, "get_attestation");
    const spyValid = vi.spyOn(client.attestation, "is_valid");
    const spyCount = vi.spyOn(client.attestation, "schema_attestation_count");

    await expect(client.getSchema("bad_hex")).rejects.toThrow(InvalidUidError);
    await expect(client.getAttestation("bad_hex")).rejects.toThrow(InvalidUidError);
    await expect(client.isValid("bad_hex")).rejects.toThrow(InvalidUidError);
    await expect(client.schemaAttestationCount("bad_hex")).rejects.toThrow(InvalidUidError);

    expect(spySchema).not.toHaveBeenCalled();
    expect(spyAttestation).not.toHaveBeenCalled();
    expect(spyValid).not.toHaveBeenCalled();
    expect(spyCount).not.toHaveBeenCalled();
  });
});
