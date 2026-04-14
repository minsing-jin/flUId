import { validateUIPlan } from "../dsl/validator.js";
import type { Action, PlanPatch, UIPlan } from "../dsl/types.js";
import { resolveBindingsInObject } from "../bindings/resolver.js";
import { applyPlanPatch } from "../patches/apply.js";
import { ComponentRegistry } from "../registry/component-registry.js";
import { ToolRegistry } from "../registry/tool-registry.js";
import type { RuntimeEvent, RuntimeEventType } from "../telemetry/types.js";
import { RuntimeStore } from "./store.js";

export interface RuntimeOptions {
  permissionAllowlist: Set<string>;
  devMode?: boolean;
}

export interface RefinePlanner {
  refine(
    feedback: string,
    currentPlan: UIPlan,
    triggerMode: "interaction" | "feedPoll"
  ): Promise<RefineResult>;
}

export interface RefineResult {
  responseMode: "full" | "patch";
  uiPlan?: UIPlan;
  patches?: PlanPatch | null;
  rationale?: string;
}

export class WorkbenchRuntime {
  private readonly store = new RuntimeStore();

  constructor(
    private readonly componentRegistry: ComponentRegistry,
    private readonly toolRegistry: ToolRegistry,
    private readonly options: RuntimeOptions
  ) {}

  isDevMode(): boolean {
    return this.options.devMode === true;
  }

  getPlan(): UIPlan | null {
    return this.store.getPlan();
  }

  loadPlan(input: unknown): UIPlan {
    const result = validateUIPlan(input, {
      componentSchemas: this.componentRegistry.getSchemaMap(),
      toolAllowlist: this.toolRegistry.getToolAllowlist(),
      permissionAllowlist: this.options.permissionAllowlist
    });

    if (!result.ok) {
      throw new Error(`Plan validation failed: ${JSON.stringify(result.errors)}`);
    }

    this.store.setPlan(result.plan);
    this.logEvent("plan_loaded", { title: result.plan.title });
    return result.plan;
  }

  async refinePlan(feedback: string, planner: RefinePlanner, triggerMode: "interaction" | "feedPoll" = "interaction"): Promise<UIPlan> {
    const current = this.store.getPlan();
    if (!current) {
      throw new Error("No plan loaded to refine");
    }
    this.logEvent("refine_started", { feedback, triggerMode });
    try {
      const result = await planner.refine(feedback, current, triggerMode);
      if (result.responseMode === "patch" && result.patches) {
        const next = applyPlanPatch(current, result.patches);
        const revalidated = validateUIPlan(next, {
          componentSchemas: this.componentRegistry.getSchemaMap(),
          toolAllowlist: this.toolRegistry.getToolAllowlist(),
          permissionAllowlist: this.options.permissionAllowlist
        });
        if (!revalidated.ok) {
          throw new Error(`Patched plan invalid: ${JSON.stringify(revalidated.errors)}`);
        }
        this.store.setPlan(revalidated.plan);
        this.logEvent("refine_succeeded", { mode: "patch", opsCount: result.patches.ops.length });
        return revalidated.plan;
      }
      if (result.responseMode === "full" && result.uiPlan) {
        const next = this.loadPlan(result.uiPlan);
        this.logEvent("refine_succeeded", { mode: "full" });
        return next;
      }
      throw new Error("RefineResult missing payload for declared responseMode");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logEvent("refine_failed", { error: message });
      throw error;
    }
  }

  async dispatchAction(actionId: string): Promise<Record<string, unknown>> {
    const plan = this.store.getPlan();
    if (!plan) {
      throw new Error("No plan loaded");
    }

    const action = plan.actions.find((item) => item.id === actionId);
    if (!action) {
      throw new Error(`Action not found: ${actionId}`);
    }

    this.logEvent("action_dispatched", { actionId });
    return this.invokeActionTool(plan, action);
  }

  getEvents(): RuntimeEvent[] {
    return this.store.getEvents();
  }

  private async invokeActionTool(plan: UIPlan, action: Action): Promise<Record<string, unknown>> {
    const tool = this.toolRegistry.getTool(action.toolName);
    if (!tool) {
      throw new Error(`Tool not registered: ${action.toolName}`);
    }

    const grantedPermissions = new Set(plan.permissions.granted);
    const allPermitted = tool.permissions.every((permission) => grantedPermissions.has(permission));
    if (!allPermitted) {
      throw new Error(`Permission gate blocked tool: ${action.toolName}`);
    }

    const dataSourceMap = Object.fromEntries(
      plan.dataSources.map((source) => [source.id, { data: source.data, meta: source.meta }])
    );
    const resolvedInput = resolveBindingsInObject(action.input, {
      state: plan.state,
      dataSources: dataSourceMap
    });

    const parsedInput = tool.inputSchema.safeParse(resolvedInput);
    if (!parsedInput.success) {
      throw new Error(`Invalid tool input: ${parsedInput.error.message}`);
    }

    this.logEvent("tool_started", { toolName: tool.name, actionId: action.id });

    try {
      const output = await tool.handler(parsedInput.data, {
        grantedPermissions,
        traceId: plan.telemetry?.traceId
      });

      const parsedOutput = tool.outputSchema.safeParse(output);
      if (!parsedOutput.success) {
        throw new Error(`Invalid tool output: ${parsedOutput.error.message}`);
      }

      this.logEvent("tool_succeeded", { toolName: tool.name, actionId: action.id });
      return parsedOutput.data;
    } catch (error) {
      this.logEvent("tool_failed", {
        toolName: tool.name,
        actionId: action.id,
        error: error instanceof Error ? error.message : "Unknown error"
      });
      throw error;
    }
  }

  logEvent(type: RuntimeEventType, payload: Record<string, unknown>): void {
    this.store.pushEvent({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      type,
      at: new Date().toISOString(),
      payload
    });
  }
}
