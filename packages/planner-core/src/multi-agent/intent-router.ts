import type { Provider, ChatMessage } from "../providers/types.js";

export interface IntentResult {
  intent: string;
  complexity: "simple" | "moderate" | "complex";
  keywords: string[];
  tokensUsed: number;
}

const ROUTER_SYSTEM = `You are an intent classifier for a Generative UI system.
Given a user prompt, classify:
1. intent: one of "research", "analysis", "marketing", "sales", "dev", "geo", "ops", "custom"
2. complexity: "simple" (single widget), "moderate" (2-4 widgets), "complex" (5+ widgets or multi-skill)
3. keywords: up to 5 key terms from the prompt

Respond with EXACTLY one JSON object: {"intent":"...","complexity":"...","keywords":["..."]}`;

export async function routeIntent(
  prompt: string,
  provider: Provider,
  model?: string
): Promise<IntentResult> {
  const messages: ChatMessage[] = [
    { role: "system", content: ROUTER_SYSTEM },
    { role: "user", content: prompt }
  ];

  const result = await provider.complete({
    model: model ?? "gpt-4o-mini",
    messages,
    temperature: 0,
    maxTokens: 150,
    stream: false,
    jsonMode: true
  });

  try {
    const parsed = JSON.parse(result.content) as {
      intent?: string;
      complexity?: string;
      keywords?: string[];
    };
    return {
      intent: parsed.intent ?? "custom",
      complexity: (parsed.complexity as IntentResult["complexity"]) ?? "moderate",
      keywords: parsed.keywords ?? [],
      tokensUsed: result.tokensPrompt + result.tokensCompletion
    };
  } catch {
    return { intent: "custom", complexity: "moderate", keywords: [], tokensUsed: result.tokensPrompt + result.tokensCompletion };
  }
}
