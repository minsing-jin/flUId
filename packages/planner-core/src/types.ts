import type { PlanPatch, SkillManifest, UIPlan } from "@genui/core";

export type TriggerMode = "prompt" | "interaction" | "feedPoll";

export type ResponseMode = "full" | "patch";

export interface ModelTierConfig {
  full: string;
  patch: string;
}

export type Transport =
  | {
      kind: "direct";
      apiKey: string;
      baseUrl?: string;
    }
  | {
      kind: "proxy";
      proxyUrl: string;
      headers?: Record<string, string>;
    };

export interface GPTPlannerConfig {
  transport: Transport;
  modelTier?: ModelTierConfig;
  maxTokensFull?: number;
  maxTokensPatch?: number;
  stream?: boolean;
  locale?: "ko" | "en" | "auto";
  temperature?: number;
  /** Fallback planner invoked when GPT pipeline exhausts retries. */
  fallbackPlanner?: Planner;
}

export interface PlannerContext {
  grantedPermissions?: string[];
  currentPlan?: UIPlan | null;
  dataSourceSnapshot?: Record<string, unknown>;
  triggerMode?: TriggerMode;
  feedback?: string;
}

export interface Planner {
  plan(prompt: string, context?: PlannerContext): Promise<UIPlan> | UIPlan;
}

export interface PlannerResponse {
  selectedSkills: string[];
  uiPlan: UIPlan;
  responseMode: ResponseMode;
  patches?: PlanPatch | null;
  rationale?: string;
}

export interface RefineOutcome {
  responseMode: ResponseMode;
  uiPlan?: UIPlan;
  patches?: PlanPatch | null;
  rationale?: string;
  tokensUsed: number;
}

export interface PromptBuildInput {
  prompt: string;
  triggerMode: TriggerMode;
  context: PlannerContext;
  skillpacks: readonly SkillManifest[];
  allowlistedComponents: readonly string[];
}

export interface GuardrailIssue {
  layer: "input" | "output" | "schema";
  code: string;
  message: string;
  path?: string;
}

export class GuardrailError extends Error {
  public readonly issues: GuardrailIssue[];
  constructor(issues: GuardrailIssue[]) {
    super(`Guardrail violation (${issues.length} issue${issues.length === 1 ? "" : "s"})`);
    this.name = "GuardrailError";
    this.issues = issues;
  }
}
