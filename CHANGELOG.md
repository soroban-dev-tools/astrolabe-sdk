# Changelog

All notable changes to `@astrolabe/sdk` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-11-08

### Added

- **Core Client (`Astrolabe`)**:
  - Full client support for reading and creating attestations and schemas on Stellar Soroban.
  - Built-in network presets: `network: "testnet"` and `network: "local"`.
  - Automatic resolution of local standalone RPC endpoints (`http://localhost:8000/soroban/rpc`), local passphrase, and `allowHttp` configuration.
  - Support for `CONSTELLATION_DEPLOYMENTS` environment variables for seamless integration with local deployment runners.
  - Contract query methods: `getSchema`, `registerSchema`, `attest`, `revoke`, `getAttestation`, `isValid`, `attestationsForSubject`, `schemaAttestationCount`, and `registry`.

- **Resilience & Safety**:
  - Configurable read retry policy (`ReadRetryOptions`) with exponential backoff, jitter, and timeout per attempt.
  - Strict write safety guarantee: mutating calls (`attest`, `revoke`, `registerSchema`) are never automatically retried.
  - Strict UID validation (`parseUid`, `InvalidUidError`) guarding all methods against malformed hex strings and buffer length mismatches.

- **Typed Error Hierarchy (`src/errors.ts`)**:
  - Concrete error classes for contract failure codes: `SchemaNotFoundError`, `AttestationNotFoundError`, `NotAuthorizedToRevokeError`, `SchemaNotRevocableError`, `AlreadyRevokedError`, `DataTooLongError`, `NotInitializedError`, `SchemaAlreadyExistsError`, `DefinitionTooLongError`.
  - `mapContractError` translation layer parsing simulation failures and HostErrors into typed instances.

- **Type-Safe Schema Encoding (`src/encoding.ts`)**:
  - Binary encoder (`encodeData`) and decoder (`decodeData`) for Soroban attestation data payloads.
  - Compile-time type inference from schema definition string literals (`InferSchemaType<Def>`).
  - Typed decoder utilities (`decodeTyped`, `createSchemaDecoder`).
  - Boundary checking on integer types (`u32`, `i32`, `u64`, `i64`).

- **Cryptographic Hashing (`src/crypto.ts`)**:
  - Canonical length-prefixed attestation payload serialization with domain separation (`serializeAttestationPayload`).
  - SHA-256 hash generation (`hashAttestationPayload`, `hashAttestationPayloadHex`) for off-chain claims and verification.

- **React Integration (`@astrolabe/sdk/react`)**:
  - Lightweight hooks: `useAttestation`, `useAttestationsFor`, `useIsValid`, `useSchema`, `useSchemaAttestationCount`.
  - TanStack React Query adapters: query key factory (`astrolabeQueryKeys`) and query option builders (`attestationQueryOptions`, `schemaQueryOptions`, `isValidQueryOptions`, etc.) without runtime lock-in.

- **Developer & Contributor Experience**:
  - Comprehensive browser wallet signing guide (`docs/wallet-signing.md`) covering Freighter and Stellar Wallets Kit.
  - GitHub Actions CI matrix workflow testing Node 20 and 22 across lint, typecheck, unit tests, and build artifact verification.
  - Contributor Covenant v2.1 Code of Conduct (`CODE_OF_CONDUCT.md`).
  - GitHub issue and pull request templates.
  - `.env.example` documenting test credentials and deployment environment options.
