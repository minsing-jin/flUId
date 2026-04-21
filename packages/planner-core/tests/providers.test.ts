import test from "node:test";
import assert from "node:assert/strict";
import { OpenAIProvider, AnthropicProvider, LocalProvider } from "../src/providers/index.js";

function installMockFetch(payload: unknown, status = 200): () => void {
  const original = globalThis.fetch;
  (globalThis as unknown as { fetch: typeof fetch }).fetch = (async () => ({
    ok: status < 400,
    status,
    statusText: "OK",
    headers: { get: () => "application/json" },
    body: null,
    json: async () => payload,
    text: async () => JSON.stringify(payload)
  })) as unknown as typeof fetch;
  return () => { (globalThis as unknown as { fetch: typeof fetch }).fetch = original; };
}

test("OpenAIProvider returns content + tokens from non-stream response", async () => {
  const restore = installMockFetch({
    choices: [{ message: { content: "{\"ok\":true}" } }],
    usage: { prompt_tokens: 100, completion_tokens: 20 }
  });
  try {
    const provider = new OpenAIProvider({ apiKey: "sk-test" });
    const result = await provider.complete({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "hi" }],
      stream: false,
      jsonMode: true
    });
    assert.equal(result.content, "{\"ok\":true}");
    assert.equal(result.tokensPrompt, 100);
    assert.equal(result.tokensCompletion, 20);
    assert.equal(result.provider, "openai");
  } finally { restore(); }
});

test("OpenAIProvider throws on non-ok status", async () => {
  const restore = installMockFetch({ error: "boom" }, 500);
  try {
    const provider = new OpenAIProvider({ apiKey: "sk-test" });
    await assert.rejects(
      provider.complete({ model: "gpt-4o", messages: [], stream: false, jsonMode: false }),
      /OpenAI 500/
    );
  } finally { restore(); }
});

test("AnthropicProvider extracts text from content array", async () => {
  const restore = installMockFetch({
    content: [{ type: "text", text: "Hello from Claude" }],
    usage: { input_tokens: 50, output_tokens: 10 }
  });
  try {
    const provider = new AnthropicProvider({ apiKey: "sk-ant-test" });
    const result = await provider.complete({
      model: "claude-sonnet-4-20250514",
      messages: [{ role: "system", content: "be helpful" }, { role: "user", content: "hi" }],
      stream: false,
      jsonMode: false
    });
    assert.equal(result.content, "Hello from Claude");
    assert.equal(result.tokensPrompt, 50);
    assert.equal(result.tokensCompletion, 10);
    assert.equal(result.provider, "anthropic");
  } finally { restore(); }
});

test("LocalProvider reads Ollama-style message.content", async () => {
  const restore = installMockFetch({
    message: { content: "Local model output" },
    prompt_eval_count: 30,
    eval_count: 5
  });
  try {
    const provider = new LocalProvider();
    const result = await provider.complete({
      model: "llama3",
      messages: [{ role: "user", content: "ping" }],
      stream: false,
      jsonMode: true
    });
    assert.equal(result.content, "Local model output");
    assert.equal(result.tokensPrompt, 30);
    assert.equal(result.tokensCompletion, 5);
    assert.equal(result.provider, "local");
  } finally { restore(); }
});
