import { createElement, useMemo, useState, type ReactElement } from "react";
import type { UIPlan } from "@genui/core";

export interface PlanHistoryEntry {
  at: string;
  title: string;
  plan: UIPlan;
}

export interface DevToolsData {
  gptRequest: string;
  gptResponseStream: string;
  validationError: string | null;
  planHistory: PlanHistoryEntry[];
  patchDiffs: Array<{ at: string; diff: string }>;
  costTimeline: Array<{ at: string; tokens: number; priceUsd: number; model: string }>;
  recoveryEvents: Array<{ at: string; layer: string; outcome: string; message: string }>;
  accessibilityIssues?: Array<{ severity: "error" | "warning" | "info"; rule: string; message: string; blockId?: string; suggestion?: string }>;
}

export interface DevToolsProps {
  data: DevToolsData;
  visible?: boolean;
  onClose?: () => void;
}

type TabKey = "request" | "response" | "validation" | "history" | "patches" | "cost" | "recovery" | "accessibility";

const TAB_LABELS: Record<TabKey, string> = {
  request: "Request",
  response: "Response",
  validation: "Validation",
  history: "Plan History",
  patches: "Patches",
  cost: "Cost",
  recovery: "Recovery",
  accessibility: "A11y"
};

export function WorkbenchDevTools(props: DevToolsProps): ReactElement | null {
  // All hooks MUST be called unconditionally before any early return (Rules of Hooks)
  const [tab, setTab] = useState<TabKey>("request");
  const totalCost = useMemo(
    () => props.data.costTimeline.reduce((acc, entry) => acc + entry.priceUsd, 0),
    [props.data.costTimeline]
  );
  const totalTokens = useMemo(
    () => props.data.costTimeline.reduce((acc, entry) => acc + entry.tokens, 0),
    [props.data.costTimeline]
  );

  if (props.visible === false) return null;

  return createElement(
    "aside",
    {
      className: "genui-devtools",
      style: {
        position: "fixed",
        right: 0,
        bottom: 0,
        width: 420,
        height: "60vh",
        background: "rgba(15, 23, 42, 0.97)",
        color: "#e2e8f0",
        fontFamily: "ui-monospace, Menlo, Consolas, monospace",
        fontSize: 12,
        border: "1px solid #1e293b",
        display: "flex",
        flexDirection: "column",
        zIndex: 9999
      }
    },
    [
      createElement(
        "header",
        {
          key: "header",
          style: {
            padding: "6px 10px",
            borderBottom: "1px solid #1e293b",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }
        },
        [
          createElement("strong", { key: "t" }, "GPT Spark DevTools"),
          createElement(
            "span",
            { key: "stats", style: { color: "#94a3b8" } },
            `tokens: ${totalTokens} · $${totalCost.toFixed(4)}`
          ),
          createElement(
            "button",
            {
              key: "close",
              onClick: props.onClose,
              style: { background: "transparent", color: "#94a3b8", border: "none", cursor: "pointer" }
            },
            "x"
          )
        ]
      ),
      createElement(
        "nav",
        {
          key: "nav",
          style: {
            display: "flex",
            gap: 2,
            padding: "4px 4px 0",
            borderBottom: "1px solid #1e293b",
            overflowX: "auto"
          }
        },
        (Object.keys(TAB_LABELS) as TabKey[]).map((key) =>
          createElement(
            "button",
            {
              key,
              onClick: () => setTab(key),
              style: {
                padding: "4px 8px",
                background: tab === key ? "#1e293b" : "transparent",
                color: tab === key ? "#e2e8f0" : "#94a3b8",
                border: "none",
                borderRadius: "4px 4px 0 0",
                cursor: "pointer",
                fontSize: 11
              }
            },
            TAB_LABELS[key]
          )
        )
      ),
      createElement(
        "div",
        {
          key: "body",
          style: { padding: 10, overflow: "auto", flex: 1 }
        },
        renderTabBody(tab, props.data)
      )
    ]
  );
}

function pre(children: string): ReactElement {
  return createElement(
    "pre",
    { style: { whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0, color: "#cbd5e1" } },
    children || "(empty)"
  );
}

