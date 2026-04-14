import type { Provider, CompletionRequest, CompletionResult } from "./types.js";

export interface OpenAIProviderConfig {
  apiKey: string;
  baseUrl?: string;
}

export class OpenAIProvider implements Provider {
  readonly name = "openai";
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: OpenAIProviderConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? "https://api.openai.com";
  }

  async complete(request: CompletionRequest, options?: { signal?: AbortSignal }): Promise<CompletionResult> {
    const url = `${this.baseUrl}/v1/chat/completions`;
    const body: Record<string, unknown> = {
      model: request.model,
      messages: request.messages,
      temperature: request.temperature ?? 0.4,
      max_tokens: request.maxTokens,
      stream: request.stream
    };
    if (request.jsonMode) {
      body.response_format = request.jsonSchema
        ? { type: "json_schema", json_schema: { name: "plan", schema: request.jsonSchema, strict: true } }
        : { type: "json_object" };
    }

    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify(body),
      signal: options?.signal
    });

    if (!response.ok) {
      throw new Error(`OpenAI ${response.status}: ${await response.text().catch(() => response.statusText)}`);
    }

    if (!request.stream) {
      const payload = await response.json() as {
        choices: Array<{ message: { content: string } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };
      return {
        content: payload.choices[0]?.message?.content ?? "",
        tokensPrompt: payload.usage?.prompt_tokens ?? 0,
        tokensCompletion: payload.usage?.completion_tokens ?? 0,
        streamed: false,
        provider: this.name
      };
    }

    return this.readStream(response);
  }

  private async readStream(response: Response): Promise<CompletionResult> {
    if (!response.body) throw new Error("Streaming body is null");
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let content = "";
    let tokensPrompt = 0;
    let tokensCompletion = 0;
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
          if (chunk.choices?.[0]?.delta?.content) content += chunk.choices[0].delta.content;
          if (chunk.usage?.prompt_tokens) tokensPrompt = chunk.usage.prompt_tokens;
          if (chunk.usage?.completion_tokens) tokensCompletion = chunk.usage.completion_tokens;
        } catch { /* skip malformed frames */ }
      }
    }
    return { content, tokensPrompt, tokensCompletion, streamed: true, provider: this.name };
  }
}
