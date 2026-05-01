import { createElement, useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import {
  ComponentRegistry,
  ToolRegistry,
  WorkbenchRuntime,
  DefaultConnectorRegistry,
  type UIPlan
} from "@genui/core";
import { DefaultReactRenderer, applyTheme, WorkbenchDevTools, type DevToolsData, type AccessibilityIssue } from "@genui/renderer-react";
import { MultiAgentPlanner, GPTPlanner } from "@genui/planner-core";
import { BYOKPanel, type BYOKConfig } from "./byok.js";
import { ConnectorPanel, type UserConnector } from "./connector-panel.js";
import { useCases, type UseCase } from "./use-cases.js";
import { MockPlanner } from "./planner.js";
import { useLiveSubscriptions } from "./hooks/use-live-subscriptions.js";
import { useGlobalActionListener } from "./hooks/use-global-action-listener.js";
import { useAccessibility } from "./hooks/use-accessibility.js";
import { usePlanner, type PlannerMode } from "./hooks/use-planner.js";

const MODE_LABELS: Record<"prompt" | "interaction" | "feedPoll", string> = {
  prompt: "Mode 1 · Prompt",
  interaction: "Mode 2 · Patch",
  feedPoll: "Mode 3 · Feed"
};

const EMPTY_DEV_DATA: DevToolsData = {
  gptRequest: "",
  gptResponseStream: "",
  validationError: null,
  planHistory: [],
  patchDiffs: [],
  costTimeline: [],
  recoveryEvents: [],
  accessibilityIssues: []
};

function useRuntime(): WorkbenchRuntime {
  return useMemo(() => {
    const components = new ComponentRegistry();
    const tools = new ToolRegistry();
    return new WorkbenchRuntime(components, tools, {
      permissionAllowlist: new Set(["network", "files", "geo", "code_exec", "ads", "crm", "social_auth"]),
      devMode: true
    });
  }, []);
}

export function App(): ReactElement {
  const runtime = useRuntime();
  const [byok, setByok] = useState<BYOKConfig>({ mode: "direct", apiKey: "", proxyUrl: "" });
  const [plannerMode, setPlannerMode] = useState<PlannerMode>("single");
  const [userConnectors, setUserConnectors] = useState<UserConnector[]>([]);
  const [plan, setPlan] = useState<UIPlan | null>(null);
  const [prompt, setPrompt] = useState("");
  const [devVisible, setDevVisible] = useState(true);
  const [status, setStatus] = useState<string>("idle");
  const [devData, setDevData] = useState<DevToolsData>(EMPTY_DEV_DATA);

  const mountRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<DefaultReactRenderer | null>(null);
  const connectorRef = useRef<DefaultConnectorRegistry | null>(null);
  const runPromptRef = useRef<((p: string) => Promise<void>) | null>(null);
  if (!connectorRef.current) connectorRef.current = new DefaultConnectorRegistry();

  const { kind: plannerKind, planner } = usePlanner(byok, plannerMode);

  // Auto-load a welcome demo plan on first render
  useEffect(() => {
    setPlan(new MockPlanner().plan("daily ops dashboard"));
    setStatus("welcome · live");
  }, []);

  // Render plan + apply theme (split from subscriptions)
  useEffect(() => {
    if (!mountRef.current || !plan) return;
    rendererRef.current = rendererRef.current ?? new DefaultReactRenderer();
    rendererRef.current.renderPlan(plan, runtime, mountRef.current);
    applyTheme(mountRef.current, plan.theme);
  }, [plan, runtime]);

  // Accessibility check — extracted hook
  useAccessibility({
    plan,
    onIssues: useCallback((issues: AccessibilityIssue[]) => {
      setDevData((prev) => ({ ...prev, accessibilityIssues: issues }));
    }, [])
  });

  // Live data subscriptions — extracted hook
  useLiveSubscriptions({
    plan,
    connectorRef,
    rendererRef,
    mountRef,
    userConnectors,
    setUserConnectors
  });

  // Global action listener — extracted hook
  useGlobalActionListener({
    onStatus: setStatus,
    onPrompt: useCallback((p: string) => {
      void runPromptRef.current?.(p);
    }, [])
  });

  const appendDevData = useCallback(
    (next: Partial<DevToolsData>) => setDevData((prev) => ({ ...prev, ...next })),
    []
  );

  const runPrompt = useCallback(
    async (inputPrompt: string, selected?: UseCase) => {
      const mock = new MockPlanner();
      setStatus("generating...");
      if (mountRef.current && rendererRef.current) {
        rendererRef.current.showLoading(mountRef.current);
      }
      try {
        if (planner) {
          const response = await planner.planWithResponse(inputPrompt, {
            triggerMode: "prompt",
            grantedPermissions: ["network", "files", "geo", "social_auth"]
          });
          setPlan(response.uiPlan);
          // GPTPlanner trace (MultiAgent trace shape is compatible subset)
          if (planner instanceof GPTPlanner) {
            const trace = planner.getLastTrace();
            if (trace) {
              appendDevData({
                gptRequest: trace.request.map((m) => `[${m.role}]\n${m.content}`).join("\n\n"),
                gptResponseStream: trace.rawResponse,
                validationError: null,
                planHistory: [
                  ...devData.planHistory,
                  { at: new Date().toISOString(), title: response.uiPlan.title, plan: response.uiPlan }
                ],
                costTimeline: [
                  ...devData.costTimeline,
                  {
                    at: new Date().toISOString(),
                    tokens: trace.tokensPrompt + trace.tokensCompletion,
                    priceUsd: trace.costSnapshot.costUsd,
                    model: planner.getCostLedger().selectModel("prompt")
                  }
                ],
                recoveryEvents: trace.recoveryEvents.map((event) => ({
                  at: event.at,
                  layer: event.layer,
                  outcome: event.outcome,
                  message: event.message
                }))
              });
            }
          } else if (planner instanceof MultiAgentPlanner) {
            const trace = planner.getLastTrace();
            if (trace) {
              appendDevData({
                gptRequest: `[multi-agent] intent=${trace.intent.intent} complexity=${trace.intent.complexity} keywords=${trace.intent.keywords.join(", ")}`,
                gptResponseStream: trace.rawResponse,
                costTimeline: [
                  ...devData.costTimeline,
                  {
                    at: new Date().toISOString(),
                    tokens: trace.tokensTotal,
                    priceUsd: 0,
                    model: "multi-agent"
                  }
                ]
              });
            }
          }
          setStatus(`ok · ${plannerKind} · ${selected?.id ?? "custom"}`);
        } else {
          setPlan(mock.plan(inputPrompt));
          setStatus("ok · mock");
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setStatus(`error: ${message}`);
        appendDevData({ validationError: message });
      }
    },
    [planner, plannerKind, devData.planHistory, devData.costTimeline, appendDevData]
  );

  useEffect(() => {
    runPromptRef.current = (p: string) => runPrompt(p);
  }, [runPrompt]);

  const runUseCase = useCallback(
    (useCase: UseCase) => {
      setPrompt(useCase.prompt);
      void runPrompt(useCase.prompt, useCase);
    },
    [runPrompt]
  );

  const shellStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "320px 1fr",
    gap: 16,
    padding: 16,
    minHeight: "100vh",
    background: "var(--genui-bg, #f8fafc)",
    color: "var(--genui-fg, #0f172a)",
    fontFamily: "var(--genui-font-family, system-ui)"
  };

  const canUseMultiAgent = byok.mode === "direct" && byok.apiKey.length > 0;

  return createElement("div", { style: shellStyle }, [
    createElement(
      "aside",
      {
        key: "sidebar",
        style: { display: "flex", flexDirection: "column", gap: 12 }
      },
      [
        createElement("h1", { key: "title", style: { margin: 0, fontSize: 18 } }, "GPT Spark · flUId"),
        createElement("p", { key: "sub", style: { margin: 0, color: "#64748b", fontSize: 12 } },
          "10+ use cases · 6 skillpacks · 3 modes · shadcn-ready"
        ),
        createElement(BYOKPanel, { key: "byok", onChange: setByok }),

        // Planner mode toggle — only meaningful when BYOK direct is configured
        canUseMultiAgent && createElement(
          "section",
          { key: "planner-mode", style: { padding: 10, border: "1px solid var(--genui-border, #e2e8f0)", borderRadius: 8, background: "var(--genui-bg, #fff)" } },
          [
            createElement("div", { key: "l", style: { fontSize: 11, fontWeight: 600, marginBottom: 6, color: "#64748b" } }, "PLANNER MODE"),
            createElement("div", { key: "row", style: { display: "flex", gap: 4 } }, [
              createElement("button", {
                key: "single",
                onClick: () => setPlannerMode("single"),
                style: tabBtn(plannerMode === "single")
              }, "Single GPT"),
              createElement("button", {
                key: "multi",
                onClick: () => setPlannerMode("multi-agent"),
                style: tabBtn(plannerMode === "multi-agent")
              }, "Multi-Agent")
            ])
          ]
        ),

        createElement(ConnectorPanel, { key: "connectors", onChange: setUserConnectors }),

        createElement(
          "section",
          { key: "prompt", style: { display: "flex", flexDirection: "column", gap: 6 } },
          [
            createElement("label", { key: "l", style: { fontSize: 12, color: "#64748b" } }, "프롬프트"),
            createElement("textarea", {
              key: "ta",
              value: prompt,
              onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => setPrompt(e.target.value),
              rows: 3,
              style: { padding: 8, borderRadius: 6, border: "1px solid #cbd5e1", fontFamily: "inherit" }
            }),
            createElement("button", {
              key: "b",
              onClick: () => void runPrompt(prompt),
              style: generateBtn
            }, "Generate UI")
          ]
        ),

        createElement(
          "section",
          { key: "cases", style: { display: "flex", flexDirection: "column", gap: 4 } },
          [
            createElement("strong", { key: "h", style: { fontSize: 12 } }, "Use Cases"),
            ...useCases.map((uc) => createElement("button", {
              key: uc.id,
              onClick: () => runUseCase(uc),
              style: caseBtn
            }, [
              createElement("div", { key: "t", style: { fontWeight: 600 } }, `${uc.id}. ${uc.title}`),
              createElement("div", { key: "d", style: { color: "#64748b", fontSize: 11 } }, uc.description),
              createElement("div", { key: "m", style: { color: "#94a3b8", fontSize: 10 } }, MODE_LABELS[uc.triggerMode])
            ]))
          ]
        ),

        createElement(
          "div",
          { key: "toggle", style: { display: "flex", gap: 6, flexWrap: "wrap" } },
          [
            createElement("button", {
              key: "dev",
              onClick: () => setDevVisible((v) => !v),
              style: toggleBtn
            }, devVisible ? "Hide DevTools" : "Show DevTools"),
            createElement("button", {
              key: "export",
              onClick: () => {
                if (typeof window !== "undefined") {
                  // Hide sidebar + devtools at print time via a class; main area prints
                  document.body.classList.add("genui-print-mode");
                  window.print();
                  setTimeout(() => document.body.classList.remove("genui-print-mode"), 500);
                }
              },
              title: "Export current view as PDF (browser print → save as PDF)",
              style: toggleBtn
            }, "Export PDF"),
            createElement("span", { key: "status", style: { fontSize: 11, color: "#64748b", flexBasis: "100%" } }, status)
          ]
        )
      ]
    ),
    createElement("main", { key: "main", ref: mountRef, className: "genui-react-workbench" }),
    createElement(WorkbenchDevTools, { key: "dev", data: devData, visible: devVisible, onClose: () => setDevVisible(false) })
  ]);
}

/* ── Inline styles (hoisted for clarity) ── */
function tabBtn(active: boolean): React.CSSProperties {
  return {
    flex: 1,
    padding: "6px 10px",
    fontSize: 11,
    fontWeight: 600,
    border: "1px solid var(--genui-border, #e2e8f0)",
    borderRadius: 6,
    background: active ? "var(--genui-accent, #4f46e5)" : "transparent",
    color: active ? "var(--genui-accent-fg, #fff)" : "var(--genui-fg, #0f172a)",
    cursor: "pointer"
  };
}

const generateBtn: React.CSSProperties = {
  padding: "8px 12px",
  border: "none",
  borderRadius: 6,
  background: "#4f46e5",
  color: "#ffffff",
  cursor: "pointer"
};

const caseBtn: React.CSSProperties = {
  textAlign: "left",
  padding: 8,
  border: "1px solid #e2e8f0",
  borderRadius: 6,
  background: "#ffffff",
  cursor: "pointer"
};

const toggleBtn: React.CSSProperties = {
  padding: "6px 10px",
  fontSize: 11,
  border: "1px solid #cbd5e1",
  borderRadius: 6,
  background: "transparent",
  cursor: "pointer"
};
