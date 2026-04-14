import test from "node:test";
import assert from "node:assert/strict";
import { themeSchema, uiPlanSchema } from "../src/dsl/schemas.js";

test("themeSchema accepts valid theme with hex accent", () => {
  const result = themeSchema.safeParse({
    mood: "serious",
    density: "compact",
    accent: "#3b82f6"
  });
  assert.equal(result.success, true);
});

test("themeSchema accepts valid theme with preset accent", () => {
  const result = themeSchema.safeParse({
    mood: "playful",
    density: "spacious",
    accent: "rose",
    rationale: "Warm weekend feel"
  });
  assert.equal(result.success, true);
});

test("themeSchema rejects unknown mood", () => {
  const result = themeSchema.safeParse({
    mood: "aggressive",
    density: "compact",
    accent: "indigo"
  });
  assert.equal(result.success, false);
});

test("themeSchema rejects invalid accent (not hex, not preset)", () => {
  const result = themeSchema.safeParse({
    mood: "serious",
    density: "compact",
    accent: "lime-500"
  });
  assert.equal(result.success, false);
});

test("themeSchema rejects extra keys (strict)", () => {
  const result = themeSchema.safeParse({
    mood: "minimal",
    density: "comfortable",
    accent: "slate",
    extra: "should fail"
  });
  assert.equal(result.success, false);
});

test("uiPlanSchema accepts plan without theme (backward compat)", () => {
  const plan = {
    version: "1.0",
    title: "legacy",
    intent: "analysis",
    layout: { shell: "workbench", regions: ["main"] },
    blocks: [],
    actions: [],
    dataSources: [],
    state: {},
    permissions: { requested: [], granted: [] }
  };
  const result = uiPlanSchema.safeParse(plan);
  assert.equal(result.success, true);
});

test("uiPlanSchema accepts plan with theme", () => {
  const plan = {
    version: "1.0",
    title: "themed",
    intent: "analysis",
    layout: { shell: "workbench", regions: ["main"] },
    blocks: [],
    actions: [],
    dataSources: [],
    state: {},
    permissions: { requested: [], granted: [] },
    theme: { mood: "dark", density: "compact", accent: "violet" }
  };
  const result = uiPlanSchema.safeParse(plan);
  assert.equal(result.success, true);
});
