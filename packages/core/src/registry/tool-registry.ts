import type { ZodType } from "zod";

export interface ToolContext {
  grantedPermissions: Set<string>;
  traceId?: string;
}

export interface ToolDefinition<TInput extends Record<string, unknown>, TOutput extends Record<string, unknown>> {
  name: string;
  inputSchema: ZodType<TInput>;
  outputSchema: ZodType<TOutput>;
  permissions: string[];
  handler: (input: TInput, context: ToolContext) => Promise<TOutput>;
}

export class ToolRegistry {
  private readonly tools = new Map<string, ToolDefinition<Record<string, unknown>, Record<string, unknown>>>();

  registerTool<TInput extends Record<string, unknown>, TOutput extends Record<string, unknown>>(
    tool: ToolDefinition<TInput, TOutput>
  ): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool already registered: ${tool.name}`);
    }
    this.tools.set(tool.name, tool as ToolDefinition<Record<string, unknown>, Record<string, unknown>>);
  }

  getTool(name: string): ToolDefinition<Record<string, unknown>, Record<string, unknown>> | undefined {
    return this.tools.get(name);
  }

  listTools(): ToolDefinition<Record<string, unknown>, Record<string, unknown>>[] {
    return [...this.tools.values()];
  }

  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  getToolAllowlist(): Set<string> {
    return new Set(this.tools.keys());
  }
}
