import { layoutWithLines, prepareWithSegments } from "@chenglou/pretext";

const TEXT_VARIANTS = {
  title: {
    font: '600 22px Inter, "Helvetica Neue", Arial, sans-serif',
    fontFamily: 'Inter, "Helvetica Neue", Arial, sans-serif',
    fontSize: "22px",
    fontWeight: "600",
    lineHeight: 32
  },
  body: {
    font: '400 15px Inter, "Helvetica Neue", Arial, sans-serif',
    fontFamily: 'Inter, "Helvetica Neue", Arial, sans-serif',
    fontSize: "15px",
    fontWeight: "400",
    lineHeight: 24
  },
  caption: {
    font: '400 13px Inter, "Helvetica Neue", Arial, sans-serif',
    fontFamily: 'Inter, "Helvetica Neue", Arial, sans-serif',
    fontSize: "13px",
    fontWeight: "400",
    lineHeight: 20
  },
  code: {
    font: "400 13px Menlo, Consolas, monospace",
    fontFamily: "Menlo, Consolas, monospace",
    fontSize: "13px",
    fontWeight: "400",
    lineHeight: 20
  }
} as const;

type JsonRecord = Record<string, unknown>;
export type MeasuredTextVariant = keyof typeof TEXT_VARIANTS;

export interface NormalizedMeasuredTextProps {
  text: string;
  variant: MeasuredTextVariant;
  measureWidth: number;
  maxLines: number | null;
  whiteSpace: "normal" | "pre-wrap";
  showMetrics: boolean;
}

export interface MeasuredTextLayout {
  visibleLines: string[];
  visibleLineCount: number;
  totalLineCount: number;
  visibleHeight: number;
  totalHeight: number;
  truncated: boolean;
  hiddenLineCount: number;
  engine: "pretext" | "fallback";
}

function isPositiveFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function normalizeFallbackLines(text: string, whiteSpace: "normal" | "pre-wrap"): string[] {
  if (whiteSpace === "pre-wrap") {
    const split = text.split(/\r?\n/);
    return split.length > 0 ? split : [""];
  }

  const collapsed = text.replace(/\s+/g, " ").trim();
  return collapsed.length > 0 ? [collapsed] : [""];
}

export function normalizeMeasuredTextProps(props: JsonRecord): NormalizedMeasuredTextProps {
  const variant = props.variant;
  const maxLines = props.maxLines;

  return {
    text: typeof props.text === "string" ? props.text : "",
    variant: variant === "title" || variant === "body" || variant === "caption" || variant === "code" ? variant : "body",
    measureWidth: isPositiveFiniteNumber(props.measureWidth) ? props.measureWidth : 360,
    maxLines: typeof maxLines === "number" && Number.isInteger(maxLines) && maxLines > 0 ? maxLines : null,
    whiteSpace: props.whiteSpace === "pre-wrap" ? "pre-wrap" : "normal",
    showMetrics: props.showMetrics === true
  };
}

export function resolveMeasuredTextVariant(variant: MeasuredTextVariant) {
  return TEXT_VARIANTS[variant];
}

export function measureMeasuredText(props: NormalizedMeasuredTextProps): MeasuredTextLayout {
  const variant = resolveMeasuredTextVariant(props.variant);

  try {
    const prepared = prepareWithSegments(props.text, variant.font, { whiteSpace: props.whiteSpace });
    const result = layoutWithLines(prepared, props.measureWidth, variant.lineHeight);
    const totalLines = result.lines.map((line) => line.text);
    const visibleLines = props.maxLines === null ? totalLines : totalLines.slice(0, props.maxLines);
    const safeVisibleLines = visibleLines.length > 0 ? visibleLines : [""];

    return {
      visibleLines: safeVisibleLines,
      visibleLineCount: safeVisibleLines.length,
      totalLineCount: totalLines.length,
      visibleHeight: safeVisibleLines.length * variant.lineHeight,
      totalHeight: result.height,
      truncated: props.maxLines !== null && totalLines.length > props.maxLines,
      hiddenLineCount: props.maxLines !== null && totalLines.length > props.maxLines ? totalLines.length - props.maxLines : 0,
      engine: "pretext"
    };
  } catch {
    const totalLines = normalizeFallbackLines(props.text, props.whiteSpace);
    const visibleLines = props.maxLines === null ? totalLines : totalLines.slice(0, props.maxLines);
    const safeVisibleLines = visibleLines.length > 0 ? visibleLines : [""];

    return {
      visibleLines: safeVisibleLines,
      visibleLineCount: safeVisibleLines.length,
      totalLineCount: totalLines.length,
      visibleHeight: safeVisibleLines.length * variant.lineHeight,
      totalHeight: totalLines.length * variant.lineHeight,
      truncated: props.maxLines !== null && totalLines.length > props.maxLines,
      hiddenLineCount: props.maxLines !== null && totalLines.length > props.maxLines ? totalLines.length - props.maxLines : 0,
      engine: "fallback"
    };
  }
}

export function formatMeasuredTextMetrics(props: NormalizedMeasuredTextProps, layout: MeasuredTextLayout): string {
  const visibility = layout.truncated
    ? `${layout.visibleLineCount}/${layout.totalLineCount} lines, +${layout.hiddenLineCount} hidden`
    : `${layout.totalLineCount} lines`;

  return `${layout.engine} ${visibility}, ${layout.visibleHeight}px shown at ${props.measureWidth}px width`;
}
