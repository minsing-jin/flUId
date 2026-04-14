import { createElement, type ReactElement } from "react";

type BlockProps = Record<string, unknown>;

export type ReactBlockRenderer = (props: BlockProps) => ReactElement;

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

const Placeholder = (type: string, props: BlockProps): ReactElement =>
  createElement("section", { "data-genui-component": type }, [
    createElement("h4", { key: "title" }, type),
    createElement("pre", { key: "props" }, JSON.stringify(props, null, 2))
  ]);

export const reactComponentMap: Record<string, ReactBlockRenderer> = {
  WorkbenchShell: () => createElement("section", { className: "genui-react-shell" }),
  PromptInput: (props) =>
    createElement("div", { className: "genui-react-prompt" }, [
      createElement("input", {
        key: "input",
        placeholder: asString(props.placeholder, "Describe your workbench...")
      }),
      createElement("button", { key: "button", type: "button" }, "Generate")
    ]),
  ActivityLog: (props) =>
    createElement(
      "ul",
      null,
      (Array.isArray(props.entries) ? props.entries : []).map((entry, index) =>
        createElement("li", { key: `log-${index}` }, String(entry))
      )
    ),
  DebugJSON: (props) => createElement("pre", null, JSON.stringify(props.value ?? props, null, 2)),
  MeasuredText: (props) => {
    const text = asString(props.text, "");
    const variant = asString(props.variant, "body");
    const width = typeof props.measureWidth === "number" && Number.isFinite(props.measureWidth) ? props.measureWidth : 360;
    const fontSize = variant === "title" ? "22px" : variant === "caption" ? "13px" : "15px";
    const fontFamily = variant === "code" ? 'Menlo, Consolas, monospace' : 'Inter, "Helvetica Neue", Arial, sans-serif';
    const whiteSpace = props.whiteSpace === "pre-wrap" ? "pre-wrap" : "normal";

    return createElement("article", {
      style: {
        width: `min(100%, ${width}px)`,
        padding: "12px 14px",
        border: "1px solid #d9e2ec",
        borderRadius: "12px",
        background: "#ffffff",
        color: "#102a43"
      }
    }, [
      createElement("div", {
        key: "text",
        style: {
          fontFamily,
          fontSize,
          lineHeight: variant === "title" ? "32px" : variant === "caption" ? "20px" : "24px",
          whiteSpace
        }
      }, text),
      props.showMetrics
        ? createElement("small", {
            key: "metrics",
            style: {
              display: "block",
              marginTop: "8px",
              color: "#486581"
            }
          }, "renderer-react uses the same declarative props, but pretext metrics are only computed in renderer-web.")
        : null
    ]);
  },
  SummaryBlock: (props) =>
    createElement(
      "ul",
      null,
      (Array.isArray(props.bullets) ? props.bullets : []).map((bullet, index) =>
        createElement("li", { key: `bullet-${index}` }, String(bullet))
      )
    ),
  DataTable: (props) => {
    const columns = Array.isArray(props.columns) ? props.columns.map(String) : [];
    const rows = Array.isArray(props.rows) ? props.rows : [];

    return createElement("table", null, [
      createElement(
        "thead",
        { key: "thead" },
        createElement("tr", null, columns.map((column) => createElement("th", { key: column }, column)))
      ),
      createElement(
        "tbody",
        { key: "tbody" },
        rows.map((row, rowIndex) => {
          if (!row || typeof row !== "object") {
            return createElement("tr", { key: `row-${rowIndex}` });
          }

          const record = row as Record<string, unknown>;
          return createElement(
            "tr",
            { key: `row-${rowIndex}` },
            columns.map((column) => createElement("td", { key: `${rowIndex}-${column}` }, String(record[column] ?? "")))
          );
        })
      )
    ]);
  },
  ChartBlock: (props) => Placeholder("ChartBlock", props),
  KPIGrid: (props) => Placeholder("KPIGrid", props),
  ComparisonMatrix: (props) => Placeholder("ComparisonMatrix", props),
  WebResultsList: (props) => Placeholder("WebResultsList", props),
  CodeEditor: (props) =>
    createElement("textarea", {
      defaultValue: asString(props.value, "")
    }),
  CodeRunnerJS: (props) => Placeholder("CodeRunnerJS", props),
  MapView: (props) => Placeholder("MapView", props),
  PipelineKanban: (props) => Placeholder("PipelineKanban", props)
};

export function listReactSupportedComponents(): string[] {
  return Object.keys(reactComponentMap);
}
