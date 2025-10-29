/**
 * InteractiveComponent - Extends BaseComponent with event handling
 * Integrates with EventBus for decoupled communication
 */

import type {
  AppEventMap,
  ComponentEventEmitter,
  InteractiveComponentConfig,
  ListenerConfig,
} from '$lib/types';

import { EventBus } from '../events';
import { BaseComponent } from './base-component';

export abstract class InteractiveComponent extends BaseComponent implements ComponentEventEmitter {
  protected readonly eventBus: EventBus;
  protected listeners: Map<string, ListenerConfig> = new Map();
  protected eventUnsubscribers: Array<() => void> = [];
  protected delegatedHandlers: Map<string, EventListener> = new Map();

  constructor(config: InteractiveComponentConfig = {}) {
    super(config);
    this.eventBus = EventBus.getInstance();
  }

  /**
   * Initialize component and set up event listeners
   */
  protected async onInit(): Promise<void> {
    await this.setupEventListeners();

    // Initialize custom events if provided in config
    if ((this.config as InteractiveComponentConfig).events) {
      this.bindConfigEvents();
    }
  }

  /**
   * Clean up all event listeners and subscriptions
   */
  protected async onDestroy(): Promise<void> {
    this.removeAllListeners();
    this.removeAllSubscriptions();
    this.removeDelegatedHandlers();
  }

  /**
   * Hook for child classes to set up event listeners
   */
  protected abstract setupEventListeners(): void | Promise<void>;

  /**
   * Add an event listener with automatic cleanup
   */
  protected addEventListener(
    target: HTMLElement | Window | Document | string,
    event: string,
    handler: EventListener,
    options?: AddEventListenerOptions
  ): void {
    let element: HTMLElement | Window | Document;
    let key: string;

    // Handle selector-based listeners (cached elements)
    if (typeof target === 'string') {
      const cached = this.getElement(target);
      if (!cached) {
        this.logWarn(`Cached element not found: ${target}`);
        return;
      }
      element = cached;
      key = `${target}-${event}`;
    } else {
      element = target;
      key = `${element.constructor.name}-${event}-${Date.now()}`;
    }

    // Remove existing listener if present
    if (this.listeners.has(key)) {
      this.removeEventListener(key);
    }

    // Add the listener
    element.addEventListener(event, handler, options);

    // Store for cleanup
    this.listeners.set(key, {
      element,
      event,
      handler,
      options: options || undefined,
    });

    this.logDebug(`Added listener: ${key}`);
  }

  /**
   * Remove a specific event listener
   */
  protected removeEventListener(key: string): void {
    const config = this.listeners.get(key);
    if (config) {
      config.element.removeEventListener(config.event, config.handler, config.options);
      this.listeners.delete(key);
      this.logDebug(`Removed listener: ${key}`);
    }
  }

  /**
   * Remove all event listeners
   */
  protected removeAllListeners(): void {
    this.listeners.forEach((_, key) => {
      this.removeEventListener(key);
    });
  }

  /**
   * Set up event delegation for dynamic content
   */
  protected delegate(
    event: string,
    selector: string,
    handler: (event: Event, target: HTMLElement) => void,
    parent: HTMLElement | Document = document
  ): void {
    const delegatedHandler: EventListener = (e) => {
      const target = e.target as HTMLElement;
      const delegateTarget = target.closest(selector);

      if (delegateTarget && parent.contains(delegateTarget)) {
        handler.call(this, e, delegateTarget as HTMLElement);
      }
    };

    const key = `${event}-${selector}`;

    // Remove existing handler
    if (this.delegatedHandlers.has(key)) {
      parent.removeEventListener(event, this.delegatedHandlers.get(key)!);
    }

    // Add new handler
    parent.addEventListener(event, delegatedHandler, true);
    this.delegatedHandlers.set(key, delegatedHandler);
  }

  /**
   * Remove delegated event handlers
   */
  protected removeDelegatedHandlers(): void {
    this.delegatedHandlers.forEach((handler, key) => {
      const [event] = key.split('-');
      if (event) {
        document.removeEventListener(event, handler, true);
      }
    });
    this.delegatedHandlers.clear();
  }

