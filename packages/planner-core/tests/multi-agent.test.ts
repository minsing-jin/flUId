import test from "node:test";
import assert from "node:assert/strict";
import { seedSkillpacks } from "@genui/core";
import { selectSkills, routeIntent } from "../src/multi-agent/index.js";
import type { Provider } from "../src/providers/types.js";

function mockProvider(response: string): Provider {
  return {
    name: "mock",
    complete: async () => ({
      content: response,
      tokensPrompt: 30,
      tokensCompletion: 10,
      streamed: false,
      provider: "mock"
    })
  };
}

test("routeIntent parses intent/complexity/keywords from judge response", async () => {
  const provider = mockProvider(JSON.stringify({
    intent: "marketing",
    complexity: "complex",
    keywords: ["campaign", "social", "ctr"]
  }));
  const result = await routeIntent("Run Q2 campaign analysis", provider);
  assert.equal(result.intent, "marketing");
  assert.equal(result.complexity, "complex");
  assert.deepEqual(result.keywords, ["campaign", "social", "ctr"]);
});

test("routeIntent falls back to custom/moderate on parse failure", async () => {
  const provider = mockProvider("not json at all");
  const result = await routeIntent("hello", provider);
  assert.equal(result.intent, "custom");
  assert.equal(result.complexity, "moderate");
});

test("selectSkills picks category-matching skillpacks first", () => {
  const intent = { intent: "marketing", complexity: "moderate" as const, keywords: ["campaign"], tokensUsed: 0 };
  const result = selectSkills(intent, seedSkillpacks);
  assert.ok(result.selectedSkills.length > 0);
  assert.ok(result.selectedSkills.some((s) => s.id === "marketing-ops"));
});

test("selectSkills returns fallback when no category matches", () => {
  const intent = { intent: "nonexistent", complexity: "simple" as const, keywords: [], tokensUsed: 0 };
  const result = selectSkills(intent, seedSkillpacks);
  assert.equal(result.selectedSkills.length, 1);
  assert.match(result.reason, /defaulting/);
});

test("selectSkills caps results by complexity — simple=1, moderate=2, complex=4", () => {
  const simple = selectSkills({ intent: "research", complexity: "simple", keywords: ["data"], tokensUsed: 0 }, seedSkillpacks);
  assert.ok(simple.selectedSkills.length <= 1);

  const complex = selectSkills({ intent: "research", complexity: "complex", keywords: ["data", "sales", "map"], tokensUsed: 0 }, seedSkillpacks);
  assert.ok(complex.selectedSkills.length <= 4);
});
