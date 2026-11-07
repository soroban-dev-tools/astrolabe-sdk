// Copyright 2026 The Astrolabe Authors
// Licensed under the Apache License, Version 2.0.

/**
 * Ergonomic Astrolabe client. Wraps the generated contract bindings with a
 * single class, hex-string uids, and read/write helpers.
 */

import { Buffer } from "buffer";
import * as fs from "node:fs";
import { Client as SchemaClient, type Schema } from "./generated/schema-registry.js";
import {
  Client as AttestationClient,
  type Attestation,
} from "./generated/attestation.js";
import deployments from "./deployments.json";
import { bytesToHex } from "./encoding.js";
import { mapContractError } from "./errors.js";

/** A uid may be passed as a hex string or raw bytes. */
export type Uid = string | Uint8Array;

/** A function that signs a transaction XDR, as produced by a wallet or keypair. */
export type SignTransaction = (
  xdr: string,
  opts?: { networkPassphrase?: string; address?: string },
) => Promise<{ signedTxXdr: string; signerAddress?: string }>;

export type NetworkPreset = "testnet" | "local";

export interface AstrolabeOptions {
  /** Named network preset: "testnet" (default) or "local". */
  network?: NetworkPreset;
  /** Soroban RPC endpoint. Defaults to public Testnet or local standalone RPC. */
  rpcUrl?: string;
  /** Network passphrase. Defaults to the network preset or vendored deployments. */
  networkPassphrase?: string;
  /** Override the contract ids. Defaults to the vendored deployment truth or CONSTELLATION_DEPLOYMENTS. */
  contractIds?: { attestation?: string; schema_registry?: string };
  /** The public key that signs write transactions. */
  publicKey?: string;
  /** Signer for write transactions. Required for attest, revoke, registerSchema. */
  signTransaction?: SignTransaction;
  /** Allow plain HTTP RPC (defaults to true for local, false otherwise). */
  allowHttp?: boolean;
}

export const DEFAULT_RPC_TESTNET = "https://soroban-testnet.stellar.org";
export const DEFAULT_RPC_LOCAL = "http://localhost:8000/soroban/rpc";
export const DEFAULT_PASSPHRASE_LOCAL = "Standalone Network ; February 2017";

interface EnvDeployments {
  networkPassphrase?: string;
  contracts?: { attestation?: string; schema_registry?: string };
}

function loadDeploymentsEnv(): EnvDeployments | null {
  if (typeof process === "undefined" || !process.env) return null;
  const envVal = process.env.CONSTELLATION_DEPLOYMENTS;
  if (!envVal || typeof envVal !== "string") return null;

  const trimmed = envVal.trim();
  if (trimmed.startsWith("{")) {
    try {
      return JSON.parse(trimmed) as EnvDeployments;
    } catch {
      return null;
    }
  }

  try {
    if (typeof fs.readFileSync === "function") {
      const content = fs.readFileSync(trimmed, "utf-8");
      return JSON.parse(content) as EnvDeployments;
    }
  } catch {
    return null;
  }
  return null;
}

function toBuffer(uid: Uid): Buffer {
  if (typeof uid === "string") {
    const clean = uid.startsWith("0x") ? uid.slice(2) : uid;
    return Buffer.from(clean, "hex");
  }
  return Buffer.from(uid);
}

export interface RegisterSchemaArgs {
  authority: string;
  name: string;
  definition: string;
  revocable: boolean;
  resolver?: string;
}

export interface AttestArgs {
  issuer: string;
  schemaUid: Uid;
  subject: string;
  data: Uint8Array;
  expiration?: number | bigint;
  refUid?: Uid;
}

export class Astrolabe {
  readonly schemaRegistry: SchemaClient;
  readonly attestation: AttestationClient;
  private readonly hasSigner: boolean;

