# Roadmap & Issues — astrolabe-sdk

This document tracks the feature backlog and roadmap for `@astrolabe/sdk`.

---

## Completed in v0.1.0

- [x] **S1. Add `network: "local"` preset**
  - Resolved standalone local RPC (`http://localhost:8000/soroban/rpc`), local passphrase, automatic `allowHttp: true`, and `CONSTELLATION_DEPLOYMENTS` environment variables.
  - Implemented in `src/client.ts`; tested in `test/client.test.ts`.

- [x] **S2. Typed decode helpers per schema**
  - Added `decodeTyped`, `createSchemaDecoder`, and `InferSchemaType<Def>` for compile-time schema type inference.
  - Implemented in `src/encoding.ts`; tested in `test/encoding.test.ts`.

- [x] **S3. Friendly contract error mapping**
  - Strongly-typed domain error hierarchy (`SchemaNotFoundError`, `AttestationNotFoundError`, `NotAuthorizedToRevokeError`, etc.) and `mapContractError` translation layer.
  - Implemented in `src/errors.ts`; tested in `test/errors.test.ts`.

- [x] **S4. Retry and timeout policy for reads**
  - Configurable exponential backoff and timeout runner for read queries (`getSchema`, `getAttestation`, `isValid`, `attestationsForSubject`, `schemaAttestationCount`).
  - Strict write safety guarantee ensuring `attest`, `revoke`, and `registerSchema` are never retried.
  - Implemented in `src/client.ts`; tested in `test/client.test.ts`.

- [x] **S5. Browser bundle and wallet-signer example**
  - Documented browser wallet signing workflows with Freighter API and Stellar Wallets Kit.
  - Implemented in `docs/wallet-signing.md` and `README.md`.

- [x] **S6 (Foundation). Canonical attestation payload serializer and hasher**
  - Implemented length-prefixed canonical binary serializer with domain separation (`"astrolabe-attestation-v1"`) and SHA-256 hash calculation (`hashAttestationPayload`, `hashAttestationPayloadHex`).
  - Implemented in `src/crypto.ts`; tested in `test/crypto.test.ts`.

- [x] **S7. TanStack React Query adapters**
  - Tree-shakeable query option factories (`attestationQueryOptions`, `schemaQueryOptions`, etc.) and deterministic query key factory (`astrolabeQueryKeys`) without hard runtime dependencies.
  - Implemented in `src/react.ts`; tested in `test/react.test.tsx`.

---

## Active & Upcoming Roadmap (The Remaining ~10%)

### S6 (Part 2). On-Chain Delegated Attestation Submission (`attestDelegated`)

**Status:** Blocked on upstream contracts (`astrolabe-contracts` C7/C8)
**Difficulty:** Advanced
**Likely files:** `src/client.ts`, `src/generated/attestation.ts`, `test/client.test.ts`

**Description:**
Once the Soroban contracts expose the `attest_delegated` and `verify_offchain` entrypoints on Testnet:
1. Re-generate TypeScript bindings with `stellar contract bindings typescript`.
2. Add `client.attestDelegated({ payload, signature, feePayer })` enabling issuers to sign off-chain claims that third parties or relayers can submit on-chain.
3. Add `client.verifyOffchain({ payload, signature, issuerPublicKey })` for off-chain Ed25519 signature verification against the canonical hash.

**Acceptance criteria:**
- `client.attestDelegated` passes the canonical payload hash and signature to the contract.
- End-to-end integration test validating a delegated attestation flow.

---

### S8. Multi-Attestation Transaction Bundling (Batch Operations)

**Status:** Open / Backlog
**Difficulty:** Intermediate
**Likely files:** `src/client.ts`, `test/batch.test.ts`

**Description:**
In high-throughput issuer workflows, sending individual transactions per attestation incurs unnecessary network round-trips and ledger sequence increments.
Provide a batch builder utility that packs multiple attestation calls into a single Soroban atomic transaction or pipelined simulation.

**Acceptance criteria:**
- `client.batchAttest(args: AttestArgs[]): Promise<string[]>`
- Transaction respects Soroban instruction limits and transaction footprint sizes.
- Comprehensive unit tests covering partial failures and batch signing.

---

### S9. Subsquid / Indexer Integration Adapters

**Status:** Open / Backlog
**Difficulty:** Intermediate
**Likely files:** `src/indexer.ts`, `docs/indexer.md`

**Description:**
While direct RPC queries to Soroban nodes provide the authoritative source of truth for current state and TTLs, querying historical attestations or complex filters across multiple subjects requires an indexer (such as Subsquid or a Mercury indexer).
Add optional GraphQL client helpers configured with standard Astrolabe indexer queries.

**Acceptance criteria:**
- Typed queries for fetching attestations by issuer, date range, or schema UID.
- Seamless fallback to direct RPC `attestationsForSubject` when an indexer endpoint is not configured.
