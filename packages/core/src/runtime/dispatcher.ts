import type { WorkbenchRuntime } from "./workbench-runtime.js";

export async function dispatchAction(runtime: WorkbenchRuntime, actionId: string): Promise<Record<string, unknown>> {
  return runtime.dispatchAction(actionId);
}
