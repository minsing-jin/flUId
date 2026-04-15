import type { DataConnector, ConnectorConfig, ConnectorResult } from "./types.js";

export class CsvConnector implements DataConnector {
  readonly type = "csv";

  async fetch(config: ConnectorConfig): Promise<ConnectorResult> {
    const start = Date.now();
    try {
      const raw = config.source;
      const parsed = parseCsv(raw);
      return {
        data: parsed,
        fetchedAt: new Date().toISOString(),
        source: "(csv inline)",
        durationMs: Date.now() - start
      };
    } catch (error) {
      return {
        data: null,
        fetchedAt: new Date().toISOString(),
        source: "(csv inline)",
        durationMs: Date.now() - start,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}

function parseCsv(text: string): { columns: string[]; rows: Record<string, string>[] } {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  if (lines.length === 0) return { columns: [], rows: [] };
  const header = lines[0] ?? "";
  const columns = header.split(",").map((c) => c.trim());
  const rows = lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim());
    const row: Record<string, string> = {};
    columns.forEach((col, i) => { row[col] = values[i] ?? ""; });
    return row;
  });
  return { columns, rows };
}
