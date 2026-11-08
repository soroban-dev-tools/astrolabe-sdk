// Copyright 2026 The Astrolabe Authors
// Licensed under the Apache License, Version 2.0.

import { AstrolabeError } from "./errors.js";

/** A 32-byte uid, as a hex string (optionally 0x-prefixed) or raw bytes. */
export type Uid = string | Uint8Array;

const UID_BYTES = 32;
const HEX_RE = /^[0-9a-fA-F]*$/;

/** Thrown when a uid is not exactly 32 bytes of valid hex. */
export class InvalidUidError extends AstrolabeError {
  constructor(label: string, reason: string) {
    super(`${label} ${reason}`);
    this.name = "InvalidUidError";
  }
}

/**
 * Validate a uid and return its 32 raw bytes. Rejecting malformed input here
 * avoids sending a doomed call to the RPC node, and avoids Buffer.from silently
 * truncating hex at the first invalid character.
 */
export function parseUid(uid: Uid, label = "uid"): Buffer {
  if (typeof uid === "string") {
    const clean = uid.startsWith("0x") ? uid.slice(2) : uid;
    if (!HEX_RE.test(clean) || clean.length !== UID_BYTES * 2) {
      throw new InvalidUidError(label, "must be a 32-byte hex string (64 characters)");
    }
    return Buffer.from(clean, "hex");
  }
  if (uid.length !== UID_BYTES) {
    throw new InvalidUidError(label, "must be 32 bytes");
  }
  return Buffer.from(uid);
}
