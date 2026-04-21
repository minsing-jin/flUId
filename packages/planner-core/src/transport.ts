import type { Transport } from "./types.js";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  stream: boolean;
  responseFormat?: { type: "json_object" } | { type: "json_schema"; json_schema: { name: string; schema: Record<string, unknown>; strict: boolean } };
}

export interface CompletionResult {
  content: string;
  tokensPrompt: number;
  tokensCompletion: number;
  streamed: boolean;
}

export interface FetchLike {
  (input: string, init: {
    method: string;
    headers: Record<string, string>;
    body: string;
    signal?: AbortSignal;
  }): Promise<{
    ok: boolean;
    status: number;
    statusText: string;
    body: ReadableStream<Uint8Array> | null;
    json(): Promise<unknown>;
    text(): Promise<string>;
  }>;
}

function resolveEndpoint(transport: Transport): { url: string; headers: Record<string, string> } {
  if (transport.kind === "direct") {
    const base = transport.baseUrl ?? "https://api.openai.com";
    return {
      url: `${base}/v1/chat/completions`,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${transport.apiKey}`
      }
    };
  }
  return {
    url: transport.proxyUrl,
    headers: {
      "content-type": "application/json",
      ...(transport.headers ?? {})
    }
  };
}

export async function sendCompletion(
  transport: Transport,
  request: CompletionRequest,
  options: { signal?: AbortSignal; fetchImpl?: FetchLike } = {}
): Promise<CompletionResult> {
  const { url, headers } = resolveEndpoint(transport);
  const fetchImpl = (options.fetchImpl ?? (globalThis.fetch as unknown as FetchLike));
  if (!fetchImpl) {
    throw new Error("Global fetch is not available. Provide fetchImpl in options.");
  }

  const body = JSON.stringify({
    model: request.model,
    messages: request.messages,
    temperature: request.temperature ?? 0.4,
    max_tokens: request.maxTokens,
    stream: request.stream,
    response_format: request.responseFormat
  });

  const response = await fetchImpl(url, {
    method: "POST",
    headers,
    body,
    signal: options.signal
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => response.statusText);
    throw new Error(`GPT transport error ${response.status}: ${detail}`);
  }

  if (!request.stream) {
    const payload = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    return {
      content: payload.choices[0]?.message?.content ?? "",
      tokensPrompt: payload.usage?.prompt_tokens ?? 0,
      tokensCompletion: payload.usage?.completion_tokens ?? 0,
      streamed: false
    };
  }

  if (!response.body) {
    throw new Error("Streaming response body is null");
  }

  const decoder = new TextDecoder();
  const reader = response.body.getReader();
  let content = "";
  let tokensCompletion = 0;
  let tokensPrompt = 0;
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === "[DONE]") continue;
      try {
        const chunk = JSON.parse(payload) as {
          choices?: Array<{ delta?: { content?: string } }>;
          usage?: { prompt_tokens?: number; completion_tokens?: number };
        };
        const delta = chunk.choices?.[0]?.delta?.content;
        if (delta) content += delta;
        if (chunk.usage?.prompt_tokens) tokensPrompt = chunk.usage.prompt_tokens;
        if (chunk.usage?.completion_tokens) tokensCompletion = chunk.usage.completion_tokens;
      } catch {
        // Ignore malformed streaming frames; upstream self-heal will catch JSON errors.
      }
    }
  }

  return { content, tokensPrompt, tokensCompletion, streamed: true };
}
