/**
 * BaseComponent - Foundation for all components
 * Handles DOM references, lifecycle methods, and safe element access
 */

import {
  type BaseComponentProps,
  ComponentError,
  type ComponentLifecycle,
  type ComponentMetadata,
  type ElementOrNull,
  type ElementSelector,
  type QueryOptions,
} from '$lib/types';

export abstract class BaseComponent implements ComponentLifecycle {
  protected readonly group: string | undefined;
  protected readonly id: string;
  protected readonly props: BaseComponentProps;
  protected metadata: ComponentMetadata;
  protected rootElement: ElementOrNull = null;
  protected elements: Map<string, HTMLElement> = new Map();

  constructor(props: BaseComponentProps = {}) {
    this.metadata = {
      name: this.constructor.name,
      initialized: false,
      destroyed: false,
    };

    this.props = props;
    this.group = props.group;
    this.id = props.id || this.generateId();

    // Auto-init if requested
    if (props.autoInit) {
      this.init();
    }
  }

  /**
   * Initialize the component
   */
  async init(): Promise<void> {
    if (this.metadata.initialized) {
      this.logWarn('Component already initialized');
      return;
    }

    try {
      this.metadata.initTime = Date.now();

      // Allow child classes to perform initialization
      await this.onInit();

      this.metadata.initialized = true;
      this.logDebug('Component initialized');
    } catch (error) {
      throw this.createError(`Failed to initialize: ${error}`, 'init');
    }
  }

  /**
   * Destroy the component and clean up resources
   */
  async destroy(): Promise<void> {
    if (this.metadata.destroyed) {
      this.logWarn('Component already destroyed');
      return;
    }

    try {
      this.metadata.destroyTime = Date.now();

      // Allow child classes to perform cleanup
      await this.onDestroy();

      // Clear element references
      this.elements.clear();
      this.rootElement = null;

      this.metadata.destroyed = true;
      this.metadata.initialized = false;
      this.logDebug('Component destroyed');
    } catch (error) {
      throw this.createError(`Failed to destroy: ${error}`, 'destroy');
    }
  }

  /**
   * Hook for child classes to implement initialization logic
   */
  protected abstract onInit(): void | Promise<void>;

  /**
   * Hook for child classes to implement cleanup logic
   */
  protected abstract onDestroy(): void | Promise<void>;

  /**
   * Query for a DOM element with enhanced options
   */
  public query<T extends HTMLElement = HTMLElement>(
    selector: ElementSelector,
    options: QueryOptions = {}
  ): T | null {
    const { required = false, parent = this.rootElement || document } = options;

    // Handle direct element passing
    if (selector instanceof HTMLElement) {
      return selector as T;
    }

    if (!selector) {
      if (required) {
        throw this.createError('Selector is required', 'runtime');
      }
      return null;
    }

    const element = parent.querySelector<T>(selector as string);

    if (!element && required) {
      throw this.createError(`Required element not found: ${selector}`, 'runtime');
    }

    return element;
  }

  /**
   * Query for multiple DOM elements
   */
  public queryAll<T extends HTMLElement = HTMLElement>(
    selector: string,
    options: Omit<QueryOptions, 'multiple'> = {}
  ): T[] {
    const { parent = this.rootElement || document } = options;
    return Array.from(parent.querySelectorAll<T>(selector));
  }

  /**
   * Set the root element for the component
   */
  protected setRootElement(selector: ElementSelector, options?: QueryOptions): void {
    const element = this.query(selector, { ...options, required: true });
    if (element) {
      this.rootElement = element;

      // Add component identifier
      element.dataset['componentId'] = this.id;

      if (this.props.className) {
        element.classList.add(this.props.className);
      }
    }
  }

  /**
   * Get the root element for the component
   */
  public getRootElement<T extends HTMLElement = HTMLElement>(): T | null {
    return this.rootElement as T | null;
  }

  /**
   * Cache an element reference for quick access
   */
  protected cacheElement(key: string, selector: ElementSelector, options?: QueryOptions): void {
    const element = this.query(selector, options);
    if (element) {
      this.elements.set(key, element);
    }
  }

  /**
   * Get a cached element
   */
  protected getElement(key: string): HTMLElement | null {
    return this.elements.get(key) || null;
  }

  /**
   * Check if component is initialized
   */
  isInitialized(): boolean {
    return this.metadata.initialized && !this.metadata.destroyed;
  }

  /**
   * Check if component is destroyed
   */
  isDestroyed(): boolean {
    return this.metadata.destroyed;
  }

  /**
   * Get component ID
   */
  getId(): string {
    return this.id;
  }

  /**
   * Get component metadata
   */
  getMetadata(): Readonly<ComponentMetadata> {
    return { ...this.metadata };
  }

  /**
   * Generate unique component ID
   */
  protected generateId(): string {
    const id = crypto.randomUUID();
    return `${this.metadata.name}-${id}`;
  }

  /**
   * Create a component-specific error
   */
  public createError(
    message: string,
    phase: 'init' | 'runtime' | 'destroy' = 'runtime',
    cause?: unknown
  ): ComponentError {
    return new ComponentError(`[${this.id}] ${message}`, this.id, phase, cause);
  }

  /**
   * Safe element text content setter
   */
  protected setText(element: ElementOrNull, text: string): void {
    if (element) {
      element.textContent = text;
    }
  }

  /**
   * Safe element HTML setter with optional sanitization
   */
  protected setHTML(element: ElementOrNull, html: string, sanitize = false): void {
    if (!element) return;

    if (sanitize) {
      // Basic sanitization - in production, use a proper sanitizer like DOMPurify
      const temp = document.createElement('div');
      temp.textContent = html;
      element.innerHTML = temp.innerHTML;
    } else {
      element.innerHTML = html;
    }
  }

  /**
   * Safe attribute setter
   */
  protected setAttribute(element: ElementOrNull, name: string, value: string): void {
    if (element) {
      element.setAttribute(name, value);
    }
  }

  /**
   * Toggle element visibility
   */
  protected toggleVisibility(element: ElementOrNull, visible?: boolean): void {
    if (!element) return;

    if (visible === undefined) {
      element.hidden = !element.hidden;
    } else {
      element.hidden = !visible;
    }
  }

  /**
   * Toggle CSS class
   */
  protected toggleClass(element: ElementOrNull, className: string, force?: boolean): void {
    if (element) {
      element.classList.toggle(className, force);
    }
  }

  /**
   * Debug logging (only in debug mode)
   */
  public logDebug(...args: unknown[]): void {
    if (this.props.debug) {
      // eslint-disable-next-line no-console
      console.log(
        `[FLOWUPS-DEBUG] ${this.group ? `[${this.group}: ${this.id}]` : `[${this.id}]`}`,
        ...args
      );
    }
  }

  /**
   * Warning logging
   */
  public logWarn(...args: unknown[]): void {
    // eslint-disable-next-line no-console
    console.warn(
      `[FLOWUPS-WARN] ${this.group ? `[${this.group}: ${this.id}]` : `[${this.id}]`}`,
      ...args
    );
  }

  /**
   * Error logging
   */
  public logError(...args: unknown[]): void {
    console.error(
      `[FLOWUPS-ERROR] ${this.group ? `[${this.group}: ${this.id}]` : `[${this.id}]`}`,
      ...args
    );
  }
}
