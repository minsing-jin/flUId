import test from "node:test";
import assert from "node:assert/strict";
import { llmJudge } from "../src/guardrails/llm-judge.js";
import type { Provider } from "../src/providers/types.js";
import type { UIPlan } from "@genui/core";

const plan: UIPlan = {
  version: "1.0",
  title: "x",
  intent: "analysis",
  layout: { shell: "workbench", regions: ["main"] },
  blocks: [],
  actions: [],
  dataSources: [],
  state: {},
  permissions: { requested: [], granted: [] }
};

function mockProvider(response: string): Provider {
  return {
    name: "mock",
    complete: async () => ({
      content: response,
      tokensPrompt: 50,
      tokensCompletion: 10,
      streamed: false,
      provider: "mock"
    })
  };
}

test("llmJudge returns safe=true on approving judge", async () => {
  const provider = mockProvider(JSON.stringify({ safe: true, reason: "looks fine" }));
  const result = await llmJudge(plan, provider);
  assert.equal(result.safe, true);
  assert.match(result.reason, /fine/);
  assert.equal(result.tokensUsed, 60);
});

test("llmJudge returns safe=false on rejecting judge", async () => {
  const provider = mockProvider(JSON.stringify({ safe: false, reason: "data exfil attempt" }));
  const result = await llmJudge(plan, provider);
  assert.equal(result.safe, false);
  assert.match(result.reason, /exfil/);
});

test("llmJudge defaults to unsafe when response is unparseable", async () => {
  const provider = mockProvider("I think this plan is fine actually");
  const result = await llmJudge(plan, provider);
  assert.equal(result.safe, false);
  assert.match(result.reason, /unparseable/);
});
