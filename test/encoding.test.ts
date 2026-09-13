import { describe, it, expect } from "vitest";
import {
  encodeData,
  decodeData,
  hexToBytes,
  bytesToHex,
  EncodingError,
} from "../src/encoding.js";
import { SchemaDefinitionError } from "../src/schema.js";

describe("encode/decode round trips", () => {
  it("round-trips a mixed record", () => {
    const def = "string name,u32 score,bool active";
    const values = { name: "Astrolabe", score: 42, active: true };
    const bytes = encodeData(def, values);
    expect(decodeData(def, bytes)).toEqual(values);
  });

  it("round-trips every type", () => {
    const def = "string a,bool b,u32 c,i32 d,u64 e,i64 f,address g,bytes h";
    const values = {
      a: "hello",
      b: false,
      c: 4294967295,
      d: -2147483648,
      e: 18446744073709551615n,
      f: -9223372036854775808n,
      g: "GABC1234",
      h: new Uint8Array([1, 2, 3]),
    };
    const decoded = decodeData(def, encodeData(def, values));
    expect(decoded.a).toBe("hello");
    expect(decoded.b).toBe(false);
    expect(decoded.c).toBe(4294967295);
    expect(decoded.d).toBe(-2147483648);
    expect(decoded.e).toBe(18446744073709551615n);
    expect(decoded.f).toBe(-9223372036854775808n);
    expect(decoded.g).toBe("GABC1234");
    expect(decoded.h).toEqual(new Uint8Array([1, 2, 3]));
  });

  it("handles empty strings and empty bytes", () => {
    const def = "string s,bytes b";
    const values = { s: "", b: new Uint8Array([]) };
    expect(decodeData(def, encodeData(def, values))).toEqual(values);
  });

  it("handles unicode strings", () => {
    const def = "string s";
    const values = { s: "héllo 世界 🛰" };
    expect(decodeData(def, encodeData(def, values))).toEqual(values);
  });

  it("accepts a hex string for a bytes field", () => {
    const def = "bytes b";
    const bytes = encodeData(def, { b: "0a0b0c" });
    expect(decodeData(def, bytes)).toEqual({ b: new Uint8Array([10, 11, 12]) });
  });

  it("accepts bigint or number for u32", () => {
    const def = "u32 x";
    expect(encodeData(def, { x: 7 })).toEqual(encodeData(def, { x: 7n }));
  });

  it("is deterministic", () => {
    const def = "string name,u32 score";
    const a = encodeData(def, { name: "x", score: 1 });
    const b = encodeData(def, { name: "x", score: 1 });
    expect(bytesToHex(a)).toBe(bytesToHex(b));
  });
});

describe("encode errors", () => {
  it("rejects a missing field", () => {
    expect(() => encodeData("u32 x,bool y", { x: 1 })).toThrow(
      /missing value for field "y"/,
    );
  });

  it("rejects a type mismatch on bool", () => {
    expect(() => encodeData("bool b", { b: 1 as never })).toThrow(EncodingError);
  });

  it("rejects a type mismatch on string", () => {
    expect(() => encodeData("string s", { s: 5 as never })).toThrow(
      /must be a string/,
    );
  });

  it("rejects a non-integer number", () => {
    expect(() => encodeData("u32 x", { x: 1.5 })).toThrow(/must be an integer/);
  });

  it("rejects out-of-range u32", () => {
    expect(() => encodeData("u32 x", { x: 4294967296 })).toThrow(
      /out of u32 range/,
    );
    expect(() => encodeData("u32 x", { x: -1 })).toThrow(/out of u32 range/);
  });

  it("rejects out-of-range i32", () => {
    expect(() => encodeData("i32 x", { x: 2147483648 })).toThrow(
      /out of i32 range/,
    );
  });

  it("rejects out-of-range u64", () => {
    expect(() => encodeData("u64 x", { x: 1n << 64n })).toThrow(
      /out of u64 range/,
    );
  });

  it("propagates definition errors", () => {
    expect(() => encodeData("nope x", {})).toThrow(SchemaDefinitionError);
  });
});

describe("decode errors", () => {
  it("rejects truncated data", () => {
    // u32 needs 4 bytes; give 2.
    expect(() => decodeData("u32 x", new Uint8Array([0, 0]))).toThrow(
      /unexpected end of data/,
    );
  });

  it("rejects trailing bytes", () => {
    const good = encodeData("bool b", { b: true });
    const extra = new Uint8Array([...good, 9, 9]);
    expect(() => decodeData("bool b", extra)).toThrow(/trailing bytes/);
  });
});

describe("hex helpers", () => {
  it("round-trips hex", () => {
    const bytes = new Uint8Array([0, 255, 16, 32]);
    expect(hexToBytes(bytesToHex(bytes))).toEqual(bytes);
  });

  it("accepts a 0x prefix", () => {
    expect(hexToBytes("0xff")).toEqual(new Uint8Array([255]));
  });

  it("rejects malformed hex", () => {
    expect(() => hexToBytes("xyz")).toThrow(/invalid hex/);
    expect(() => hexToBytes("abc")).toThrow(/invalid hex/);
  });
});
