# Browser Wallet Signing with Astrolabe

The `@astrolabe/sdk` does not bundle private keys or wallet extensions. To keep web dApps secure, any write operation (`registerSchema`, `attest`, `revoke`) delegates transaction signing to a user's wallet via the `signTransaction` callback.

## The `SignTransaction` Interface

`Astrolabe` expects a standard signing callback conforming to:

```ts
export type SignTransaction = (
  xdr: string,
  opts?: { networkPassphrase?: string; address?: string },
) => Promise<{ signedTxXdr: string; signerAddress?: string }>;
```

This interface is directly compatible with the Stellar ecosystem's primary browser wallets.

---

## 1. Using Freighter Wallet

[Freighter](https://www.freighter.app/) is the standard browser extension wallet for Stellar and Soroban.

### Installation

```bash
pnpm add @stellar/freighter-api
```

### Setup

```ts
import { Astrolabe } from "@astrolabe/sdk";
import {
  isConnected,
  isAllowed,
  setAllowed,
  getPublicKey,
  signTransaction,
} from "@stellar/freighter-api";

async function createFreighterClient(): Promise<Astrolabe> {
  // Ensure Freighter extension is installed
  const connected = await isConnected();
  if (!connected) {
    throw new Error("Freighter wallet is not installed");
  }

  // Request permission if not already granted
  const allowed = await isAllowed();
  if (!allowed) {
    await setAllowed();
  }

  // Retrieve user's public address (e.g. G...)
  const publicKey = await getPublicKey();

  return new Astrolabe({
    network: "testnet",
    publicKey,
    signTransaction: async (xdr, opts) => {
      const signedTxXdr = await signTransaction(xdr, {
        networkPassphrase: opts?.networkPassphrase,
        accountToSign: opts?.address ?? publicKey,
      });
      return { signedTxXdr };
    },
  });
}
```

---

## 2. Using Stellar Wallets Kit

For multi-wallet support (Freighter, xBull, Albedo, Lobstr, Hana), use the `@creit.tech/stellar-wallets-kit`.

### Installation

```bash
pnpm add @creit.tech/stellar-wallets-kit
```

### Setup

```ts
import { Astrolabe } from "@astrolabe/sdk";
import {
  StellarWalletsKit,
  WalletNetwork,
  allowAllModules,
  FREIGHTER_ID,
} from "@creit.tech/stellar-wallets-kit";

async function createKitClient(): Promise<Astrolabe> {
  const kit = new StellarWalletsKit({
    network: WalletNetwork.TESTNET,
    selectedWalletId: FREIGHTER_ID,
    modules: allowAllModules(),
  });

  // Prompt user modal to connect wallet
  await kit.openModal({
    onWalletSelected: async (option) => {
      kit.setWallet(option.id);
    },
  });

  const { address } = await kit.getAddress();

  return new Astrolabe({
    network: "testnet",
    publicKey: address,
    signTransaction: async (xdr, opts) => {
      const { signedTxXdr } = await kit.signTx({
        xdr,
        networkPassphrase: opts?.networkPassphrase,
      });
      return { signedTxXdr };
    },
  });
}
```

---

## 3. Submitting Attestations from Browser

Once initialized with a wallet signer, calling write methods automatically simulates the Soroban contract transaction, prompts the user's wallet for approval, and submits the finalized transaction to the network:

```ts
import { Astrolabe, encodeData } from "@astrolabe/sdk";

// Client configured with Freighter or Stellar Wallets Kit
const client = await createFreighterClient();

// 1. Encode attestation payload matching schema
const schemaDef = "string name,u32 score,bool active";
const data = encodeData(schemaDef, {
  name: "Alice",
  score: 100,
  active: true,
});

// 2. Submit attestation - prompts wallet signature
const attestationUid = await client.attest({
  issuer: client.publicKey!,
  schemaUid: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  subject: "GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
  data,
});

console.log("Attestation created with UID:", attestationUid);
```

---

## Read-Only Mode (Zero Signer Required)

If an application only queries data, neither `publicKey` nor `signTransaction` is required:

```ts
// Pure read client - completely safe for SSR, serverless, and read-only pages
const reader = new Astrolabe({ network: "testnet" });

const schema = await reader.getSchema(schemaUid);
const isValid = await reader.isValid(attestationUid);
const count = await reader.schemaAttestationCount(schemaUid);
```
