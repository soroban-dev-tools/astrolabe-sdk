import { Buffer } from "buffer";
import { Address } from "@stellar/stellar-sdk";
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  MethodOptions,
  Result,
  Spec as ContractSpec,
} from "@stellar/stellar-sdk/contract";
import type {
  u32,
  i32,
  u64,
  i64,
  u128,
  i128,
  u256,
  i256,
  Option,
  Timepoint,
  Duration,
} from "@stellar/stellar-sdk/contract";
export * from "@stellar/stellar-sdk";
export * as contract from "@stellar/stellar-sdk/contract";
export * as rpc from "@stellar/stellar-sdk/rpc";

if (typeof window !== "undefined") {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}


export const networks = {
  testnet: {
    networkPassphrase: "Test SDF Network ; September 2015",
    contractId: "CB2773G3PKQVSECFXTM2Q65W2XJLMWGQXC5UTFBQEPHYPAGUEXEYBMW4",
  }
} as const

export const Errors = {
  1: {message:"SchemaNotFound"},
  2: {message:"AttestationNotFound"},
  3: {message:"NotAuthorizedToRevoke"},
  4: {message:"SchemaNotRevocable"},
  5: {message:"AlreadyRevoked"},
  6: {message:"DataTooLong"},
  7: {message:"NotInitialized"}
}




/**
 * Mirror of the schema registry's `Schema` record, used only to decode the
 * cross-contract `get_schema` response. Field names must match the registry.
 */
export interface SchemaView {
  authority: string;
  definition: string;
  name: string;
  resolver: Option<string>;
  revocable: boolean;
}


/**
 * One attestation. Stored under its uid in persistent storage.
 */
export interface Attestation {
  created_at: u64;
  data: Buffer;
  expiration: Option<u64>;
  issuer: string;
  ref_uid: Option<Buffer>;
  revocation_time: Option<u64>;
  revoked: boolean;
  schema_uid: Buffer;
  subject: string;
}

export interface Client {
  /**
   * Construct and simulate a attest transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Create an attestation under an existing schema. Returns the attestation uid.
   */
  attest: ({issuer, schema_uid, subject, data, expiration, ref_uid}: {issuer: string, schema_uid: Buffer, subject: string, data: Buffer, expiration: Option<u64>, ref_uid: Option<Buffer>}, options?: MethodOptions) => Promise<AssembledTransaction<Result<Buffer>>>

