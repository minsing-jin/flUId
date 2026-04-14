import { allPermissionsGranted, type PermissionDecision } from "./permission-model.js";
import type { SkillManifest } from "./types.js";

export interface SkillLoadResult {
  accepted: SkillManifest[];
  rejected: Array<{ skill: SkillManifest; reason: string }>;
}

export function loadSkills(skillManifests: SkillManifest[], decision: PermissionDecision): SkillLoadResult {
  const accepted: SkillManifest[] = [];
  const rejected: Array<{ skill: SkillManifest; reason: string }> = [];

  for (const manifest of skillManifests) {
    if (allPermissionsGranted(decision, manifest.permissionsRequested)) {
      accepted.push(manifest);
      continue;
    }

    rejected.push({
      skill: manifest,
      reason: "Missing required permissions"
    });
  }

  return { accepted, rejected };
}
