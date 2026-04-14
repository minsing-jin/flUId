import type { SkillManifest } from "@genui/core";
import type { IntentResult } from "./intent-router.js";

export interface SkillSelectionResult {
  selectedSkills: SkillManifest[];
  reason: string;
}

/**
 * Deterministic skill selector based on intent + keywords.
 * No LLM call needed — uses category matching and keyword overlap.
 */
export function selectSkills(
  intent: IntentResult,
  availableSkills: readonly SkillManifest[]
): SkillSelectionResult {
  const scores = new Map<string, number>();

  for (const skill of availableSkills) {
    let score = 0;

    // Category match
    if (skill.categories.includes(intent.intent)) {
      score += 10;
    }

    // Keyword overlap with skill description, tools, components
    const skillText = [
      skill.description,
      ...skill.tools,
      ...skill.components,
      ...skill.suggestedPrompts
    ]
      .join(" ")
      .toLowerCase();

    for (const keyword of intent.keywords) {
      if (skillText.includes(keyword.toLowerCase())) {
        score += 3;
      }
    }

    // Complexity bonus: complex intents benefit from more skills
    if (intent.complexity === "complex" && score > 0) {
      score += 2;
    }

    if (score > 0) {
      scores.set(skill.id, score);
    }
  }

  // Sort by score descending, take top skills based on complexity
  const maxSkills = intent.complexity === "simple" ? 1 : intent.complexity === "moderate" ? 2 : 4;
  const sorted = [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxSkills);

  const selected = sorted
    .map(([id]) => availableSkills.find((s) => s.id === id))
    .filter((s): s is SkillManifest => s !== undefined);

  // Fallback: if nothing matched, pick first skill
  if (selected.length === 0 && availableSkills.length > 0) {
    const fallback = availableSkills[0];
    if (fallback) {
      return {
        selectedSkills: [fallback],
        reason: `No category match for "${intent.intent}"; defaulting to ${fallback.id}`
      };
    }
  }

  return {
    selectedSkills: selected,
    reason: sorted.map(([id, score]) => `${id}(${score})`).join(", ")
  };
}
