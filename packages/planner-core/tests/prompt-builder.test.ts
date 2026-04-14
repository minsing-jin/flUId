import test from "node:test";
import assert from "node:assert/strict";
import { seedSkillpacks } from "@genui/core";
import { buildSystemPrompt, buildUserPrompt, inferLocale, buildSelfHealMessages } from "../src/prompt-builder.js";

test("buildSystemPrompt mentions every loaded skillpack", () => {
  const prompt = buildSystemPrompt(seedSkillpacks, ["SummaryBlock", "ChartBlock"], "en");
  for (const pack of seedSkillpacks) {
    assert.ok(prompt.includes(pack.id), `system prompt missing skill ${pack.id}`);
  }
  assert.match(prompt, /Allowlisted Widget Types/);
});

test("buildSystemPrompt Korean variant includes refusal rules", () => {
  const prompt = buildSystemPrompt(seedSkillpacks, ["SummaryBlock"], "ko");
  assert.match(prompt, /거부/);
  assert.match(prompt, /UIPlan/);
});

test("buildUserPrompt includes triggerMode and user input", () => {
  const prompt = buildUserPrompt({
    prompt: "매출 대시보드",
    triggerMode: "prompt",
    context: { grantedPermissions: ["network"] },
    skillpacks: seedSkillpacks,
    allowlistedComponents: []
  });
  assert.match(prompt, /Trigger Mode/);
  assert.match(prompt, /매출 대시보드/);
  assert.match(prompt, /network/);
});

test("inferLocale detects Hangul as ko", () => {
  assert.equal(inferLocale("매출 대시보드", "auto"), "ko");
  assert.equal(inferLocale("sales dashboard", "auto"), "en");
  assert.equal(inferLocale("sales dashboard", "ko"), "ko");
});

test("buildSelfHealMessages appends error context", () => {
  const previous = [{ role: "system" as const, content: "x" }];
  const messages = buildSelfHealMessages(previous, "{ bad json", "Unexpected token");
  assert.equal(messages.length, 3);
  assert.equal(messages[1]?.role, "assistant");
  assert.match(messages[2]?.content ?? "", /Unexpected token/);
});
