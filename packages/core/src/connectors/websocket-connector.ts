import type { ConnectorConfig, ConnectorResult, DataConnector } from "./types.js";

export interface WebSocketConnectorOptions {
  WebSocket?: new (url: string) => WebSocket;
  maxReconnectAttempts?: number;
  baseReconnectDelayMs?: number;
}

/**
 * WebSocketConnector — streams messages from a WebSocket endpoint.
 * Unlike REST/Mock, there is no pull-based fetch. Callers MUST use
 * subscribe() to receive messages. fetch() resolves with a no-op result.
 */
export class WebSocketConnector implements DataConnector {
  readonly type = "websocket";
  private readonly options: WebSocketConnectorOptions;

  constructor(options: WebSocketConnectorOptions = {}) {
    this.options = options;
  }

  async fetch(config: ConnectorConfig): Promise<ConnectorResult> {
    return {
      data: null,
      fetchedAt: new Date().toISOString(),
      source: config.source,
      durationMs: 0,
      error: "WebSocket requires subscribe() — one-shot fetch not supported"
    };
  }

  subscribe(config: ConnectorConfig, onData: (result: ConnectorResult) => void): () => void {
    const WsCtor = this.options.WebSocket ?? globalThis.WebSocket;
    if (!WsCtor) {
      onData({
        data: null,
        fetchedAt: new Date().toISOString(),
        source: config.source,
        durationMs: 0,
        error: "WebSocket not available in this environment"
      });
      return () => { /* noop */ };
    }

    const maxAttempts = this.options.maxReconnectAttempts ?? 5;
    const baseDelay = this.options.baseReconnectDelayMs ?? 1000;
    let attempts = 0;
    let closed = false;
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = (): void => {
      if (closed) return;
      try {
        ws = new WsCtor(config.source);
      } catch (error) {
        onData({
          data: null,
          fetchedAt: new Date().toISOString(),
          source: config.source,
          durationMs: 0,
          error: error instanceof Error ? error.message : String(error)
        });
        return;
      }

      ws.onopen = () => {
        attempts = 0;
      };

      ws.onmessage = (event: MessageEvent) => {
        let parsed: unknown = event.data;
        if (typeof event.data === "string") {
          try {
            parsed = JSON.parse(event.data);
          } catch {
            parsed = event.data;
          }
        }
        onData({
          data: parsed,
          fetchedAt: new Date().toISOString(),
          source: config.source,
          durationMs: 0
        });
      };

      ws.onerror = () => {
        if (ws) ws.close();
      };

      ws.onclose = () => {
        if (closed) return;
        if (attempts >= maxAttempts) {
          onData({
            data: null,
            fetchedAt: new Date().toISOString(),
            source: config.source,
            durationMs: 0,
            error: `Max reconnect attempts (${maxAttempts}) exhausted`
          });
          return;
        }
        attempts++;
        const delay = Math.min(30_000, baseDelay * 2 ** (attempts - 1));
        reconnectTimer = setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) ws.close();
    };
  }
}
