import type { Provider, CompletionRequest, CompletionResult, ChatMessage } from "./types.js";

export interface AnthropicProviderConfig {
  apiKey: string;
  baseUrl?: string;
  defaultModel?: string;
}

function convertMessages(messages: ChatMessage[]): { system: string; userMessages: Array<{ role: "user" | "assistant"; content: string }> } {
  let system = "";
  const userMessages: Array<{ role: "user" | "assistant"; content: string }> = [];
  for (const msg of messages) {
    if (msg.role === "system") {
      system += (system ? "\n" : "") + msg.content;
    } else {
      userMessages.push({ role: msg.role, content: msg.content });
    }
  }
  return { system, userMessages };
}

export class AnthropicProvider implements Provider {
  readonly name = "anthropic";
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly defaultModel: string;

  constructor(config: AnthropicProviderConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? "https://api.anthropic.com";
    this.defaultModel = config.defaultModel ?? "claude-sonnet-4-20250514";
  }

  async complete(request: CompletionRequest, options?: { signal?: AbortSignal }): Promise<CompletionResult> {
    const { system, userMessages } = convertMessages(request.messages);
    const model = request.model || this.defaultModel;
    const url = `${this.baseUrl}/v1/messages`;

    const body: Record<string, unknown> = {
      model,
      max_tokens: request.maxTokens ?? 4096,
      messages: userMessages,
      temperature: request.temperature ?? 0.4
    };
    if (system) body.system = system;
    if (request.stream) body.stream = true;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify(body),
      signal: options?.signal
    });

    if (!response.ok) {
      throw new Error(`Anthropic ${response.status}: ${await response.text().catch(() => response.statusText)}`);
    }

    if (!request.stream) {
      const payload = await response.json() as {
        content: Array<{ type: string; text?: string }>;
        usage?: { input_tokens?: number; output_tokens?: number };
      };
      const text = payload.content.filter((b) => b.type === "text").map((b) => b.text ?? "").join("");
      return {
        content: text,
        tokensPrompt: payload.usage?.input_tokens ?? 0,
        tokensCompletion: payload.usage?.output_tokens ?? 0,
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
        try {
          const event = JSON.parse(payload) as {
            type?: string;
            delta?: { type?: string; text?: string };
            usage?: { input_tokens?: number; output_tokens?: number };
            message?: { usage?: { input_tokens?: number; output_tokens?: number } };
          };
          if (event.type === "content_block_delta" && event.delta?.text) {
            content += event.delta.text;
          }
          if (event.message?.usage?.input_tokens) tokensPrompt = event.message.usage.input_tokens;
          if (event.usage?.output_tokens) tokensCompletion = event.usage.output_tokens;
        } catch { /* skip malformed frames */ }
      }
    }
    return { content, tokensPrompt, tokensCompletion, streamed: true, provider: this.name };
  }
}
