import { z } from "zod";
import { uiPlanSchema } from "./schemas.js";
import type { ComponentSchemaMap, ToolAllowlist, UIPlan } from "./types.js";

export type ValidationError = {
  code:
    | "SCHEMA_INVALID"
    | "UNKNOWN_COMPONENT"
    | "UNKNOWN_TOOL"
    | "BLOCK_PROPS_INVALID"
    | "DISALLOWED_PERMISSION"
    | "UNSAFE_HTML";
  message: string;
  path?: string;
};

export type ValidationResult =
  | { ok: true; plan: UIPlan }
  | { ok: false; errors: ValidationError[] };

export interface UIPlanValidatorOptions {
  componentSchemas: ComponentSchemaMap;
  toolAllowlist: ToolAllowlist;
  permissionAllowlist: Set<string>;
}

const UNSAFE_HTML_PATTERNS = ["<script", "javascript:", "onerror=", "onload="];

function hasUnsafeHtml(value: unknown): boolean {
  if (typeof value === "string") {
    const normalized = value.toLowerCase();
    return UNSAFE_HTML_PATTERNS.some((pattern) => normalized.includes(pattern));
  }

  if (Array.isArray(value)) {
    return value.some((item) => hasUnsafeHtml(item));
  }

  if (value && typeof value === "object") {
    return Object.values(value).some((item) => hasUnsafeHtml(item));
  }

  return false;
}

function toSchemaErrors(error: z.ZodError): ValidationError[] {
  return error.issues.map((issue) => ({
    code: "SCHEMA_INVALID",
    message: issue.message,
    path: issue.path.join(".")
  }));
}

export function validateUIPlan(input: unknown, options: UIPlanValidatorOptions): ValidationResult {
  const parsed = uiPlanSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, errors: toSchemaErrors(parsed.error) };
  }

  const plan = parsed.data;
  const errors: ValidationError[] = [];

  for (const permission of plan.permissions.requested) {
    if (!options.permissionAllowlist.has(permission)) {
      errors.push({
        code: "DISALLOWED_PERMISSION",
        message: `Permission not allowlisted: ${permission}`,
        path: "permissions.requested"
      });
    }
  }

  for (const block of plan.blocks) {
    const componentSchema = options.componentSchemas[block.type];
    if (!componentSchema) {
      errors.push({
        code: "UNKNOWN_COMPONENT",
        message: `Unknown block type: ${block.type}`,
        path: `blocks.${block.id}.type`
      });
      continue;
    }

    const propsResult = componentSchema.safeParse(block.props);
    if (!propsResult.success) {
      errors.push({
        code: "BLOCK_PROPS_INVALID",
        message: `Props validation failed for block ${block.id}`,
        path: `blocks.${block.id}.props`
      });
    }

    if (hasUnsafeHtml(block.props)) {
      errors.push({
        code: "UNSAFE_HTML",
        message: `Unsafe HTML pattern in block props: ${block.id}`,
        path: `blocks.${block.id}.props`
      });
    }
  }

  for (const action of plan.actions) {
    if (!options.toolAllowlist.has(action.toolName)) {
      errors.push({
        code: "UNKNOWN_TOOL",
        message: `Unknown tool: ${action.toolName}`,
        path: `actions.${action.id}.toolName`
      });
    }

    if (hasUnsafeHtml(action.input)) {
      errors.push({
        code: "UNSAFE_HTML",
        message: `Unsafe HTML pattern in action input: ${action.id}`,
        path: `actions.${action.id}.input`
      });
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, plan: plan as UIPlan };
}
