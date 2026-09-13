import { describe, it, expect } from "vitest";
import { parseDefinition, SchemaDefinitionError } from "../src/schema.js";

describe("parseDefinition", () => {
  it("parses a well-formed definition", () => {
    expect(parseDefinition("string name,u32 score,bool active")).toEqual([
      { type: "string", name: "name" },
      { type: "u32", name: "score" },
      { type: "bool", name: "active" },
    ]);
  });

  it("tolerates extra whitespace", () => {
    expect(parseDefinition("  string   name ,  bool active ")).toEqual([
      { type: "string", name: "name" },
      { type: "bool", name: "active" },
    ]);
  });

  it("accepts every supported type", () => {
    const def = "string a,bool b,u32 c,i32 d,u64 e,i64 f,address g,bytes h";
    expect(parseDefinition(def)).toHaveLength(8);
  });

  it("rejects an empty definition", () => {
    expect(() => parseDefinition("")).toThrow(SchemaDefinitionError);
    expect(() => parseDefinition("   ")).toThrow(SchemaDefinitionError);
  });

  it("rejects an unknown type", () => {
    expect(() => parseDefinition("u16 x")).toThrow(/unknown type/);
  });

  it("rejects a malformed entry", () => {
    expect(() => parseDefinition("string")).toThrow(/exactly/);
    expect(() => parseDefinition("string name extra")).toThrow(/exactly/);
  });

  it("rejects a bad field name", () => {
    expect(() => parseDefinition("u32 1bad")).toThrow(/invalid field name/);
    expect(() => parseDefinition("u32 has-dash")).toThrow(/invalid field name/);
  });

  it("rejects duplicate field names", () => {
    expect(() => parseDefinition("u32 x,bool x")).toThrow(/duplicate/);
  });

  it("rejects an empty entry between commas", () => {
    expect(() => parseDefinition("u32 x,,bool y")).toThrow(/empty field entry/);
  });
});
