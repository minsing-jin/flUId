import type { DataConnector, ConnectorConfig, ConnectorResult } from "./types.js";

export class RestConnector implements DataConnector {
  readonly type = "rest";

  async fetch(config: ConnectorConfig): Promise<ConnectorResult> {
    const start = Date.now();
    try {
      const response = await globalThis.fetch(config.source, {
        method: config.method ?? "GET",
        headers: config.headers ?? {}
      });
      if (!response.ok) {
        return {
          data: null,
          fetchedAt: new Date().toISOString(),
          source: config.source,
          durationMs: Date.now() - start,
          error: `HTTP ${response.status}: ${response.statusText}`
        };
      }
      const contentType = response.headers.get("content-type") ?? "";
      const data = contentType.includes("json")
        ? await response.json()
        : await response.text();

      return {
        data: config.transform ? applyTransform(data, config.transform) : data,
        fetchedAt: new Date().toISOString(),
        source: config.source,
        durationMs: Date.now() - start
      };
    } catch (error) {
      return {
        data: null,
        fetchedAt: new Date().toISOString(),
        source: config.source,
        durationMs: Date.now() - start,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  subscribe(config: ConnectorConfig, onData: (result: ConnectorResult) => void): () => void {
    const interval = config.refreshMs ?? 30000;
    const handle = setInterval(() => {
      void this.fetch(config).then(onData);
    }, interval);
    // Immediate first fetch
    void this.fetch(config).then(onData);
    return () => clearInterval(handle);
  }
}

function applyTransform(data: unknown, path: string): unknown {
  if (!path || !data || typeof data !== "object") return data;
  const segments = path.split(".");
  let current: unknown = data;
  for (const seg of segments) {
    if (current && typeof current === "object" && seg in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[seg];
    } else {
      return data;
    }
  }
  return current;
}
