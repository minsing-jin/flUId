import type { z } from "zod";

/**
 * Convert a Zod schema to a JSON Schema object compatible with
 * OpenAI's response_format.json_schema parameter.
 *
 * Handles the subset of Zod types used in plannerResponseSchema:
 * string, number, boolean, array, object, enum, literal, optional, nullable, union, lazy, refine.
 */
export function zodToJsonSchema(schema: z.ZodType): Record<string, unknown> {
  return convertNode(schema);
}

function convertNode(node: z.ZodType): Record<string, unknown> {
  const def = (node as unknown as { _def: Record<string, unknown> })._def;
  const typeName = def.typeName as string | undefined;

  switch (typeName) {
    case "ZodString":
      return { type: "string" };
    case "ZodNumber":
      return { type: "number" };
    case "ZodBoolean":
      return { type: "boolean" };
    case "ZodLiteral":
      return { type: typeof def.value, const: def.value };
    case "ZodEnum":
      return { type: "string", enum: def.values as string[] };
    case "ZodArray":
      return { type: "array", items: convertNode(def.type as z.ZodType) };
    case "ZodObject": {
      const shape = (def.shape as () => Record<string, z.ZodType>)();
      const properties: Record<string, unknown> = {};
      const required: string[] = [];
      for (const [key, value] of Object.entries(shape)) {
        properties[key] = convertNode(value);
        if (!isOptional(value)) required.push(key);
      }
      const result: Record<string, unknown> = {
        type: "object",
        properties,
        additionalProperties: false
      };
      if (required.length > 0) result.required = required;
      return result;
    }
    case "ZodOptional":
      return convertNode(def.innerType as z.ZodType);
    case "ZodNullable": {
      const inner = convertNode(def.innerType as z.ZodType);
      return { anyOf: [inner, { type: "null" }] };
    }
    case "ZodUnion": {
      const options = (def.options as z.ZodType[]).map(convertNode);
      return { anyOf: options };
    }
    case "ZodLazy":
      return convertNode((def.getter as () => z.ZodType)());
    case "ZodEffects":
      return convertNode(def.schema as z.ZodType);
    case "ZodRecord":
      return {
        type: "object",
        additionalProperties: def.valueType
          ? convertNode(def.valueType as z.ZodType)
          : { }
      };
    case "ZodUnknown":
      return {};
    default:
      return {};
  }
}

function isOptional(schema: z.ZodType): boolean {
  const def = (schema as unknown as { _def: Record<string, unknown> })._def;
  return (def.typeName as string) === "ZodOptional";
}
