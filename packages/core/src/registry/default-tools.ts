import { Script, createContext } from "node:vm";
import { z } from "zod";
import { ToolRegistry } from "./tool-registry.js";

const recordArraySchema = z.array(z.record(z.unknown()));

function parseCsv(csvText: string, delimiter: string): { columns: string[]; rows: Array<Record<string, unknown>> } {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return { columns: [], rows: [] };
  }

  const headerLine = lines[0] ?? "";
  const columns = headerLine.split(delimiter).map((column) => column.trim());
  const rows = lines.slice(1).map((line) => {
    const values = line.split(delimiter).map((value) => value.trim());
    const entry = Object.fromEntries(columns.map((column, index) => [column, values[index] ?? ""]));
    return entry;
  });

  return { columns, rows };
}

function detectOutlierColumns(rows: Array<Record<string, unknown>>): string[] {
  if (rows.length === 0) {
    return [];
  }

  const numericColumns = new Map<string, number[]>();
  for (const row of rows) {
    for (const [key, value] of Object.entries(row)) {
      const num = typeof value === "number" ? value : Number(value);
      if (!Number.isFinite(num)) {
        continue;
      }

      if (!numericColumns.has(key)) {
        numericColumns.set(key, []);
      }
      numericColumns.get(key)?.push(num);
    }
  }

  const outliers: string[] = [];
  for (const [column, values] of numericColumns.entries()) {
    if (values.length < 4) {
      continue;
    }

    const sorted = [...values].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)] ?? 0;
    const q3 = sorted[Math.floor(sorted.length * 0.75)] ?? 0;
    const iqr = q3 - q1;
    const upper = q3 + 1.5 * iqr;
    const lower = q1 - 1.5 * iqr;
    const hasOutlier = sorted.some((value) => value > upper || value < lower);
    if (hasOutlier) {
      outliers.push(column);
    }
  }

  return outliers;
}

