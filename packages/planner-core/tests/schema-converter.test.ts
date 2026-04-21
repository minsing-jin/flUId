import test from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { zodToJsonSchema } from "../src/schema-converter.js";

test("converts primitive types", () => {
  assert.deepEqual(zodToJsonSchema(z.string()), { type: "string" });
  assert.deepEqual(zodToJsonSchema(z.number()), { type: "number" });
  assert.deepEqual(zodToJsonSchema(z.boolean()), { type: "boolean" });
});

test("converts enum to string with enum list", () => {
  const schema = z.enum(["a", "b", "c"]);
  const result = zodToJsonSchema(schema) as { type: string; enum: string[] };
  assert.equal(result.type, "string");
  assert.deepEqual(result.enum, ["a", "b", "c"]);
});

test("converts object with properties + required", () => {
  const schema = z.object({
    name: z.string(),
    age: z.number(),
    nickname: z.string().optional()
  });
  const result = zodToJsonSchema(schema) as {
    type: string;
    properties: Record<string, unknown>;
    required?: string[];
    additionalProperties: boolean;
  };
  assert.equal(result.type, "object");
  assert.equal(result.additionalProperties, false);
  assert.deepEqual(Object.keys(result.properties).sort(), ["age", "name", "nickname"]);
  assert.ok(result.required?.includes("name"));
  assert.ok(result.required?.includes("age"));
  assert.ok(!result.required?.includes("nickname"));
});

test("converts array with items schema", () => {
  const schema = z.array(z.string());
  const result = zodToJsonSchema(schema) as { type: string; items: { type: string } };
  assert.equal(result.type, "array");
  assert.equal(result.items.type, "string");
});

test("converts nullable to anyOf with null", () => {
  const schema = z.string().nullable();
  const result = zodToJsonSchema(schema) as { anyOf: Array<{ type: string }> };
  assert.ok(Array.isArray(result.anyOf));
  assert.ok(result.anyOf.some((x) => x.type === "null"));
});

test("unwraps refine/effects wrapper", () => {
  const schema = z.string().refine((v) => v.length > 0);
  const result = zodToJsonSchema(schema);
  assert.deepEqual(result, { type: "string" });
});
