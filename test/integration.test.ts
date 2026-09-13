import { describe, it, expect, beforeAll } from "vitest";
import { Astrolabe } from "../src/client.js";
import { signerFromSecret, type SecretSigner } from "../src/signer.js";
import { deployments } from "../src/index.js";
import { encodeData } from "../src/encoding.js";

// Integration tests hit live Testnet and are skipped unless STELLAR_SECRET is
// set to a funded Testnet secret key. Testnet resets and rate limits make them
// unsuitable as a per-pull-request gate; run them on a schedule.
const secret = process.env.STELLAR_SECRET;
const run = secret ? describe : describe.skip;

run("live Testnet flow", () => {
  let signer: SecretSigner;
  let client: Astrolabe;

  beforeAll(() => {
    signer = signerFromSecret(secret as string, deployments.networkPassphrase);
    client = new Astrolabe({
      network: "testnet",
      publicKey: signer.publicKey,
      signTransaction: signer.signTransaction,
    });
  });

  it("reads a seed schema", async () => {
    const uid = deployments.seedSchemas.verified_merchant;
    const schema = await client.getSchema(uid);
    expect(schema).not.toBeNull();
    expect(schema?.name).toBe("verified_merchant");
  });

  it("attests and reads back", async () => {
    const uid = deployments.seedSchemas.verified_merchant;
    const schema = await client.getSchema(uid);
    const data = encodeData(schema!.definition, {
      name: "Test Merchant",
      country: "NG",
    });
    const attUid = await client.attest({
      issuer: signer.publicKey,
      schemaUid: uid,
      subject: signer.publicKey,
      data,
    });
    expect(attUid).toMatch(/^[0-9a-f]{64}$/);
    expect(await client.isValid(attUid)).toBe(true);
  }, 90_000);
});
