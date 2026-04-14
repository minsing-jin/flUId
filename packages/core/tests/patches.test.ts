import test from "node:test";
import assert from "node:assert/strict";
import { applyPlanPatch, mergePlanPatches } from "../src/patches/index.js";
import type { PlanPatch } from "../src/dsl/types.js";

test("apply and merge patch operations", () => {
  const doc = {
    blocks: [{ id: "b1", text: "old" }],
    state: { k: 1 }
  };

  const patch1: PlanPatch = {
    ops: [{ op: "replace", path: "/blocks/0/text", value: "new" }]
  };
  const patch2: PlanPatch = {
    ops: [{ op: "add", path: "/state/newKey", value: 42 }]
  };

  const merged = mergePlanPatches(patch1, patch2);
  const next = applyPlanPatch(doc, merged);

  assert.equal(next.blocks[0]?.text, "new");
  assert.equal((next.state as Record<string, unknown>).newKey, 42);
});
