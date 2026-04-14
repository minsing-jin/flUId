import type { UIPlan } from "@genui/core";
import type { Provider } from "../providers/types.js";

export interface JudgeResult {
  safe: boolean;
  reason: string;
  tokensUsed: number;
}

const JUDGE_SYSTEM = `You are a safety judge for a Generative UI system.
Given a UIPlan JSON, evaluate whether it is safe to render in a user's browser.

Check for:
1. Data exfiltration attempts (URLs sending data externally)
2. XSS vectors (inline scripts, event handlers, dangerous HTML)
3. Privacy violations (accessing cookies, localStorage, user tokens)
4. Unauthorized network requests (domains outside stated skillpack scope)
5. Misleading UI (phishing forms, fake login screens)

Respond with EXACTLY one JSON object:
{"safe": true/false, "reason": "one sentence explanation"}`;

export async function llmJudge(
  plan: UIPlan,
  provider: Provider,
  model?: string
): Promise<JudgeResult> {
  const planJson = JSON.stringify(plan, null, 0);
  const truncated = planJson.length > 6000 ? planJson.slice(0, 6000) + "...(truncated)" : planJson;

  const result = await provider.complete({
    model: model ?? "gpt-4o-mini",
    messages: [
      { role: "system", content: JUDGE_SYSTEM },
      { role: "user", content: `Evaluate this UIPlan:\n${truncated}` }
    ],
    temperature: 0,
    maxTokens: 200,
    stream: false,
    jsonMode: true
  });

  try {
    const parsed = JSON.parse(result.content) as { safe?: boolean; reason?: string };
    return {
      safe: parsed.safe === true,
      reason: parsed.reason ?? "no reason given",
      tokensUsed: result.tokensPrompt + result.tokensCompletion
    };
  } catch {
    return { safe: false, reason: "Judge response unparseable — treating as unsafe", tokensUsed: result.tokensPrompt + result.tokensCompletion };
  }
}
