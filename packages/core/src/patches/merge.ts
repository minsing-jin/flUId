import type { PlanPatch } from "../dsl/types.js";

export function mergePlanPatches(base: PlanPatch, incoming: PlanPatch): PlanPatch {
  return {
    ops: [...base.ops, ...incoming.ops]
  };
}
