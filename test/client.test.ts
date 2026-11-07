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

  it("initializes with local preset defaults", () => {
    const client = new Astrolabe({ network: "local" });

    expect(client.schemaRegistry.options.rpcUrl).toBe(
      "http://localhost:8000/soroban/rpc",
    );
    expect(client.attestation.options.rpcUrl).toBe(
      "http://localhost:8000/soroban/rpc",
    );
    expect(client.schemaRegistry.options.networkPassphrase).toBe(
      "Standalone Network ; February 2017",
    );
    expect(client.schemaRegistry.options.allowHttp).toBe(true);
    expect(client.attestation.options.allowHttp).toBe(true);
  });

  it("resolves contract ids and passphrase from CONSTELLATION_DEPLOYMENTS env", () => {
    const validSchemaId =
      "CAYUJL5VPIVDBAGXAQ3FTOUJ4LICWV6IFKIMTRPAJB7ZS5FMRRI3M5EC";
    const validAttestationId =
      "CB2773G3PKQVSECFXTM2Q65W2XJLMWGQXC5UTFBQEPHYPAGUEXEYBMW4";
    const envPayload = JSON.stringify({
      network: "local",
      networkPassphrase: "Custom Env Passphrase",
      contracts: {
        schema_registry: validSchemaId,
        attestation: validAttestationId,
      },
    });

    const originalEnv = process.env.CONSTELLATION_DEPLOYMENTS;
    try {
      process.env.CONSTELLATION_DEPLOYMENTS = envPayload;
      const client = new Astrolabe({ network: "local" });

      expect(client.schemaRegistry.options.contractId).toBe(validSchemaId);
      expect(client.attestation.options.contractId).toBe(validAttestationId);
      expect(client.schemaRegistry.options.networkPassphrase).toBe(
        "Custom Env Passphrase",
      );
    } finally {
      if (originalEnv !== undefined) {
        process.env.CONSTELLATION_DEPLOYMENTS = originalEnv;
      } else {
        delete process.env.CONSTELLATION_DEPLOYMENTS;
      }
    }
  });

  it("explicit options override CONSTELLATION_DEPLOYMENTS and presets", () => {
    const validSchemaId =
      "CAYUJL5VPIVDBAGXAQ3FTOUJ4LICWV6IFKIMTRPAJB7ZS5FMRRI3M5EC";
    const validAttestationId =
      "CB2773G3PKQVSECFXTM2Q65W2XJLMWGQXC5UTFBQEPHYPAGUEXEYBMW4";
    const explicitSchemaId =
      "CB2773G3PKQVSECFXTM2Q65W2XJLMWGQXC5UTFBQEPHYPAGUEXEYBMW4";

    const envPayload = JSON.stringify({
      networkPassphrase: "Env Passphrase",
      contracts: {
        schema_registry: validSchemaId,
        attestation: validAttestationId,
      },
    });

    const originalEnv = process.env.CONSTELLATION_DEPLOYMENTS;
    try {
      process.env.CONSTELLATION_DEPLOYMENTS = envPayload;
      const client = new Astrolabe({
        network: "local",
        networkPassphrase: "Explicit Passphrase",
        rpcUrl: "https://custom-local-rpc.org",
        contractIds: {
          schema_registry: explicitSchemaId,
        },
        allowHttp: false,
      });

      expect(client.schemaRegistry.options.networkPassphrase).toBe(
        "Explicit Passphrase",
      );
      expect(client.schemaRegistry.options.rpcUrl).toBe(
        "https://custom-local-rpc.org",
      );
      expect(client.schemaRegistry.options.contractId).toBe(explicitSchemaId);
      expect(client.attestation.options.contractId).toBe(validAttestationId);
      expect(client.schemaRegistry.options.allowHttp).toBe(false);
    } finally {
      if (originalEnv !== undefined) {
        process.env.CONSTELLATION_DEPLOYMENTS = originalEnv;
      } else {
        delete process.env.CONSTELLATION_DEPLOYMENTS;
      }
    }
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