function renderTabBody(tab: TabKey, data: DevToolsData): ReactElement | ReactElement[] {
  switch (tab) {
    case "request":
      return pre(data.gptRequest);
    case "response":
      return pre(data.gptResponseStream);
    case "validation":
      return pre(data.validationError ?? "All validations passed");
    case "history":
      return data.planHistory.map((entry, index) =>
        createElement(
          "div",
          {
            key: index,
            style: { borderBottom: "1px solid #1e293b", padding: "6px 0" }
          },
          [
            createElement("div", { key: "h", style: { color: "#94a3b8" } }, `${entry.at} · ${entry.title}`),
            pre(JSON.stringify(entry.plan, null, 2))
          ]
        )
      );
    case "patches":
      return data.patchDiffs.length === 0
        ? pre("(no patches yet)")
        : data.patchDiffs.map((entry, index) =>
            createElement(
              "div",
              { key: index, style: { borderBottom: "1px solid #1e293b", padding: "6px 0" } },
              [
                createElement("div", { key: "h", style: { color: "#94a3b8" } }, entry.at),
                pre(entry.diff)
              ]
            )
          );
    case "cost":
      return createElement(
        "table",
        { style: { width: "100%", borderCollapse: "collapse" } },
        [
          createElement(
            "thead",
            { key: "head" },
            createElement("tr", null, [
              createElement("th", { key: "t", style: { textAlign: "left" } }, "time"),
              createElement("th", { key: "m", style: { textAlign: "left" } }, "model"),
              createElement("th", { key: "tok", style: { textAlign: "right" } }, "tokens"),
              createElement("th", { key: "p", style: { textAlign: "right" } }, "$")
            ])
          ),
          createElement(
            "tbody",
            { key: "body" },
            data.costTimeline.map((entry, index) =>
              createElement("tr", { key: index }, [
                createElement("td", { key: "t" }, entry.at.split("T")[1]?.slice(0, 8) ?? entry.at),
                createElement("td", { key: "m" }, entry.model),
                createElement("td", { key: "tok", style: { textAlign: "right" } }, String(entry.tokens)),
                createElement("td", { key: "p", style: { textAlign: "right" } }, entry.priceUsd.toFixed(4))
              ])
            )
          )
        ]
      );
    case "recovery":
      return data.recoveryEvents.length === 0
        ? pre("(no recovery events)")
        : data.recoveryEvents.map((entry, index) =>
            createElement(
              "div",
              { key: index, style: { borderBottom: "1px solid #1e293b", padding: "4px 0" } },
              [
                createElement(
                  "span",
                  { key: "t", style: { color: "#94a3b8" } },
                  `[${entry.layer}/${entry.outcome}] `
                ),
                entry.message
              ]
            )
          );
    case "accessibility": {
      const issues = data.accessibilityIssues ?? [];
      if (issues.length === 0) return pre("No accessibility issues detected");
      const severityColor = (s: string): string =>
        s === "error" ? "#ef4444" : s === "warning" ? "#f59e0b" : "#3b82f6";
      return issues.map((issue, index) =>
        createElement("div", { key: index, style: { borderBottom: "1px solid #1e293b", padding: "6px 0" } }, [
          createElement("div", { key: "h", style: { display: "flex", gap: 8 } }, [
            createElement("span", { key: "s", style: { color: severityColor(issue.severity), fontWeight: 700, textTransform: "uppercase", fontSize: 10 } }, issue.severity),
            createElement("span", { key: "r", style: { color: "#94a3b8", fontSize: 11 } }, issue.rule),
            issue.blockId ? createElement("span", { key: "b", style: { color: "#64748b", fontSize: 10 } }, `· ${issue.blockId}`) : null
          ]),
          createElement("div", { key: "m", style: { color: "#cbd5e1", fontSize: 12, marginTop: 2 } }, issue.message),
          issue.suggestion ? createElement("div", { key: "sg", style: { color: "#64748b", fontSize: 11, marginTop: 2, fontStyle: "italic" } }, `💡 ${issue.suggestion}`) : null
        ])
      );
    }
  }
}
