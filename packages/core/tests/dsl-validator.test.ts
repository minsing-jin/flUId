import test from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { validateUIPlan } from "../src/dsl/validator.js";

const basePlan = {
  version: "1.0",
  title: "test",
  intent: "analysis",
  layout: { shell: "workbench", regions: ["main"] },
  blocks: [{ id: "b1", type: "SummaryBlock", region: "main", props: { bullets: ["ok"] } }],
  actions: [{ id: "a1", label: "run", toolName: "data.profile", input: {} }],
  dataSources: [],
  state: {},
  permissions: { requested: ["network"], granted: ["network"] }
} as const;

test("validator rejects unknown component", () => {
  const result = validateUIPlan(
    {
      ...basePlan,
      blocks: [{ ...basePlan.blocks[0], type: "UnknownComponent" }]
    },
    {
      componentSchemas: {
        SummaryBlock: z.object({ bullets: z.array(z.string()) }).strict()
      },
      toolAllowlist: new Set(["data.profile"]),
      permissionAllowlist: new Set(["network"])
    }
  );

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.errors.some((error) => error.code === "UNKNOWN_COMPONENT"));
  }
});

test("validator rejects unknown tool and unsafe html", () => {
  const result = validateUIPlan(
    {
      ...basePlan,
      actions: [{ ...basePlan.actions[0], toolName: "bad.tool", input: { x: "<script>alert(1)</script>" } }]
    },
    {
      componentSchemas: {
        SummaryBlock: z.object({ bullets: z.array(z.string()) }).strict()
      },
      toolAllowlist: new Set(["data.profile"]),
      permissionAllowlist: new Set(["network"])
    }
  );

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.errors.some((error) => error.code === "UNKNOWN_TOOL"));
    assert.ok(result.errors.some((error) => error.code === "UNSAFE_HTML"));
  }
});
