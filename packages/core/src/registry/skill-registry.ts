import type { SkillManifest } from "../skills/types.js";

export class SkillRegistry {
  private readonly skills = new Map<string, SkillManifest>();

  registerSkill(manifest: SkillManifest): void {
    if (this.skills.has(manifest.id)) {
      throw new Error(`Skill already registered: ${manifest.id}`);
    }
    this.skills.set(manifest.id, manifest);
  }

  unregisterSkill(skillId: string): void {
    this.skills.delete(skillId);
  }

  getSkill(skillId: string): SkillManifest | undefined {
    return this.skills.get(skillId);
  }

  listSkills(): SkillManifest[] {
    return [...this.skills.values()];
  }
}
