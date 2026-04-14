export type RuntimeEventType =
  | "plan_loaded"
  | "action_dispatched"
  | "tool_started"
  | "tool_succeeded"
  | "tool_failed"
  | "refine_started"
  | "refine_succeeded"
  | "refine_failed"
  | "feed_polling_started"
  | "feed_polling_stopped"
  | "feed_change_detected"
  | "feed_change_ignored"
  | "guardrail_blocked";

export interface RuntimeEvent {
  id: string;
  type: RuntimeEventType;
  at: string;
  traceId?: string;
  payload: Record<string, unknown>;
}
