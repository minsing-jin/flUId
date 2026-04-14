import type { SkillManifest, UIPlan } from "@genui/core";
import { plannerResponseSchema, type PlannerResponseSchema } from "./response-schema.js";
import {
  buildMessages,
  buildSelfHealMessages,
  inferLocale
} from "./prompt-builder.js";
import { inputFilter, outputStaticCheck } from "./guardrails/index.js";
import { CostLedger } from "./cost-ledger.js";
import { retryWithBackoff, createRecoveryLedger, type RecoveryEvent } from "./recovery.js";
import { sendCompletion, type ChatMessage, type FetchLike } from "./transport.js";
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
  private readonly fetchImpl?: FetchLike;
  private lastTrace: PlanTrace | null = null;

  constructor(
    private readonly config: GPTPlannerConfig,
    private readonly deps: GPTPlannerDeps
  ) {
    this.costLedger = deps.costLedger ?? new CostLedger({ modelTier: config.modelTier });
    this.fetchImpl = deps.fetchImpl;
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
    return this.runPipeline(prompt, triggerMode, context);
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
            responseFormat: { type: "json_object" }
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
    const planForCheck = validated.uiPlan as unknown as UIPlan;
    const staticIssues: GuardrailIssue[] = outputStaticCheck(planForCheck, {
      allowedDomains: allowed
    });
    if (staticIssues.length > 0) {
      throw new GuardrailError(staticIssues);
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

    const merged = (validated.theme
      ? { ...validated.uiPlan, theme: validated.theme }
      : validated.uiPlan) as unknown as UIPlan;

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
