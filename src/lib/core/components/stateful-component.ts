/**
 * StatefulComponent - Extends InteractiveComponent with state management
 * Provides local and persistent state capabilities with change tracking
 */

import type {
  AppEventMap,
  ComponentState,
  ComponentStateConfig,
  PersistenceConfig,
  StateChangeEvent,
  StatefulComponentProps,
  StateValue,
  StorageType,
} from '$lib/types';

import { StateManager } from '../state/state-manager';
import { PersistenceManager } from '../storage/persistance-manager';
import { StorageManager } from '../storage/storage-manager';
import { InteractiveComponent } from './interactive-component';

export abstract class StatefulComponent<
  TState extends ComponentState = ComponentState,
  TEventMap extends AppEventMap = AppEventMap
> extends InteractiveComponent<TEventMap> {
  protected state: TState;
  protected stateConfigs: Map<keyof TState, ComponentStateConfig> = new Map();
  protected stateManager: StateManager;
  protected storageManager: StorageManager;
  protected persistenceManager: PersistenceManager;
  private statePrefix: string;
  private initialState: Partial<TState> = {};

  constructor(props: StatefulComponentProps = {}) {
    super(props);

    this.state = {} as TState;
    this.stateManager = StateManager.getInstance();
    this.storageManager = StorageManager.getInstance();
    this.persistenceManager = PersistenceManager.getInstance();
    this.statePrefix = props.statePrefix || this.id;

    // Configure state from config
    if (props.state) {
      const configs = Array.isArray(props.state) ? props.state : [props.state];
      configs.forEach((stateConfig) => this.configureState(stateConfig));
    }
  }

  /**
   * Initialize component and restore state
   */
  protected override async onInit(): Promise<void> {
    await super.onInit();

    // Restore state from storage
    this.restoreState();

    // Subscribe to global state changes if using StateManager
    this.subscribeToStateChanges();
  }

  /**
   * Save state before destroying
   */
  protected override async onDestroy(): Promise<void> {
    // Persist state if configured
    if ((this.props as StatefulComponentProps).persistState) {
      this.persistState();
    }

    await super.onDestroy();
  }

  /**
   * Configure a state property
   */
  protected configureState(config: ComponentStateConfig): void {
    const key = config.key as keyof TState;
    this.stateConfigs.set(key, config);

    // Set default value
    if (config.defaultValue !== undefined) {
      this.state[key] = config.defaultValue as TState[keyof TState];
      this.initialState[key] = config.defaultValue as TState[keyof TState];
    }
  }

  /**
   * Get state value
   */
  public getState<K extends keyof TState>(key: K): TState[K] {
    return this.state[key];
  }

  /**
   * Set state value with validation and change tracking
   */
  public setState<K extends keyof TState>(
    key: K,
    value: TState[K],
    options: { silent?: boolean; persist?: boolean } = {}
  ): boolean {
    const oldValue = this.state[key];

    // Skip if value hasn't changed
    if (this.isEqual(oldValue, value)) {
      return false;
    }

    const config = this.stateConfigs.get(key);

    // Validate if validator provided
    if (config?.validate && !config.validate(value as StateValue)) {
      this.logWarn(`State validation failed for ${String(key)}:`, value);
      return false;
    }

    // Transform if transformer provided
    const transformedValue = config?.transform
      ? (config.transform(value as StateValue) as TState[K])
      : value;

    // Update state
    this.state[key] = transformedValue;

    // Persist if configured
    if (options.persist !== false) {
      this.persistStateKey(key, transformedValue);
    }

    // Emit change event
    if (!options.silent) {
      this.onStateChange(key, oldValue, transformedValue);
    }

    return true;
  }

  /**
   * Batch update multiple state values
   */
  protected setStates(
    updates: Partial<TState>,
    options: { silent?: boolean; persist?: boolean } = {}
  ): void {
    const changes: Array<{ key: keyof TState; oldValue: unknown; newValue: unknown }> = [];

    Object.entries(updates).forEach(([key, value]) => {
      const typedKey = key as keyof TState;
      const oldValue = this.state[typedKey];

      if (this.setState(typedKey, value as TState[keyof TState], { ...options, silent: true })) {
        changes.push({ key: typedKey, oldValue, newValue: value });
      }
    });

    // Emit batch change event
    if (!options.silent && changes.length > 0) {
      changes.forEach(({ key, oldValue, newValue }) => {
        this.onStateChange(key, oldValue, newValue);
      });
    }
  }

  /**
   * Reset state to initial values
   */
  protected resetState(keys?: Array<keyof TState>): void {
    const keysToReset = keys || (Object.keys(this.state) as Array<keyof TState>);

    keysToReset.forEach((key) => {
      if (key in this.initialState) {
        this.setState(key, this.initialState[key] as TState[keyof TState]);
      }
    });
  }

  /**
   * Get all current state
   */
  protected getAllState(): Readonly<TState> {
    return { ...this.state };
  }

  /**
   * Subscribe to global state changes
   */
  private subscribeToStateChanges(): void {
    // Subscribe to state changes that match our prefix
    this.subscribe('state:changed', (payload) => {
      if (payload.key.startsWith(this.statePrefix)) {
        const localKey = payload.key.replace(`${this.statePrefix}.`, '') as keyof TState;
        if (localKey in this.state) {
          this.setState(localKey, payload.newValue as TState[keyof TState], {
            silent: false,
            persist: false,
          });
        }
      }
    });
  }

  /**
   * Called when state changes
   */
  protected onStateChange(key: keyof TState, oldValue: unknown, newValue: unknown): void {
    const event: StateChangeEvent = {
      key: String(key),
      oldValue: oldValue as StateValue,
      newValue: newValue as StateValue,
      component: this.id,
    };

    // Emit local state change
    this.emitCustom('state:changed', event);

    // Emit to EventBus
    this.emit('state:changed', {
      key: `${this.statePrefix}.${String(key)}`,
      oldValue: oldValue as StateValue,
      newValue: newValue as StateValue,
      timestamp: Date.now(),
    });

    // Call abstract handler
    this.handleStateChange(key, oldValue as TState[keyof TState], newValue as TState[keyof TState]);
  }

  /**
   * Abstract method for child classes to handle state changes
   */
  protected abstract handleStateChange<K extends keyof TState>(
    key: K,
    oldValue: TState[K],
    newValue: TState[K]
  ): void;

  /**
   * Persist a single state key
   */
  private persistStateKey<K extends keyof TState>(key: K, value: TState[K]): void {
    const config = this.stateConfigs.get(key);
    if (!config) return;

    const persistConfig: PersistenceConfig = {
      key: this.statePrefix,
      storage: (config.storage || 'memory') as StorageType,
      version: 1,
    };

    try {
      this.persistenceManager.save(String(key), value, persistConfig);
    } catch (error) {
      this.logError(`Failed to persist state: ${String(key)}`, error);
    }
  }

  /**
   * Persist all state
   */
  private persistState(): void {
    Object.entries(this.state).forEach(([key, value]) => {
      this.persistStateKey(key as keyof TState, value as TState[keyof TState]);
    });
  }

  /**
   * Restore state from storage
   */
  private restoreState(): void {
    this.stateConfigs.forEach((config, key) => {
      const persistConfig: PersistenceConfig = {
        key: this.statePrefix,
        storage: (config.storage || 'memory') as StorageType,
        version: 1,
      };

      try {
        const storedValue = this.persistenceManager.load(String(key), persistConfig);
        if (storedValue !== null) {
          this.setState(key, storedValue as TState[keyof TState], {
            silent: true,
            persist: false,
          });
        }
      } catch (error) {
        this.logError(`Failed to restore state: ${String(key)}`, error);
      }
    });
  }

  /**
   * Check if two values are equal
   */
  private isEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (typeof a !== 'object' || typeof b !== 'object') return false;

    // Simple deep equality check for objects
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) return false;

    return keysA.every((key) =>
      this.isEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])
    );
  }

  /**
   * Create a computed property
   */
  protected createComputed<R>(
    _dependencies: Array<keyof TState>,
    compute: (state: TState) => R
  ): () => R {
    return () => compute(this.state);
  }

  /**
   * Watch for state changes with a callback
   */
  protected watchState<K extends keyof TState>(
    key: K,
    callback: (current: TState[K], previous: TState[K]) => void
  ): () => void {
    const handler = (e: Event) => {
      const { detail } = e as CustomEvent<StateChangeEvent>;
      if (detail.key === String(key)) {
        callback(detail.newValue as TState[K], detail.oldValue as TState[K]);
      }
    };

    this.rootElement?.addEventListener('state:changed', handler);

    return () => {
      this.rootElement?.removeEventListener('state:changed', handler);
    };
  }
}
