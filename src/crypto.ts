// Copyright 2026 The Astrolabe Authors
// Licensed under the Apache License, Version 2.0.

/**
 * Canonical serialization and hashing for Astrolabe attestation payloads.
 *
 * This provides the deterministic cryptographic foundation for off-chain claims,
 * cross-party verification, and delegated on-chain attestation flows (S6).
 */

import { hash } from "@stellar/stellar-sdk";
import type { Uid } from "./client.js";
import { bytesToHex } from "./encoding.js";

const DOMAIN_SEPARATOR = Buffer.from("astrolabe-attestation-v1", "utf-8");

export interface AttestationPayload {
  schemaUid: Uid;
  issuer: string;
  subject: string;
  data: Uint8Array;
  expiration?: number | bigint;
  refUid?: Uid;
}

function parseUidBuffer(uid: Uid, fieldName: string): Buffer {
  let buf: Buffer;
  if (typeof uid === "string") {
    const clean = uid.startsWith("0x") ? uid.slice(2) : uid;
    if (!/^[0-9a-fA-F]*$/.test(clean) || clean.length !== 64) {
      throw new Error(`${fieldName} must be a 32-byte hex string (64 characters)`);
    }
    buf = Buffer.from(clean, "hex");
  } else {
    buf = Buffer.from(uid);
    if (buf.length !== 32) {
      throw new Error(`${fieldName} must be 32 bytes`);
    }
  }
  return buf;
}

/**
 * Deterministically pack an attestation payload into a canonical byte buffer.
 *
 * Layout:
 * - Domain separator: "astrolabe-attestation-v1" (24 bytes)
 * - Schema UID: 32 bytes
 * - Issuer: 4-byte BE length + UTF-8 bytes
 * - Subject: 4-byte BE length + UTF-8 bytes
 * - Expiration: 8-byte BE u64 (0n if none)
 * - Ref UID: 32 bytes (all zeroes if none)
 * - Data: 4-byte BE length + raw payload bytes
 */
export function serializeAttestationPayload(
  payload: AttestationPayload,
): Uint8Array {
  const schemaBuf = parseUidBuffer(payload.schemaUid, "schemaUid");

  const issuerBuf = Buffer.from(payload.issuer, "utf-8");
  const issuerLen = Buffer.alloc(4);
  issuerLen.writeUInt32BE(issuerBuf.length, 0);

  const subjectBuf = Buffer.from(payload.subject, "utf-8");
  const subjectLen = Buffer.alloc(4);
  subjectLen.writeUInt32BE(subjectBuf.length, 0);

  const expBigInt =
    payload.expiration !== undefined ? BigInt(payload.expiration) : 0n;
  if (expBigInt < 0n) {
    throw new Error("expiration cannot be negative");
  }
  const expBuf = Buffer.alloc(8);
  expBuf.writeBigUInt64BE(expBigInt, 0);

  const refBuf =
    payload.refUid !== undefined
      ? parseUidBuffer(payload.refUid, "refUid")
      : Buffer.alloc(32, 0);

  const dataBuf = Buffer.from(payload.data);
  const dataLen = Buffer.alloc(4);
  dataLen.writeUInt32BE(dataBuf.length, 0);

  const packed = Buffer.concat([
    DOMAIN_SEPARATOR,
    schemaBuf,
    issuerLen,
    issuerBuf,
    subjectLen,
    subjectBuf,
    expBuf,
    refBuf,
    dataLen,
    dataBuf,
  ]);

  return new Uint8Array(packed.buffer, packed.byteOffset, packed.byteLength);
}

/**
 * Compute the canonical 32-byte SHA-256 hash of an attestation payload.
 */
export function hashAttestationPayload(
  payload: AttestationPayload,
): Uint8Array {
  const serialized = serializeAttestationPayload(payload);
  const digest = hash(Buffer.from(serialized));
  return new Uint8Array(digest.buffer, digest.byteOffset, digest.byteLength);
}

/**
 * Compute the canonical SHA-256 hash of an attestation payload as a 64-character hex string.
 */
export function hashAttestationPayloadHex(
  payload: AttestationPayload,
): string {
  return bytesToHex(hashAttestationPayload(payload));
}
