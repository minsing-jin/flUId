export const GENUI_PROTOCOL_VERSION = "1.0" as const;

export type HostToWidgetMessage =
  | { type: "GENUI_INIT"; grantedPermissions: string[]; enabledSkills: string[]; theme?: string }
  | { type: "GENUI_PROMPT"; text: string }
  | { type: "GENUI_PATCH"; patch: unknown }
  | { type: "GENUI_DISPOSE" };

export type WidgetToHostMessage =
  | { type: "GENUI_REQUEST_PERMISSION"; permissionsRequested: string[] }
  | { type: "GENUI_TOOL_CALL"; toolName: string; input: unknown; callId: string }
  | { type: "GENUI_LOG_EVENT"; event: unknown }
  | { type: "GENUI_READY"; version: typeof GENUI_PROTOCOL_VERSION };

export function isHostToWidgetMessage(value: unknown): value is HostToWidgetMessage {
  if (!value || typeof value !== "object") {
    return false;
  }

  const type = (value as { type?: unknown }).type;
  return (
    type === "GENUI_INIT" ||
    type === "GENUI_PROMPT" ||
    type === "GENUI_PATCH" ||
    type === "GENUI_DISPOSE"
  );
}
