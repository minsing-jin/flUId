import test from "node:test";
import assert from "node:assert/strict";
import { buildConnectSrc, buildSandboxCsp, normalizeDomain } from "../src/skills/csp.js";
import type { SkillManifest } from "../src/skills/types.js";

const geo: SkillManifest = {
  id: "geo",
  name: "Geo",
  version: "0.1.0",
  description: "",
  author: "test",
  categories: ["geo"],
  permissionsRequested: [],
  components: [],
  tools: [],
  suggestedPrompts: [],
  allowedDomains: ["api.mapbox.com", "nominatim.openstreetmap.org"]
};

const marketing: SkillManifest = {
  id: "marketing",
  name: "Marketing",
  version: "0.1.0",
  description: "",
  author: "test",
  categories: ["marketing"],
  permissionsRequested: [],
  components: [],
  tools: [],
  suggestedPrompts: [],
  allowedDomains: ["graph.facebook.com"]
};

test("normalizeDomain converts bare domains to https URLs", () => {
  assert.equal(normalizeDomain("api.mapbox.com"), "https://api.mapbox.com");
});

test("normalizeDomain preserves 'self'", () => {
  assert.equal(normalizeDomain("'self'"), "'self'");
  assert.equal(normalizeDomain("self"), "'self'");
});

test("normalizeDomain rejects malformed domains", () => {
  assert.throws(() => normalizeDomain("not a domain"));
});

test("buildConnectSrc includes self by default and merges skill domains", () => {
  const result = buildConnectSrc([geo, marketing]);
  assert.match(result, /'self'/);
  assert.match(result, /https:\/\/api\.mapbox\.com/);
  assert.match(result, /https:\/\/nominatim\.openstreetmap\.org/);
  assert.match(result, /https:\/\/graph\.facebook\.com/);
});

test("buildConnectSrc omits self when includeSelf=false", () => {
  const result = buildConnectSrc([geo], { includeSelf: false });
  assert.doesNotMatch(result, /'self'/);
});

test("buildConnectSrc rejects wildcard entries", () => {
  const bad: SkillManifest = { ...geo, allowedDomains: ["*.mapbox.com"] };
  assert.throws(() => buildConnectSrc([bad]));
});

test("buildConnectSrc returns 'none' for empty without self", () => {
  assert.equal(buildConnectSrc([], { includeSelf: false }), "'none'");
});

test("buildSandboxCsp emits a complete policy string", () => {
  const policy = buildSandboxCsp([geo]);
  assert.match(policy, /default-src 'none'/);
  assert.match(policy, /connect-src/);
  assert.match(policy, /https:\/\/api\.mapbox\.com/);
  assert.match(policy, /frame-src 'none'/);
});
