import test from "node:test";
import assert from "node:assert/strict";
import { createDefaultComponentCatalog } from "../src/registry/default-component-catalog.js";

test("default component catalog exposes strict MeasuredText schema", () => {
  const measuredText = createDefaultComponentCatalog().find((component) => component.type === "MeasuredText");

  assert.ok(measuredText);

  const valid = measuredText.schema.safeParse({
    text: "Pretext-backed deterministic copy preview",
    variant: "body",
    measureWidth: 320,
    maxLines: 3,
    whiteSpace: "normal",
    showMetrics: true
  });

  assert.equal(valid.success, true);

  const invalid = measuredText.schema.safeParse({
    text: "ok",
    unexpected: true
  });

  assert.equal(invalid.success, false);
});
