export const UI_PLAN_VERSION = "1.0" as const;

export type WorkbenchIntent =
  | "research"
  | "analysis"
  | "marketing"
  | "sales"
  | "dev"
  | "geo"
  | "ops"
  | "custom";

export type Region = "left" | "main" | "right" | "bottom";

export type BindingRef = {
  $bind: string;
};

export type Condition =
  | {
      equals: {
        path: string;
        value: unknown;
      };
    }
  | {
      exists: {
        path: string;
      };
    }
  | {
      and: Condition[];
    }
  | {
      or: Condition[];
    };

export type PlanPatchOp = {
  op: "add" | "remove" | "replace" | "move";
  path: string;
  value?: unknown;
};

export type PlanPatch = {
  ops: PlanPatchOp[];
};

export type DataSource = {
  id: string;
  kind: "table" | "text" | "json" | "file" | "geo" | "chart";
  data?: unknown;
  meta?: Record<string, unknown>;
  pollIntervalMs?: number;
};

export type Block = {
  id: string;
  type: string;
  region: Region;
  title?: string;
  props: Record<string, unknown>;
  bindings?: Record<string, BindingRef>;
  visibleWhen?: Condition;
};

export type Action = {
  id: string;
  label: string;
  toolName: string;
  input: Record<string, unknown>;
  confirm?: {
    title: string;
    body: string;
  };
  onSuccessPatch?: PlanPatch;
  onErrorPatch?: PlanPatch;
};

export type ThemeMood = "serious" | "playful" | "minimal" | "vivid" | "dark";
export type ThemeDensity = "compact" | "comfortable" | "spacious";

export type Theme = {
  mood: ThemeMood;
  density: ThemeDensity;
  accent: string;
  rationale?: string;
};

export type UIPlan = {
  version: typeof UI_PLAN_VERSION;
  title: string;
  intent: WorkbenchIntent;
  layout: {
    shell: "workbench";
    regions: Region[];
    regionConfig?: Record<string, unknown>;
  };
  blocks: Block[];
  actions: Action[];
  dataSources: DataSource[];
  state: Record<string, unknown>;
  permissions: {
    requested: string[];
    granted: string[];
  };
  theme?: Theme;
  telemetry?: {
    traceId?: string;
    eventsEnabled?: boolean;
  };
};

export type ComponentSchemaMap = Record<string, import("zod").ZodType<Record<string, unknown>>>;
export type ToolAllowlist = Set<string>;
