import type { IStorageAdapter, StorageOptions, StorageValue } from '$lib/types';

/**
 * In-memory storage adapter
 */
export class MemoryAdapter implements IStorageAdapter {
  private storage: Map<string, { value: StorageValue; expires?: number }> = new Map();

  get(key: string): StorageValue | null {
    const item = this.storage.get(key);
    if (!item) return null;

    // Check if expired
    if (item.expires && item.expires < Date.now()) {
      this.storage.delete(key);
      return null;
    }

    return item.value;
  }

  set(key: string, value: StorageValue, options?: StorageOptions): void {
    const item: { value: StorageValue; expires?: number } = { value };
    if (options?.ttl) {
      item.expires = Date.now() + options.ttl;
    }
    this.storage.set(key, item);
  }

  remove(key: string): void {
    this.storage.delete(key);
  }

  clear(): void {
    this.storage.clear();
  }

  has(key: string): boolean {
    const value = this.get(key);
    return value !== null;
  }

  keys(): string[] {
    // Clean up expired items first
    const now = Date.now();
    for (const [key, item] of this.storage.entries()) {
      if (item.expires && item.expires < now) {
        this.storage.delete(key);
      }
    }
    return Array.from(this.storage.keys());
  }

  size(): number {
    return this.keys().length;
  }
}
