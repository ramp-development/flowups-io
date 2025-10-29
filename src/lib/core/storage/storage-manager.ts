import type {
  IStorageAdapter,
  IStorageManager,
  StorageOptions,
  StorageType,
  StorageValue,
} from '$lib/types';

import { EventBus } from '../events';
import {
  CookieAdapter,
  LocalStorageAdapter,
  MemoryAdapter,
  SessionStorageAdapter,
} from './adapters';

/**
 * Manages different storage adapters and provides a unified interface
 */
export class StorageManager implements IStorageManager {
  private static instance: StorageManager;
  private adapters: Map<StorageType, IStorageAdapter>;
  private defaultType: StorageType = 'memory';
  private eventBus: EventBus;

  private constructor() {
    this.eventBus = EventBus.getInstance();
    this.adapters = new Map<StorageType, IStorageAdapter>();
    this.adapters.set('memory', new MemoryAdapter());
    this.adapters.set('local', new LocalStorageAdapter());
    this.adapters.set('session', new SessionStorageAdapter());
    this.adapters.set('cookie', new CookieAdapter());
  }

  static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager();
    }
    return StorageManager.instance;
  }

  static init(): void {
    StorageManager.getInstance();
  }

  /**
   * Get a specific storage adapter
   */
  getAdapter(type: StorageType): IStorageAdapter {
    const adapter = this.adapters.get(type);
    if (!adapter) {
      throw new Error(`Storage adapter not found: ${type}`);
    }
    return adapter;
  }

  /**
   * Set the default storage type
   */
  setDefaultType(type: StorageType): void {
    if (!this.adapters.has(type)) {
      throw new Error(`Invalid storage type: ${type}`);
    }
    this.defaultType = type;
  }

  /**
   * Get a value from storage
   */
  get(key: string, type: StorageType = this.defaultType): StorageValue | null {
    try {
      const adapter = this.getAdapter(type);
      const value = adapter.get(key);

      this.eventBus.emit('storage:get', { key, type });

      return value;
    } catch (error) {
      this.eventBus.emit('storage:error', {
        error: error as Error,
        operation: 'get',
        key,
      });
      return null;
    }
  }

  /**
   * Set a value in storage
   */
  set(
    key: string,
    value: StorageValue,
    type: StorageType = this.defaultType,
    options?: StorageOptions
  ): void {
    try {
      const adapter = this.getAdapter(type);
      adapter.set(key, value, options);

      this.eventBus.emit('storage:set', { key, value, type });
    } catch (error) {
      this.eventBus.emit('storage:error', {
        error: error as Error,
        operation: 'set',
        key,
      });
      throw error;
    }
  }

  /**
   * Remove a value from storage
   */
  remove(key: string, type: StorageType = this.defaultType): void {
    try {
      const adapter = this.getAdapter(type);
      adapter.remove(key);

      this.eventBus.emit('storage:remove', { key, type });
    } catch (error) {
      this.eventBus.emit('storage:error', {
        error: error as Error,
        operation: 'remove',
        key,
      });
    }
  }

  /**
   * Clear all values from a storage type
   */
  clear(type: StorageType = this.defaultType): void {
    try {
      const adapter = this.getAdapter(type);
      adapter.clear();

      this.eventBus.emit('storage:clear', { type });
    } catch (error) {
      this.eventBus.emit('storage:error', {
        error: error as Error,
        operation: 'clear',
      });
    }
  }

  /**
   * Check if a key exists in storage
   */
  has(key: string, type: StorageType = this.defaultType): boolean {
    try {
      const adapter = this.getAdapter(type);
      return adapter.has(key);
    } catch {
      return false;
    }
  }

  /**
   * Get all keys from a storage type
   */
  keys(type: StorageType = this.defaultType): string[] {
    try {
      const adapter = this.getAdapter(type);
      return adapter.keys();
    } catch {
      return [];
    }
  }

  /**
   * Get the size of a storage type
   */
  size(type: StorageType = this.defaultType): number {
    try {
      const adapter = this.getAdapter(type);
      return adapter.size();
    } catch {
      return 0;
    }
  }

  /**
   * Copy a value from one storage type to another
   */
  copy(key: string, fromType: StorageType, toType: StorageType, options?: StorageOptions): boolean {
    try {
      const value = this.get(key, fromType);
      if (value === null) return false;

      this.set(key, value, toType, options);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Move a value from one storage type to another
   */
  move(key: string, fromType: StorageType, toType: StorageType, options?: StorageOptions): boolean {
    try {
      const copied = this.copy(key, fromType, toType, options);
      if (copied) {
        this.remove(key, fromType);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Get storage statistics
   */
  getStats(): Record<StorageType, { keys: number; available: boolean }> {
    const stats: Record<StorageType, { keys: number; available: boolean }> = {
      memory: { keys: 0, available: true },
      local: { keys: 0, available: true },
      session: { keys: 0, available: true },
      cookie: { keys: 0, available: true },
    };

    for (const [type, adapter] of this.adapters.entries()) {
      try {
        stats[type] = {
          keys: adapter.size(),
          available: true,
        };
      } catch {
        stats[type] = {
          keys: 0,
          available: false,
        };
      }
    }

    return stats;
  }
}
