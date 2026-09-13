// Copyright 2026 The Astrolabe Authors
// Licensed under the Apache License, Version 2.0.

/**
 * `@astrolabe/sdk` — a TypeScript client for the Astrolabe attestation registry
 * on Stellar Soroban.
 *
 * The React hooks ship from the `@astrolabe/sdk/react` entry point.
 */

export { Astrolabe } from "./client.js";
export type {
  AstrolabeOptions,
  RegisterSchemaArgs,
  AttestArgs,
  SignTransaction,
  Uid,
} from "./client.js";

export {
  encodeData,
  decodeData,
  hexToBytes,
  bytesToHex,
  EncodingError,
  type FieldValue,
} from "./encoding.js";

export {
  parseDefinition,
  SchemaDefinitionError,
  type FieldType,
  type SchemaField,
} from "./schema.js";

export { signerFromSecret, type SecretSigner } from "./signer.js";

export type { Schema } from "./generated/schema-registry.js";
export type { Attestation } from "./generated/attestation.js";

import deployments from "./deployments.json";
/** The vendored contract deployment truth from astrolabe-contracts. */
export { deployments };
