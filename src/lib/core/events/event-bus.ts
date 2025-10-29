/**
 * Type-safe EventBus implementation with advanced features
 */

import type {
  AppEventMap,
  EventBusConfig,
  EventEmitOptions,
  EventHandler,
  EventHandlerWrapper,
  EventSubscriptionOptions,
  IEventBus,
  UnsubscribeFn,
} from '$lib/types';

export class EventBus implements IEventBus<AppEventMap> {
  private static instance: EventBus;
  private events: Map<keyof AppEventMap, EventHandlerWrapper[]> = new Map();
  private config: Required<EventBusConfig>;
  private handlerIdCounter = 0;

  private constructor(config: EventBusConfig = {}) {
    this.config = {
      maxListeners: config.maxListeners ?? 0,
      errorHandler: config.errorHandler ?? this.defaultErrorHandler,
      debug: config.debug ?? false,
    };
  }

  static getInstance(config?: EventBusConfig): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus(config);
    }
    return EventBus.instance;
  }

  on<K extends keyof AppEventMap>(
    event: K,
    handler: EventHandler<AppEventMap[K]>,
    options: EventSubscriptionOptions = {}
  ): UnsubscribeFn {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }

    const handlers = this.events.get(event)!;

    // Check max listeners
    if (this.config.maxListeners > 0 && handlers.length >= this.config.maxListeners) {
      console.error(
        `[EventBus] Max listeners (${this.config.maxListeners}) reached for event "${String(
          event
        )}"`
      );
    }

    this.handlerIdCounter += 1;
    const wrapper: EventHandlerWrapper<AppEventMap[K]> = {
      handler,
      options,
      id: `handler-${this.handlerIdCounter}`,
    };

    // Insert based on priority
    const priority = options.priority ?? 0;
    const insertIndex = handlers.findIndex((h) => (h.options.priority ?? 0) < priority);

    if (insertIndex === -1) {
      handlers.push(wrapper);
    } else {
      handlers.splice(insertIndex, 0, wrapper);
    }

    // Return unsubscribe function
    return () => {
      this.off(event, handler);
    };
  }

  once<K extends keyof AppEventMap>(
    event: K,
    handler: EventHandler<AppEventMap[K]>
  ): UnsubscribeFn {
    return this.on(event, handler, { once: true });
  }

  off<K extends keyof AppEventMap>(event: K, handler?: EventHandler<AppEventMap[K]>): void {
    const handlers = this.events.get(event);
    if (!handlers) return;

    if (!handler) {
      // Remove all handlers for this event
      this.events.delete(event);
      return;
    }

    // Remove specific handler
    const index = handlers.findIndex((h) => h.handler === handler);
    if (index !== -1) {
      handlers.splice(index, 1);
    }

    // Clean up empty handler arrays
    if (handlers.length === 0) {
      this.events.delete(event);
    }
  }

  emit<K extends keyof AppEventMap>(
    event: K,
    payload: AppEventMap[K],
    options: EventEmitOptions = {}
  ): void {
    const handlers = this.events.get(event);
    if (!handlers || handlers.length === 0) {
      return;
    }

    // Create a copy to handle modifications during iteration
    const handlersToExecute = [...handlers];

    for (const wrapper of handlersToExecute) {
      try {
        // Apply context if provided
        const context = wrapper.options.context ?? undefined;
        wrapper.handler.call(context, payload);

        // Remove if it was a one-time handler
        if (wrapper.options.once) {
          this.off(event, wrapper.handler);
        }
      } catch (error) {
        if (options.throwOnError) {
          throw error;
        }
        this.config.errorHandler(error as Error, String(event));
      }
    }
  }

  async emitAsync<K extends keyof AppEventMap>(
    event: K,
    payload: AppEventMap[K],
    options: EventEmitOptions = {}
  ): Promise<void> {
    const handlers = this.events.get(event);
    if (!handlers || handlers.length === 0) {
      return;
    }

    const handlersToExecute = [...handlers];
    const promises: Promise<void>[] = [];

    for (const wrapper of handlersToExecute) {
      const promise = (async () => {
        try {
          const context = wrapper.options.context ?? undefined;
          await wrapper.handler.call(context, payload);

          if (wrapper.options.once) {
            this.off(event, wrapper.handler);
          }
        } catch (error) {
          if (options.throwOnError) {
            throw error;
          }
          this.config.errorHandler(error as Error, String(event));
        }
      })();

      promises.push(promise);
    }

    await Promise.all(promises);
  }

  listenerCount<K extends keyof AppEventMap>(event: K): number {
    return this.events.get(event)?.length ?? 0;
  }

  removeAllListeners<K extends keyof AppEventMap>(event?: K): void {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
  }

  setMaxListeners(max: number): void {
    this.config.maxListeners = max;
  }

  getMaxListeners(): number {
    return this.config.maxListeners;
  }

  setDebugMode(enabled: boolean): void {
    this.config.debug = enabled;
  }

  private defaultErrorHandler(error: Error, eventName: string): void {
    console.error(`[EventBus] Error in handler for "${eventName}":`, error);
  }

  // Helper method to get all event names
  getEventNames(): (keyof AppEventMap)[] {
    return Array.from(this.events.keys());
  }

  // Helper method to check if event has listeners
  hasListeners<K extends keyof AppEventMap>(event: K): boolean {
    return this.listenerCount(event) > 0;
  }

  // Cleanup method
  destroy(): void {
    this.removeAllListeners();
    if (EventBus.instance === this) {
      // @ts-expect-error - Clearing singleton instance
      EventBus.instance = undefined;
    }
  }
}
