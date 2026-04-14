import type { ZodType } from "zod";

export interface ComponentDefinition {
  type: string;
  schema: ZodType<Record<string, unknown>>;
  meta: {
    displayName: string;
    category: string;
    description: string;
    examples: string[];
  };
}

export class ComponentRegistry {
  private readonly components = new Map<string, ComponentDefinition>();

  registerComponent(definition: ComponentDefinition): void {
    if (this.components.has(definition.type)) {
      throw new Error(`Component already registered: ${definition.type}`);
    }
    this.components.set(definition.type, definition);
  }

  getComponent(type: string): ComponentDefinition | undefined {
    return this.components.get(type);
  }

  hasComponent(type: string): boolean {
    return this.components.has(type);
  }

  listComponents(): ComponentDefinition[] {
    return [...this.components.values()];
  }

  getSchemaMap(): Record<string, ZodType<Record<string, unknown>>> {
    const entries = [...this.components.entries()].map(([type, definition]) => [type, definition.schema]);
    return Object.fromEntries(entries);
  }
}
