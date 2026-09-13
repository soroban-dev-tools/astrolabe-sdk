# @astrolabe/sdk

TypeScript client for **Astrolabe**, an open attestation registry on Stellar's
Soroban platform. Read and write attestations in a few lines, with the contract
ids vendored in so you never hardcode one.

> **Status:** prerelease (`0.1.0-rc.1`), Testnet only, unaudited.

## The three repositories

Astrolabe ships as three repositories; dependencies point one way and never
reverse:

```
astrolabe-contracts  ->  astrolabe-sdk  ->  astrolabe-explorer
```

- **[astrolabe-contracts](https://github.com/soroban-dev-tools/astrolabe-contracts)**
  — the Soroban contracts and deployment truth.
- **astrolabe-sdk** (this repo) — the TypeScript client on npm.
- **[astrolabe-explorer](https://github.com/soroban-dev-tools/astrolabe-explorer)**
  — the Next.js web app.

This package depends on the contracts repository's published artifacts (the
generated bindings and the deployed contract ids). It never imports application
code.

## Install

```bash
pnpm add @astrolabe/sdk
# or: npm install @astrolabe/sdk
```

React hooks ship from `@astrolabe/sdk/react`. `react` is an optional peer
dependency.

## Five-minute quickstart

Read a seed schema and check an attestation, no wallet needed:

```ts
import { Astrolabe, deployments, decodeData } from "@astrolabe/sdk";

const astrolabe = new Astrolabe({ network: "testnet" });

// Read one of the five seed schemas registered on Testnet.
const uid = deployments.seedSchemas.verified_merchant;
const schema = await astrolabe.getSchema(uid);
console.log(schema?.name, schema?.definition);

// Check whether an attestation is currently valid.
const valid = await astrolabe.isValid("<attestation-uid-hex>");
```

Issue and revoke need a signer. In Node, build one from a funded Testnet secret;
in the browser, pass a wallet signer (see the explorer, which uses Stellar
Wallets Kit). Never ship a secret key in client-side code.

```ts
import { Astrolabe, deployments, encodeData, signerFromSecret } from "@astrolabe/sdk";

const signer = signerFromSecret(process.env.STELLAR_SECRET!, deployments.networkPassphrase);
const astrolabe = new Astrolabe({
  network: "testnet",
  publicKey: signer.publicKey,
  signTransaction: signer.signTransaction,
});

const uid = deployments.seedSchemas.verified_merchant;
const schema = await astrolabe.getSchema(uid);

// Encode the data field against the schema definition, then attest.
const data = encodeData(schema!.definition, { name: "Acme", country: "NG" });
const attUid = await astrolabe.attest({
  issuer: signer.publicKey,
  schemaUid: uid,
  subject: signer.publicKey,
  data,
});

console.log("attested", attUid, await astrolabe.isValid(attUid));

// Later, the issuer can revoke it.
await astrolabe.revoke(signer.publicKey, attUid);
```

## API

- `new Astrolabe(options)` — `network`, `rpcUrl`, `networkPassphrase`,
  `contractIds`, `publicKey`, `signTransaction`, `allowHttp`.
- Reads: `getSchema`, `getAttestation`, `isValid`, `attestationsForSubject`.
- Writes (need a signer): `registerSchema`, `attest`, `revoke`.
- Encoding: `encodeData(definition, values)`, `decodeData(definition, bytes)`,
  `parseDefinition`, plus `hexToBytes` / `bytesToHex`.
- React (`@astrolabe/sdk/react`): `useAttestation`, `useAttestationsFor`,
  `useIsValid`.

## Contract ids

The contract ids live in `src/deployments.json`, vendored from the contracts
repository, and are exported as `deployments`. To refresh them after a
redeployment:

```bash
pnpm sync:deployments
```

## Regenerating the bindings

`src/generated/` holds the TypeScript bindings produced from the deployed
contracts. Do not edit them by hand. Regenerate with:

```bash
stellar contract bindings typescript --network testnet \
  --id CAYUJL5VPIVDBAGXAQ3FTOUJ4LICWV6IFKIMTRPAJB7ZS5FMRRI3M5EC \
  --output-dir /tmp/schema-registry --overwrite
stellar contract bindings typescript --network testnet \
  --id CB2773G3PKQVSECFXTM2Q65W2XJLMWGQXC5UTFBQEPHYPAGUEXEYBMW4 \
  --output-dir /tmp/attestation --overwrite
# then copy each package's src/index.ts to
# src/generated/schema-registry.ts and src/generated/attestation.ts
```

## Compatibility

The major version tracks protocol compatibility. This table is the source of
truth and is updated in the same pull request that changes compatibility.

| SDK version | Protocol version | Testnet | Mainnet |
|-------------|------------------|---------|---------|
| 0.1.x       | v0.1.0           | yes     | no      |

## Develop

```bash
pnpm install
pnpm typecheck
pnpm test        # unit tests; integration tests run only with STELLAR_SECRET set
pnpm build
```

Integration tests hit live Testnet and are skipped unless `STELLAR_SECRET` holds
a funded Testnet secret key.

## License

Apache-2.0. See [`LICENSE`](LICENSE).