  constructor(options: AstrolabeOptions = {}) {
    const isLocal = options.network === "local";
    const envDeployments = loadDeploymentsEnv();

    const networkPassphrase =
      options.networkPassphrase ??
      envDeployments?.networkPassphrase ??
      (isLocal ? DEFAULT_PASSPHRASE_LOCAL : deployments.networkPassphrase);

    const rpcUrl =
      options.rpcUrl ?? (isLocal ? DEFAULT_RPC_LOCAL : DEFAULT_RPC_TESTNET);

    const schemaId =
      options.contractIds?.schema_registry ??
      envDeployments?.contracts?.schema_registry ??
      deployments.contracts.schema_registry;

    const attestationId =
      options.contractIds?.attestation ??
      envDeployments?.contracts?.attestation ??
      deployments.contracts.attestation;

    const allowHttp = options.allowHttp ?? isLocal;
    this.hasSigner = Boolean(options.signTransaction);

    const shared = {
      networkPassphrase,
      rpcUrl,
      allowHttp,
      publicKey: options.publicKey,
      signTransaction: options.signTransaction as never,
    };

    this.schemaRegistry = new SchemaClient({ ...shared, contractId: schemaId });
    this.attestation = new AttestationClient({
      ...shared,
      contractId: attestationId,
    });
  }

  private requireSigner(method: string): void {
    if (!this.hasSigner) {
      throw new Error(
        `${method} is a write and needs a signTransaction option and publicKey`,
      );
    }
  }

  /** Register a schema. Returns the schema uid as a hex string. */
  async registerSchema(args: RegisterSchemaArgs): Promise<string> {
    this.requireSigner("registerSchema");
    try {
      const tx = await this.schemaRegistry.register_schema({
        authority: args.authority,
        name: args.name,
        definition: args.definition,
        revocable: args.revocable,
        resolver: args.resolver,
      });
      const sent = await tx.signAndSend();
      return bytesToHex(new Uint8Array(sent.result.unwrap()));
    } catch (err) {
      throw mapContractError("schema_registry", err);
    }
  }

  /** Read a schema by uid. Returns null when it does not exist. */
  async getSchema(schemaUid: Uid): Promise<Schema | null> {
    try {
      const tx = await this.schemaRegistry.get_schema({
        schema_uid: toBuffer(schemaUid),
      });
      return tx.result ?? null;
    } catch (err) {
      throw mapContractError("schema_registry", err);
    }
  }

  /** Create an attestation. Returns the attestation uid as a hex string. */
  async attest(args: AttestArgs): Promise<string> {
    this.requireSigner("attest");
    try {
      const tx = await this.attestation.attest({
        issuer: args.issuer,
        schema_uid: toBuffer(args.schemaUid),
        subject: args.subject,
        data: Buffer.from(args.data),
        expiration:
          args.expiration === undefined ? undefined : BigInt(args.expiration),
        ref_uid: args.refUid === undefined ? undefined : toBuffer(args.refUid),
      });
      const sent = await tx.signAndSend();
      return bytesToHex(new Uint8Array(sent.result.unwrap()));
    } catch (err) {
      throw mapContractError("attestation", err);
    }
  }

  /** Revoke an attestation by uid. */
  async revoke(issuer: string, attestationUid: Uid): Promise<void> {
    this.requireSigner("revoke");
    try {
      const tx = await this.attestation.revoke({
        issuer,
        attestation_uid: toBuffer(attestationUid),
      });
      const sent = await tx.signAndSend();
      sent.result.unwrap();
    } catch (err) {
      throw mapContractError("attestation", err);
    }
  }

  /** Read an attestation by uid. Returns null when it does not exist. */
  async getAttestation(attestationUid: Uid): Promise<Attestation | null> {
    try {
      const tx = await this.attestation.get_attestation({
        attestation_uid: toBuffer(attestationUid),
      });
      return tx.result ?? null;
    } catch (err) {
      throw mapContractError("attestation", err);
    }
  }

  /** Whether an attestation exists, is not revoked, and is not expired. */
  async isValid(attestationUid: Uid): Promise<boolean> {
    try {
      const tx = await this.attestation.is_valid({
        attestation_uid: toBuffer(attestationUid),
      });
      return tx.result;
    } catch (err) {
      throw mapContractError("attestation", err);
    }
  }

  /** The capped, most-recent attestation uids for a subject, as hex strings. */
  async attestationsForSubject(subject: string): Promise<string[]> {
    try {
      const tx = await this.attestation.attestations_for_subject({ subject });
      return tx.result.map((b) => bytesToHex(new Uint8Array(b)));
    } catch (err) {
      throw mapContractError("attestation", err);
    }
  }
}
