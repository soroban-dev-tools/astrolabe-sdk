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
    contractId: "CAYUJL5VPIVDBAGXAQ3FTOUJ4LICWV6IFKIMTRPAJB7ZS5FMRRI3M5EC",
  }
} as const

export const Errors = {
  1: {message:"SchemaAlreadyExists"},
  2: {message:"DefinitionTooLong"},
  3: {message:"SchemaNotFound"}
}


/**
 * A registered schema. Immutable once written.
 */
export interface Schema {
  authority: string;
  definition: string;
  name: string;
  resolver: Option<string>;
  revocable: boolean;
}


export interface Client {
  /**
   * Construct and simulate a get_schema transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Read a schema by uid. Extends the entry TTL on a hit.
   */
  get_schema: ({schema_uid}: {schema_uid: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Option<Schema>>>

  /**
   * Construct and simulate a register_schema transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Register an immutable schema. Returns the schema uid.
   * 
   * Fails with `DefinitionTooLong` if the definition exceeds the byte limit,
   * or `SchemaAlreadyExists` if the derived uid is already registered.
   */
  register_schema: ({authority, name, definition, revocable, resolver}: {authority: string, name: string, definition: string, revocable: boolean, resolver: Option<string>}, options?: MethodOptions) => Promise<AssembledTransaction<Result<Buffer>>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
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
    return ContractClient.deploy(null, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAABAAAAAAAAAAAAAAABUVycm9yAAAAAAAAAwAAAAAAAAATU2NoZW1hQWxyZWFkeUV4aXN0cwAAAAABAAAAAAAAABFEZWZpbml0aW9uVG9vTG9uZwAAAAAAAAIAAAAAAAAADlNjaGVtYU5vdEZvdW5kAAAAAAAD",
        "AAAAAQAAACxBIHJlZ2lzdGVyZWQgc2NoZW1hLiBJbW11dGFibGUgb25jZSB3cml0dGVuLgAAAAAAAAAGU2NoZW1hAAAAAAAFAAAAAAAAAAlhdXRob3JpdHkAAAAAAAATAAAAAAAAAApkZWZpbml0aW9uAAAAAAAQAAAAAAAAAARuYW1lAAAAEQAAAAAAAAAIcmVzb2x2ZXIAAAPoAAAAEwAAAAAAAAAJcmV2b2NhYmxlAAAAAAAAAQ==",
        "AAAABQAAACRFbWl0dGVkIHdoZW4gYSBzY2hlbWEgaXMgcmVnaXN0ZXJlZC4AAAAAAAAAEFNjaGVtYVJlZ2lzdGVyZWQAAAACAAAABnNjaGVtYQAAAAAACHJlZ2lzdGVyAAAABAAAAAAAAAAKc2NoZW1hX3VpZAAAAAAD7gAAACAAAAABAAAAAAAAAAlhdXRob3JpdHkAAAAAAAATAAAAAAAAAAAAAAAEbmFtZQAAABEAAAAAAAAAAAAAAAlyZXZvY2FibGUAAAAAAAABAAAAAAAAAAI=",
        "AAAAAAAAADVSZWFkIGEgc2NoZW1hIGJ5IHVpZC4gRXh0ZW5kcyB0aGUgZW50cnkgVFRMIG9uIGEgaGl0LgAAAAAAAApnZXRfc2NoZW1hAAAAAAABAAAAAAAAAApzY2hlbWFfdWlkAAAAAAPuAAAAIAAAAAEAAAPoAAAH0AAAAAZTY2hlbWEAAA==",
        "AAAAAAAAAMJSZWdpc3RlciBhbiBpbW11dGFibGUgc2NoZW1hLiBSZXR1cm5zIHRoZSBzY2hlbWEgdWlkLgoKRmFpbHMgd2l0aCBgRGVmaW5pdGlvblRvb0xvbmdgIGlmIHRoZSBkZWZpbml0aW9uIGV4Y2VlZHMgdGhlIGJ5dGUgbGltaXQsCm9yIGBTY2hlbWFBbHJlYWR5RXhpc3RzYCBpZiB0aGUgZGVyaXZlZCB1aWQgaXMgYWxyZWFkeSByZWdpc3RlcmVkLgAAAAAAD3JlZ2lzdGVyX3NjaGVtYQAAAAAFAAAAAAAAAAlhdXRob3JpdHkAAAAAAAATAAAAAAAAAARuYW1lAAAAEQAAAAAAAAAKZGVmaW5pdGlvbgAAAAAAEAAAAAAAAAAJcmV2b2NhYmxlAAAAAAAAAQAAAAAAAAAIcmVzb2x2ZXIAAAPoAAAAEwAAAAEAAAPpAAAD7gAAACAAAAAD" ]),
      options
    )
  }
  public readonly fromJSON = {
    get_schema: this.txFromJSON<Option<Schema>>,
        register_schema: this.txFromJSON<Result<Buffer>>
  }
}