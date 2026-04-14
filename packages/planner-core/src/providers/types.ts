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
  jsonMode: boolean;
  jsonSchema?: Record<string, unknown>;
}

export interface CompletionResult {
  content: string;
  tokensPrompt: number;
  tokensCompletion: number;
  streamed: boolean;
  provider: string;
}

export interface Provider {
  readonly name: string;
  complete(request: CompletionRequest, options?: { signal?: AbortSignal }): Promise<CompletionResult>;
}
