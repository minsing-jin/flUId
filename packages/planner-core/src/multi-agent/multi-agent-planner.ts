import type { SkillManifest, UIPlan } from "@genui/core";
import type { Provider } from "../providers/types.js";
import type { Planner, PlannerContext, PlannerResponse, TriggerMode } from "../types.js";
import { plannerResponseSchema } from "../response-schema.js";
import { buildMessages, inferLocale } from "../prompt-builder.js";
import { inputFilter, outputStaticCheck } from "../guardrails/index.js";
import { GuardrailError } from "../types.js";
import { routeIntent, type IntentResult } from "./intent-router.js";
import { selectSkills, type SkillSelectionResult } from "./skill-selector.js";

export interface MultiAgentPlannerConfig {
  provider: Provider;
  routerModel?: string;
  generatorModel?: string;
  maxTokens?: number;
  temperature?: number;
  locale?: "ko" | "en" | "auto";
  skillpacks: readonly SkillManifest[];
  allowlistedComponents: readonly string[];
}

export interface MultiAgentTrace {
  intent: IntentResult;
  skillSelection: SkillSelectionResult;
  rawResponse: string;
  tokensTotal: number;
}

/**
 * Multi-agent planner that splits generation into three steps:
 * 1. Intent Router — classify prompt (cheap model)
 * 2. Skill Selector — pick relevant skillpacks (deterministic, no LLM)
 * 3. UI Generator — generate UIPlan with only selected skills in context (expensive model)
 */
export class MultiAgentPlanner implements Planner {
  private lastTrace: MultiAgentTrace | null = null;

  constructor(private readonly config: MultiAgentPlannerConfig) {}

  getLastTrace(): MultiAgentTrace | null {
    return this.lastTrace;
  }

  async plan(prompt: string, context: PlannerContext = {}): Promise<UIPlan> {
    const response = await this.planWithResponse(prompt, context);
    return response.uiPlan;
  }

  async planWithResponse(prompt: string, context: PlannerContext = {}): Promise<PlannerResponse> {
    // Guardrail layer 1
    const inputIssues = inputFilter(prompt);
    if (inputIssues.length > 0) throw new GuardrailError(inputIssues);

    // Step 1: Intent routing (cheap model)
    const intent = await routeIntent(
      prompt,
      this.config.provider,
      this.config.routerModel
    );

    // Step 2: Skill selection (deterministic)
    const skillSelection = selectSkills(intent, this.config.skillpacks);
    const selectedSkillIds = skillSelection.selectedSkills.map((s) => s.id);

    // Step 3: UI generation with only selected skills in context
    const locale = inferLocale(prompt, this.config.locale);
    const selectedComponents = new Set<string>();
    for (const skill of skillSelection.selectedSkills) {
      for (const comp of skill.components) selectedComponents.add(comp);
    }

    const messages = buildMessages(
      {
        prompt,
        triggerMode: (context.triggerMode ?? "prompt") as TriggerMode,
        context,
        skillpacks: skillSelection.selectedSkills,
        allowlistedComponents: [...selectedComponents]
      },
      locale
    );

    const result = await this.config.provider.complete({
      model: this.config.generatorModel ?? "gpt-4o",
      messages,
      temperature: this.config.temperature ?? 0.4,
      maxTokens: this.config.maxTokens ?? 2400,
      stream: false,
      jsonMode: true
    });

    // Parse and validate
    const json = JSON.parse(result.content.trim());
    const parsed = plannerResponseSchema.safeParse(json);
    if (!parsed.success) {
      throw new Error(`Multi-agent plan validation failed: ${parsed.error.issues.map((i) => i.message).join("; ")}`);
    }

    // Guardrail layer 3: static check
    const allowedDomains: string[] = [];
    for (const skill of skillSelection.selectedSkills) {
      for (const d of skill.allowedDomains ?? []) allowedDomains.push(d.toLowerCase());
    }
    const staticIssues = outputStaticCheck(parsed.data.uiPlan as unknown as UIPlan, { allowedDomains });
    if (staticIssues.length > 0) throw new GuardrailError(staticIssues);

    const tokensTotal = intent.tokensUsed + result.tokensPrompt + result.tokensCompletion;
    this.lastTrace = {
      intent,
      skillSelection,
      rawResponse: result.content,
      tokensTotal
    };

    const merged = (parsed.data.theme
      ? { ...parsed.data.uiPlan, theme: parsed.data.theme }
      : parsed.data.uiPlan) as unknown as UIPlan;

    return {
      selectedSkills: selectedSkillIds,
      uiPlan: merged,
      responseMode: parsed.data.responseMode,
      patches: (parsed.data.patches ?? null) as PlannerResponse["patches"],
      rationale: parsed.data.rationale
    };
  }
}
