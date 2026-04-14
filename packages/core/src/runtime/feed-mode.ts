import type { DataSource, UIPlan } from "../dsl/types.js";
import type { RefinePlanner, WorkbenchRuntime } from "./workbench-runtime.js";

export type FeedFetcher = (dataSource: DataSource) => Promise<unknown>;

export interface FeedModeOptions {
  defaultIntervalMs?: number;
  shouldPause?: () => boolean;
  now?: () => number;
  setInterval?: (handler: () => void, ms: number) => unknown;
  clearInterval?: (handle: unknown) => void;
}

interface TimerHandle {
  dataSourceId: string;
  handle: unknown;
}

function hashUnknown(value: unknown): string {
  try {
    return JSON.stringify(value ?? null);
  } catch {
    return String(value);
  }
}

/**
 * FeedMode runs `pollIntervalMs`-based polling for each dataSource that has
 * a polling interval set. When the fetched data differs from the last
 * known snapshot, it asks the refine planner whether the UI needs updating.
 */
export class FeedMode {
  private readonly timers: TimerHandle[] = [];
  private readonly snapshots = new Map<string, string>();

  constructor(
    private readonly runtime: WorkbenchRuntime,
    private readonly planner: RefinePlanner,
    private readonly fetcher: FeedFetcher,
    private readonly options: FeedModeOptions = {}
  ) {}

  start(): void {
    const plan = this.runtime.getPlan();
    if (!plan) {
      throw new Error("FeedMode.start(): no plan loaded");
    }
    const set = this.options.setInterval ?? ((handler, ms) => setInterval(handler, ms));

    for (const ds of plan.dataSources) {
      const interval = ds.pollIntervalMs ?? this.options.defaultIntervalMs;
      if (!interval) continue;
      this.snapshots.set(ds.id, hashUnknown(ds.data));
      const handle = set(() => {
        void this.tick(ds.id);
      }, interval);
      this.timers.push({ dataSourceId: ds.id, handle });
      this.runtime.logEvent("feed_polling_started", { dataSourceId: ds.id, interval });
    }
  }

  stop(): void {
    const clear = this.options.clearInterval ?? ((handle: unknown) => clearInterval(handle as number));
    for (const timer of this.timers) {
      clear(timer.handle);
      this.runtime.logEvent("feed_polling_stopped", { dataSourceId: timer.dataSourceId });
    }
    this.timers.length = 0;
    this.snapshots.clear();
  }

  async tick(dataSourceId: string): Promise<void> {
    if (this.options.shouldPause?.()) {
      return;
    }
    const plan = this.runtime.getPlan();
    if (!plan) return;
    const ds = plan.dataSources.find((item) => item.id === dataSourceId);
    if (!ds) return;

    let next: unknown;
    try {
      next = await this.fetcher(ds);
    } catch (error) {
      this.runtime.logEvent("feed_change_ignored", {
        dataSourceId,
        reason: "fetch_error",
        error: error instanceof Error ? error.message : String(error)
      });
      return;
    }

    const nextHash = hashUnknown(next);
    const prevHash = this.snapshots.get(dataSourceId);
    if (prevHash === nextHash) {
      return;
    }
    this.snapshots.set(dataSourceId, nextHash);
    this.runtime.logEvent("feed_change_detected", { dataSourceId });

    const feedback = `dataSource ${dataSourceId} changed. New snapshot: ${nextHash.slice(0, 400)}`;
    try {
      await this.runtime.refinePlan(feedback, this.planner, "feedPoll");
    } catch (error) {
      this.runtime.logEvent("feed_change_ignored", {
        dataSourceId,
        reason: "refine_failed",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  getSnapshot(dataSourceId: string): string | undefined {
    return this.snapshots.get(dataSourceId);
  }

  getActivePlan(): UIPlan | null {
    return this.runtime.getPlan();
  }
}
