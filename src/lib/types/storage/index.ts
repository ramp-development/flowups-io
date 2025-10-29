/**
 * Storage-related type definitions
 */

// Storage types
export type StorageType = 'memory' | 'local' | 'session' | 'cookie';

// Storage value types - must be serializable for persistence
export type StorageValue = string | number | boolean | null | StorageObject | StorageArray;
export interface StorageObject {
  [key: string]: StorageValue;
}
export type StorageArray = Array<StorageValue>;

// Storage options
export interface StorageOptions {
  /** Time to live in milliseconds */
  ttl?: number;
  /** Encrypt the stored value */
  encrypt?: boolean;
  /** Domain for cookies */
  domain?: string;
  /** Path for cookies */
  path?: string;
  /** Secure flag for cookies */
  secure?: boolean;
  /** SameSite attribute for cookies */
  sameSite?: 'strict' | 'lax' | 'none';
}

// Storage adapter interface
export interface IStorageAdapter {
  get(key: string): StorageValue | null;
  set(key: string, value: StorageValue, options?: StorageOptions): void;
  remove(key: string): void;
  clear(): void;
  has(key: string): boolean;
  keys(): string[];
  size(): number;
}

// Storage manager interface
export interface IStorageManager {
  getAdapter(type: StorageType): IStorageAdapter;
  get(key: string, type?: StorageType): StorageValue | null;
  set(key: string, value: StorageValue, type?: StorageType, options?: StorageOptions): void;
  remove(key: string, type?: StorageType): void;
  clear(type?: StorageType): void;
  has(key: string, type?: StorageType): boolean;
}

// Persistence configuration
export interface PersistenceConfig {
  /** Unique key for the persistence namespace */
  key: string;
  /** Storage type to use */
  storage: StorageType;
  /** Version for migration support */
  version?: number;
  /** Fields to persist */
  include?: string[];
  /** Fields to exclude from persistence */
  exclude?: string[];
  /** Transform function before saving */
  serialize?: (data: unknown) => StorageValue;
  /** Transform function after loading */
  deserialize?: (data: StorageValue) => unknown;
  /** Storage options */
  options?: StorageOptions;
}

// Persistence manager interface
export interface IPersistenceManager {
  save(key: string, data: unknown, config: PersistenceConfig): void;
  load(key: string, config: PersistenceConfig): unknown | null;
  remove(key: string, config: PersistenceConfig): void;
  migrate(
    key: string,
    fromVersion: number,
    toVersion: number,
    migrator: (data: unknown) => unknown
  ): void;
}

// Storage metadata
export interface StorageMetadata {
  key: string;
  type: StorageType;
  size: number;
  created: number;
  updated: number;
  expires?: number;
}

// Storage events
export interface StorageEventMap {
  'storage:set': { key: string; value: StorageValue; type: StorageType };
  'storage:get': { key: string; type: StorageType };
  'storage:remove': { key: string; type: StorageType };
  'storage:clear': { type: StorageType };
  'storage:error': { error: Error; operation: string; key?: string };
}
