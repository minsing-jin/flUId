import type { ConnectorConfig, ConnectorRegistry, ConnectorResult, DataConnector } from "./types.js";
import { RestConnector } from "./rest-connector.js";
import { CsvConnector } from "./csv-connector.js";
import { MockConnector } from "./mock-connector.js";

export class DefaultConnectorRegistry implements ConnectorRegistry {
  private readonly connectors = new Map<string, DataConnector>();
  private readonly subscriptions = new Map<string, () => void>();

  constructor() {
    this.register("rest", new RestConnector());
    this.register("csv", new CsvConnector());
    this.register("mock", new MockConnector());
    this.register("static", { type: "static", fetch: async (cfg) => ({
      data: JSON.parse(cfg.source || "null"),
      fetchedAt: new Date().toISOString(),
      source: "(static)",
      durationMs: 0
    }) });
  }

  register(type: string, connector: DataConnector): void {
    this.connectors.set(type, connector);
  }

  get(type: string): DataConnector | undefined {
    return this.connectors.get(type);
  }

  getMockConnector(): MockConnector | undefined {
    const c = this.connectors.get("mock");
    return c instanceof MockConnector ? c : undefined;
  }

  async fetchData(config: ConnectorConfig): Promise<ConnectorResult> {
    const connector = this.connectors.get(config.type);
    if (!connector) {
      return {
        data: null,
        fetchedAt: new Date().toISOString(),
        source: config.source,
        durationMs: 0,
        error: `Unknown connector type: ${config.type}`
      };
    }
    return connector.fetch(config);
  }

  subscribeTo(config: ConnectorConfig, onData: (result: ConnectorResult) => void): void {
    const connector = this.connectors.get(config.type);
    if (!connector?.subscribe) return;
    // Unsubscribe previous if exists
    this.unsubscribe(config.id);
    const unsub = connector.subscribe(config, onData);
    this.subscriptions.set(config.id, unsub);
  }

  unsubscribe(id: string): void {
    const unsub = this.subscriptions.get(id);
    if (unsub) {
      unsub();
      this.subscriptions.delete(id);
    }
  }

  unsubscribeAll(): void {
    for (const unsub of this.subscriptions.values()) unsub();
    this.subscriptions.clear();
  }
}
