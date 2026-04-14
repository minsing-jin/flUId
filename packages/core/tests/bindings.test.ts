import test from "node:test";
import assert from "node:assert/strict";
import { resolveBindingsInObject } from "../src/bindings/index.js";

test("resolve binding syntax from state and dataSources", () => {
  const resolved = resolveBindingsInObject(
    {
      dateRange: { $bind: "state.filters.dateRange" },
      table: { $bind: "dataSources.salesTable.data" }
    },
    {
      state: { filters: { dateRange: "2026-Q1" } },
      dataSources: { salesTable: { data: [{ amount: 10 }] } }
    }
  );

  assert.equal(resolved.dateRange, "2026-Q1");
  assert.deepEqual(resolved.table, [{ amount: 10 }]);
});
