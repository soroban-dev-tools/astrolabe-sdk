// Copyright 2026 The Astrolabe Authors
// Licensed under the Apache License, Version 2.0.

/**
 * Build a signer from a Stellar secret key, for Node scripts and integration
 * tests. Browser apps pass a wallet's signer instead (see Stellar Wallets Kit).
 * Never ship a secret key in client-side code.
 */

import { Keypair } from "@stellar/stellar-sdk";
import { basicNodeSigner } from "@stellar/stellar-sdk/contract";
import type { SignTransaction } from "./client.js";

export interface SecretSigner {
  publicKey: string;
  signTransaction: SignTransaction;
}

/** Create a `{ publicKey, signTransaction }` pair from a secret key `S...`. */
export function signerFromSecret(
  secret: string,
  networkPassphrase: string,
): SecretSigner {
  const keypair = Keypair.fromSecret(secret);
  const { signTransaction } = basicNodeSigner(keypair, networkPassphrase);
  return {
    publicKey: keypair.publicKey(),
    signTransaction: signTransaction as unknown as SignTransaction,
  };
}
