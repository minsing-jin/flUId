import test from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { ComponentRegistry, ToolRegistry } from "../src/registry/index.js";
import { WorkbenchRuntime } from "../src/runtime/index.js";

function createPlan() {
  return {
    version: "1.0",
    title: "Permission test",
    intent: "dev",
    layout: { shell: "workbench", regions: ["main"] },
    blocks: [{ id: "b1", type: "SummaryBlock", region: "main", props: { bullets: ["x"] } }],
    actions: [{ id: "a1", label: "run", toolName: "code.run_js", input: { code: "1+1" } }],
    dataSources: [],
    state: {},
    permissions: { requested: ["code_exec"], granted: [] }
  };
}

test("runtime blocks tool call when permission not granted", async () => {
  const components = new ComponentRegistry();
  const tools = new ToolRegistry();

  components.registerComponent({
    type: "SummaryBlock",
    schema: z.object({ bullets: z.array(z.string()) }).strict(),
    meta: { displayName: "Summary", category: "test", description: "", examples: [] }
  });

  tools.registerTool({
    name: "code.run_js",
    inputSchema: z.object({ code: z.string() }).strict(),
    outputSchema: z.object({ ok: z.boolean() }).strict(),
    permissions: ["code_exec"],
    handler: async () => ({ ok: true })
  });

  const runtime = new WorkbenchRuntime(components, tools, {
    permissionAllowlist: new Set(["code_exec"])
  });

  runtime.loadPlan(createPlan());

  await assert.rejects(runtime.dispatchAction("a1"), /Permission gate blocked tool/);
});