  /**
   * Construct and simulate a revoke transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Revoke an attestation. Only the original issuer may revoke, and only if the
   * schema is revocable and the attestation is not already revoked.
   */
  revoke: ({issuer, attestation_uid}: {issuer: string, attestation_uid: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a is_valid transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Return true if the attestation exists, is not revoked, and is not expired.
   */
  is_valid: ({attestation_uid}: {attestation_uid: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<boolean>>

  /**
   * Construct and simulate a registry transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * The bound schema registry contract id.
   */
  registry: (options?: MethodOptions) => Promise<AssembledTransaction<Result<string>>>

  /**
   * Construct and simulate a get_attestation transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Read an attestation by uid. Extends its TTL on a hit.
   */
  get_attestation: ({attestation_uid}: {attestation_uid: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Option<Attestation>>>

  /**
   * Construct and simulate a attestations_for_subject transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Return the capped, most-recent index of attestation uids for a subject.
   */
  attestations_for_subject: ({subject}: {subject: string}, options?: MethodOptions) => Promise<AssembledTransaction<Array<Buffer>>>

  /**
   * Construct and simulate a schema_attestation_count transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Number of attestations ever issued under a schema.
   */
  schema_attestation_count: ({schema_uid}: {schema_uid: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<u64>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
        /** Constructor/Initialization Args for the contract's `__constructor` method */
        {registry}: {registry: string},
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions &
      Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
      }
  ): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy({registry}, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAABAAAAAAAAAAAAAAABUVycm9yAAAAAAAABwAAAAAAAAAOU2NoZW1hTm90Rm91bmQAAAAAAAEAAAAAAAAAE0F0dGVzdGF0aW9uTm90Rm91bmQAAAAAAgAAAAAAAAAVTm90QXV0aG9yaXplZFRvUmV2b2tlAAAAAAAAAwAAAAAAAAASU2NoZW1hTm90UmV2b2NhYmxlAAAAAAAEAAAAAAAAAA5BbHJlYWR5UmV2b2tlZAAAAAAABQAAAAAAAAALRGF0YVRvb0xvbmcAAAAABgAAAAAAAAAOTm90SW5pdGlhbGl6ZWQAAAAAAAc=",
        "AAAABQAAACNFbWl0dGVkIG9uIGV2ZXJ5IHN1Y2Nlc3NmdWwgcmV2b2tlLgAAAAAAAAAAB1Jldm9rZWQAAAAAAQAAAAZyZXZva2UAAAAAAAUAAAAAAAAACnNjaGVtYV91aWQAAAAAA+4AAAAgAAAAAQAAAAAAAAAPYXR0ZXN0YXRpb25fdWlkAAAAA+4AAAAgAAAAAQAAAAAAAAAGaXNzdWVyAAAAAAATAAAAAAAAAAAAAAAHc3ViamVjdAAAAAATAAAAAAAAAAAAAAAPcmV2b2NhdGlvbl90aW1lAAAAAAYAAAAAAAAAAg==",
        "AAAABQAAACNFbWl0dGVkIG9uIGV2ZXJ5IHN1Y2Nlc3NmdWwgYXR0ZXN0LgAAAAAAAAAACEF0dGVzdGVkAAAAAQAAAAZhdHRlc3QAAAAAAAUAAAAAAAAACnNjaGVtYV91aWQAAAAAA+4AAAAgAAAAAQAAAAAAAAAPYXR0ZXN0YXRpb25fdWlkAAAAA+4AAAAgAAAAAQAAAAAAAAAGaXNzdWVyAAAAAAATAAAAAAAAAAAAAAAHc3ViamVjdAAAAAATAAAAAAAAAAAAAAAKZXhwaXJhdGlvbgAAAAAD6AAAAAYAAAAAAAAAAg==",
        "AAAAAQAAAJNNaXJyb3Igb2YgdGhlIHNjaGVtYSByZWdpc3RyeSdzIGBTY2hlbWFgIHJlY29yZCwgdXNlZCBvbmx5IHRvIGRlY29kZSB0aGUKY3Jvc3MtY29udHJhY3QgYGdldF9zY2hlbWFgIHJlc3BvbnNlLiBGaWVsZCBuYW1lcyBtdXN0IG1hdGNoIHRoZSByZWdpc3RyeS4AAAAAAAAAAApTY2hlbWFWaWV3AAAAAAAFAAAAAAAAAAlhdXRob3JpdHkAAAAAAAATAAAAAAAAAApkZWZpbml0aW9uAAAAAAAQAAAAAAAAAARuYW1lAAAAEQAAAAAAAAAIcmVzb2x2ZXIAAAPoAAAAEwAAAAAAAAAJcmV2b2NhYmxlAAAAAAAAAQ==",
        "AAAAAQAAADxPbmUgYXR0ZXN0YXRpb24uIFN0b3JlZCB1bmRlciBpdHMgdWlkIGluIHBlcnNpc3RlbnQgc3RvcmFnZS4AAAAAAAAAC0F0dGVzdGF0aW9uAAAAAAkAAAAAAAAACmNyZWF0ZWRfYXQAAAAAAAYAAAAAAAAABGRhdGEAAAAOAAAAAAAAAApleHBpcmF0aW9uAAAAAAPoAAAABgAAAAAAAAAGaXNzdWVyAAAAAAATAAAAAAAAAAdyZWZfdWlkAAAAA+gAAAPuAAAAIAAAAAAAAAAPcmV2b2NhdGlvbl90aW1lAAAAA+gAAAAGAAAAAAAAAAdyZXZva2VkAAAAAAEAAAAAAAAACnNjaGVtYV91aWQAAAAAA+4AAAAgAAAAAAAAAAdzdWJqZWN0AAAAABM=",
        "AAAAAAAAAExDcmVhdGUgYW4gYXR0ZXN0YXRpb24gdW5kZXIgYW4gZXhpc3Rpbmcgc2NoZW1hLiBSZXR1cm5zIHRoZSBhdHRlc3RhdGlvbiB1aWQuAAAABmF0dGVzdAAAAAAABgAAAAAAAAAGaXNzdWVyAAAAAAATAAAAAAAAAApzY2hlbWFfdWlkAAAAAAPuAAAAIAAAAAAAAAAHc3ViamVjdAAAAAATAAAAAAAAAARkYXRhAAAADgAAAAAAAAAKZXhwaXJhdGlvbgAAAAAD6AAAAAYAAAAAAAAAB3JlZl91aWQAAAAD6AAAA+4AAAAgAAAAAQAAA+kAAAPuAAAAIAAAAAM=",
        "AAAAAAAAAItSZXZva2UgYW4gYXR0ZXN0YXRpb24uIE9ubHkgdGhlIG9yaWdpbmFsIGlzc3VlciBtYXkgcmV2b2tlLCBhbmQgb25seSBpZiB0aGUKc2NoZW1hIGlzIHJldm9jYWJsZSBhbmQgdGhlIGF0dGVzdGF0aW9uIGlzIG5vdCBhbHJlYWR5IHJldm9rZWQuAAAAAAZyZXZva2UAAAAAAAIAAAAAAAAABmlzc3VlcgAAAAAAEwAAAAAAAAAPYXR0ZXN0YXRpb25fdWlkAAAAA+4AAAAgAAAAAQAAA+kAAAACAAAAAw==",
        "AAAAAAAAAEpSZXR1cm4gdHJ1ZSBpZiB0aGUgYXR0ZXN0YXRpb24gZXhpc3RzLCBpcyBub3QgcmV2b2tlZCwgYW5kIGlzIG5vdCBleHBpcmVkLgAAAAAACGlzX3ZhbGlkAAAAAQAAAAAAAAAPYXR0ZXN0YXRpb25fdWlkAAAAA+4AAAAgAAAAAQAAAAE=",
        "AAAAAAAAACZUaGUgYm91bmQgc2NoZW1hIHJlZ2lzdHJ5IGNvbnRyYWN0IGlkLgAAAAAACHJlZ2lzdHJ5AAAAAAAAAAEAAAPpAAAAEwAAAAM=",
        "AAAAAAAAAHlCaW5kIHRoaXMgYXR0ZXN0YXRpb24gcmVnaXN0cnkgdG8gYSBzY2hlbWEgcmVnaXN0cnkgY29udHJhY3QuIENhbGxlZCBvbmNlCmF0IGRlcGxveW1lbnQgdGltZSBhcyB0aGUgY29udHJhY3QgY29uc3RydWN0b3IuAAAAAAAADV9fY29uc3RydWN0b3IAAAAAAAABAAAAAAAAAAhyZWdpc3RyeQAAABMAAAAA",
        "AAAAAAAAADVSZWFkIGFuIGF0dGVzdGF0aW9uIGJ5IHVpZC4gRXh0ZW5kcyBpdHMgVFRMIG9uIGEgaGl0LgAAAAAAAA9nZXRfYXR0ZXN0YXRpb24AAAAAAQAAAAAAAAAPYXR0ZXN0YXRpb25fdWlkAAAAA+4AAAAgAAAAAQAAA+gAAAfQAAAAC0F0dGVzdGF0aW9uAA==",
        "AAAAAAAAAEdSZXR1cm4gdGhlIGNhcHBlZCwgbW9zdC1yZWNlbnQgaW5kZXggb2YgYXR0ZXN0YXRpb24gdWlkcyBmb3IgYSBzdWJqZWN0LgAAAAAYYXR0ZXN0YXRpb25zX2Zvcl9zdWJqZWN0AAAAAQAAAAAAAAAHc3ViamVjdAAAAAATAAAAAQAAA+oAAAPuAAAAIA==",
        "AAAAAAAAADJOdW1iZXIgb2YgYXR0ZXN0YXRpb25zIGV2ZXIgaXNzdWVkIHVuZGVyIGEgc2NoZW1hLgAAAAAAGHNjaGVtYV9hdHRlc3RhdGlvbl9jb3VudAAAAAEAAAAAAAAACnNjaGVtYV91aWQAAAAAA+4AAAAgAAAAAQAAAAY=" ]),
      options
    )
  }
  public readonly fromJSON = {
    attest: this.txFromJSON<Result<Buffer>>,
        revoke: this.txFromJSON<Result<void>>,
        is_valid: this.txFromJSON<boolean>,
        registry: this.txFromJSON<Result<string>>,
        get_attestation: this.txFromJSON<Option<Attestation>>,
        attestations_for_subject: this.txFromJSON<Array<Buffer>>,
        schema_attestation_count: this.txFromJSON<u64>
  }
}