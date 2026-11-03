import { describe, it, expect } from "vitest";
import { Keypair } from "@stellar/stellar-sdk";
import { signerFromSecret } from "../src/signer.js";

describe("signerFromSecret", () => {
  it("derives public key and provides signTransaction", () => {
    const pair = Keypair.random();
    const passphrase = "Test SDF Network ; September 2015";
    const signer = signerFromSecret(pair.secret(), passphrase);

    expect(signer.publicKey).toBe(pair.publicKey());
    expect(typeof signer.signTransaction).toBe("function");
  });

  it("throws on an invalid secret", () => {
    expect(() => signerFromSecret("invalid-secret", "passphrase")).toThrow();
  });
});
