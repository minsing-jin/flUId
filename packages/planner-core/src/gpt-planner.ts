import type { SkillManifest, UIPlan } from "@genui/core";
import { plannerResponseSchema, type PlannerResponseSchema } from "./response-schema.js";
import {
  buildMessages,
  buildSelfHealMessages,
  inferLocale
} from "./prompt-builder.js";
import { inputFilter, outputStaticCheck, llmJudge } from "./guardrails/index.js";
import { OpenAIProvider } from "./providers/openai.js";
import { CostLedger } from "./cost-ledger.js";
import { ResponseCache, buildCacheKey } from "./response-cache.js";
import { coerceValidatedPlan } from "./plan-coerce.js";
import { retryWithBackoff, createRecoveryLedger, type RecoveryEvent } from "./recovery.js";
import { sendCompletion, type ChatMessage, type FetchLike, type CompletionRequest } from "./transport.js";
import { zodToJsonSchema } from "./schema-converter.js";
import {
  GuardrailError,
  type GPTPlannerConfig,
  type GuardrailIssue,
  type Planner,
  type PlannerContext,
  type PlannerResponse,
  type TriggerMode
} from "./types.js";

export interface GPTPlannerDeps {
  skillpacks: readonly SkillManifest[];
  allowlistedComponents: readonly string[];
  costLedger?: CostLedger;
  responseCache?: ResponseCache;
  fetchImpl?: FetchLike;
}

export interface PlanTrace {
  request: ChatMessage[];
  rawResponse: string;
  validatedResponse: PlannerResponseSchema;
  tokensPrompt: number;
  tokensCompletion: number;
  recoveryEvents: RecoveryEvent[];
  costSnapshot: ReturnType<CostLedger["snapshot"]>;
}

function allowlistDomains(active: readonly SkillManifest[]): string[] {
  const set = new Set<string>();
  for (const manifest of active) {
    for (const domain of manifest.allowedDomains ?? []) {
      set.add(domain.toLowerCase());
    }
  }
  return [...set];
}

function parseJsonObject(content: string): unknown {
  const trimmed = content.trim();
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace < 0 || lastBrace < 0) {
    throw new Error("No JSON object found in response");
  }
  const candidate = trimmed.slice(firstBrace, lastBrace + 1);
  return JSON.parse(candidate);
}

export class GPTPlanner implements Planner {
  private readonly costLedger: CostLedger;
  private readonly responseCache: ResponseCache;
  private readonly fetchImpl?: FetchLike;
  private lastTrace: PlanTrace | null = null;
  private lastCacheHit = false;

  constructor(
    private readonly config: GPTPlannerConfig,
    private readonly deps: GPTPlannerDeps
  ) {
    this.costLedger = deps.costLedger ?? new CostLedger({ modelTier: config.modelTier });
    this.responseCache = deps.responseCache ?? new ResponseCache();
    this.fetchImpl = deps.fetchImpl;
  }

  getResponseCache(): ResponseCache {
    return this.responseCache;
  }

  wasLastCacheHit(): boolean {
    return this.lastCacheHit;
  }

  getCostLedger(): CostLedger {
    return this.costLedger;
  }

  getLastTrace(): PlanTrace | null {
    return this.lastTrace;
  }

  async plan(prompt: string, context: PlannerContext = {}): Promise<UIPlan> {
    const triggerMode: TriggerMode = context.triggerMode ?? "prompt";

    // Guardrail layer 1 — input pattern filter.
    const inputIssues = inputFilter(prompt);
    if (inputIssues.length > 0) {
      throw new GuardrailError(inputIssues);
    }

    // Try the GPT pipeline with retries. On exhausted failure, fall back.
    try {
      const response = await this.runPipeline(prompt, triggerMode, context);
      return response.uiPlan;
    } catch (error) {
      if (this.config.fallbackPlanner) {
        const fallback = await Promise.resolve(
          this.config.fallbackPlanner.plan(prompt, context)
        );
        return fallback;
      }
      throw error;
    }
  }

  async planWithResponse(
    prompt: string,
    context: PlannerContext = {}
  ): Promise<PlannerResponse> {
    const triggerMode: TriggerMode = context.triggerMode ?? "prompt";
    const inputIssues = inputFilter(prompt);
    if (inputIssues.length > 0) {
      throw new GuardrailError(inputIssues);
    }

    // Cache check
    const cacheKey = buildCacheKey(prompt, context.currentPlan, context.dataSourceSnapshot);
    const cached = this.responseCache.get(cacheKey);
    if (cached) {
      this.lastCacheHit = true;
      return cached;
    }
    this.lastCacheHit = false;

    const response = await this.runPipeline(prompt, triggerMode, context);

    // Cache store
    this.responseCache.set(cacheKey, response);
    return response;
  }

  private getResponseFormat(): CompletionRequest["responseFormat"] {
    if (this.config.useStructuredOutput) {
      return { type: "json_schema", json_schema: { name: "uiplan", schema: zodToJsonSchema(plannerResponseSchema), strict: true } };
    }
    return { type: "json_object" };
  }

