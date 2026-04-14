import { createElement, useEffect, useState, type ReactElement } from "react";

const STORAGE_KEY = "genui.gptspark.byok";
const PROXY_KEY = "genui.gptspark.proxy";

export interface BYOKConfig {
  mode: "direct" | "proxy";
  apiKey: string;
  proxyUrl: string;
}

export function loadBYOK(): BYOKConfig {
  try {
    const apiKey = localStorage.getItem(STORAGE_KEY) ?? "";
    const proxyUrl = localStorage.getItem(PROXY_KEY) ?? "";
    return {
      mode: proxyUrl ? "proxy" : "direct",
      apiKey,
      proxyUrl
    };
  } catch {
    return { mode: "direct", apiKey: "", proxyUrl: "" };
  }
}

export function saveBYOK(config: BYOKConfig): void {
  try {
    if (config.mode === "direct") {
      localStorage.setItem(STORAGE_KEY, config.apiKey);
      localStorage.removeItem(PROXY_KEY);
    } else {
      localStorage.setItem(PROXY_KEY, config.proxyUrl);
    }
  } catch {
    // ignore
  }
}

export interface BYOKPanelProps {
  onChange: (config: BYOKConfig) => void;
}

export function BYOKPanel({ onChange }: BYOKPanelProps): ReactElement {
  const [config, setConfig] = useState<BYOKConfig>(() => loadBYOK());

  useEffect(() => {
    onChange(config);
  }, [config, onChange]);

  const wrapperStyle: React.CSSProperties = {
    padding: 14,
    border: "1px solid var(--genui-border, #e2e8f0)",
    borderRadius: 8,
    display: "flex",
    flexDirection: "column",
    gap: 8,
    background: "var(--genui-bg, #ffffff)",
    color: "var(--genui-fg, #0f172a)"
  };

  const inputStyle: React.CSSProperties = {
    padding: "6px 8px",
    border: "1px solid var(--genui-border, #cbd5e1)",
    borderRadius: 6,
    fontFamily: "ui-monospace, Menlo, Consolas, monospace",
    fontSize: 12
  };

  return createElement(
    "section",
    { style: wrapperStyle, "aria-label": "GPT Spark BYOK" },
    [
      createElement("strong", { key: "t" }, "Bring Your Own Key"),
      createElement(
        "small",
        { key: "warn", style: { color: "#64748b" } },
        "API 키는 이 브라우저의 localStorage에만 저장됩니다. 공용 기기에서는 사용하지 마세요."
      ),
      createElement(
        "div",
        { key: "mode", style: { display: "flex", gap: 12 } },
        [
          createElement("label", { key: "direct" }, [
            createElement("input", {
              key: "r1",
              type: "radio",
              name: "byok-mode",
              checked: config.mode === "direct",
              onChange: () => setConfig({ ...config, mode: "direct" })
            }),
            " Direct (BYOK)"
          ]),
          createElement("label", { key: "proxy" }, [
            createElement("input", {
              key: "r2",
              type: "radio",
              name: "byok-mode",
              checked: config.mode === "proxy",
              onChange: () => setConfig({ ...config, mode: "proxy" })
            }),
            " Proxy"
          ])
        ]
      ),
      config.mode === "direct"
        ? createElement("input", {
            key: "key",
            type: "password",
            placeholder: "sk-...",
            value: config.apiKey,
            onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
              setConfig({ ...config, apiKey: e.target.value }),
            style: inputStyle
          })
        : createElement("input", {
            key: "proxy",
            type: "url",
            placeholder: "https://your-proxy.example.com/v1/chat/completions",
            value: config.proxyUrl,
            onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
              setConfig({ ...config, proxyUrl: e.target.value }),
            style: inputStyle
          }),
      createElement(
        "button",
        {
          key: "save",
          onClick: () => saveBYOK(config),
          style: {
            padding: "6px 12px",
            borderRadius: 6,
            border: "none",
            background: "var(--genui-accent, #4f46e5)",
            color: "var(--genui-accent-fg, #ffffff)",
            cursor: "pointer",
            alignSelf: "flex-start"
          }
        },
        "Save"
      )
    ]
  );
}
