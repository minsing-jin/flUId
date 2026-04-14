import type { PlannerResponse } from "./types.js";

export interface ResponseCacheOptions {
  maxEntries?: number;
  ttlMs?: number;
  now?: () => number;
}

interface CacheEntry {
  response: PlannerResponse;
  createdAt: number;
}

function hashString(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return hash.toString(36);
}

export function buildCacheKey(
  prompt: string,
  currentPlan: unknown,
  dataSnapshot: unknown
): string {
  const raw = JSON.stringify({ p: prompt, c: currentPlan ?? null, d: dataSnapshot ?? null });
  return hashString(raw);
}

export class ResponseCache {
  private readonly entries = new Map<string, CacheEntry>();
  private readonly maxEntries: number;
  private readonly ttlMs: number;
  private readonly now: () => number;
  private hits = 0;
  private misses = 0;

  constructor(options: ResponseCacheOptions = {}) {
    this.maxEntries = options.maxEntries ?? 50;
    this.ttlMs = options.ttlMs ?? 10 * 60 * 1000;
    this.now = options.now ?? (() => Date.now());
  }

  get(key: string): PlannerResponse | null {
    const entry = this.entries.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }
    if (this.now() - entry.createdAt > this.ttlMs) {
      this.entries.delete(key);
      this.misses++;
      return null;
    }
    // Move to end for LRU
    this.entries.delete(key);
    this.entries.set(key, entry);
    this.hits++;
    return entry.response;
  }

  set(key: string, response: PlannerResponse): void {
    if (this.entries.has(key)) {
      this.entries.delete(key);
    }
    if (this.entries.size >= this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest !== undefined) {
        this.entries.delete(oldest);
      }
    }
    this.entries.set(key, { response, createdAt: this.now() });
  }

  clear(): void {
    this.entries.clear();
    this.hits = 0;
    this.misses = 0;
  }

  stats(): { size: number; hits: number; misses: number; hitRate: number } {
    const total = this.hits + this.misses;
    return {
      size: this.entries.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total === 0 ? 0 : this.hits / total
    };
  }
}
