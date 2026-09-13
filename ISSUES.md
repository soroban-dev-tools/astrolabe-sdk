# Open Issues — astrolabe-sdk

Unclaimed work in the SDK, ordered easiest to hardest. Difficulty labels:
`good first issue`, `intermediate`, `advanced`. This list is the source of truth
for the "Where to start" section of `CONTRIBUTING.md`.

The single largest unclaimed piece is **S6, the delegated-attestation and
off-chain client**, which cannot land until the matching contract work ships.

---

## S1. Add a `network: "local"` preset

**Difficulty:** good first issue
**Likely files:** `src/client.ts`, `README.md`, `test/`

The client only knows `testnet` defaults. Add a `local` preset that reads
`CONSTELLATION_DEPLOYMENTS` or an explicit `rpcUrl`, so a contract developer can
point the SDK at a local deployment. See `docs/multi-repo.md` section 5.

**Acceptance criteria**
- `new Astrolabe({ network: "local", rpcUrl, contractIds })` works.
- A unit test covers option resolution and precedence.

## S2. Typed decode helpers per schema

**Difficulty:** good first issue
**Likely files:** `src/encoding.ts`, `test/encoding.test.ts`

`decodeData` returns `Record<string, FieldValue>`. Add a generic helper that
returns a typed object given a definition, improving editor completion.

**Acceptance criteria**
- Typed return inferred from a definition literal where feasible.
- Tests for at least three definitions.

## S3. Friendly error mapping

**Difficulty:** intermediate
**Likely files:** `src/client.ts`, `src/errors.ts` (new), `test/`

Contract calls fail with a numeric error code. Map codes to named SDK errors
(`SchemaNotRevocable`, `NotAuthorizedToRevoke`, and so on) so callers can branch
on `err.code`. The codes are in the contracts repo `docs/protocol.md` section 6.

**Acceptance criteria**
- Each contract error surfaces as a typed error carrying its numeric code.
- Tests assert the mapping from a simulated failure.

## S4. Retry and timeout policy for reads

**Difficulty:** intermediate
**Likely files:** `src/client.ts`, `test/`

Testnet RPC is flaky. Add a small, configurable retry with backoff for read
methods only. Writes must never auto-retry, to avoid double submission.

**Acceptance criteria**
- Configurable retry count and backoff; default is conservative.
- A test proves writes are not retried.

## S5. Browser bundle and wallet-signer example

**Difficulty:** intermediate
**Likely files:** `README.md`, `examples/` (new)

Document and test the browser path: passing a Stellar Wallets Kit signer into the
client. Add a minimal example that the explorer can mirror.

**Acceptance criteria**
- An example that compiles and type-checks against the public API.
- README section on wallet signing that does not touch secret keys.

## S6. Delegated-attestation and off-chain client

**Difficulty:** advanced
**Likely files:** `src/client.ts`, `src/encoding.ts`, `src/generated/*`

Once the contracts ship `attest_delegated` and `verify_offchain` (contracts issues
C7 and C8), add client methods and the canonical payload builder and signer. This
is the largest open piece and depends on the contract work landing first.

**Acceptance criteria**
- Payload builder matches the contract's canonical format exactly.
- Methods for delegated attest and off-chain verify with tests.
- Compatibility table in the README updated for the new protocol version.

## S7. React Query adapters

**Difficulty:** intermediate
**Likely files:** `src/react.ts`, `test/react.test.tsx`

The hooks are hand-rolled. Provide optional adapters for TanStack Query so apps
already using it get caching and invalidation for free, without making it a hard
dependency.

**Acceptance criteria**
- Adapters are opt-in and tree-shakeable.
- Hand-rolled hooks remain the default with no new required dependency.
