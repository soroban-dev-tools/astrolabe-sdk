// Copyright 2026 The Astrolabe Authors
// Licensed under the Apache License, Version 2.0.

/**
 * Schema definition parsing.
 *
 * A schema definition is a comma-separated list of `type name` pairs, for
 * example `"string name,u32 score,bool active"`. This module turns that string
 * into a typed field list that the encoding module uses to encode and decode an
 * attestation's `data` field.
 */

/** The field types Astrolabe can encode. */
export type FieldType =
  | "string"
  | "bool"
  | "u32"
  | "i32"
  | "u64"
  | "i64"
  | "address"
  | "bytes";

const FIELD_TYPES: readonly FieldType[] = [
  "string",
  "bool",
  "u32",
  "i32",
  "u64",
  "i64",
  "address",
  "bytes",
];

export interface SchemaField {
  type: FieldType;
  name: string;
}

/** Thrown when a schema definition string is malformed. */
export class SchemaDefinitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SchemaDefinitionError";
  }
}

const NAME_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

/**
 * Parse a schema definition string into an ordered field list.
 *
 * @throws {SchemaDefinitionError} if the definition is empty, has a bad type,
 *   a bad field name, duplicate names, or a malformed entry.
 */
export function parseDefinition(definition: string): SchemaField[] {
  if (typeof definition !== "string") {
    throw new SchemaDefinitionError("definition must be a string");
  }
  const trimmed = definition.trim();
  if (trimmed.length === 0) {
    throw new SchemaDefinitionError("definition must not be empty");
  }

  const fields: SchemaField[] = [];
  const seen = new Set<string>();

  for (const rawEntry of trimmed.split(",")) {
    const entry = rawEntry.trim();
    if (entry.length === 0) {
      throw new SchemaDefinitionError(`empty field entry in "${definition}"`);
    }
    const parts = entry.split(/\s+/);
    if (parts.length !== 2) {
      throw new SchemaDefinitionError(
        `field "${entry}" must be exactly "type name"`,
      );
    }
    const [type, name] = parts;
    if (!FIELD_TYPES.includes(type as FieldType)) {
      throw new SchemaDefinitionError(
        `unknown type "${type}"; expected one of ${FIELD_TYPES.join(", ")}`,
      );
    }
    if (!NAME_RE.test(name)) {
      throw new SchemaDefinitionError(
        `invalid field name "${name}"; must match ${NAME_RE}`,
      );
    }
    if (seen.has(name)) {
      throw new SchemaDefinitionError(`duplicate field name "${name}"`);
    }
    seen.add(name);
    fields.push({ type: type as FieldType, name });
  }

  return fields;
}
