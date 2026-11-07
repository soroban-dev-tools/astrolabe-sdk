import { describe, it, expect } from "vitest";
import {
  serializeAttestationPayload,
  hashAttestationPayload,
  hashAttestationPayloadHex,
  type AttestationPayload,
} from "../src/crypto.js";
import { bytesToHex } from "../src/encoding.js";

describe("crypto: canonical attestation payload hashing", () => {
  const basePayload: AttestationPayload = {
    schemaUid: "11".repeat(32),
    issuer: "GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
    subject: "GCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC",
    data: new Uint8Array([1, 2, 3, 4]),
    expiration: 1800000000n,
    refUid: "22".repeat(32),
  };

  it("serializes payload with domain separator and proper field lengths", () => {
    const serialized = serializeAttestationPayload(basePayload);
    expect(serialized).toBeInstanceOf(Uint8Array);

    // Domain separator is 24 bytes ("astrolabe-attestation-v1")
    const domain = Buffer.from(serialized.slice(0, 24)).toString("utf-8");
    expect(domain).toBe("astrolabe-attestation-v1");

    // Schema UID is 32 bytes
    const schema = Buffer.from(serialized.slice(24, 56)).toString("hex");
    expect(schema).toBe("11".repeat(32));
  });

  it("hashes payload deterministically to 32 bytes and matching hex", () => {
    const hash1 = hashAttestationPayload(basePayload);
    const hash2 = hashAttestationPayload(basePayload);
    const hex = hashAttestationPayloadHex(basePayload);

    expect(hash1.length).toBe(32);
    expect(hash1).toEqual(hash2);
    expect(hex).toBe(bytesToHex(hash1));
    expect(hex).toMatch(/^[0-9a-f]{64}$/);
  });

  it("supports 0x-prefixed hex string UIDs and Uint8Array UIDs identically", () => {
    const p1: AttestationPayload = {
      ...basePayload,
      schemaUid: `0x${"aa".repeat(32)}`,
      refUid: `0x${"bb".repeat(32)}`,
    };

    const p2: AttestationPayload = {
      ...basePayload,
      schemaUid: new Uint8Array(Buffer.from("aa".repeat(32), "hex")),
      refUid: new Uint8Array(Buffer.from("bb".repeat(32), "hex")),
    };

    expect(hashAttestationPayloadHex(p1)).toBe(hashAttestationPayloadHex(p2));
  });

  it("handles omitted optional expiration and refUid with zero defaults", () => {
    const minimalPayload: AttestationPayload = {
      schemaUid: "33".repeat(32),
      issuer: "GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
      subject: "GCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC",
      data: new Uint8Array([]),
    };

    const serialized = serializeAttestationPayload(minimalPayload);
    expect(serialized.length).toBeGreaterThan(0);

    const hashHex = hashAttestationPayloadHex(minimalPayload);
    expect(hashHex).toMatch(/^[0-9a-f]{64}$/);

    // Payload with explicit 0 expiration and empty refUid should hash identically
    const explicitZeros: AttestationPayload = {
      ...minimalPayload,
      expiration: 0,
      refUid: "00".repeat(32),
    };

    expect(hashAttestationPayloadHex(explicitZeros)).toBe(hashHex);
  });

  it("produces distinct hashes when any field changes", () => {
    const baseHash = hashAttestationPayloadHex(basePayload);

    const diffSchema = hashAttestationPayloadHex({
      ...basePayload,
      schemaUid: "ff".repeat(32),
    });
    expect(diffSchema).not.toBe(baseHash);

    const diffIssuer = hashAttestationPayloadHex({
      ...basePayload,
      issuer: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    });
    expect(diffIssuer).not.toBe(baseHash);

    const diffSubject = hashAttestationPayloadHex({
      ...basePayload,
      subject: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    });
    expect(diffSubject).not.toBe(baseHash);

    const diffData = hashAttestationPayloadHex({
      ...basePayload,
      data: new Uint8Array([1, 2, 3, 5]),
    });
    expect(diffData).not.toBe(baseHash);

    const diffExpiration = hashAttestationPayloadHex({
      ...basePayload,
      expiration: 1900000000n,
    });
    expect(diffExpiration).not.toBe(baseHash);

    const diffRefUid = hashAttestationPayloadHex({
      ...basePayload,
      refUid: "99".repeat(32),
    });
    expect(diffRefUid).not.toBe(baseHash);
  });

  it("rejects invalid schemaUid formats or lengths", () => {
    expect(() =>
      serializeAttestationPayload({
        ...basePayload,
        schemaUid: "short_hex",
      }),
    ).toThrow(/schemaUid must be a 32-byte hex string/);

    expect(() =>
      serializeAttestationPayload({
        ...basePayload,
        schemaUid: new Uint8Array(16),
      }),
    ).toThrow(/schemaUid must be 32 bytes/);
  });

  it("rejects invalid refUid formats or lengths", () => {
    expect(() =>
      serializeAttestationPayload({
        ...basePayload,
        refUid: "not-a-valid-hex-64-length",
      }),
    ).toThrow(/refUid must be a 32-byte hex string/);
  });

  it("rejects negative expiration", () => {
    expect(() =>
      serializeAttestationPayload({
        ...basePayload,
        expiration: -1,
      }),
    ).toThrow(/expiration cannot be negative/);
  });
});
