# Contributing to astrolabe-sdk

Welcome. This repository is the TypeScript client for Astrolabe, an open
attestation registry on Stellar. You do not need to have used Stellar before to
contribute here; most of the interesting work is ordinary TypeScript.

## What this repository is, and the other two

Astrolabe lets anyone define a schema, issue a signed claim about an address, and
verify or revoke it on chain. It ships as three repositories:

- **[astrolabe-contracts](https://github.com/soroban-dev-tools/astrolabe-contracts)**
  — the Rust/Soroban contracts and the deployment truth.
- **astrolabe-sdk** (you are here) — the TypeScript client published to npm as
  `@astrolabe/sdk`.
- **[astrolabe-explorer](https://github.com/soroban-dev-tools/astrolabe-explorer)**
  — the Next.js web app that consumes this SDK.

Dependencies point one way and never reverse:
**contracts → SDK → explorer**. This repository depends on the contracts
repository's published artifacts, the generated bindings and the deployed contract
ids. It never imports application code. If the explorer needs something the SDK
cannot do, the fix goes here, not in the app.

## The domain in two minutes

- **Schema** — a named, typed, immutable description of an attestation's data, for
  example `"string name,u32 score,bool active"`.
- **Attestation** — one claim under a schema: issuer, subject, data, optional
  expiry, revocable or not. Identified by a uid.
- **uid** — a 32-byte hash. This SDK passes uids around as lowercase hex strings.
- **Signer** — writes (`attest`, `revoke`, `registerSchema`) need a signature.
  Reads never do.

The normative protocol lives in the contracts repository's `docs/protocol.md`,
including the error codes this SDK surfaces. Encoding of the `data` field is a
client convention defined in `src/encoding.ts`.

## Repository map

```
src/
  index.ts          public entry point
  client.ts         the Astrolabe class (reads and writes)
  encoding.ts       encode/decode the data field against a schema definition
  schema.ts         parse a schema definition string
  signer.ts         build a signer from a secret (Node/tests only)
  react.ts          the @astrolabe/sdk/react hooks
  deployments.json  vendored contract ids (generated; see below)
  generated/        contract bindings (GENERATED; do not edit by hand)
test/               vitest unit tests, plus a Testnet integration suite
scripts/
  sync-deployments.mjs  refetch deployments.json from the contracts repo
```

Two directories are generated:

- `src/generated/` — regenerate with `stellar contract bindings typescript`; see
  the README for the exact commands.
- `src/deployments.json` — refresh with `pnpm sync:deployments`.

## Getting set up

Prerequisites:

- **Node** 20 or newer (`node --version`).
- **pnpm** 11 or newer (`pnpm --version`; `corepack enable` provides it).

Clone and prove the setup works. No deployment or funded key is needed; the unit
tests run offline:

```bash
git clone https://github.com/soroban-dev-tools/astrolabe-sdk
cd astrolabe-sdk
pnpm install --ignore-scripts
pnpm test
```

`--ignore-scripts` is intentional: the only dependency with a build script is
esbuild, which runs correctly without it, and skipping it keeps installs
non-interactive. A passing `pnpm test` means you are ready.

The integration suite in `test/integration.test.ts` is skipped unless
`STELLAR_SECRET` holds a funded Testnet secret key. You do not need it for most
contributions.

## Where to start

Issues carry `good first issue`, `intermediate`, and `advanced` labels. The
unclaimed work below is ordered easiest to hardest and mirrors [`ISSUES.md`](ISSUES.md),
which has full acceptance criteria.

1. **S1 — a `local` network preset** (`good first issue`). Option resolution for
   local development.
2. **S2 — typed decode helpers** (`good first issue`). Better types over
   `decodeData`.
3. **S3 — friendly error mapping** (`intermediate`). Turn numeric contract codes
   into named errors.
4. **S4 — retry policy for reads** (`intermediate`). Reads only; writes must never
   auto-retry.
5. **S5 — browser bundle and wallet-signer example** (`intermediate`).
6. **S7 — React Query adapters** (`intermediate`). Opt-in, no new hard dependency.
7. **S6 — delegated-attestation and off-chain client** (`advanced`). The single
   largest piece; blocked on contracts issues C7 and C8.

To claim an issue, comment on it and a maintainer will assign it. Open a
Discussion first for anything `advanced` or anything that changes the public API
surface.

## Rules that matter here

A reviewer will send a pull request back if it breaks any of these.

1. **No hardcoded contract ids.** Ids come only from `deployments.json` or an
   explicit `contractIds` option. This is what lets a redeployment be a version
   bump rather than a code change.
2. **Errors carry the contract error code.** When a contract call fails, surface
   the numeric code so callers can branch on it. Do not swallow it into a generic
   message.
3. **Pure modules do no network access.** `encoding.ts` and `schema.ts` are pure
   and must stay that way; they are covered by fast offline tests. Network access
   lives only in `client.ts`.
4. **Never handle a secret key outside `signer.ts`.** The browser path uses a
   wallet signer. Do not log or persist secrets or signed payloads.
5. **Writes never auto-retry.** Retrying a submitted write risks double execution.

## Code style

- **Language:** TypeScript, ES modules, strict mode.
- **Formatter and linter:** ESLint (`pnpm lint`).
- **Types:** `pnpm typecheck` must pass with no errors.
- **Tests:** Vitest (`pnpm test`).
- **Build:** tsup (`pnpm build`), emitting ESM, CJS, and type declarations.
- **Commits:** [Conventional Commits](https://www.conventionalcommits.org):
  `feat:`, `fix:`, `docs:`, `test:`, `chore:`.
- **Branches:** `type/short-description`, for example `feat/error-mapping`.

The exact commands CI runs, which you should run locally first:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Pull request checklist

- [ ] `pnpm lint` passes.
- [ ] `pnpm typecheck` passes.
- [ ] `pnpm test` passes, with new tests for new behaviour.
- [ ] `pnpm build` succeeds.
- [ ] No hardcoded contract ids; `src/generated` and `src/deployments.json` were
      regenerated, not hand-edited, if they changed.
- [ ] The README compatibility table is updated if protocol compatibility changed.
- [ ] Commits follow Conventional Commits.
- [ ] If this depends on a change in `astrolabe-contracts`, or enables one in
      `astrolabe-explorer`, link that pull request and state the dependency
      direction.

## Releases

Maintainers publish to npm. The package uses semantic versioning, and the major
version tracks protocol compatibility as recorded in the README table. Before 1.0,
breaking changes may land in minors. Contributors must not bump the version or
edit `src/deployments.json` in a feature pull request; publishing and vendoring
are a maintainer step, done in dependency order across the three repositories (see
[`docs/multi-repo.md`](docs/multi-repo.md)).

## Security

Report vulnerabilities privately as described in [`SECURITY.md`](SECURITY.md),
never in a public issue. The sensitive surfaces here are signing, contract-id
resolution, and the encoding parser. Astrolabe is unaudited and Testnet only.

## Community

Design discussion happens in this repository's GitHub Discussions. Two merged pull
requests earn triage rights on request. Commit rights are granted per repository;
because this is an application-adjacent library rather than the protocol, they are
granted more readily than in the contracts repository but still after a track
record of reviewed work. Small pull requests get reviewed faster than large ones.
