import { createElement, useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import {
  ComponentRegistry,
  ToolRegistry,
  WorkbenchRuntime,
  FeedMode,
  seedSkillpacks,
  type UIPlan
} from "@genui/core";
import { DefaultReactRenderer, applyTheme, WorkbenchDevTools, type DevToolsData } from "@genui/renderer-react";
import { GPTPlanner, type GPTPlannerConfig } from "@genui/planner-core";
import { BYOKPanel, type BYOKConfig } from "./byok.js";
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

  useEffect(() => {
    if (!mountRef.current) return;
    rendererRef.current = new DefaultReactRenderer();
    if (plan) {
      rendererRef.current.renderPlan(plan, runtime, mountRef.current);
      applyTheme(mountRef.current, plan.theme);
    }
  }, [plan, runtime]);

  const appendDevData = useCallback(
    (next: Partial<DevToolsData>) =>
      setDevData((prev) => ({ ...prev, ...next })),
    []
  );

  const runPrompt = useCallback(
    async (inputPrompt: string, selected?: UseCase) => {
      const effectivePlanner = planner ?? new MockPlanner();
      setStatus("running");
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
