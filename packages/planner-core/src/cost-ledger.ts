import type { ModelTierConfig, TriggerMode } from "./types.js";

export interface CostLedgerOptions {
  dailyTokenBudget?: number;
  warnThresholdRatio?: number;
  modelTier?: ModelTierConfig;
  tokenPriceUsdPer1M?: Record<string, number>;
  now?: () => Date;
}

export interface CostLedgerEntry {
  at: string;
  model: string;
  triggerMode: TriggerMode;
  tokensPrompt: number;
  tokensCompletion: number;
  priceUsd: number;
}

export interface CostSnapshot {
  used: number;
  budget: number;
  ratio: number;
  warningFired: boolean;
  pollingPaused: boolean;
  entries: CostLedgerEntry[];
  costUsd: number;
}

const DEFAULT_TIER: ModelTierConfig = {
  full: "gpt-4o",
  patch: "gpt-4o-mini"
};

const DEFAULT_PRICES: Record<string, number> = {
  "gpt-4o": 10,
  "gpt-4o-mini": 0.6,
  "gpt-4.1": 12,
  "gpt-4.1-mini": 0.4
};

export class CostLedger {
  private readonly entries: CostLedgerEntry[] = [];
  private readonly dailyBudget: number;
  private readonly warnRatio: number;
  private readonly tier: ModelTierConfig;
  private readonly prices: Record<string, number>;
  private readonly now: () => Date;
  private warningFired = false;
  private pollingPaused = false;
  private resetMarkerDate: string;

  constructor(options: CostLedgerOptions = {}) {
    this.dailyBudget = options.dailyTokenBudget ?? 100_000;
    this.warnRatio = options.warnThresholdRatio ?? 0.8;
    this.tier = options.modelTier ?? DEFAULT_TIER;
    this.prices = options.tokenPriceUsdPer1M ?? DEFAULT_PRICES;
    this.now = options.now ?? (() => new Date());
    this.resetMarkerDate = this.today();
  }

  selectModel(triggerMode: TriggerMode): string {
    return triggerMode === "prompt" ? this.tier.full : this.tier.patch;
  }

  /**
   * Record a GPT call and return whether the session should continue. Applies
   * daily rollover so long-lived sessions naturally reset after midnight.
   */
  record(entry: Omit<CostLedgerEntry, "at" | "priceUsd">): CostSnapshot {
    this.rolloverIfNeeded();
    const price = this.priceFor(entry.model, entry.tokensPrompt + entry.tokensCompletion);
    const full: CostLedgerEntry = {
      ...entry,
      at: this.now().toISOString(),
      priceUsd: price
    };
    this.entries.push(full);
    const used = this.entries.reduce((acc, item) => acc + item.tokensPrompt + item.tokensCompletion, 0);
    const ratio = this.dailyBudget === 0 ? 1 : used / this.dailyBudget;
    if (!this.warningFired && ratio >= this.warnRatio) {
      this.warningFired = true;
    }
    if (!this.pollingPaused && ratio >= 1) {
      this.pollingPaused = true;
    }
    return this.snapshot();
  }

  snapshot(): CostSnapshot {
    const used = this.entries.reduce((acc, item) => acc + item.tokensPrompt + item.tokensCompletion, 0);
    const costUsd = this.entries.reduce((acc, item) => acc + item.priceUsd, 0);
    return {
      used,
      budget: this.dailyBudget,
      ratio: this.dailyBudget === 0 ? 1 : used / this.dailyBudget,
      warningFired: this.warningFired,
      pollingPaused: this.pollingPaused,
      entries: [...this.entries],
      costUsd
    };
  }

  isPollingPaused(): boolean {
    this.rolloverIfNeeded();
    return this.pollingPaused;
  }

  resetDaily(): void {
    this.entries.length = 0;
    this.warningFired = false;
    this.pollingPaused = false;
    this.resetMarkerDate = this.today();
  }

  private today(): string {
    const d = this.now();
    return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
  }

  private rolloverIfNeeded(): void {
    const today = this.today();
    if (today !== this.resetMarkerDate) {
      this.resetDaily();
    }
  }

  private priceFor(model: string, totalTokens: number): number {
    const pricePer1M = this.prices[model] ?? 0;
    return (pricePer1M * totalTokens) / 1_000_000;
  }
}
