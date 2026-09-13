// Copyright 2026 The Astrolabe Authors
// Licensed under the Apache License, Version 2.0.

/**
 * Ergonomic Astrolabe client. Wraps the generated contract bindings with a
 * single class, hex-string uids, and read/write helpers.
 */

import { Buffer } from "buffer";
import { Client as SchemaClient, type Schema } from "./generated/schema-registry.js";
import {
  Client as AttestationClient,
  type Attestation,
} from "./generated/attestation.js";
import deployments from "./deployments.json";
import { bytesToHex } from "./encoding.js";

/** A uid may be passed as a hex string or raw bytes. */
export type Uid = string | Uint8Array;

/** A function that signs a transaction XDR, as produced by a wallet or keypair. */
export type SignTransaction = (
  xdr: string,
  opts?: { networkPassphrase?: string; address?: string },
) => Promise<{ signedTxXdr: string; signerAddress?: string }>;

export interface AstrolabeOptions {
  /** Named network. Only "testnet" ships with defaults today. */
  network?: "testnet";
  /** Soroban RPC endpoint. Defaults to the public Testnet RPC. */
  rpcUrl?: string;
  /** Network passphrase. Defaults to the value in the vendored deployments. */
  networkPassphrase?: string;
  /** Override the contract ids. Defaults to the vendored deployment truth. */
  contractIds?: { attestation?: string; schema_registry?: string };
  /** The public key that signs write transactions. */
  publicKey?: string;
  /** Signer for write transactions. Required for attest, revoke, registerSchema. */
  signTransaction?: SignTransaction;
  /** Allow plain HTTP RPC (local development only). */
  allowHttp?: boolean;
}

const DEFAULT_RPC_TESTNET = "https://soroban-testnet.stellar.org";

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
    const networkPassphrase =
      options.networkPassphrase ?? deployments.networkPassphrase;
    const rpcUrl = options.rpcUrl ?? DEFAULT_RPC_TESTNET;
    const schemaId =
      options.contractIds?.schema_registry ??
      deployments.contracts.schema_registry;
    const attestationId =
      options.contractIds?.attestation ?? deployments.contracts.attestation;
    this.hasSigner = Boolean(options.signTransaction);

    const shared = {
      networkPassphrase,
      rpcUrl,
      allowHttp: options.allowHttp ?? false,
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
    const tx = await this.schemaRegistry.register_schema({
      authority: args.authority,
      name: args.name,
      definition: args.definition,
      revocable: args.revocable,
      resolver: args.resolver,
    });
    const sent = await tx.signAndSend();
    return bytesToHex(new Uint8Array(sent.result.unwrap()));
  }

  /** Read a schema by uid. Returns null when it does not exist. */
  async getSchema(schemaUid: Uid): Promise<Schema | null> {
    const tx = await this.schemaRegistry.get_schema({
      schema_uid: toBuffer(schemaUid),
    });
    return tx.result ?? null;
  }

  /** Create an attestation. Returns the attestation uid as a hex string. */
  async attest(args: AttestArgs): Promise<string> {
    this.requireSigner("attest");
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
  }

  /** Revoke an attestation by uid. */
  async revoke(issuer: string, attestationUid: Uid): Promise<void> {
    this.requireSigner("revoke");
    const tx = await this.attestation.revoke({
      issuer,
      attestation_uid: toBuffer(attestationUid),
    });
    const sent = await tx.signAndSend();
    sent.result.unwrap();
  }

  /** Read an attestation by uid. Returns null when it does not exist. */
  async getAttestation(attestationUid: Uid): Promise<Attestation | null> {
    const tx = await this.attestation.get_attestation({
      attestation_uid: toBuffer(attestationUid),
    });
    return tx.result ?? null;
  }

  /** Whether an attestation exists, is not revoked, and is not expired. */
  async isValid(attestationUid: Uid): Promise<boolean> {
    const tx = await this.attestation.is_valid({
      attestation_uid: toBuffer(attestationUid),
    });
    return tx.result;
  }

  /** The capped, most-recent attestation uids for a subject, as hex strings. */
  async attestationsForSubject(subject: string): Promise<string[]> {
    const tx = await this.attestation.attestations_for_subject({ subject });
    return tx.result.map((b) => bytesToHex(new Uint8Array(b)));
  }
}
