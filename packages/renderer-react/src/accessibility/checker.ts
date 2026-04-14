import type { UIPlan, Block } from "@genui/core";

export interface AccessibilityIssue {
  severity: "error" | "warning" | "info";
  rule: string;
  message: string;
  blockId?: string;
  suggestion?: string;
}

const INTERACTIVE_TYPES = new Set([
  "PromptInput", "CodeEditor", "SQLQueryEditor", "FileUpload",
  "GeoSearchBox", "UTMBuilder", "PivotTableLite"
]);

const DATA_DISPLAY_TYPES = new Set([
  "KPIGrid", "ChartBlock", "DataTable", "ComparisonMatrix",
  "WebResultsList", "SummaryBlock", "DataQualityReport"
]);

function checkBlock(block: Block): AccessibilityIssue[] {
  const issues: AccessibilityIssue[] = [];

  // Rule: Interactive components should have labels
  if (INTERACTIVE_TYPES.has(block.type) && !block.title) {
    issues.push({
      severity: "warning",
      rule: "label-required",
      message: `Interactive component "${block.type}" has no title/label`,
      blockId: block.id,
      suggestion: `Add a "title" field to block "${block.id}" for screen reader support`
    });
  }

  // Rule: Data displays should have descriptive titles
  if (DATA_DISPLAY_TYPES.has(block.type) && !block.title) {
    issues.push({
      severity: "info",
      rule: "descriptive-title",
      message: `Data display "${block.type}" would benefit from a descriptive title`,
      blockId: block.id,
      suggestion: `Add title like "Monthly Revenue" instead of just type name`
    });
  }

  // Rule: ChartBlock needs alt text or aria-label
  if (block.type === "ChartBlock" && !block.props.ariaLabel && !block.title) {
    issues.push({
      severity: "error",
      rule: "chart-alt-text",
      message: `ChartBlock "${block.id}" has no accessible description`,
      blockId: block.id,
      suggestion: `Add ariaLabel prop or title describing the chart's data`
    });
  }

  // Rule: Images in props should have alt text
  if (typeof block.props.imageUrl === "string" && !block.props.imageAlt) {
    issues.push({
      severity: "error",
      rule: "img-alt",
      message: `Block "${block.id}" has image without alt text`,
      blockId: block.id,
      suggestion: `Add imageAlt prop describing the image content`
    });
  }

  // Rule: Color-only status indicators
  if (block.type === "StatusIndicator" && !block.props.label) {
    issues.push({
      severity: "error",
      rule: "color-not-alone",
      message: `StatusIndicator "${block.id}" uses color without text label`,
      blockId: block.id,
      suggestion: `Add a text label in addition to the color indicator`
    });
  }

  return issues;
}

function checkPlanLevel(plan: UIPlan): AccessibilityIssue[] {
  const issues: AccessibilityIssue[] = [];

  // Rule: Plan should have a meaningful title
  if (!plan.title || plan.title.length < 3) {
    issues.push({
      severity: "warning",
      rule: "plan-title",
      message: "Plan has no meaningful title for document heading",
      suggestion: "GPT should generate a descriptive title for the workbench"
    });
  }

  // Rule: Keyboard navigation
  const interactiveCount = plan.blocks.filter((b) => INTERACTIVE_TYPES.has(b.type)).length;
  if (interactiveCount > 3) {
    issues.push({
      severity: "info",
      rule: "focus-management",
      message: `${interactiveCount} interactive components — consider tab order and focus management`,
      suggestion: "Ensure logical tab order follows the visual layout"
    });
  }

  // Rule: Contrast check for theme
  if (plan.theme?.mood === "dark") {
    issues.push({
      severity: "info",
      rule: "contrast-check",
      message: "Dark theme active — ensure all text meets WCAG AA contrast ratio (4.5:1)",
      suggestion: "Check muted text colors against dark backgrounds"
    });
  }

  return issues;
}

/**
 * Run accessibility checks on a UIPlan.
 * Returns issues sorted by severity (error > warning > info).
 */
export function accessibilityCheck(plan: UIPlan): AccessibilityIssue[] {
  const issues: AccessibilityIssue[] = [];

  issues.push(...checkPlanLevel(plan));
  for (const block of plan.blocks) {
    issues.push(...checkBlock(block));
  }

  const severityOrder = { error: 0, warning: 1, info: 2 };
  return issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}
