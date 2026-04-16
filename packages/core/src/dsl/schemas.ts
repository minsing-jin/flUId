import { z } from "zod";
import { UI_PLAN_VERSION } from "./types.js";

const bindingRefSchema = z
  .object({
    $bind: z.string().min(1)
  })
  .strict();

const conditionSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z
      .object({
        equals: z
          .object({
            path: z.string().min(1),
            value: z.unknown()
          })
          .strict()
      })
      .strict(),
    z
      .object({
        exists: z
          .object({
            path: z.string().min(1)
          })
          .strict()
      })
      .strict(),
    z
      .object({
        and: z.array(conditionSchema)
      })
      .strict(),
    z
      .object({
        or: z.array(conditionSchema)
      })
      .strict()
  ])
);

export const planPatchSchema = z
  .object({
    ops: z.array(
      z
        .object({
          op: z.enum(["add", "remove", "replace", "move"]),
          path: z.string().min(1),
          value: z.unknown().optional()
        })
        .strict()
    )
  })
  .strict();

export const dataSourceSchema = z
  .object({
    id: z.string().min(1),
    kind: z.enum(["table", "text", "json", "file", "geo", "chart"]),
    data: z.unknown().optional(),
    meta: z.record(z.unknown()).optional(),
    pollIntervalMs: z.number().int().positive().optional(),
    feedUrl: z.string().url().optional(),
    connector: z
      .object({
        type: z.enum(["rest", "csv", "mock", "static"]),
        source: z.string(),
        refreshMs: z.number().int().nonnegative().optional(),
        method: z.enum(["GET", "POST"]).optional(),
        headers: z.record(z.string()).optional(),
        transform: z.string().optional(),
        targetBlockId: z.string().optional()
      })
      .strict()
      .optional()
  })
  .strict();

export const blockSchema = z
  .object({
    id: z.string().min(1),
    type: z.string().min(1),
    region: z.enum(["left", "main", "right", "bottom"]),
    title: z.string().min(1).optional(),
    props: z.record(z.unknown()),
    bindings: z.record(bindingRefSchema).optional(),
    visibleWhen: conditionSchema.optional()
  })
  .strict();

export const actionSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1),
    toolName: z.string().min(1),
    input: z.record(z.unknown()),
    confirm: z
      .object({
        title: z.string().min(1),
        body: z.string().min(1)
      })
      .strict()
      .optional(),
    onSuccessPatch: planPatchSchema.optional(),
    onErrorPatch: planPatchSchema.optional()
  })
  .strict();

const ACCENT_PRESETS = [
  "indigo",
  "emerald",
  "rose",
  "amber",
  "slate",
  "violet",
  "cyan",
  "teal",
  "pink",
  "neutral"
] as const;

export const themeSchema = z
  .object({
    mood: z.enum(["serious", "playful", "minimal", "vivid", "dark"]),
    density: z.enum(["compact", "comfortable", "spacious"]),
    accent: z
      .string()
      .min(1)
      .refine(
        (value) =>
          /^#[0-9a-fA-F]{6}$/.test(value) ||
          (ACCENT_PRESETS as readonly string[]).includes(value),
        { message: "accent must be a 6-digit hex or preset keyword" }
      ),
    rationale: z.string().min(1).optional()
  })
  .strict();

export const uiPlanSchema = z
  .object({
    version: z.literal(UI_PLAN_VERSION),
    title: z.string().min(1),
    intent: z.enum(["research", "analysis", "marketing", "sales", "dev", "geo", "ops", "custom"]),
    layout: z
      .object({
        shell: z.literal("workbench"),
        regions: z.array(z.enum(["left", "main", "right", "bottom"])).min(1),
        regionConfig: z.record(z.unknown()).optional()
      })
      .strict(),
    blocks: z.array(blockSchema),
    actions: z.array(actionSchema),
    dataSources: z.array(dataSourceSchema),
    state: z.record(z.unknown()),
    permissions: z
      .object({
        requested: z.array(z.string()),
        granted: z.array(z.string())
      })
      .strict(),
    theme: themeSchema.optional(),
    telemetry: z
      .object({
        traceId: z.string().optional(),
        eventsEnabled: z.boolean().optional()
      })
      .strict()
      .optional()
  })
  .strict();

export const ACCENT_PRESET_KEYWORDS = ACCENT_PRESETS;
