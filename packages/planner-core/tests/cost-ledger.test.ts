import test from "node:test";
import assert from "node:assert/strict";
import { CostLedger } from "../src/cost-ledger.js";

test("CostLedger selectModel tiers by triggerMode", () => {
  const ledger = new CostLedger();
  assert.equal(ledger.selectModel("prompt"), "gpt-4o");
  assert.equal(ledger.selectModel("interaction"), "gpt-4o-mini");
  assert.equal(ledger.selectModel("feedPoll"), "gpt-4o-mini");
});

test("CostLedger fires warning at 80% and pauses polling at 100%", () => {
  const ledger = new CostLedger({ dailyTokenBudget: 1000, warnThresholdRatio: 0.8 });
  const firstSnap = ledger.record({
    model: "gpt-4o-mini",
    triggerMode: "feedPoll",
    tokensPrompt: 400,
    tokensCompletion: 200
  });
  assert.equal(firstSnap.warningFired, false);
  assert.equal(firstSnap.pollingPaused, false);

  const secondSnap = ledger.record({
    model: "gpt-4o-mini",
    triggerMode: "feedPoll",
    tokensPrompt: 200,
    tokensCompletion: 50
  });
  assert.equal(secondSnap.warningFired, true);
  assert.equal(secondSnap.pollingPaused, false);

  const thirdSnap = ledger.record({
    model: "gpt-4o-mini",
    triggerMode: "feedPoll",
    tokensPrompt: 100,
    tokensCompletion: 100
  });
  assert.equal(thirdSnap.warningFired, true);
  assert.equal(thirdSnap.pollingPaused, true);
  assert.equal(ledger.isPollingPaused(), true);
});

test("CostLedger accumulates cost based on model prices", () => {
  const ledger = new CostLedger({
    tokenPriceUsdPer1M: { "gpt-4o": 10, "gpt-4o-mini": 0.6 }
  });
  const snap = ledger.record({
    model: "gpt-4o",
    triggerMode: "prompt",
    tokensPrompt: 500_000,
    tokensCompletion: 500_000
  });
  assert.equal(snap.costUsd, 10);
});

test("CostLedger resetDaily clears state", () => {
  const ledger = new CostLedger({ dailyTokenBudget: 1000 });
  ledger.record({ model: "gpt-4o", triggerMode: "prompt", tokensPrompt: 900, tokensCompletion: 200 });
  assert.equal(ledger.isPollingPaused(), true);
  ledger.resetDaily();
  assert.equal(ledger.isPollingPaused(), false);
  assert.equal(ledger.snapshot().used, 0);
});
