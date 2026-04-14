import { GENUI_PROTOCOL_VERSION, type HostToWidgetMessage, type WidgetToHostMessage } from "../protocol/index.js";

export interface GenUIMountOptions {
  apiKey?: string;
  permissions?: string[];
  skills?: string[];
  position?: "left" | "right";
  width?: number;
  src?: string;
  target?: HTMLElement;
  theme?: string;
}

export interface GenUIWidgetInstance {
  prompt: (text: string) => void;
  patch: (patch: unknown) => void;
  dispose: () => void;
}

export interface GenUIBridge {
  mount: (options: GenUIMountOptions) => GenUIWidgetInstance;
}

function postToWidget(iframe: HTMLIFrameElement, message: HostToWidgetMessage): void {
  iframe.contentWindow?.postMessage(message, "*");
}

function createIframe(options: Required<Pick<GenUIMountOptions, "position" | "width" | "src">>): HTMLIFrameElement {
  const iframe = document.createElement("iframe");
  iframe.src = options.src;
  iframe.style.position = "fixed";
  iframe.style.top = "0";
  iframe.style.bottom = "0";
  iframe.style.width = `${options.width}px`;
  iframe.style.border = "0";
  iframe.style.zIndex = "2147483000";
  iframe.style[options.position] = "0";
  iframe.setAttribute("title", "GENUI Workbench Widget");
  return iframe;
}

export function mount(options: GenUIMountOptions = {}): GenUIWidgetInstance {
  const position = options.position ?? "right";
  const width = options.width ?? 420;
  const src = options.src ?? "/widget/index.html";
  const target = options.target ?? document.body;

  const iframe = createIframe({ position, width, src });
  target.appendChild(iframe);

  const messageHandler = (event: MessageEvent<unknown>): void => {
    if (event.source !== iframe.contentWindow) {
      return;
    }

    const payload = event.data as WidgetToHostMessage;
    if (!payload || typeof payload !== "object" || !("type" in payload)) {
      return;
    }

    if (payload.type === "GENUI_READY") {
      postToWidget(iframe, {
        type: "GENUI_INIT",
        grantedPermissions: options.permissions ?? [],
        enabledSkills: options.skills ?? [],
        theme: options.theme
      });
    }
  };

  window.addEventListener("message", messageHandler);

  return {
    prompt(text: string): void {
      postToWidget(iframe, { type: "GENUI_PROMPT", text });
    },
    patch(patch: unknown): void {
      postToWidget(iframe, { type: "GENUI_PATCH", patch });
    },
    dispose(): void {
      postToWidget(iframe, { type: "GENUI_DISPOSE" });
      window.removeEventListener("message", messageHandler);
      iframe.remove();
    }
  };
}

export function installGlobalBridge(): GenUIBridge {
  const bridge: GenUIBridge = {
    mount
  };

  const globalWindow = window as Window & { GENUI?: GenUIBridge; GENUI_PROTOCOL_VERSION?: string };
  globalWindow.GENUI = bridge;
  globalWindow.GENUI_PROTOCOL_VERSION = GENUI_PROTOCOL_VERSION;

  return bridge;
}
