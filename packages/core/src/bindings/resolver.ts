import { isBindingRef, parseBindingPath } from "./parser.js";

export interface BindingContext {
  state: Record<string, unknown>;
  dataSources: Record<string, unknown>;
}

function resolvePath(source: Record<string, unknown>, path: string): unknown {
  const segments = parseBindingPath(path);
  let cursor: unknown = source;

  for (const segment of segments) {
    if (!cursor || typeof cursor !== "object" || !(segment in cursor)) {
      return undefined;
    }
    cursor = (cursor as Record<string, unknown>)[segment];
  }

  return cursor;
}

export function resolveBinding(path: string, context: BindingContext): unknown {
  if (path.startsWith("state.")) {
    return resolvePath(context.state, path.slice("state.".length));
  }

  if (path.startsWith("dataSources.")) {
    return resolvePath(context.dataSources, path.slice("dataSources.".length));
  }

  return undefined;
}

export function resolveBindingsInObject<T>(input: T, context: BindingContext): T {
  if (isBindingRef(input)) {
    return resolveBinding(input.$bind, context) as T;
  }

  if (Array.isArray(input)) {
    return input.map((item) => resolveBindingsInObject(item, context)) as T;
  }

  if (input && typeof input === "object") {
    const mappedEntries = Object.entries(input as Record<string, unknown>).map(([key, value]) => [
      key,
      resolveBindingsInObject(value, context)
    ]);
    return Object.fromEntries(mappedEntries) as T;
  }

  return input;
}
