import type { IPersistenceManager, PersistenceConfig, StorageValue } from '$lib/types';

import { StorageManager } from './storage-manager';

/**
 * Manages data persistence with versioning and migration support
 */
export class PersistenceManager implements IPersistenceManager {
  private static instance: PersistenceManager;
  private storageManager: StorageManager;
  // EventBus can be used for persistence events in the future
  // private eventBus: EventBus;
  private migrations: Map<string, Map<number, (data: unknown) => unknown>> = new Map();

  private constructor() {
    this.storageManager = StorageManager.getInstance();
  }

  static getInstance(): PersistenceManager {
    if (!PersistenceManager.instance) {
      PersistenceManager.instance = new PersistenceManager();
    }
    return PersistenceManager.instance;
  }

  static init(): void {
    PersistenceManager.getInstance();
  }

  /**
   * Save data with persistence configuration
   */
  save(key: string, data: unknown, config: PersistenceConfig): void {
    try {
      // Filter data based on include/exclude
      const filteredData = this.filterData(data, config);

      // Serialize data
      const serialized = config.serialize
        ? config.serialize(filteredData)
        : this.defaultSerialize(filteredData);

      // Create metadata wrapper
      const wrapper = {
        _data: serialized,
        _version: config.version || 1,
        _saved: Date.now(),
        _key: config.key,
      };

      // Save to storage
      this.storageManager.set(
        this.getStorageKey(key, config),
        wrapper as StorageValue,
        config.storage,
        config.options
      );
    } catch (error) {
      console.error(`Failed to persist data: ${key}`, error);
      throw error;
    }
  }

  /**
   * Load data with persistence configuration
   */
  load(key: string, config: PersistenceConfig): unknown | null {
    try {
      // Load from storage
      const wrapper = this.storageManager.get(this.getStorageKey(key, config), config.storage) as {
        _data: StorageValue;
        _version: number;
      } | null;

      if (!wrapper || !wrapper._data) {
        return null;
      }

      // Check version and migrate if needed
      let data: StorageValue = wrapper._data;
      if (wrapper._version !== (config.version || 1)) {
        const migratedData = this.migrateData(
          config.key,
          data,
          wrapper._version,
          config.version || 1
        );
        if (migratedData !== null) {
          data = migratedData;
        }
      }

      // Deserialize data
      const deserialized = config.deserialize
        ? config.deserialize(data)
        : this.defaultDeserialize(data);

      return deserialized;
    } catch (error) {
      console.error(`Failed to load persisted data: ${key}`, error);
      return null;
    }
  }

  /**
   * Remove persisted data
   */
  remove(key: string, config: PersistenceConfig): void {
    try {
      this.storageManager.remove(this.getStorageKey(key, config), config.storage);
    } catch (error) {
      console.error(`Failed to remove persisted data: ${key}`, error);
    }
  }

  /**
   * Register a migration function
   */
  registerMigration(
    key: string,
    fromVersion: number,
    _toVersion: number,
    migrator: (data: unknown) => unknown
  ): void {
    if (!this.migrations.has(key)) {
      this.migrations.set(key, new Map());
    }

    const keyMigrations = this.migrations.get(key)!;
    // Store migration by "from" version
    keyMigrations.set(fromVersion, migrator);
  }

  /**
   * Migrate data through version changes
   */
  migrate(
    key: string,
    fromVersion: number,
    _toVersion: number,
    migrator: (data: unknown) => unknown
  ): void {
    this.registerMigration(key, fromVersion, _toVersion, migrator);
  }

  /**
   * Get all persisted keys for a namespace
   */
  getPersistedKeys(namespace: string): string[] {
    const allKeys: string[] = [];
    const storageTypes = ['memory', 'local', 'session', 'cookie'] as const;

    storageTypes.forEach((type) => {
      const keys = this.storageManager.keys(type);
      const namespaceKeys = keys.filter((key) => key.startsWith(`${namespace}:`));
      allKeys.push(...namespaceKeys);
    });

    return Array.from(new Set(allKeys));
  }