  /**
   * Subscribe to EventBus events
   */
  protected subscribe<K extends keyof AppEventMap>(
    event: K,
    handler: (payload: AppEventMap[K]) => void,
    options?: { priority?: number; once?: boolean }
  ): void {
    const unsubscribe = this.eventBus.on(event, handler, options);
    this.eventUnsubscribers.push(unsubscribe);
  }

  /**
   * Subscribe to a one-time EventBus event
   */
  protected subscribeOnce<K extends keyof AppEventMap>(
    event: K,
    handler: (payload: AppEventMap[K]) => void
  ): void {
    const unsubscribe = this.eventBus.once(event, handler);
    this.eventUnsubscribers.push(unsubscribe);
  }

  /**
   * Remove all EventBus subscriptions
   */
  protected removeAllSubscriptions(): void {
    this.eventUnsubscribers.forEach((unsubscribe) => unsubscribe());
    this.eventUnsubscribers = [];
  }

  /**
   * Emit an event through the EventBus
   */
  emit<K extends keyof AppEventMap>(event: K, payload: AppEventMap[K]): void {
    this.eventBus.emit(event, payload);
  }

  /**
   * Emit a custom DOM event
   */
  emitCustom(eventName: string, detail: unknown, target?: HTMLElement): void {
    const element = target || this.rootElement || document.body;
    const event = new CustomEvent(eventName, {
      detail,
      bubbles: true,
      cancelable: true,
    });
    element.dispatchEvent(event);
  }

  /**
   * Bind events from configuration
   */
  private bindConfigEvents(): void {
    const config = this.config as InteractiveComponentConfig;
    if (!config.events || !this.rootElement) return;

    Object.entries(config.events).forEach(([eventName, handler]) => {
      this.addEventListener(this.rootElement!, eventName, handler.bind(this));
    });
  }

  /**
   * Handle click events with optional debouncing
   */
  protected onClick(
    target: HTMLElement | string,
    handler: (event: MouseEvent) => void,
    debounceMs = 0
  ): void {
    const wrappedHandler =
      debounceMs > 0
        ? (this.debounce(handler as (...args: unknown[]) => unknown, debounceMs) as EventListener)
        : (handler as EventListener);

    this.addEventListener(target, 'click', wrappedHandler);
  }

  /**
   * Handle input events with optional debouncing
   */
  protected onInput(
    target: HTMLElement | string,
    handler: (event: Event) => void,
    debounceMs = 0
  ): void {
    const wrappedHandler =
      debounceMs > 0
        ? (this.debounce(handler as (...args: unknown[]) => unknown, debounceMs) as EventListener)
        : (handler as EventListener);

    this.addEventListener(target, 'input', wrappedHandler);
  }

  /**
   * Simple debounce implementation
   */
  private debounce<T extends (...args: unknown[]) => unknown>(
    callback: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    return (...args: Parameters<T>) => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        callback.apply(this, args);
      }, wait);
    };
  }

  /**
   * Wait for an element to appear in the DOM
   */
  protected async waitForElement(
    selector: string,
    timeout = 5000,
    parent: HTMLElement | Document = document
  ): Promise<HTMLElement> {
    return new Promise((resolve, reject) => {
      const element = parent.querySelector<HTMLElement>(selector);
      if (element) {
        resolve(element);
        return;
      }

      const observer = new MutationObserver((_, obs) => {
        const element = parent.querySelector<HTMLElement>(selector);
        if (element) {
          obs.disconnect();
          resolve(element);
        }
      });

      observer.observe(parent === document ? document.body : parent, {
        childList: true,
        subtree: true,
      });

      setTimeout(() => {
        observer.disconnect();
        reject(this.createError(`Element not found: ${selector}`, 'runtime'));
      }, timeout);
    });
  }

  /**
   * Get all active listeners (for debugging)
   */
  getActiveListeners(): ReadonlyMap<string, ListenerConfig> {
    return new Map(this.listeners);
  }

  /**
   * Get listener count
   */
  getListenerCount(): number {
    return this.listeners.size + this.eventUnsubscribers.length;
  }
}
