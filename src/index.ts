// Copyright 2026 The Astrolabe Authors
// Licensed under the Apache License, Version 2.0.

/**
 * `@astrolabe/sdk` — a TypeScript client for the Astrolabe attestation registry
 * on Stellar Soroban.
 *
 * The React hooks ship from the `@astrolabe/sdk/react` entry point.
 */

export {
  Astrolabe,
  DEFAULT_RPC_TESTNET,
  DEFAULT_RPC_LOCAL,
  DEFAULT_PASSPHRASE_LOCAL,
  DEFAULT_RETRY,
} from "./client.js";
export type {
  AstrolabeOptions,
  NetworkPreset,
  ReadRetryOptions,
  RegisterSchemaArgs,
  AttestArgs,
  SignTransaction,
  Uid,
} from "./client.js";

export {
  encodeData,
  decodeData,
  decodeTyped,
  createSchemaDecoder,
  hexToBytes,
  bytesToHex,
  EncodingError,
  type FieldValue,
  type InferSchemaType,
  type FieldTypeToTsType,
} from "./encoding.js";

export {
  parseDefinition,
  SchemaDefinitionError,
  type FieldType,
  type SchemaField,
} from "./schema.js";

export { signerFromSecret, type SecretSigner } from "./signer.js";

export {
  AstrolabeError,
  ContractError,
  SchemaNotFoundError,
  AttestationNotFoundError,
  NotAuthorizedToRevokeError,
  SchemaNotRevocableError,
  AlreadyRevokedError,
  DataTooLongError,
  NotInitializedError,
  SchemaAlreadyExistsError,
  DefinitionTooLongError,
  mapContractError,
  type ContractName,
} from "./errors.js";

export {
  serializeAttestationPayload,
  hashAttestationPayload,
  hashAttestationPayloadHex,
  type AttestationPayload,
} from "./crypto.js";

export type { Schema } from "./generated/schema-registry.js";
export type { Attestation } from "./generated/attestation.js";

import deployments from "./deployments.json";
/** The vendored contract deployment truth from astrolabe-contracts. */
export { deployments };
