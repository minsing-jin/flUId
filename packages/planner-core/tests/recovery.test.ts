import test from "node:test";
import assert from "node:assert/strict";
import { retryWithBackoff, createRecoveryLedger } from "../src/recovery.js";

test("retryWithBackoff succeeds on first attempt", async () => {
  const ledger = createRecoveryLedger();
  const result = await retryWithBackoff(async () => 42, {
    sleep: async () => undefined,
    onEvent: (e) => ledger.push(e)
  });
  assert.equal(result, 42);
  const events = ledger.drain();
  assert.equal(events.length, 1);
  assert.equal(events[0]?.outcome, "success");
});

test("retryWithBackoff retries up to max then throws", async () => {
  const ledger = createRecoveryLedger();
  let calls = 0;
  await assert.rejects(
    () =>
      retryWithBackoff(
        async () => {
          calls += 1;
          throw new Error("nope");
        },
        {
          maxAttempts: 3,
          baseDelayMs: 1,
          sleep: async () => undefined,
          onEvent: (e) => ledger.push(e)
        }
      ),
    /nope/
  );
  assert.equal(calls, 3);
  const events = ledger.drain();
  assert.equal(events.length, 3);
  assert.equal(events[events.length - 1]?.outcome, "give_up");
});

test("retryWithBackoff succeeds after a transient failure", async () => {
  let calls = 0;
  const result = await retryWithBackoff(
    async () => {
      calls += 1;
      if (calls < 2) throw new Error("flaky");
      return "ok";
    },
    { baseDelayMs: 1, sleep: async () => undefined }
  );
  assert.equal(result, "ok");
  assert.equal(calls, 2);
});
