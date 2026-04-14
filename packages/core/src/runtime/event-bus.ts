export type EventHandler = (data: unknown) => void;

export interface EventBusOptions {
  maxTopics?: number;
  maxListenersPerTopic?: number;
}

/**
 * Typed pub/sub event bus for inter-widget communication.
 * Each widget can subscribe to topics and publish events.
 * Topic permissions are enforced by an allowlist per widget.
 */
export class WidgetEventBus {
  private readonly listeners = new Map<string, Set<EventHandler>>();
  private readonly widgetTopicAllowlist = new Map<string, Set<string>>();
  private readonly maxTopics: number;
  private readonly maxListeners: number;

  constructor(options: EventBusOptions = {}) {
    this.maxTopics = options.maxTopics ?? 100;
    this.maxListeners = options.maxListenersPerTopic ?? 50;
  }

  grantTopics(widgetId: string, topics: string[]): void {
    const existing = this.widgetTopicAllowlist.get(widgetId) ?? new Set();
    for (const topic of topics) existing.add(topic);
    this.widgetTopicAllowlist.set(widgetId, existing);
  }

  revokeTopics(widgetId: string): void {
    this.widgetTopicAllowlist.delete(widgetId);
  }

  isAllowed(widgetId: string, topic: string): boolean {
    const allowed = this.widgetTopicAllowlist.get(widgetId);
    if (!allowed) return false;
    return allowed.has(topic) || allowed.has("*");
  }

  subscribe(widgetId: string, topic: string, handler: EventHandler): () => void {
    if (!this.isAllowed(widgetId, topic)) {
      throw new Error(`Widget "${widgetId}" is not allowed to subscribe to topic "${topic}"`);
    }
    if (this.listeners.size >= this.maxTopics && !this.listeners.has(topic)) {
      throw new Error(`Max topics (${this.maxTopics}) reached`);
    }
    const handlers = this.listeners.get(topic) ?? new Set();
    if (handlers.size >= this.maxListeners) {
      throw new Error(`Max listeners (${this.maxListeners}) reached for topic "${topic}"`);
    }
    handlers.add(handler);
    this.listeners.set(topic, handlers);

    return () => {
      handlers.delete(handler);
      if (handlers.size === 0) this.listeners.delete(topic);
    };
  }

  publish(widgetId: string, topic: string, data: unknown): void {
    if (!this.isAllowed(widgetId, topic)) {
      throw new Error(`Widget "${widgetId}" is not allowed to publish to topic "${topic}"`);
    }
    const handlers = this.listeners.get(topic);
    if (!handlers) return;
    for (const handler of handlers) {
      try {
        handler(data);
      } catch {
        // Don't let one handler's error break others
      }
    }
  }

  getTopics(): string[] {
    return [...this.listeners.keys()];
  }

  getListenerCount(topic: string): number {
    return this.listeners.get(topic)?.size ?? 0;
  }

  clear(): void {
    this.listeners.clear();
    this.widgetTopicAllowlist.clear();
  }
}
