import { createElement, useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import {
  ComponentRegistry,
  ToolRegistry,
  WorkbenchRuntime,
  FeedMode,
  seedSkillpacks,
  DefaultConnectorRegistry,
  type UIPlan,
  type ConnectorResult
} from "@genui/core";
import { DefaultReactRenderer, applyTheme, WorkbenchDevTools, accessibilityCheck, type DevToolsData } from "@genui/renderer-react";
import { GPTPlanner, type GPTPlannerConfig } from "@genui/planner-core";
import { BYOKPanel, type BYOKConfig } from "./byok.js";
import { ConnectorPanel, type UserConnector } from "./connector-panel.js";
import { useCases, type UseCase } from "./use-cases.js";
import { MockPlanner } from "./planner.js";

const MODE_LABELS: Record<"prompt" | "interaction" | "feedPoll", string> = {
  prompt: "Mode 1 · Prompt",
  interaction: "Mode 2 · Patch",
  feedPoll: "Mode 3 · Feed"
};

function useRuntime(): WorkbenchRuntime {
  return useMemo(() => {
    const components = new ComponentRegistry();
    const tools = new ToolRegistry();
    return new WorkbenchRuntime(components, tools, {
      permissionAllowlist: new Set(["network", "files", "geo", "code_exec", "ads", "crm"]),
      devMode: true
    });
  }, []);
}

function allowlistedComponentTypes(): string[] {
  const all = new Set<string>();
  for (const pack of seedSkillpacks) {
    for (const component of pack.components) {
      all.add(component);
    }
  }
  return [...all];
}

export function App(): ReactElement {
  const runtime = useRuntime();
  const [byok, setByok] = useState<BYOKConfig>({ mode: "direct", apiKey: "", proxyUrl: "" });
  const [userConnectors, setUserConnectors] = useState<UserConnector[]>([]);
  const [plan, setPlan] = useState<UIPlan | null>(null);
  const [prompt, setPrompt] = useState("");
  const [devVisible, setDevVisible] = useState(true);
  const [status, setStatus] = useState<string>("idle");
  const [devData, setDevData] = useState<DevToolsData>({
    gptRequest: "",
    gptResponseStream: "",
    validationError: null,
    planHistory: [],
    patchDiffs: [],
    costTimeline: [],
    recoveryEvents: []
  });

  const mountRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<DefaultReactRenderer | null>(null);
  const feedModeRef = useRef<FeedMode | null>(null);

  const planner = useMemo(() => {
    if (byok.mode === "direct" && !byok.apiKey) return null;
    if (byok.mode === "proxy" && !byok.proxyUrl) return null;
    const config: GPTPlannerConfig = {
      transport:
        byok.mode === "direct"
          ? { kind: "direct", apiKey: byok.apiKey }
          : { kind: "proxy", proxyUrl: byok.proxyUrl },
      stream: true,
      fallbackPlanner: {
        plan: (p: string) => new MockPlanner().plan(p)
      }
    };
    return new GPTPlanner(config, {
      skillpacks: seedSkillpacks,
      allowlistedComponents: allowlistedComponentTypes()
    });
  }, [byok]);

  const connectorRef = useRef<DefaultConnectorRegistry | null>(null);
  if (!connectorRef.current) {
    connectorRef.current = new DefaultConnectorRegistry();
  }

  // Auto-load a welcome demo plan on first render
  useEffect(() => {
    const mock = new MockPlanner();
    const welcome = mock.plan("daily ops dashboard");
    setPlan(welcome);
    setStatus("welcome · live");
  }, []);

  // Global interaction listener — button clicks, input changes, select changes
  useEffect(() => {
    const onAction = (e: Event) => {
      const detail = (e as CustomEvent).detail as { action: string; payload: unknown; source: string };
      setStatus(`${detail.source} · ${detail.action}: ${JSON.stringify(detail.payload).slice(0, 40)}`);
      // If the button action requests a new prompt, run it
      if (detail.action === "prompt" && typeof detail.payload === "string") {
        void runPromptRef.current?.(detail.payload);
      }
    };
    globalThis.addEventListener("genui:action", onAction);
    return () => globalThis.removeEventListener("genui:action", onAction);
  }, []);

  const runPromptRef = useRef<((p: string) => Promise<void>) | null>(null);

  // Render plan + start live data subscriptions
  useEffect(() => {
    if (!mountRef.current || !plan) return;
    rendererRef.current = rendererRef.current ?? new DefaultReactRenderer();
    rendererRef.current.renderPlan(plan, runtime, mountRef.current);
    applyTheme(mountRef.current, plan.theme);

    // Run accessibility check on every plan load
    const issues = accessibilityCheck(plan);
    setDevData((prev) => ({ ...prev, accessibilityIssues: issues }));

    // Subscribe to mock data for live updates
    const connector = connectorRef.current;
    if (!connector) return;
    connector.unsubscribeAll();

    // Subscribe to plan.dataSources[].connector (auto-wired from GPT/Mock planner)
    for (const ds of plan.dataSources) {
      if (!ds.connector) continue;
      const cfg = { id: `plan-${ds.id}`, ...ds.connector };
      connector.subscribeTo(cfg, (result: ConnectorResult) => {
        if (result.error || !result.data || !plan || !mountRef.current || !rendererRef.current) return;
        const targetId = ds.connector?.targetBlockId;
        const target = targetId ? plan.blocks.find((b) => b.id === targetId) : plan.blocks.find((b) => b.type === "KPIGrid");
        if (!target) return;
        const data = result.data;
        if (typeof data !== "object" || data === null || Array.isArray(data)) return;
        const entries = Object.entries(data as Record<string, unknown>).filter(([, v]) => typeof v === "number" || typeof v === "string");
        if (entries.length === 0) return;
        const items = entries.slice(0, 4).map(([k, v]) => ({
          label: k,
          value: String(v).length > 16 ? String(v).slice(0, 14) + "…" : String(v),
          change: ""
        }));
        const updated = {
          ...plan,
          blocks: plan.blocks.map((b) => b.id === target.id ? { ...b, props: { ...b.props, items } } : b)
        };
        rendererRef.current.update(updated);
      });
    }

    // Subscribe to user-added REST/mock connectors first (real data priority)
    for (const uc of userConnectors) {
      if (!uc.active) continue;
      connector.subscribeTo(uc, (result: ConnectorResult) => {
        setUserConnectors((prev) => prev.map((c) => c.id === uc.id
          ? { ...c, lastStatus: result.error ? "error" : "ok", lastError: result.error }
          : c
        ));
        if (result.error || !result.data || !plan || !mountRef.current || !rendererRef.current) return;
        // Inject user data into first KPIGrid if it's a record of numbers
        const data = result.data;
        if (typeof data !== "object" || data === null || Array.isArray(data)) return;
        const entries = Object.entries(data as Record<string, unknown>).filter(([, v]) => typeof v === "number" || typeof v === "string");
        if (entries.length === 0) return;
        const kpiBlock = plan.blocks.find((b) => b.type === "KPIGrid");
        if (!kpiBlock) return;
        const items = entries.slice(0, 4).map(([k, v]) => ({
          label: `${uc.name} · ${k}`,
          value: String(v).length > 16 ? String(v).slice(0, 14) + "…" : String(v),
          change: ""
        }));
        const updated = {
          ...plan,
          blocks: plan.blocks.map((b) => b.id === kpiBlock.id ? { ...b, props: { ...b.props, items } } : b)
        };
        rendererRef.current.update(updated);
      });
    }

    // Determine which mock scenario to use based on plan intent
    const scenario = plan.intent === "analysis" || plan.intent === "sales"
      ? "sales-kpi"
      : plan.intent === "marketing"
        ? "marketing"
        : plan.intent === "ops"
          ? "server-status"
          : "traffic";

    // Subscribe for live KPI updates
    connector.subscribeTo(
      { id: "live-kpi", type: "mock", source: scenario, refreshMs: 3000 },
      (result: ConnectorResult) => {
        if (!result.data || !plan || !mountRef.current || !rendererRef.current) return;
        const data = result.data as Record<string, number>;
        const kpiBlock = plan.blocks.find((b) => b.type === "KPIGrid");
        if (!kpiBlock) return;

        const items = Array.isArray(kpiBlock.props.items) ? [...kpiBlock.props.items] : [];
        const entries = Object.entries(data);
        for (let i = 0; i < Math.min(items.length, entries.length); i++) {
          const [, val] = entries[i] ?? [];
          if (val === undefined) continue;
          const item = items[i] as Record<string, unknown> | undefined;
          if (!item) continue;
          const formatted = typeof val === "number"
            ? val > 10000 ? `${(val / 1000).toFixed(0)}K`
              : val > 1000 ? `${(val / 1000).toFixed(1)}K`
                : val < 1 ? `${val}` // percentage
                  : val % 1 !== 0 ? `${val.toFixed(1)}%`
                    : `${val.toLocaleString()}`
            : String(val);
          items[i] = { ...item, value: formatted };
        }

        const updatedPlan = {
          ...plan,
          blocks: plan.blocks.map((b) =>
            b.id === kpiBlock.id ? { ...b, props: { ...b.props, items } } : b
          )
        };
        rendererRef.current.update(updatedPlan);
      }
    );

    // Subscribe for live chart updates
    connector.subscribeTo(
      { id: "live-chart", type: "mock", source: "timeseries", refreshMs: 5000 },
      (result: ConnectorResult) => {
        if (!result.data || !plan || !mountRef.current || !rendererRef.current) return;
        const ts = result.data as { labels: string[]; values: number[] };
        const chartBlock = plan.blocks.find((b) => b.type === "ChartBlock");
        if (!chartBlock) return;

        const updatedPlan = {
          ...plan,
          blocks: plan.blocks.map((b) =>
            b.id === chartBlock.id ? { ...b, props: { ...b.props, labels: ts.labels, series: [{ name: "live", data: ts.values }] } } : b
          )
        };
        rendererRef.current.update(updatedPlan);
      }
    );

    return () => { connector.unsubscribeAll(); };
  }, [plan, runtime, userConnectors]);

  const appendDevData = useCallback(
    (next: Partial<DevToolsData>) =>
      setDevData((prev) => ({ ...prev, ...next })),
    []
  );

  const runPrompt = useCallback(
    async (inputPrompt: string, selected?: UseCase) => {
      const effectivePlanner = planner ?? new MockPlanner();
      setStatus("generating...");

      // Show loading skeleton while generating
      if (mountRef.current && rendererRef.current) {
        rendererRef.current.showLoading(mountRef.current);
      }
      try {
        if ("planWithResponse" in effectivePlanner && planner) {
          const response = await planner.planWithResponse(inputPrompt, {
            triggerMode: "prompt",
            grantedPermissions: ["network", "files", "geo"]
          });
          const next = response.uiPlan;
          setPlan(next);
          const trace = planner.getLastTrace();
          if (trace) {
            appendDevData({
              gptRequest: trace.request.map((m) => `[${m.role}]\n${m.content}`).join("\n\n"),
              gptResponseStream: trace.rawResponse,
              validationError: null,
              planHistory: [...devData.planHistory, { at: new Date().toISOString(), title: next.title, plan: next }],
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
          setStatus(`ok · ${selected?.id ?? "custom"}`);
        } else {
          const fallbackPlan = (effectivePlanner as MockPlanner).plan(inputPrompt);
          setPlan(fallbackPlan);
          setStatus("ok · mock");
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setStatus(`error: ${message}`);
        appendDevData({ validationError: message });
      }
    },
    [planner, devData.planHistory, devData.costTimeline, appendDevData]
  );

  // Keep ref updated so the global action listener can call the latest runPrompt
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
          "10 use cases · 3 trigger modes · shadcn-ready"
        ),
        createElement(BYOKPanel, { key: "byok", onChange: setByok }),
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
            createElement(
              "button",
              {
                key: "b",
                onClick: () => void runPrompt(prompt),
                style: {
                  padding: "8px 12px",
                  border: "none",
                  borderRadius: 6,
                  background: "#4f46e5",
                  color: "#ffffff",
                  cursor: "pointer"
                }
              },
              "Generate UI"
            )
          ]
        ),
        createElement(
          "section",
          { key: "cases", style: { display: "flex", flexDirection: "column", gap: 4 } },
          [
            createElement("strong", { key: "h", style: { fontSize: 12 } }, "Use Cases"),
            ...useCases.map((uc) =>
              createElement(
                "button",
                {
                  key: uc.id,
                  onClick: () => runUseCase(uc),
                  style: {
                    textAlign: "left",
                    padding: 8,
                    border: "1px solid #e2e8f0",
                    borderRadius: 6,
                    background: "#ffffff",
                    cursor: "pointer"
                  }
                },
                [
                  createElement("div", { key: "t", style: { fontWeight: 600 } }, `${uc.id}. ${uc.title}`),
                  createElement("div", { key: "d", style: { color: "#64748b", fontSize: 11 } }, uc.description),
                  createElement(
                    "div",
                    { key: "m", style: { color: "#94a3b8", fontSize: 10 } },
                    MODE_LABELS[uc.triggerMode]
                  )
                ]
              )
            )
          ]
        ),
        createElement(
          "div",
          { key: "toggle", style: { display: "flex", gap: 6 } },
          [
            createElement(
              "button",
              {
                key: "dev",
                onClick: () => setDevVisible((v) => !v),
                style: {
                  padding: "6px 10px",
                  fontSize: 11,
                  border: "1px solid #cbd5e1",
                  borderRadius: 6,
                  background: "transparent",
                  cursor: "pointer"
                }
              },
              devVisible ? "Hide DevTools" : "Show DevTools"
            ),
            createElement("span", { key: "status", style: { fontSize: 11, color: "#64748b" } }, status)
          ]
        )
      ]
    ),
    createElement("main", { key: "main", ref: mountRef, className: "genui-react-workbench" }),
    createElement(WorkbenchDevTools, { key: "dev", data: devData, visible: devVisible, onClose: () => setDevVisible(false) })
  ]);
}
