import test from "node:test";
import assert from "node:assert/strict";
import { ResponseCache, buildCacheKey } from "../src/response-cache.js";
import type { PlannerResponse } from "../src/types.js";

const mockResponse: PlannerResponse = {
  selectedSkills: ["data-research"],
  uiPlan: { version: "1.0", title: "cached", intent: "analysis", layout: { shell: "workbench", regions: ["main"] }, blocks: [], actions: [], dataSources: [], state: {}, permissions: { requested: [], granted: [] } } as never,
  responseMode: "full",
  patches: null
};

test("buildCacheKey produces consistent keys", () => {
  const k1 = buildCacheKey("hello", null, null);
  const k2 = buildCacheKey("hello", null, null);
  assert.equal(k1, k2);
  const k3 = buildCacheKey("world", null, null);
  assert.notEqual(k1, k3);
});

test("cache get returns null on miss", () => {
  const cache = new ResponseCache();
  assert.equal(cache.get("unknown"), null);
  assert.equal(cache.stats().misses, 1);
});

test("cache set and get returns cached response", () => {
  const cache = new ResponseCache();
  cache.set("k1", mockResponse);
  const result = cache.get("k1");
  assert.deepEqual(result, mockResponse);
  assert.equal(cache.stats().hits, 1);
});

test("cache evicts after TTL", () => {
  let time = 1000;
  const cache = new ResponseCache({ ttlMs: 500, now: () => time });
  cache.set("k1", mockResponse);
  assert.ok(cache.get("k1"));
  time = 1600;
  assert.equal(cache.get("k1"), null);
});

test("cache LRU evicts oldest when full", () => {
  const cache = new ResponseCache({ maxEntries: 2 });
  cache.set("a", mockResponse);
  cache.set("b", mockResponse);
  cache.set("c", mockResponse);
  assert.equal(cache.get("a"), null);
  assert.ok(cache.get("b"));
  assert.ok(cache.get("c"));
  assert.equal(cache.stats().size, 2);
});

test("cache clear resets everything", () => {
  const cache = new ResponseCache();
  cache.set("x", mockResponse);
  cache.get("x");
  cache.clear();
  assert.equal(cache.stats().size, 0);
  assert.equal(cache.stats().hits, 0);
});
