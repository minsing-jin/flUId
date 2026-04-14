export interface RecoveryEvent {
  layer: "api" | "validation" | "render";
  attempt: number;
  outcome: "retry" | "fallback" | "success" | "give_up" | "isolate";
  message: string;
  at: string;
}

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  now?: () => Date;
  sleep?: (ms: number) => Promise<void>;
  onEvent?: (event: RecoveryEvent) => void;
}

const DEFAULT_SLEEP = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Retry with exponential backoff + jitter. Pushes a RecoveryEvent for every
 * attempt so callers can surface the ledger in DevTools.
 */
export async function retryWithBackoff<T>(
  operation: (attempt: number) => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const max = options.maxAttempts ?? 3;
  const base = options.baseDelayMs ?? 400;
  const cap = options.maxDelayMs ?? 4_000;
  const sleep = options.sleep ?? DEFAULT_SLEEP;
  const now = options.now ?? (() => new Date());
  const emit = options.onEvent ?? (() => undefined);

  let lastError: unknown;
  for (let attempt = 1; attempt <= max; attempt += 1) {
    try {
      const result = await operation(attempt);
      emit({
        layer: "api",
        attempt,
        outcome: "success",
        message: `ok on attempt ${attempt}`,
        at: now().toISOString()
      });
      return result;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      emit({
        layer: "api",
        attempt,
        outcome: attempt === max ? "give_up" : "retry",
        message,
        at: now().toISOString()
      });
      if (attempt === max) break;
      const delay = Math.min(cap, base * 2 ** (attempt - 1));
      const jitter = Math.floor(delay * Math.random() * 0.25);
      await sleep(delay + jitter);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("retryWithBackoff exhausted");
}

export function createRecoveryLedger(): { push(event: RecoveryEvent): void; drain(): RecoveryEvent[] } {
  const events: RecoveryEvent[] = [];
  return {
    push(event: RecoveryEvent): void {
      events.push(event);
    },
    drain(): RecoveryEvent[] {
      return [...events];
    }
  };
}
