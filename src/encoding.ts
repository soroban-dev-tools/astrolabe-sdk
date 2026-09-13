// Copyright 2026 The Astrolabe Authors
// Licensed under the Apache License, Version 2.0.

/**
 * Encode and decode an attestation `data` field against a schema definition.
 *
 * The on-chain `data` field is opaque bytes. This module defines a canonical,
 * deterministic binary layout so an issuer and a consumer that share the schema
 * definition agree on how to read it. The layout is length-prefixed and
 * big-endian:
 *
 *   - bool            1 byte, 0 or 1
 *   - u32 / i32       4 bytes, big-endian (i32 two's complement)
 *   - u64 / i64       8 bytes, big-endian (i64 two's complement)
 *   - string          4-byte big-endian length, then UTF-8 bytes
 *   - address         encoded as its strkey string (see string)
 *   - bytes           4-byte big-endian length, then raw bytes
 *
 * Fields are written in schema order with no separators. This layout is a
 * client convention; the contract never inspects `data`.
 */

import { parseDefinition, type FieldType, type SchemaField } from "./schema.js";

/** A decoded attestation value. */
export type FieldValue = string | number | bigint | boolean | Uint8Array;

/** Thrown when a value does not match its declared field type. */
export class EncodingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EncodingError";
  }
}

const U32_MAX = 0xffffffff;
const I32_MIN = -0x80000000;
const I32_MAX = 0x7fffffff;
const U64_MAX = (1n << 64n) - 1n;
const I64_MIN = -(1n << 63n);
const I64_MAX = (1n << 63n) - 1n;

class Writer {
  private chunks: Uint8Array[] = [];

  u32(value: number): void {
    const b = new Uint8Array(4);
    new DataView(b.buffer).setUint32(0, value >>> 0, false);
    this.chunks.push(b);
  }

  i32(value: number): void {
    const b = new Uint8Array(4);
    new DataView(b.buffer).setInt32(0, value, false);
    this.chunks.push(b);
  }

  u64(value: bigint): void {
    const b = new Uint8Array(8);
    new DataView(b.buffer).setBigUint64(0, value, false);
    this.chunks.push(b);
  }

  i64(value: bigint): void {
    const b = new Uint8Array(8);
    new DataView(b.buffer).setBigInt64(0, value, false);
    this.chunks.push(b);
  }

  byte(value: number): void {
    this.chunks.push(new Uint8Array([value & 0xff]));
  }

  bytes(value: Uint8Array): void {
    this.u32(value.length);
    this.chunks.push(value);
  }

  finish(): Uint8Array {
    const total = this.chunks.reduce((n, c) => n + c.length, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    for (const c of this.chunks) {
      out.set(c, offset);
      offset += c.length;
    }
    return out;
  }
}

class Reader {
  private offset = 0;
  private view: DataView;

  constructor(private buf: Uint8Array) {
    this.view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  }

  private need(n: number): void {
    if (this.offset + n > this.buf.length) {
      throw new EncodingError("unexpected end of data while decoding");
    }
  }

  u32(): number {
    this.need(4);
    const v = this.view.getUint32(this.offset, false);
    this.offset += 4;
    return v;
  }

  i32(): number {
    this.need(4);
    const v = this.view.getInt32(this.offset, false);
    this.offset += 4;
    return v;
  }

  u64(): bigint {
    this.need(8);
    const v = this.view.getBigUint64(this.offset, false);
    this.offset += 8;
    return v;
  }

  i64(): bigint {
    this.need(8);
    const v = this.view.getBigInt64(this.offset, false);
    this.offset += 8;
    return v;
  }

  byte(): number {
    this.need(1);
    return this.buf[this.offset++];
  }

  bytes(): Uint8Array {
    const len = this.u32();
    this.need(len);
    const slice = this.buf.slice(this.offset, this.offset + len);
    this.offset += len;
    return slice;
  }

  atEnd(): boolean {
    return this.offset === this.buf.length;
  }
}

const utf8Encoder = new TextEncoder();
const utf8Decoder = new TextDecoder("utf-8", { fatal: true });

function toBigInt(value: FieldValue, type: FieldType): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") {
    if (!Number.isInteger(value)) {
      throw new EncodingError(`${type} value must be an integer, got ${value}`);
    }
    return BigInt(value);
  }
  throw new EncodingError(`${type} value must be a number or bigint`);
}

