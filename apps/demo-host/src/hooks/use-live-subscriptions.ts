import { useEffect, type RefObject } from "react";
import type { DefaultConnectorRegistry, ConnectorResult, UIPlan } from "@genui/core";
import type { DefaultReactRenderer } from "@genui/renderer-react";
import type { UserConnector } from "../connector-panel.js";

interface KpiItem {
  label: string;
  value: string;
  change?: string;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function toKpiEntries(data: unknown): Array<[string, string]> {
  if (!isPlainObject(data)) return [];
  return Object.entries(data)
    .filter(([, v]) => typeof v === "number" || typeof v === "string")
    .map(([k, v]) => [k, String(v)]);
}

function formatNumber(val: number): string {
  if (val > 10000) return `${(val / 1000).toFixed(0)}K`;
  if (val > 1000) return `${(val / 1000).toFixed(1)}K`;
  if (val < 1) return `${val}`;
  if (val % 1 !== 0) return `${val.toFixed(1)}%`;
  return val.toLocaleString();
}

function truncate(v: string, max = 14): string {
  return v.length > max + 2 ? v.slice(0, max) + "…" : v;
}

function updateBlockProps(plan: UIPlan, blockId: string, propsPatch: Record<string, unknown>): UIPlan {
  return {
    ...plan,
    blocks: plan.blocks.map((b) =>
      b.id === blockId ? { ...b, props: { ...b.props, ...propsPatch } } : b
    )
  };
}

function findKpiBlock(plan: UIPlan, targetId?: string): { id: string; existingItems: KpiItem[] } | null {
  const target = targetId
    ? plan.blocks.find((b) => b.id === targetId)
    : plan.blocks.find((b) => b.type === "KPIGrid");
  if (!target) return null;
  const existingItems = Array.isArray(target.props.items) ? (target.props.items as KpiItem[]) : [];
  return { id: target.id, existingItems };
}

function intentToScenario(intent: UIPlan["intent"]): string {
  if (intent === "analysis" || intent === "sales") return "sales-kpi";
  if (intent === "marketing") return "marketing";
  if (intent === "ops") return "server-status";
  return "traffic";
}

export interface UseLiveSubscriptionsArgs {
  plan: UIPlan | null;
  connectorRef: RefObject<DefaultConnectorRegistry | null>;
  rendererRef: RefObject<DefaultReactRenderer | null>;
  mountRef: RefObject<HTMLElement | null>;
  userConnectors: UserConnector[];
  setUserConnectors: (updater: (prev: UserConnector[]) => UserConnector[]) => void;
}

/**
 * Manages live data subscriptions for the current plan:
 * 1. Auto-wired plan.dataSources[].connector → inject into target block
 * 2. User-added REST/mock/WebSocket connectors → inject into first KPIGrid
 * 3. Built-in mock scenario by plan.intent → rolling KPI/chart updates
 */
export function useLiveSubscriptions(args: UseLiveSubscriptionsArgs): void {
  const { plan, connectorRef, rendererRef, mountRef, userConnectors, setUserConnectors } = args;

  useEffect(() => {
    if (!plan || !mountRef.current || !rendererRef.current) return;
    const connector = connectorRef.current;
    if (!connector) return;
    connector.unsubscribeAll();

    // 1) Auto-wired plan data sources
    for (const ds of plan.dataSources) {
      if (!ds.connector) continue;
      const cfg = { id: `plan-${ds.id}`, ...ds.connector };
      connector.subscribeTo(cfg, (result: ConnectorResult) => {
        if (result.error || !rendererRef.current) return;
        const kpi = findKpiBlock(plan, ds.connector?.targetBlockId);
        if (!kpi) return;
        const entries = toKpiEntries(result.data);
        if (entries.length === 0) return;
        const items: KpiItem[] = entries.slice(0, 4).map(([k, v]) => ({
          label: k,
          value: truncate(v),
          change: ""
        }));
        rendererRef.current.update(updateBlockProps(plan, kpi.id, { items }));
      });
    }

    // 2) User-added REST/mock/websocket connectors
    for (const uc of userConnectors) {
      if (!uc.active) continue;
      connector.subscribeTo(uc, (result: ConnectorResult) => {
        setUserConnectors((prev) =>
          prev.map((c) =>
            c.id === uc.id
              ? { ...c, lastStatus: result.error ? "error" : "ok", lastError: result.error }
              : c
          )
        );
        if (result.error || !rendererRef.current) return;
        const kpi = findKpiBlock(plan);
        if (!kpi) return;
        const entries = toKpiEntries(result.data);
        if (entries.length === 0) return;
        const items: KpiItem[] = entries.slice(0, 4).map(([k, v]) => ({
          label: `${uc.name} · ${k}`,
          value: truncate(v),
          change: ""
        }));
        rendererRef.current.update(updateBlockProps(plan, kpi.id, { items }));
      });
    }

    // 3) Built-in mock scenario rolling KPI updates
    const scenario = intentToScenario(plan.intent);
    connector.subscribeTo(
      { id: "live-kpi", type: "mock", source: scenario, refreshMs: 3000 },
      (result: ConnectorResult) => {
        if (!rendererRef.current || !isPlainObject(result.data)) return;
        const kpi = findKpiBlock(plan);
        if (!kpi) return;
        const data = result.data;
        const items: KpiItem[] = kpi.existingItems.map((existing, i) => {
          const entry = Object.entries(data)[i];
          if (!entry) return existing;
          const val = entry[1];
          const formatted =
            typeof val === "number" ? formatNumber(val) : typeof val === "string" ? val : String(val);
          return { ...existing, value: formatted };
        });
        rendererRef.current.update(updateBlockProps(plan, kpi.id, { items }));
      }
    );

    // 4) Built-in mock time series for ChartBlock
    connector.subscribeTo(
      { id: "live-chart", type: "mock", source: "timeseries", refreshMs: 5000 },
      (result: ConnectorResult) => {
        if (!rendererRef.current || !isPlainObject(result.data)) return;
        const ts = result.data as { labels?: unknown; values?: unknown };
        if (!Array.isArray(ts.labels) || !Array.isArray(ts.values)) return;
        const chart = plan.blocks.find((b) => b.type === "ChartBlock");
        if (!chart) return;
        rendererRef.current.update(
          updateBlockProps(plan, chart.id, {
            labels: ts.labels,
            series: [{ name: "live", data: ts.values }]
          })
        );
      }
    );

    return () => {
      connector.unsubscribeAll();
    };
  }, [plan, connectorRef, rendererRef, mountRef, userConnectors, setUserConnectors]);
}
