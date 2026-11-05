import { describe, it, expect } from "vitest";
import { Astrolabe } from "../src/client.js";
import { deployments } from "../src/index.js";

describe("Astrolabe client initialization", () => {
  it("initializes with default testnet parameters", () => {
    const client = new Astrolabe();
    expect(client.schemaRegistry).toBeDefined();
    expect(client.attestation).toBeDefined();
    expect(client.schemaRegistry.options.contractId).toBe(
      deployments.contracts.schema_registry,
    );
    expect(client.attestation.options.contractId).toBe(
      deployments.contracts.attestation,
    );
    expect(client.schemaRegistry.options.networkPassphrase).toBe(
      deployments.networkPassphrase,
    );
  });

  it("accepts custom contract ids and rpcUrl", () => {
    const customSchemaId = "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
    const customAttestationId = "CBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB";
    const customRpc = "https://custom-rpc.stellar.org";

    const client = new Astrolabe({
      rpcUrl: customRpc,
      contractIds: {
        schema_registry: customSchemaId,
        attestation: customAttestationId,
      },
    });

    expect(client.schemaRegistry.options.contractId).toBe(customSchemaId);
    expect(client.attestation.options.contractId).toBe(customAttestationId);
    expect(client.schemaRegistry.options.rpcUrl).toBe(customRpc);
  });

  it("passes signer options and allowHttp", () => {
    const fakeSign = async () => ({ signedTxXdr: "AAAA" });
    const client = new Astrolabe({
      publicKey: "GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
      signTransaction: fakeSign,
      allowHttp: true,
    });

    expect(client.schemaRegistry.options.publicKey).toBe(
      "GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
    );
    expect(client.schemaRegistry.options.allowHttp).toBe(true);
  });

  it("throws clear error when calling write methods without a signer", async () => {
    const client = new Astrolabe();

    await expect(
      client.registerSchema({
        authority: "GABC",
        name: "test",
        definition: "string name",
        revocable: false,
      }),
    ).rejects.toThrow(/registerSchema is a write and needs a signTransaction option and publicKey/);

    await expect(
      client.attest({
        issuer: "GABC",
        schemaUid: "00".repeat(32),
        subject: "GABC",
        data: new Uint8Array([1, 2, 3]),
      }),
    ).rejects.toThrow(/attest is a write and needs a signTransaction option and publicKey/);

    await expect(
      client.revoke("GABC", "00".repeat(32)),
    ).rejects.toThrow(/revoke is a write and needs a signTransaction option and publicKey/);
  });
});
