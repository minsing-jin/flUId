import type { UIPlan } from "../dsl/types.js";

export interface SkillManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  categories: string[];
  permissionsRequested: string[];
  components: string[];
  tools: string[];
  suggestedPrompts: string[];
  uiPresets?: UIPlan[];
  /** Domains the skillpack is permitted to reach via fetch from sandbox or tool. */
  allowedDomains?: string[];
}
