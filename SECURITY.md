# Security Policy

## Reporting a vulnerability

Report vulnerabilities privately by email to **security@soroban-dev-tools.org**.
Do not open a public issue for a security problem.

We will acknowledge your report and keep you updated. Please allow reasonable time
for a fix before public disclosure.

## Scope

This repository is the TypeScript client. The sensitive surfaces here are:

- **Signing.** The client never holds a secret key. `signerFromSecret` is for Node
  scripts and tests only; browser apps must pass a wallet signer. A change that
  logs, transmits, or persists a secret or a signed payload is a vulnerability.
- **Contract ids.** Ids come only from the vendored `deployments.json` or an
  explicit `contractIds` override. Hardcoding an id elsewhere, or fetching it from
  an untrusted source, is a bug.
- **Encoding.** `encodeData` / `decodeData` parse untrusted bytes. Report any input
  that causes an unbounded allocation, a crash, or a wrong decode.

On-chain behaviour belongs in `astrolabe-contracts`; UI issues belong in
`astrolabe-explorer`.

## Status

Astrolabe is unaudited and Testnet only. Do not use it to protect anything of
value until the contracts repository's README states an audit has completed.
