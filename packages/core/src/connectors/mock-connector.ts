import type { DataConnector, ConnectorConfig, ConnectorResult } from "./types.js";

export interface MockScenario {
  id: string;
  generator: (tick: number) => unknown;
}

const BUILT_IN_SCENARIOS: Record<string, (tick: number) => unknown> = {
  "sales-kpi": (tick) => ({
    revenue: 1200000 + Math.floor(Math.sin(tick * 0.3) * 80000 + Math.random() * 20000),
    orders: 8400 + Math.floor(Math.random() * 200 - 100),
    avgOrder: 142 + Math.floor(Math.random() * 10 - 5),
    conversion: +(3.8 + Math.sin(tick * 0.5) * 0.4).toFixed(1)
  }),
  "traffic": (tick) => ({
    activeUsers: 12000 + Math.floor(Math.sin(tick * 0.2) * 3000 + Math.random() * 500),
    sessions: 34000 + Math.floor(Math.random() * 2000),
    bounceRate: +(42 + Math.sin(tick * 0.4) * 5).toFixed(1),
    avgDuration: +(3.2 + Math.random() * 0.8).toFixed(1)
  }),
  "server-status": (tick) => ({
    cpu: Math.min(100, Math.max(5, 35 + Math.sin(tick * 0.6) * 20 + Math.random() * 10)),
    memory: Math.min(100, Math.max(20, 62 + Math.sin(tick * 0.3) * 8)),
    requests: Math.floor(1200 + Math.sin(tick * 0.4) * 400 + Math.random() * 100),
    errors: Math.max(0, Math.floor(Math.random() * 5 - 2)),
    uptime: 99.97
  }),
  "marketing": (tick) => ({
    impressions: 2400000 + Math.floor(Math.random() * 100000),
    clicks: 89000 + Math.floor(Math.sin(tick * 0.3) * 5000),
    ctr: +(3.7 + Math.sin(tick * 0.5) * 0.3).toFixed(1),
    spend: 4200 + Math.floor(Math.random() * 200 - 100)
  }),
  "timeseries": (tick) => {
    const points = [];
    for (let i = 0; i < 7; i++) {
      points.push(Math.floor(800 + Math.sin((tick + i) * 0.4) * 400 + Math.random() * 200));
    }
    return { labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], values: points };
  }
};

/**
 * MockConnector generates realistic, time-varying simulated data.
 * Scenarios produce different data each tick, simulating a live backend.
 */
export class MockConnector implements DataConnector {
  readonly type = "mock";
  private tick = 0;
  private customScenarios = new Map<string, (tick: number) => unknown>();

  registerScenario(id: string, generator: (tick: number) => unknown): void {
    this.customScenarios.set(id, generator);
  }

  async fetch(config: ConnectorConfig): Promise<ConnectorResult> {
    const start = Date.now();
    this.tick++;
    const scenarioId = config.source || "sales-kpi";
    const generator = this.customScenarios.get(scenarioId)
      ?? BUILT_IN_SCENARIOS[scenarioId]
      ?? BUILT_IN_SCENARIOS["sales-kpi"]!;
    const data = generator(this.tick);
    return {
      data,
      fetchedAt: new Date().toISOString(),
      source: `mock:${scenarioId}`,
      durationMs: Date.now() - start
    };
  }

  subscribe(config: ConnectorConfig, onData: (result: ConnectorResult) => void): () => void {
    const interval = config.refreshMs ?? 3000;
    const handle = setInterval(() => {
      void this.fetch(config).then(onData);
    }, interval);
    void this.fetch(config).then(onData);
    return () => clearInterval(handle);
  }
}
