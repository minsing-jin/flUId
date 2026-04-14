import { z } from "zod";
import { uiPlanSchema, planPatchSchema, themeSchema } from "@genui/core";

/**
 * The structured response shape we ask GPT to emit. We reuse the existing
 * UIPlan and PlanPatch schemas so runtime validation is consistent with the
 * rest of the framework. `selectedSkills` captures the planner's explicit
 * skillpack selection so UI can display and authorize it separately.
 */
export const plannerResponseSchema = z
  .object({
    selectedSkills: z.array(z.string().min(1)),
    uiPlan: uiPlanSchema,
    theme: themeSchema.optional(),
    responseMode: z.enum(["full", "patch"]),
    patches: planPatchSchema.nullable().optional(),
    rationale: z.string().min(1).optional()
  })
  .strict()
  .refine(
    (data) => (data.responseMode === "patch" ? data.patches !== null && data.patches !== undefined : true),
    { message: "patches is required when responseMode === 'patch'" }
  );

export type PlannerResponseSchema = z.infer<typeof plannerResponseSchema>;