function encodeField(w: Writer, field: SchemaField, value: FieldValue): void {
  switch (field.type) {
    case "bool": {
      if (typeof value !== "boolean") {
        throw new EncodingError(`field "${field.name}" must be a boolean`);
      }
      w.byte(value ? 1 : 0);
      return;
    }
    case "u32": {
      const v = toBigInt(value, "u32");
      if (v < 0n || v > BigInt(U32_MAX)) {
        throw new EncodingError(`field "${field.name}" out of u32 range`);
      }
      w.u32(Number(v));
      return;
    }
    case "i32": {
      const v = toBigInt(value, "i32");
      if (v < BigInt(I32_MIN) || v > BigInt(I32_MAX)) {
        throw new EncodingError(`field "${field.name}" out of i32 range`);
      }
      w.i32(Number(v));
      return;
    }
    case "u64": {
      const v = toBigInt(value, "u64");
      if (v < 0n || v > U64_MAX) {
        throw new EncodingError(`field "${field.name}" out of u64 range`);
      }
      w.u64(v);
      return;
    }
    case "i64": {
      const v = toBigInt(value, "i64");
      if (v < I64_MIN || v > I64_MAX) {
        throw new EncodingError(`field "${field.name}" out of i64 range`);
      }
      w.i64(v);
      return;
    }
    case "string":
    case "address": {
      if (typeof value !== "string") {
        throw new EncodingError(`field "${field.name}" must be a string`);
      }
      w.bytes(utf8Encoder.encode(value));
      return;
    }
    case "bytes": {
      const bytes =
        typeof value === "string" ? hexToBytes(value) : (value as Uint8Array);
      if (!(bytes instanceof Uint8Array)) {
        throw new EncodingError(
          `field "${field.name}" must be a Uint8Array or hex string`,
        );
      }
      w.bytes(bytes);
      return;
    }
    default: {
      const exhaustive: never = field.type;
      throw new EncodingError(`unhandled type ${exhaustive}`);
    }
  }
}

function decodeField(r: Reader, field: SchemaField): FieldValue {
  switch (field.type) {
    case "bool":
      return r.byte() !== 0;
    case "u32":
      return r.u32();
    case "i32":
      return r.i32();
    case "u64":
      return r.u64();
    case "i64":
      return r.i64();
    case "string":
    case "address":
      return utf8Decoder.decode(r.bytes());
    case "bytes":
      return r.bytes();
    default: {
      const exhaustive: never = field.type;
      throw new EncodingError(`unhandled type ${exhaustive}`);
    }
  }
}

/**
 * Encode a record of values into the attestation `data` byte layout, following
 * the given schema definition.
 *
 * @throws {EncodingError} on a missing field or a type mismatch.
 * @throws {SchemaDefinitionError} if the definition is malformed.
 */
export function encodeData(
  definition: string,
  values: Record<string, FieldValue>,
): Uint8Array {
  const fields = parseDefinition(definition);
  const w = new Writer();
  for (const field of fields) {
    if (!(field.name in values)) {
      throw new EncodingError(`missing value for field "${field.name}"`);
    }
    encodeField(w, field, values[field.name]);
  }
  return w.finish();
}

/**
 * Decode an attestation `data` buffer into a typed record, following the given
 * schema definition.
 *
 * @throws {EncodingError} if the buffer is truncated or has trailing bytes.
 * @throws {SchemaDefinitionError} if the definition is malformed.
 */
export function decodeData(
  definition: string,
  data: Uint8Array,
): Record<string, FieldValue> {
  const fields = parseDefinition(definition);
  const r = new Reader(data);
  const out: Record<string, FieldValue> = {};
  for (const field of fields) {
    out[field.name] = decodeField(r, field);
  }
  if (!r.atEnd()) {
    throw new EncodingError("trailing bytes after decoding all fields");
  }
  return out;
}

/** Convert a hex string (with or without a 0x prefix) to bytes. */
export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (clean.length % 2 !== 0 || /[^0-9a-fA-F]/.test(clean)) {
    throw new EncodingError(`invalid hex string "${hex}"`);
  }
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

/** Convert bytes to a lowercase hex string with no prefix. */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
