import type { UIPlan, Theme } from "@genui/core";
import type { PlannerResponseSchema } from "./response-schema.js";

/**
 * Coerce the zod-validated response into a runtime UIPlan.
 * Zod's lazy Condition type erases `visibleWhen` to `unknown`; at runtime
 * the validator already guarantees structural integrity, so this cast
 * is safe but we centralize it in a single helper.
 */
export function coerceValidatedPlan(validated: PlannerResponseSchema): UIPlan {
  const source = validated.uiPlan;
  const plan = validated.theme
    ? { ...source, theme: validated.theme as Theme }
    : source;
  return plan as unknown as UIPlan;
}
