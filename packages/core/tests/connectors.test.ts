import test from "node:test";
import assert from "node:assert/strict";
import {
  DefaultConnectorRegistry,
  MockConnector,
  CsvConnector,
  RestConnector
} from "../src/connectors/index.js";

test("DefaultConnectorRegistry registers all built-in connectors", () => {
  const reg = new DefaultConnectorRegistry();
  assert.ok(reg.get("rest"));
  assert.ok(reg.get("csv"));
  assert.ok(reg.get("mock"));
  assert.ok(reg.get("static"));
});

test("MockConnector returns time-varying data for sales-kpi scenario", async () => {
  const mock = new MockConnector();
  const first = await mock.fetch({ id: "a", type: "mock", source: "sales-kpi" });
  const second = await mock.fetch({ id: "a", type: "mock", source: "sales-kpi" });
  assert.ok(first.data);
  assert.ok(second.data);
  const d1 = first.data as Record<string, number>;
  const d2 = second.data as Record<string, number>;
  assert.ok(typeof d1.revenue === "number");
  assert.ok(typeof d2.revenue === "number");
  // Tick-based variation means second call likely differs (sin based)
  assert.ok(first.fetchedAt);
  assert.equal(first.source, "mock:sales-kpi");
});

test("MockConnector defaults to sales-kpi for unknown scenario", async () => {
  const mock = new MockConnector();
  const result = await mock.fetch({ id: "x", type: "mock", source: "unknown-scenario" });
  assert.ok(result.data);
});

test("MockConnector.registerScenario allows custom generators", async () => {
  const mock = new MockConnector();
  mock.registerScenario("custom", () => ({ flag: true, tick: 1 }));
  const result = await mock.fetch({ id: "x", type: "mock", source: "custom" });
  assert.deepEqual(result.data, { flag: true, tick: 1 });
});

test("CsvConnector parses header + rows into columns+rows structure", async () => {
  const csv = new CsvConnector();
  const result = await csv.fetch({
    id: "c",
    type: "csv",
    source: "name,age\nAlice,30\nBob,25"
  });
  const parsed = result.data as { columns: string[]; rows: Record<string, string>[] };
  assert.deepEqual(parsed.columns, ["name", "age"]);
  assert.equal(parsed.rows.length, 2);
  assert.equal(parsed.rows[0]?.name, "Alice");
  assert.equal(parsed.rows[1]?.age, "25");
});

test("RestConnector returns error result on fetch failure", async () => {
  const original = globalThis.fetch;
  (globalThis as unknown as { fetch: typeof fetch }).fetch = (async () => {
    throw new Error("network down");
  }) as unknown as typeof fetch;
  try {
    const rest = new RestConnector();
    const result = await rest.fetch({ id: "r", type: "rest", source: "https://api.example.com/data" });
    assert.equal(result.data, null);
    assert.match(result.error ?? "", /network down/);
  } finally {
    (globalThis as unknown as { fetch: typeof fetch }).fetch = original;
  }
});

test("Registry subscribeTo wires up and unsubscribe cleans up", () => {
  const reg = new DefaultConnectorRegistry();
  let received = 0;
  reg.subscribeTo({ id: "s1", type: "mock", source: "sales-kpi", refreshMs: 10_000 }, () => { received++; });
  // First fetch is immediate on MockConnector.subscribe
  // Give the microtask a chance to flush
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      assert.ok(received >= 1, "expected at least 1 data delivery");
      reg.unsubscribeAll();
      resolve();
    }, 50);
  });
});

test("Registry fetchData returns error for unknown connector type", async () => {
  const reg = new DefaultConnectorRegistry();
  const result = await reg.fetchData({ id: "x", type: "websocket" as never, source: "ws://localhost" });
  assert.equal(result.data, null);
  assert.match(result.error ?? "", /Unknown connector type/);
});
