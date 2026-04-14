import { GENUI_PROTOCOL_VERSION, isHostToWidgetMessage, type WidgetToHostMessage } from "../protocol/index.js";

export interface WidgetBridgeHandlers {
  onInit?: (payload: { grantedPermissions: string[]; enabledSkills: string[]; theme?: string }) => void;
  onPrompt?: (text: string) => void;
  onPatch?: (patch: unknown) => void;
  onDispose?: () => void;
}

function postToHost(message: WidgetToHostMessage): void {
  window.parent?.postMessage(message, "*");
}

export function initWidgetBridge(handlers: WidgetBridgeHandlers = {}): void {
  postToHost({ type: "GENUI_READY", version: GENUI_PROTOCOL_VERSION });

  window.addEventListener("message", (event: MessageEvent<unknown>) => {
    if (!isHostToWidgetMessage(event.data)) {
      return;
    }

    if (event.data.type === "GENUI_INIT") {
      handlers.onInit?.({
        grantedPermissions: event.data.grantedPermissions,
        enabledSkills: event.data.enabledSkills,
        theme: event.data.theme
      });
      return;
    }

    if (event.data.type === "GENUI_PROMPT") {
      handlers.onPrompt?.(event.data.text);
      return;
    }

    if (event.data.type === "GENUI_PATCH") {
      handlers.onPatch?.(event.data.patch);
      return;
    }

    if (event.data.type === "GENUI_DISPOSE") {
      handlers.onDispose?.();
    }
  });
}

export function requestPermissions(permissionsRequested: string[]): void {
  postToHost({
    type: "GENUI_REQUEST_PERMISSION",
    permissionsRequested
  });
}

export function emitToolCall(toolName: string, input: unknown, callId: string): void {
  postToHost({
    type: "GENUI_TOOL_CALL",
    toolName,
    input,
    callId
  });
}

export function emitLogEvent(event: Record<string, unknown>): void {
  postToHost({
    type: "GENUI_LOG_EVENT",
    event
  });
}
