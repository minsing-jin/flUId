import { useEffect } from "react";

export interface ActionDetail {
  action: string;
  payload: unknown;
  source: string;
}

function isActionDetail(v: unknown): v is ActionDetail {
  return (
    v !== null &&
    typeof v === "object" &&
    typeof (v as ActionDetail).action === "string" &&
    typeof (v as ActionDetail).source === "string"
  );
}

export interface UseGlobalActionListenerArgs {
  onStatus: (message: string) => void;
  onPrompt: (prompt: string) => void;
}

/**
 * Listens for genui:action CustomEvents fired by Generic Renderer
 * primitives (button, input, select). Updates sidebar status bar
 * and triggers prompt regeneration when action is "prompt".
 */
export function useGlobalActionListener(args: UseGlobalActionListenerArgs): void {
  const { onStatus, onPrompt } = args;

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!isActionDetail(detail)) return;
      const preview = JSON.stringify(detail.payload).slice(0, 40);
      onStatus(`${detail.source} · ${detail.action}: ${preview}`);
      if (detail.action === "prompt" && typeof detail.payload === "string") {
        onPrompt(detail.payload);
      }
    };
    globalThis.addEventListener("genui:action", handler);
    return () => globalThis.removeEventListener("genui:action", handler);
  }, [onStatus, onPrompt]);
}
