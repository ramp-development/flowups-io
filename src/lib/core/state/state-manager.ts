import type { StateConfig, StateValue } from '$lib/types';
import type { PersistenceConfig, StorageType } from '$lib/types';

import { EventBus } from '../events';
import { PersistenceManager } from '../storage/persistance-manager';

/**
 * Central state management with persistence support
 */
export class StateManager {
  private static instance: StateManager;
  private state: Map<string, unknown> = new Map();
  private stateConfigs: Map<string, StateConfig> = new Map();
  private eventBus: EventBus;
  // StorageManager is used indirectly through PersistenceManager
  // private storageManager: StorageManager;
  private persistenceManager: PersistenceManager;
  private namespace = 'app-state';

  private constructor() {
    this.eventBus = EventBus.getInstance();
    this.persistenceManager = PersistenceManager.getInstance();
  }

  static getInstance(): StateManager {
    if (!StateManager.instance) {
      StateManager.instance = new StateManager();
    }
    return StateManager.instance;
  }

  static init(): void {
    const instance = StateManager.getInstance();
    // Restore persisted state on initialization
    instance.restorePersistedState();
  }

  /**
   * Configure state with persistence options
   */
  configure(key: string, config: StateConfig): void {
    this.stateConfigs.set(key, config);

    // Set default value if provided and key doesn't exist
    if (config.defaultValue !== undefined && !this.state.has(key)) {
      this.set(key, config.defaultValue, { skipPersist: true });
    }
  }

  /**
   * Set a state value with optional persistence
   */
  set(key: string, value: StateValue, options?: { skipPersist?: boolean }): void {
    const from = this.state.get(key) as StateValue;
    this.state.set(key, value);

    // Check if we should persist
    const config = this.stateConfigs.get(key);
    if (config?.persistent && !options?.skipPersist) {
      this.persistValue(key, value, config);
    }

    this.eventBus.emit('state:changed', {
      key,
      from,
      to: value,
      timestamp: Date.now(),
    });
  }

  /**
   * Get a state value with type safety
   */
  get<T = unknown>(key: string): T | undefined {
    return this.state.get(key) as T;
  }

  /**
   * Get a state value with a fallback
   */
  getOrDefault<T = unknown>(key: string, defaultValue: T): T {
    return this.state.has(key) ? (this.state.get(key) as T) : defaultValue;
  }

  /**
   * Check if a state key exists
   */
  has(key: string): boolean {
    return this.state.has(key);
  }

  /**
   * Remove a state value
   */
  remove(key: string): void {
    const value = this.state.get(key) as StateValue;
    const config = this.stateConfigs.get(key);

    this.state.delete(key);
    this.stateConfigs.delete(key);

    // Remove from persistence if configured
    if (config?.persistent) {
      this.removePersistedValue(key, config);
    }

    this.eventBus.emit('state:removed', {
      key,
      value,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear all state
   */
  clear(options?: { keepPersisted?: boolean }): void {
    // Store persisted keys if needed
    const persistedKeys = options?.keepPersisted
      ? Array.from(this.stateConfigs.entries())
          .filter(([, config]) => config.persistent)
          .map(([key]) => key)
      : [];

    // Clear in-memory state
    this.state.clear();

    // Clear persistence unless keepPersisted is true
    if (!options?.keepPersisted) {
      this.stateConfigs.clear();
      this.persistenceManager.clearNamespace(this.namespace);
    } else {
      // Restore persisted values
      persistedKeys.forEach((key) => {
        const config = this.stateConfigs.get(key);
        if (config) {
          const value = this.loadPersistedValue(key, config);
          if (value !== null) {
            this.state.set(key, value);
          }
        }
      });
    }
  }

  /**
   * Get all state keys
   */
  keys(): string[] {
    return Array.from(this.state.keys());
  }

  /**
   * Get all state entries
   */
  entries(): Array<[string, unknown]> {
    return Array.from(this.state.entries());
  }

  /**
   * Get the size of the state
   */
  size(): number {
    return this.state.size;
  }

  /**
   * Subscribe to state changes for a specific key
   */
  watch(key: string, callback: (value: StateValue, from: StateValue) => void): () => void {
    const handler = (event: { key: string; to: StateValue; from: StateValue }) => {
      if (event.key === key) {
        callback(event.to, event.from);
      }
    };

    return this.eventBus.on('state:changed', handler);
  }

  /**
   * Create a computed value based on state
   */
  computed<T>(keys: string[], compute: (values: Record<string, unknown>) => T): () => T {
    return () => {
      const values: Record<string, unknown> = {};
      keys.forEach((key) => {
        values[key] = this.get(key);
      });
      return compute(values);
    };
  }

  /**
   * Batch update multiple state values
   */
  batch(updates: Record<string, StateValue>): void {
    Object.entries(updates).forEach(([key, value]) => {
      this.set(key, value);
    });
  }

  /**
   * Export state for debugging or persistence
   */
  export(includeConfigs = false): {
    state: Record<string, unknown>;
    configs?: Record<string, StateConfig>;
  } {
    const exported: Record<string, unknown> = {};
    this.state.forEach((value, key) => {
      exported[key] = value;
    });

    if (includeConfigs) {
      const configs: Record<string, StateConfig> = {};
      this.stateConfigs.forEach((config, key) => {
        configs[key] = config;
      });
      return { state: exported, configs };
    }

    return { state: exported };
  }

  /**
   * Import state from an export
   */
  import(data: { state: Record<string, StateValue>; configs?: Record<string, StateConfig> }): void {
    // Import configs first if provided
    if (data.configs) {
      Object.entries(data.configs).forEach(([key, config]) => {
        this.configure(key, config);
      });
    }

    // Import state
    this.batch(data.state);
  }

  /**
   * Persist a value based on its configuration
   */
  private persistValue(key: string, value: unknown, config: StateConfig): void {
    const persistConfig: PersistenceConfig = {
      key: this.namespace,
      storage: (config.storage || 'local') as StorageType,
      version: 1,
    };

    try {
      this.persistenceManager.save(key, value, persistConfig);
    } catch (error) {
      console.error(`Failed to persist state: ${key}`, error);
    }
  }

  /**
   * Load a persisted value
   */
  private loadPersistedValue(key: string, config: StateConfig): unknown | null {
    const persistConfig: PersistenceConfig = {
      key: this.namespace,
      storage: (config.storage || 'local') as StorageType,
      version: 1,
    };

    try {
      return this.persistenceManager.load(key, persistConfig);
    } catch (error) {
      console.error(`Failed to load persisted state: ${key}`, error);
      return null;
    }
  }

  /**
   * Remove a persisted value
   */
  private removePersistedValue(key: string, config: StateConfig): void {
    const persistConfig: PersistenceConfig = {
      key: this.namespace,
      storage: (config.storage || 'local') as StorageType,
      version: 1,
    };

    try {
      this.persistenceManager.remove(key, persistConfig);
    } catch (error) {
      console.error(`Failed to remove persisted state: ${key}`, error);
    }
  }

  /**
   * Restore all persisted state on initialization
   */
  private restorePersistedState(): void {
    this.stateConfigs.forEach((config, key) => {
      if (config.persistent && !this.state.has(key)) {
        const value = this.loadPersistedValue(key, config) as StateValue;
        if (value !== null) {
          this.set(key, value, { skipPersist: true });
        }
      }
    });
  }
}
