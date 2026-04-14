import { emitLogEvent, initWidgetBridge } from "@genui/widget-iframe";

export function bootDemoWidget(): void {
  initWidgetBridge({
    onInit(payload) {
      emitLogEvent({ type: "widget_init", payload });
    },
    onPrompt(text) {
      emitLogEvent({ type: "widget_prompt", text });
    },
    onPatch(patch) {
      emitLogEvent({ type: "widget_patch", patch });
    },
    onDispose() {
      emitLogEvent({ type: "widget_dispose" });
    }
  });
}