export function registerDefaultTools(toolRegistry: ToolRegistry): void {
  toolRegistry.registerTool({
    name: "data.load_csv",
    inputSchema: z
      .object({
        csvText: z.string().min(1),
        delimiter: z.string().default(",")
      })
      .strict(),
    outputSchema: z
      .object({
        columns: z.array(z.string()),
        rows: recordArraySchema,
        rowCount: z.number().int().nonnegative()
      })
      .strict(),
    permissions: ["files"],
    handler: async (input) => {
      const parsed = parseCsv(input.csvText, input.delimiter ?? ",");
      return {
        columns: parsed.columns,
        rows: parsed.rows,
        rowCount: parsed.rows.length
      };
    }
  });

  toolRegistry.registerTool({
    name: "data.profile",
    inputSchema: z
      .object({
        rows: recordArraySchema
      })
      .strict(),
    outputSchema: z
      .object({
        rowCount: z.number().int().nonnegative(),
        columnCount: z.number().int().nonnegative(),
        missingCells: z.number().int().nonnegative(),
        duplicateRows: z.number().int().nonnegative(),
        outlierColumns: z.array(z.string())
      })
      .strict(),
    permissions: [],
    handler: async (input) => {
      const rows = input.rows;
      const keys = new Set(rows.flatMap((row) => Object.keys(row)));
      let missingCells = 0;
      for (const row of rows) {
        for (const key of keys) {
          const value = row[key];
          if (value === "" || value === null || value === undefined) {
            missingCells += 1;
          }
        }
      }

      const serialized = rows.map((row) => JSON.stringify(row));
      const duplicateRows = serialized.length - new Set(serialized).size;

      return {
        rowCount: rows.length,
        columnCount: keys.size,
        missingCells,
        duplicateRows,
        outlierColumns: detectOutlierColumns(rows)
      };
    }
  });

  toolRegistry.registerTool({
    name: "data.transform",
    inputSchema: z
      .object({
        rows: recordArraySchema,
        select: z.array(z.string()).optional(),
        filter: z
          .object({
            key: z.string(),
            equals: z.unknown()
          })
          .strict()
          .optional(),
        groupBy: z.string().optional()
      })
      .strict(),
    outputSchema: z
      .object({
        rows: recordArraySchema
      })
      .strict(),
    permissions: [],
    handler: async (input) => {
      let rows = [...input.rows];

      if (input.filter) {
        const filter = input.filter;
        rows = rows.filter((row) => row[filter.key] === filter.equals);
      }

      if (input.select && input.select.length > 0) {
        rows = rows.map((row) => Object.fromEntries(input.select?.map((key) => [key, row[key]]) ?? []));
      }

      if (input.groupBy) {
        const grouped = new Map<string, number>();
        for (const row of rows) {
          const key = String(row[input.groupBy] ?? "unknown");
          grouped.set(key, (grouped.get(key) ?? 0) + 1);
        }

        rows = [...grouped.entries()].map(([key, count]) => ({ [input.groupBy as string]: key, count }));
      }

      return { rows };
    }
  });

  toolRegistry.registerTool({
    name: "viz.prepare_chart_data",
    inputSchema: z
      .object({
        rows: recordArraySchema,
        xKey: z.string(),
        yKey: z.string()
      })
      .strict(),
    outputSchema: z
      .object({
        points: z.array(
          z
            .object({
              x: z.union([z.string(), z.number()]),
              y: z.number()
            })
            .strict()
        )
      })
      .strict(),
    permissions: [],
    handler: async (input) => {
      const points = input.rows
        .map((row) => {
          const y = Number(row[input.yKey]);
          if (!Number.isFinite(y)) {
            return null;
          }

          const xValue = row[input.xKey];
          const x = typeof xValue === "number" ? xValue : String(xValue ?? "");
          return { x, y };
        })
        .filter((value): value is { x: string | number; y: number } => value !== null);

      return { points };
    }
  });

  toolRegistry.registerTool({
    name: "marketing.build_utm",
    inputSchema: z
      .object({
        baseUrl: z.string().url(),
        source: z.string(),
        medium: z.string(),
        campaign: z.string(),
        term: z.string().optional(),
        content: z.string().optional()
      })
      .strict(),
    outputSchema: z
      .object({
        url: z.string().url()
      })
      .strict(),
    permissions: [],
    handler: async (input) => {
      const url = new URL(input.baseUrl);
      url.searchParams.set("utm_source", input.source);
      url.searchParams.set("utm_medium", input.medium);
      url.searchParams.set("utm_campaign", input.campaign);
      if (input.term) {
        url.searchParams.set("utm_term", input.term);
      }
      if (input.content) {
        url.searchParams.set("utm_content", input.content);
      }

      return { url: url.toString() };
    }
  });

  toolRegistry.registerTool({
    name: "code.run_js",
    inputSchema: z
      .object({
        code: z.string().min(1),
        timeoutMs: z.number().int().positive().max(2000).default(500)
      })
      .strict(),
    outputSchema: z
      .object({
        result: z.unknown().optional(),
        logs: z.array(z.string()),
        error: z.string().optional()
      })
      .strict(),
    permissions: ["code_exec"],
    handler: async (input) => {
      const logs: string[] = [];
      const sandbox = {
        console: {
          log: (...args: unknown[]) => {
            logs.push(args.map((arg) => String(arg)).join(" "));
          }
        }
      };

      const context = createContext(sandbox);
      try {
        const script = new Script(`"use strict";\n${input.code}`);
        const result = script.runInContext(context, { timeout: input.timeoutMs });
        return { result, logs };
      } catch (error) {
        return {
          logs,
          error: error instanceof Error ? error.message : "Unknown error"
        };
      }
    }
  });

  toolRegistry.registerTool({
    name: "tool.generate_stub",
    inputSchema: z
      .object({
        toolName: z.string().min(1),
        description: z.string().min(1),
        permissions: z.array(z.string()).default([])
      })
      .strict(),
    outputSchema: z
      .object({
        fileName: z.string(),
        code: z.string()
      })
      .strict(),
    permissions: [],
    handler: async (input) => {
      const fileName = `${input.toolName.replace(/\./g, "-")}.ts`;
      const code = [
        "import { z } from \"zod\";",
        "",
        `// ${input.description}`,
        `export const ${input.toolName.replace(/[^a-zA-Z0-9]/g, "_")} = {`,
        `  name: \"${input.toolName}\",`,
        "  inputSchema: z.object({}).strict(),",
        "  outputSchema: z.object({}).strict(),",
        `  permissions: ${JSON.stringify(input.permissions)},`,
        "  handler: async (input: Record<string, unknown>) => ({})",
        "};"
      ].join("\n");

      return {
        fileName,
        code
      };
    }
  });
}
