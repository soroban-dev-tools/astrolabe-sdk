import { describe, it, expect, vi } from "vitest";
import {
  AstrolabeError,
  ContractError,
  SchemaNotFoundError,
  AttestationNotFoundError,
  NotAuthorizedToRevokeError,
  SchemaNotRevocableError,
  AlreadyRevokedError,
  DataTooLongError,
  NotInitializedError,
  SchemaAlreadyExistsError,
  DefinitionTooLongError,
  mapContractError,
} from "../src/errors.js";
import { Astrolabe } from "../src/client.js";

describe("mapContractError", () => {
  it("maps attestation numeric error codes to typed errors", () => {
    const cases: Array<[number, new (...args: never[]) => ContractError]> = [
      [1, SchemaNotFoundError],
      [2, AttestationNotFoundError],
      [3, NotAuthorizedToRevokeError],
      [4, SchemaNotRevocableError],
      [5, AlreadyRevokedError],
      [6, DataTooLongError],
      [7, NotInitializedError],
    ];

    for (const [code, ErrorClass] of cases) {
      const err = mapContractError("attestation", { code });
      expect(err).toBeInstanceOf(ErrorClass);
      expect(err).toBeInstanceOf(ContractError);
      expect(err).toBeInstanceOf(AstrolabeError);
      expect((err as ContractError).code).toBe(code);
      expect((err as ContractError).contract).toBe("attestation");
    }
  });

  it("maps schema_registry numeric error codes to typed errors", () => {
    const cases: Array<[number, new (...args: never[]) => ContractError]> = [
      [1, SchemaAlreadyExistsError],
      [2, DefinitionTooLongError],
      [3, SchemaNotFoundError],
    ];

    for (const [code, ErrorClass] of cases) {
      const err = mapContractError("schema_registry", { code });
      expect(err).toBeInstanceOf(ErrorClass);
      expect(err).toBeInstanceOf(ContractError);
      expect(err).toBeInstanceOf(AstrolabeError);
      expect((err as ContractError).code).toBe(code);
      expect((err as ContractError).contract).toBe("schema_registry");
    }
  });

  it("parses Soroban Error(Contract, #X) messages", () => {
    const raw = new Error("HostError: Error(Contract, #4)");
    const mapped = mapContractError("attestation", raw);
    expect(mapped).toBeInstanceOf(SchemaNotRevocableError);
    expect((mapped as ContractError).code).toBe(4);
  });

  it("parses error name substrings in message", () => {
    const raw = new Error("transaction failed with AlreadyRevoked");
    const mapped = mapContractError("attestation", raw);
    expect(mapped).toBeInstanceOf(AlreadyRevokedError);
    expect((mapped as ContractError).code).toBe(5);
  });

  it("handles unknown contract codes gracefully", () => {
    const mapped = mapContractError("attestation", { code: 99 });
    expect(mapped).toBeInstanceOf(ContractError);
    expect((mapped as ContractError).code).toBe(99);
  });

  it("returns non-contract errors as original Error or AstrolabeError", () => {
    const networkErr = new Error("connection reset");
    expect(mapContractError("attestation", networkErr)).toBe(networkErr);

    const stringErr = mapContractError("attestation", "fatal string");
    expect(stringErr).toBeInstanceOf(AstrolabeError);
    expect(stringErr.message).toBe("fatal string");
  });
});

describe("Client error mapping integration", () => {
  it("translates simulated failure in revoke to typed error", async () => {
    const client = new Astrolabe({
      publicKey: "GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
      signTransaction: async () => ({ signedTxXdr: "AAAA" }),
    });

    vi.spyOn(client.attestation, "revoke").mockRejectedValue(
      new Error("HostError: Error(Contract, #3)"),
    );

    await expect(
      client.revoke("GABC", "00".repeat(32)),
    ).rejects.toThrow(NotAuthorizedToRevokeError);
  });

  it("translates simulated failure in getSchema to typed error", async () => {
    const client = new Astrolabe();

    vi.spyOn(client.schemaRegistry, "get_schema").mockRejectedValue(
      new Error("HostError: Error(Contract, #3)"),
    );

    await expect(client.getSchema("00".repeat(32))).rejects.toThrow(
      SchemaNotFoundError,
    );
  });
});
