import type { UIPlan } from "../dsl/types.js";
import type { RefinePlanner, WorkbenchRuntime } from "./workbench-runtime.js";

export interface WebSocketFeedOptions {
  maxReconnectAttempts?: number;
  baseReconnectDelayMs?: number;
  maxQueueSize?: number;
  shouldPause?: () => boolean;
  WebSocket?: new (url: string) => WebSocket;
}

interface WsHandle {
  dataSourceId: string;
  url: string;
  ws: WebSocket | null;
  reconnectAttempts: number;
  closed: boolean;
}

/**
 * WebSocketFeedMode listens on `dataSource.feedUrl` WebSocket endpoints.
 * On each message, it invokes the refine planner with the new data.
 * Auto-reconnects with exponential backoff on disconnect.
 */
export class WebSocketFeedMode {
  private readonly handles: WsHandle[] = [];
  private readonly maxReconnect: number;
  private readonly baseDelay: number;
  private readonly maxQueue: number;
  private queuedMessages = 0;

  constructor(
    private readonly runtime: WorkbenchRuntime,
    private readonly planner: RefinePlanner,
    private readonly options: WebSocketFeedOptions = {}
  ) {
    this.maxReconnect = options.maxReconnectAttempts ?? 5;
    this.baseDelay = options.baseReconnectDelayMs ?? 1000;
    this.maxQueue = options.maxQueueSize ?? 100;
  }

  start(): void {
    const plan = this.runtime.getPlan();
    if (!plan) throw new Error("WebSocketFeedMode.start(): no plan loaded");

    for (const ds of plan.dataSources) {
      if (!ds.feedUrl) continue;
      const handle: WsHandle = {
        dataSourceId: ds.id,
        url: ds.feedUrl,
        ws: null,
        reconnectAttempts: 0,
        closed: false
      };
      this.handles.push(handle);
      this.connect(handle);
    }
  }

  stop(): void {
    for (const handle of this.handles) {
      handle.closed = true;
      if (handle.ws) {
        handle.ws.close();
        handle.ws = null;
      }
      this.runtime.logEvent("feed_polling_stopped", {
        dataSourceId: handle.dataSourceId,
        type: "websocket"
      });
    }
    this.handles.length = 0;
    this.queuedMessages = 0;
  }

  private connect(handle: WsHandle): void {
    if (handle.closed) return;
    const WsCtor = this.options.WebSocket ?? globalThis.WebSocket;
    if (!WsCtor) {
      this.runtime.logEvent("feed_change_ignored", {
        dataSourceId: handle.dataSourceId,
        reason: "WebSocket not available"
      });
      return;
    }

    const ws = new WsCtor(handle.url);
    handle.ws = ws;

    ws.onopen = () => {
      handle.reconnectAttempts = 0;
      this.runtime.logEvent("feed_polling_started", {
        dataSourceId: handle.dataSourceId,
        type: "websocket",
        url: handle.url
      });
    };

    ws.onmessage = (event: MessageEvent) => {
      if (this.options.shouldPause?.()) return;
      if (this.queuedMessages >= this.maxQueue) {
        this.runtime.logEvent("feed_change_ignored", {
          dataSourceId: handle.dataSourceId,
          reason: "backpressure"
        });
        return;
      }
      this.queuedMessages++;
      const data = typeof event.data === "string" ? event.data : String(event.data);
      this.runtime.logEvent("feed_change_detected", {
        dataSourceId: handle.dataSourceId,
        type: "websocket"
      });
      const feedback = `WebSocket data for ${handle.dataSourceId}: ${data.slice(0, 400)}`;
      this.runtime.refinePlan(feedback, this.planner, "feedPoll")
        .catch(() => { /* logged inside refinePlan */ })
        .finally(() => { this.queuedMessages--; });
    };

    ws.onclose = () => {
      if (handle.closed) return;
      this.runtime.logEvent("feed_polling_stopped", {
        dataSourceId: handle.dataSourceId,
        type: "websocket",
        reason: "disconnected"
      });
      this.scheduleReconnect(handle);
    };

    ws.onerror = () => {
      if (handle.ws) handle.ws.close();
    };
  }

  private scheduleReconnect(handle: WsHandle): void {
    if (handle.closed) return;
    if (handle.reconnectAttempts >= this.maxReconnect) {
      this.runtime.logEvent("feed_change_ignored", {
        dataSourceId: handle.dataSourceId,
        reason: "max reconnect attempts reached"
      });
      return;
    }
    handle.reconnectAttempts++;
    const delay = Math.min(30_000, this.baseDelay * 2 ** (handle.reconnectAttempts - 1));
    setTimeout(() => this.connect(handle), delay);
  }

  getActiveConnections(): Array<{ dataSourceId: string; url: string; connected: boolean }> {
    return this.handles.map((h) => ({
      dataSourceId: h.dataSourceId,
      url: h.url,
      connected: h.ws?.readyState === 1
    }));
  }
}