  /**
   * Clear all persisted data for a namespace
   */
  clearNamespace(namespace: string): void {
    const keys = this.getPersistedKeys(namespace);
    const storageTypes = ['memory', 'local', 'session', 'cookie'] as const;

    keys.forEach((key) => {
      storageTypes.forEach((type) => {
        if (this.storageManager.has(key, type)) {
          this.storageManager.remove(key, type);
        }
      });
    });
  }

  /**
   * Export all data for a namespace
   */
  exportNamespace(namespace: string): Record<string, unknown> {
    const keys = this.getPersistedKeys(namespace);
    const exported: Record<string, unknown> = {};
    const storageTypes = ['memory', 'local', 'session', 'cookie'] as const;

    keys.forEach((key) => {
      for (const type of storageTypes) {
        const value = this.storageManager.get(key, type);
        if (value !== null) {
          exported[key] = value;
          break;
        }
      }
    });

    return exported;
  }

  /**
   * Import data for a namespace
   */
  importNamespace(
    namespace: string,
    data: Record<string, unknown>,
    targetStorage: 'memory' | 'local' | 'session' | 'cookie' = 'memory'
  ): void {
    Object.entries(data).forEach(([key, value]) => {
      if (key.startsWith(`${namespace}:`)) {
        this.storageManager.set(key, value as StorageValue, targetStorage);
      }
    });
  }

  /**
   * Get the storage key for persistence
   */
  private getStorageKey(key: string, config: PersistenceConfig): string {
    return `${config.key}:${key}`;
  }

  /**
   * Filter data based on include/exclude configuration
   */
  private filterData(data: unknown, config: PersistenceConfig): unknown {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const obj = data as Record<string, unknown>;
    const filtered: Record<string, unknown> = {};

    // If include is specified, only include those fields
    if (config.include && config.include.length > 0) {
      config.include.forEach((field) => {
        if (field in obj) {
          filtered[field] = obj[field];
        }
      });
      return filtered;
    }

    // Otherwise, include all except excluded fields
    Object.entries(obj).forEach(([key, value]) => {
      if (!config.exclude || !config.exclude.includes(key)) {
        filtered[key] = value;
      }
    });

    return filtered;
  }

  /**
   * Default serialization
   */
  private defaultSerialize(data: unknown): StorageValue {
    // Handle primitive types
    if (
      data === null ||
      typeof data === 'string' ||
      typeof data === 'number' ||
      typeof data === 'boolean'
    ) {
      return data;
    }

    // Handle arrays and objects
    if (Array.isArray(data) || (typeof data === 'object' && data !== null)) {
      return JSON.parse(JSON.stringify(data)) as StorageValue;
    }

    // Unsupported type
    throw new Error(`Cannot serialize data of type: ${typeof data}`);
  }

  /**
   * Default deserialization
   */
  private defaultDeserialize(data: StorageValue): unknown {
    return data;
  }

  /**
   * Migrate data through versions
   */
  private migrateData(
    key: string,
    data: StorageValue,
    fromVersion: number,
    toVersion: number
  ): StorageValue {
    const keyMigrations = this.migrations.get(key);
    if (!keyMigrations) {
      // eslint-disable-next-line no-console
      console.warn(`No migrations found for key: ${key}`);
      return data;
    }

    let currentData: unknown = data;
    let currentVersion = fromVersion;

    // Apply migrations in sequence
    while (currentVersion < toVersion) {
      const migrator = keyMigrations.get(currentVersion);
      if (migrator) {
        currentData = migrator(currentData);
      } else {
        // eslint-disable-next-line no-console
        console.warn(`No migration found from version ${currentVersion} to ${currentVersion + 1}`);
      }
      currentVersion += 1;
    }

    return currentData as StorageValue;
  }
}
