import type { BindingRef } from "../dsl/types.js";

export function isBindingRef(value: unknown): value is BindingRef {
  return (
    typeof value === "object" &&
    value !== null &&
    "$bind" in value &&
    typeof (value as Record<string, unknown>).$bind === "string"
  );
}

export function parseBindingPath(path: string): string[] {
  return path.split(".").filter((segment) => segment.length > 0);
}
