// Copyright 2026 The Astrolabe Authors
// Licensed under the Apache License, Version 2.0.

/**
 * Typed domain errors for the Astrolabe SDK.
 *
 * Translates numeric Soroban contract error codes into strongly-typed domain
 * errors that callers can catch and inspect via `err.code` or `instanceof`.
 */

export type ContractName = "attestation" | "schema_registry";

/** Base class for all Astrolabe SDK errors. */
export class AstrolabeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AstrolabeError";
  }
}

/** Base class for errors returned by on-chain contract invocations. */
export class ContractError extends AstrolabeError {
  readonly contract: ContractName;
  readonly code: number;

  constructor(contract: ContractName, code: number, message: string) {
    super(`[${contract}] Contract error #${code}: ${message}`);
    this.name = "ContractError";
    this.contract = contract;
    this.code = code;
  }
}

// --- Attestation Contract Errors (codes 1-7) ---

export class SchemaNotFoundError extends ContractError {
  constructor(contract: ContractName = "attestation", code = 1) {
    super(contract, code, "SchemaNotFound");
    this.name = "SchemaNotFoundError";
  }
}

export class AttestationNotFoundError extends ContractError {
  constructor(contract: ContractName = "attestation", code = 2) {
    super(contract, code, "AttestationNotFound");
    this.name = "AttestationNotFoundError";
  }
}

export class NotAuthorizedToRevokeError extends ContractError {
  constructor(contract: ContractName = "attestation", code = 3) {
    super(contract, code, "NotAuthorizedToRevoke");
    this.name = "NotAuthorizedToRevokeError";
  }
}

export class SchemaNotRevocableError extends ContractError {
  constructor(contract: ContractName = "attestation", code = 4) {
    super(contract, code, "SchemaNotRevocable");
    this.name = "SchemaNotRevocableError";
  }
}

export class AlreadyRevokedError extends ContractError {
  constructor(contract: ContractName = "attestation", code = 5) {
    super(contract, code, "AlreadyRevoked");
    this.name = "AlreadyRevokedError";
  }
}

export class DataTooLongError extends ContractError {
  constructor(contract: ContractName = "attestation", code = 6) {
    super(contract, code, "DataTooLong");
    this.name = "DataTooLongError";
  }
}

export class NotInitializedError extends ContractError {
  constructor(contract: ContractName = "attestation", code = 7) {
    super(contract, code, "NotInitialized");
    this.name = "NotInitializedError";
  }
}

// --- Schema Registry Contract Errors (codes 1-3) ---

export class SchemaAlreadyExistsError extends ContractError {
  constructor(contract: ContractName = "schema_registry", code = 1) {
    super(contract, code, "SchemaAlreadyExists");
    this.name = "SchemaAlreadyExistsError";
  }
}

export class DefinitionTooLongError extends ContractError {
  constructor(contract: ContractName = "schema_registry", code = 2) {
    super(contract, code, "DefinitionTooLong");
    this.name = "DefinitionTooLongError";
  }
}

const ATTESTATION_ERROR_CONSTRUCTORS: Record<
  number,
  (code: number) => ContractError
> = {
  1: (code) => new SchemaNotFoundError("attestation", code),
  2: (code) => new AttestationNotFoundError("attestation", code),
  3: (code) => new NotAuthorizedToRevokeError("attestation", code),
  4: (code) => new SchemaNotRevocableError("attestation", code),
  5: (code) => new AlreadyRevokedError("attestation", code),
  6: (code) => new DataTooLongError("attestation", code),
  7: (code) => new NotInitializedError("attestation", code),
};

const SCHEMA_REGISTRY_ERROR_CONSTRUCTORS: Record<
  number,
  (code: number) => ContractError
> = {
  1: (code) => new SchemaAlreadyExistsError("schema_registry", code),
  2: (code) => new DefinitionTooLongError("schema_registry", code),
  3: (code) => new SchemaNotFoundError("schema_registry", code),
};

const ERROR_NAME_MAP: Record<string, (contract: ContractName) => ContractError> = {
  SchemaNotFound: (contract) =>
    new SchemaNotFoundError(contract, contract === "schema_registry" ? 3 : 1),
  AttestationNotFound: () => new AttestationNotFoundError("attestation", 2),
  NotAuthorizedToRevoke: () => new NotAuthorizedToRevokeError("attestation", 3),
  SchemaNotRevocable: () => new SchemaNotRevocableError("attestation", 4),
  AlreadyRevoked: () => new AlreadyRevokedError("attestation", 5),
  DataTooLong: () => new DataTooLongError("attestation", 6),
  NotInitialized: () => new NotInitializedError("attestation", 7),
  SchemaAlreadyExists: () => new SchemaAlreadyExistsError("schema_registry", 1),
  DefinitionTooLong: () => new DefinitionTooLongError("schema_registry", 2),
};

/**
 * Extract a numeric contract error code from an error or its message if present.
 */
function extractErrorCode(err: unknown): number | null {
  if (typeof err === "object" && err !== null) {
    const candidate = err as { code?: unknown; status?: unknown };
    if (typeof candidate.code === "number") return candidate.code;
    if (typeof candidate.status === "number") return candidate.status;
  }

  const message = err instanceof Error ? err.message : String(err);
  const match =
    /Error\(Contract,\s*#?([0-9]+)\)/i.exec(message) ||
    /ContractError\(#?([0-9]+)\)/i.exec(message) ||
    /Contract\s*error\s*#?([0-9]+)/i.exec(message);

  if (match) {
    const parsed = parseInt(match[1], 10);
    if (!Number.isNaN(parsed)) return parsed;
  }

  return null;
}

/**
 * Map a raw error from a Soroban contract call to a strongly-typed ContractError.
 * If the error is not an identifiable contract error, returns the original error
 * or wraps it in an AstrolabeError.
 */
export function mapContractError(contract: ContractName, err: unknown): Error {
  if (err instanceof ContractError) {
    return err;
  }

  const code = extractErrorCode(err);
  if (code !== null) {
    const registry =
      contract === "attestation"
        ? ATTESTATION_ERROR_CONSTRUCTORS
        : SCHEMA_REGISTRY_ERROR_CONSTRUCTORS;

    if (code in registry) {
      return registry[code](code);
    }
    return new ContractError(contract, code, `UnknownContractError(${code})`);
  }

  const message = err instanceof Error ? err.message : String(err);
  for (const [name, factory] of Object.entries(ERROR_NAME_MAP)) {
    if (message.includes(name)) {
      return factory(contract);
    }
  }

  return err instanceof Error ? err : new AstrolabeError(String(err));
}
