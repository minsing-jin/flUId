import { createElement, useCallback, useEffect, useState, type ReactElement } from "react";
import type { ConnectorConfig } from "@genui/core";

const STORAGE_KEY = "genui.connectors";

export interface UserConnector extends ConnectorConfig {
  name: string;
  active: boolean;
  lastStatus?: "idle" | "ok" | "error";
  lastError?: string;
}

function loadConnectors(): UserConnector[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as UserConnector[];
  } catch {
    return [];
  }
}

function saveConnectors(list: UserConnector[]): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch { /* ignore */ }
}

export interface ConnectorPanelProps {
  onChange: (connectors: UserConnector[]) => void;
}

export function ConnectorPanel({ onChange }: ConnectorPanelProps): ReactElement {
  const [list, setList] = useState<UserConnector[]>(() => loadConnectors());
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [type, setType] = useState<"rest" | "mock">("rest");
  const [refreshMs, setRefreshMs] = useState(5000);

  useEffect(() => { onChange(list); }, [list, onChange]);

  const add = useCallback(() => {
    if (!name.trim() || (type === "rest" && !url.trim())) return;
    const next: UserConnector = {
      id: `user-${Date.now()}`,
      name: name.trim(),
      type,
      source: type === "rest" ? url.trim() : "sales-kpi",
      refreshMs,
      active: true,
      lastStatus: "idle"
    };
    const updated = [...list, next];
    setList(updated);
    saveConnectors(updated);
    setName("");
    setUrl("");
  }, [name, url, type, refreshMs, list]);

  const remove = useCallback((id: string) => {
    const updated = list.filter((c) => c.id !== id);
    setList(updated);
    saveConnectors(updated);
  }, [list]);

  const toggle = useCallback((id: string) => {
    const updated = list.map((c) => c.id === id ? { ...c, active: !c.active } : c);
    setList(updated);
    saveConnectors(updated);
  }, [list]);

  const cardStyle: React.CSSProperties = {
    padding: 14,
    border: "1px solid var(--genui-border, #e2e8f0)",
    borderRadius: 10,
    display: "flex",
    flexDirection: "column",
    gap: 8,
    background: "var(--genui-bg, #fff)"
  };

  const inputStyle: React.CSSProperties = {
    padding: "6px 10px",
    border: "1px solid var(--genui-border, #cbd5e1)",
    borderRadius: 6,
    fontFamily: "ui-monospace, Menlo, monospace",
    fontSize: 12
  };

  const statusColor = (status?: string): string => {
    if (status === "ok") return "#22c55e";
    if (status === "error") return "#ef4444";
    return "#94a3b8";
  };

  return createElement("section", { style: cardStyle, "aria-label": "Data Connectors" }, [
    createElement("div", { key: "hdr", style: { display: "flex", justifyContent: "space-between", alignItems: "center" } }, [
      createElement("strong", { key: "t" }, "Data Sources"),
      createElement("small", { key: "c", style: { color: "#64748b" } }, `${list.filter((c) => c.active).length} active / ${list.length}`)
    ]),
    createElement("small", { key: "help", style: { color: "#64748b", fontSize: 11 } },
      "REST URL을 추가하면 실제 데이터가 UI에 주입됩니다. CORS 허용 필요."
    ),

    /* Existing list */
    ...list.map((c) =>
      createElement("div", {
        key: c.id,
        style: {
          display: "flex",
          gap: 6,
          alignItems: "center",
          padding: "6px 8px",
          background: c.active ? "rgba(79, 70, 229, 0.05)" : "transparent",
          borderRadius: 6,
          border: `1px solid ${c.active ? "rgba(79, 70, 229, 0.2)" : "#e2e8f0"}`
        }
      }, [
        createElement("span", { key: "dot", style: { width: 8, height: 8, borderRadius: "50%", background: statusColor(c.lastStatus) } }),
        createElement("div", { key: "info", style: { flex: 1, minWidth: 0 } }, [
          createElement("div", { key: "n", style: { fontSize: 12, fontWeight: 600 } }, c.name),
          createElement("div", { key: "u", style: { fontSize: 10, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, `${c.type} · ${c.source.slice(0, 40)}`)
        ]),
        createElement("button", {
          key: "t",
          onClick: () => toggle(c.id),
          style: { padding: "2px 6px", fontSize: 10, border: "1px solid #cbd5e1", borderRadius: 4, cursor: "pointer", background: c.active ? "#4f46e5" : "transparent", color: c.active ? "#fff" : "#64748b" }
        }, c.active ? "ON" : "OFF"),
        createElement("button", {
          key: "x",
          onClick: () => remove(c.id),
          style: { padding: "2px 6px", fontSize: 10, border: "none", background: "transparent", color: "#ef4444", cursor: "pointer" }
        }, "✕")
      ])
    ),

    /* Add form */
    createElement("div", { key: "form", style: { display: "flex", flexDirection: "column", gap: 6, paddingTop: 8, borderTop: "1px dashed #e2e8f0" } }, [
      createElement("input", {
        key: "n",
        placeholder: "Name (e.g. 'Sales API')",
        value: name,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value),
        style: inputStyle
      }),
      createElement("div", { key: "row", style: { display: "flex", gap: 4 } }, [
        createElement("select", {
          key: "t",
          value: type,
          onChange: (e: React.ChangeEvent<HTMLSelectElement>) => setType(e.target.value as "rest" | "mock"),
          style: { ...inputStyle, width: 70 }
        }, [
          createElement("option", { key: "rest", value: "rest" }, "REST"),
          createElement("option", { key: "mock", value: "mock" }, "Mock")
        ]),
        createElement("input", {
          key: "u",
          placeholder: type === "rest" ? "https://api..." : "sales-kpi",
          value: url,
          onChange: (e: React.ChangeEvent<HTMLInputElement>) => setUrl(e.target.value),
          style: { ...inputStyle, flex: 1 }
        })
      ]),
      createElement("div", { key: "refresh", style: { display: "flex", gap: 4, alignItems: "center" } }, [
        createElement("label", { key: "l", style: { fontSize: 10, color: "#64748b" } }, "Refresh:"),
        createElement("select", {
          key: "r",
          value: String(refreshMs),
          onChange: (e: React.ChangeEvent<HTMLSelectElement>) => setRefreshMs(Number(e.target.value)),
          style: { ...inputStyle, flex: 1 }
        }, [
          createElement("option", { key: "0", value: "0" }, "once"),
          createElement("option", { key: "3", value: "3000" }, "3 seconds"),
          createElement("option", { key: "5", value: "5000" }, "5 seconds"),
          createElement("option", { key: "15", value: "15000" }, "15 seconds"),
          createElement("option", { key: "60", value: "60000" }, "1 minute")
        ])
      ]),
      createElement("button", {
        key: "add",
        onClick: add,
        disabled: !name.trim() || (type === "rest" && !url.trim()),
        style: {
          padding: "6px 12px",
          borderRadius: 6,
          border: "none",
          background: "var(--genui-accent, #4f46e5)",
          color: "#fff",
          cursor: "pointer",
          fontSize: 12,
          fontWeight: 600,
          opacity: (!name.trim() || (type === "rest" && !url.trim())) ? 0.5 : 1
        }
      }, "+ Add Data Source")
    ])
  ]);
}
