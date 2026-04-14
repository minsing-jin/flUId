import type { PlanPatch, PlanPatchOp } from "../dsl/types.js";

function parseJsonPointer(path: string): string[] {
  if (!path.startsWith("/")) {
    throw new Error(`Invalid patch path: ${path}`);
  }

  return path
    .split("/")
    .slice(1)
    .map((segment) => segment.replace(/~1/g, "/").replace(/~0/g, "~"));
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function getParentContainer(root: unknown, segments: string[]): { container: Record<string, unknown> | unknown[]; key: string } {
  if (segments.length === 0) {
    throw new Error("Patch path cannot target document root directly");
  }

  let cursor = root as Record<string, unknown> | unknown[];
  for (const segment of segments.slice(0, -1)) {
    if (Array.isArray(cursor)) {
      const index = Number(segment);
      cursor = cursor[index] as Record<string, unknown> | unknown[];
      continue;
    }
    cursor = cursor[segment] as Record<string, unknown> | unknown[];
  }

  return { container: cursor, key: segments[segments.length - 1] ?? "" };
}

function applySingleOp(document: unknown, op: PlanPatchOp): unknown {
  const nextDoc = clone(document);
  const segments = parseJsonPointer(op.path);
  const { container, key } = getParentContainer(nextDoc, segments);

  if (op.op === "add" || op.op === "replace") {
    if (Array.isArray(container)) {
      const index = key === "-" ? container.length : Number(key);
      if (op.op === "add") {
        container.splice(index, 0, clone(op.value));
      } else {
        container[index] = clone(op.value);
      }
    } else {
      container[key] = clone(op.value);
    }
    return nextDoc;
  }

  if (op.op === "remove") {
    if (Array.isArray(container)) {
      container.splice(Number(key), 1);
    } else {
      delete container[key];
    }
    return nextDoc;
  }

  if (op.op === "move") {
    if (typeof op.value !== "string") {
      throw new Error("move op requires string value as destination path");
    }

    const sourceSegments = segments;
    const sourceParent = getParentContainer(nextDoc, sourceSegments);
    let movingValue: unknown;

    if (Array.isArray(sourceParent.container)) {
      movingValue = sourceParent.container.splice(Number(sourceParent.key), 1)[0];
    } else {
      movingValue = sourceParent.container[sourceParent.key];
      delete sourceParent.container[sourceParent.key];
    }

    const destSegments = parseJsonPointer(op.value);
    const destination = getParentContainer(nextDoc, destSegments);
    if (Array.isArray(destination.container)) {
      destination.container.splice(Number(destination.key), 0, movingValue);
    } else {
      destination.container[destination.key] = movingValue;
    }

    return nextDoc;
  }

  return nextDoc;
}

export function applyPlanPatch<T>(document: T, patch: PlanPatch): T {
  return patch.ops.reduce<unknown>((acc, op) => applySingleOp(acc, op), document) as T;
}