  private async runPipeline(
    prompt: string,
    triggerMode: TriggerMode,
    context: PlannerContext
  ): Promise<PlannerResponse> {
    const locale = inferLocale(prompt, this.config.locale);
    const skillpacks = this.deps.skillpacks;
    const allowlistedComponents = this.deps.allowlistedComponents;

    const messages = buildMessages(
      {
        prompt,
        triggerMode,
        context,
        skillpacks,
        allowlistedComponents
      },
      locale
    );

    const ledger = createRecoveryLedger();
    const model = this.costLedger.selectModel(triggerMode);
    const maxTokens =
      triggerMode === "prompt"
        ? this.config.maxTokensFull ?? 2_400
        : this.config.maxTokensPatch ?? 900;

    let lastContent = "";
    let tokensPromptTotal = 0;
    let tokensCompletionTotal = 0;

    const completion = await retryWithBackoff(
      async (attempt) => {
        const result = await sendCompletion(
          this.config.transport,
          {
            model,
            messages,
            temperature: this.config.temperature ?? 0.4,
            maxTokens,
            stream: this.config.stream ?? true,
            responseFormat: this.getResponseFormat()
          },
          { fetchImpl: this.fetchImpl }
        );
        lastContent = result.content;
        tokensPromptTotal = result.tokensPrompt;
        tokensCompletionTotal = result.tokensCompletion;
        return { result, attempt };
      },
      { onEvent: (event) => ledger.push(event) }
    );

    // Stage 2: validate with zod. On failure, attempt a single self-heal retry.
    let validated: PlannerResponseSchema;
    const firstParse = this.validate(completion.result.content);
    if (firstParse.ok) {
      validated = firstParse.data;
    } else {
      ledger.push({
        layer: "validation",
        attempt: 1,
        outcome: "retry",
        message: firstParse.error,
        at: new Date().toISOString()
      });
      const healMessages = buildSelfHealMessages(messages, completion.result.content, firstParse.error);
      const retryResult = await sendCompletion(
        this.config.transport,
        {
          model,
          messages: healMessages,
          temperature: this.config.temperature ?? 0.4,
          maxTokens,
          stream: this.config.stream ?? true,
          responseFormat: { type: "json_object" }
        },
        { fetchImpl: this.fetchImpl }
      );
      tokensPromptTotal += retryResult.tokensPrompt;
      tokensCompletionTotal += retryResult.tokensCompletion;
      lastContent = retryResult.content;
      const secondParse = this.validate(retryResult.content);
      if (!secondParse.ok) {
        ledger.push({
          layer: "validation",
          attempt: 2,
          outcome: "give_up",
          message: secondParse.error,
          at: new Date().toISOString()
        });
        throw new Error(`GPT self-heal failed: ${secondParse.error}`);
      }
      ledger.push({
        layer: "validation",
        attempt: 2,
        outcome: "success",
        message: "self-heal produced valid plan",
        at: new Date().toISOString()
      });
      validated = secondParse.data;
    }

    // Stage 3: output static check against allowedDomains and suspicious keys.
    const activeSkills = skillpacks.filter((manifest) => validated.selectedSkills.includes(manifest.id));
    const allowed = allowlistDomains(activeSkills);
    const planForCheck = coerceValidatedPlan(validated);
    const staticIssues: GuardrailIssue[] = outputStaticCheck(planForCheck, {
      allowedDomains: allowed
    });
    if (staticIssues.length > 0) {
      throw new GuardrailError(staticIssues);
    }

    // Guardrail layer 5 (optional): LLM-as-judge safety evaluation.
    if (this.config.enableJudge && this.config.transport.kind === "direct") {
      const judgeProvider = new OpenAIProvider({ apiKey: this.config.transport.apiKey, baseUrl: this.config.transport.baseUrl });
      const judgeResult = await llmJudge(planForCheck, judgeProvider, this.config.judgeModel);
      tokensPromptTotal += Math.floor(judgeResult.tokensUsed / 2);
      tokensCompletionTotal += Math.ceil(judgeResult.tokensUsed / 2);
      if (!judgeResult.safe) {
        throw new GuardrailError([{ layer: "output", code: "JUDGE_UNSAFE", message: judgeResult.reason }]);
      }
    }

    const costSnapshot = this.costLedger.record({
      model,
      triggerMode,
      tokensPrompt: tokensPromptTotal,
      tokensCompletion: tokensCompletionTotal
    });

    this.lastTrace = {
      request: messages,
      rawResponse: lastContent,
      validatedResponse: validated,
      tokensPrompt: tokensPromptTotal,
      tokensCompletion: tokensCompletionTotal,
      recoveryEvents: ledger.drain(),
      costSnapshot
    };

    const merged = coerceValidatedPlan(validated);

    return {
      selectedSkills: validated.selectedSkills,
      uiPlan: merged,
      responseMode: validated.responseMode,
      patches: (validated.patches ?? null) as PlannerResponse["patches"],
      rationale: validated.rationale
    };
  }

  private validate(content: string): { ok: true; data: PlannerResponseSchema } | { ok: false; error: string } {
    try {
      const json = parseJsonObject(content);
      const parsed = plannerResponseSchema.safeParse(json);
      if (!parsed.success) {
        return { ok: false, error: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ") };
      }
      return { ok: true, data: parsed.data };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  }
}
