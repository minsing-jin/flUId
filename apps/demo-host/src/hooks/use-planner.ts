import { useMemo } from "react";
import { seedSkillpacks } from "@genui/core";
import { GPTPlanner, MultiAgentPlanner, OpenAIProvider, type GPTPlannerConfig } from "@genui/planner-core";
import type { BYOKConfig } from "../byok.js";
import { MockPlanner } from "../planner.js";

export type PlannerMode = "single" | "multi-agent";

function allowlistedComponentTypes(): string[] {
  const all = new Set<string>();
  for (const pack of seedSkillpacks) {
    for (const component of pack.components) all.add(component);
  }
  return [...all];
}

export interface PlannerInstance {
  kind: "gpt" | "multi-agent" | null;
  planner: GPTPlanner | MultiAgentPlanner | null;
}

/**
 * Build the appropriate planner instance based on BYOK + mode.
 * Returns null when no credentials are configured (caller will use MockPlanner).
 */
export function usePlanner(byok: BYOKConfig, mode: PlannerMode): PlannerInstance {
  return useMemo(() => {
    if (byok.mode === "direct" && !byok.apiKey) return { kind: null, planner: null };
    if (byok.mode === "proxy" && !byok.proxyUrl) return { kind: null, planner: null };

    const mockFallback = { plan: (p: string) => new MockPlanner().plan(p) };

    if (mode === "multi-agent" && byok.mode === "direct") {
      const provider = new OpenAIProvider({ apiKey: byok.apiKey });
      return {
        kind: "multi-agent",
        planner: new MultiAgentPlanner({
          provider,
          skillpacks: seedSkillpacks,
          allowlistedComponents: allowlistedComponentTypes()
        })
      };
    }

    const config: GPTPlannerConfig = {
      transport:
        byok.mode === "direct"
          ? { kind: "direct", apiKey: byok.apiKey }
          : { kind: "proxy", proxyUrl: byok.proxyUrl },
      stream: true,
      fallbackPlanner: mockFallback
    };
    return {
      kind: "gpt",
      planner: new GPTPlanner(config, {
        skillpacks: seedSkillpacks,
        allowlistedComponents: allowlistedComponentTypes()
      })
    };
  }, [byok, mode]);
}
