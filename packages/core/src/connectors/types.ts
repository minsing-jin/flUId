export interface ConnectorConfig {
  /** Unique ID matching DataSource.id in UIPlan */
  id: string;
  /** Adapter type */
  type: "rest" | "csv" | "mock" | "websocket" | "static";
  /** Endpoint URL, file content, or config */
  source: string;
  /** Refresh interval in ms (0 = one-shot, >0 = polling) */
  refreshMs?: number;
  /** HTTP method for REST */
  method?: "GET" | "POST";
  /** HTTP headers for REST */
  headers?: Record<string, string>;
  /** Transform function name or jmespath expression to extract data */
  transform?: string;
}

export interface ConnectorResult {
  data: unknown;
  fetchedAt: string;
  source: string;
  durationMs: number;
  error?: string;
}

export interface DataConnector {
  readonly type: string;
  fetch(config: ConnectorConfig): Promise<ConnectorResult>;
  subscribe?(config: ConnectorConfig, onData: (result: ConnectorResult) => void): () => void;
}

export interface ConnectorRegistry {
  register(type: string, connector: DataConnector): void;
  get(type: string): DataConnector | undefined;
  fetchData(config: ConnectorConfig): Promise<ConnectorResult>;
}
