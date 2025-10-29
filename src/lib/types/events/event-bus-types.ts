/**
 * Core EventBus type definitions
 */

// Generic event payload type
export type EventPayload = Record<string, unknown>;

// Event handler function type
export type EventHandler<T = unknown> = (payload: T) => void | Promise<void>;

// Unsubscribe function returned when subscribing
export type UnsubscribeFn = () => void;

// Event subscription options
export interface EventSubscriptionOptions {
  once?: boolean; // Auto-unsubscribe after first event
  priority?: number; // Higher priority handlers execute first
  context?: unknown; // Context to bind to handler
}

// Internal event handler wrapper
export interface EventHandlerWrapper<T = unknown> {
  handler: EventHandler<T>;
  options: EventSubscriptionOptions;
  id: string;
}

// Event emitter options
export interface EventEmitOptions {
  async?: boolean; // Emit asynchronously
  throwOnError?: boolean; // Throw if any handler errors
}

// Event bus configuration
export interface EventBusConfig {
  maxListeners?: number; // Max listeners per event (0 = unlimited)
  errorHandler?: (error: Error, eventName: string) => void;
  debug?: boolean;
}

// Event map for type-safe events
export interface EventMap {
  [eventName: string]: unknown;
}

// Type-safe event bus interface
export interface IEventBus<TEventMap extends EventMap = EventMap> {
  on<K extends keyof TEventMap>(
    event: K,
    handler: EventHandler<TEventMap[K]>,
    options?: EventSubscriptionOptions
  ): UnsubscribeFn;

  once<K extends keyof TEventMap>(event: K, handler: EventHandler<TEventMap[K]>): UnsubscribeFn;

  off<K extends keyof TEventMap>(event: K, handler?: EventHandler<TEventMap[K]>): void;

  emit<K extends keyof TEventMap>(
    event: K,
    payload: TEventMap[K],
    options?: EventEmitOptions
  ): void;

  emitAsync<K extends keyof TEventMap>(
    event: K,
    payload: TEventMap[K],
    options?: EventEmitOptions
  ): Promise<void>;

  listenerCount<K extends keyof TEventMap>(event: K): number;

  removeAllListeners<K extends keyof TEventMap>(event?: K): void;

  setMaxListeners(max: number): void;

  getMaxListeners(): number;
}
