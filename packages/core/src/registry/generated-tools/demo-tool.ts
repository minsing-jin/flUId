import { z } from "zod";

export const demo_tool = {
  name: "demo.tool",
  inputSchema: z.object({}).strict(),
  outputSchema: z.object({}).strict(),
  permissions: [],
  handler: async (_input: Record<string, unknown>) => ({})
};
