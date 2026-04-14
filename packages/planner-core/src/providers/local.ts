import type { Provider, CompletionRequest, CompletionResult } from "./types.js";

export interface LocalProviderConfig {
  baseUrl?: string;
  defaultModel?: string;
}

/**
 * LocalProvider connects to Ollama-compatible API (localhost:11434/api/chat).
 * Useful for offline development and testing without API keys.
 */
export class LocalProvider implements Provider {
  readonly name = "local";
  private readonly baseUrl: string;
  private readonly defaultModel: string;

  constructor(config: LocalProviderConfig = {}) {
    this.baseUrl = config.baseUrl ?? "http://localhost:11434";
    this.defaultModel = config.defaultModel ?? "llama3";
  }

  async complete(request: CompletionRequest, options?: { signal?: AbortSignal }): Promise<CompletionResult> {
    const model = request.model || this.defaultModel;
    const url = `${this.baseUrl}/api/chat`;

    const body = {
      model,
      messages: request.messages.map((m) => ({ role: m.role, content: m.content })),
      stream: false,
      options: {
        temperature: request.temperature ?? 0.4,
        num_predict: request.maxTokens ?? 2048
      },
      format: request.jsonMode ? "json" : undefined
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: options?.signal
    });

    if (!response.ok) {
      throw new Error(`Local(Ollama) ${response.status}: ${await response.text().catch(() => response.statusText)}`);
    }

    const payload = await response.json() as {
      message?: { content?: string };
      prompt_eval_count?: number;
      eval_count?: number;
    };

    return {
      content: payload.message?.content ?? "",
      tokensPrompt: payload.prompt_eval_count ?? 0,
      tokensCompletion: payload.eval_count ?? 0,
      streamed: false,
      provider: this.name
    };
  }
}
