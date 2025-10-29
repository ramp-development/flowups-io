import type { IStorageAdapter, StorageOptions, StorageValue } from '$lib/types';

/**
 * LocalStorage adapter with TTL support
 */
export class LocalStorageAdapter implements IStorageAdapter {
  private prefix = 'toolkit_';

  private getFullKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  private isStorageAvailable(): boolean {
    try {
      const testKey = '__toolkit_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  get(key: string): StorageValue | null {
    if (!this.isStorageAvailable()) return null;

    try {
      const fullKey = this.getFullKey(key);
      const item = localStorage.getItem(fullKey);
      if (!item) return null;

      const parsed = JSON.parse(item);

      // Check if it's a wrapped value with metadata
      if (parsed && typeof parsed === 'object' && '_value' in parsed) {
        // Check expiration
        if (parsed._expires && parsed._expires < Date.now()) {
          localStorage.removeItem(fullKey);
          return null;
        }
        return parsed._value;
      }

      // Legacy support for direct values
      return parsed;
    } catch (error) {
      console.error(`Failed to get value from localStorage: ${key}`, error);
      return null;
    }
  }

  set(key: string, value: StorageValue, options?: StorageOptions): void {
    if (!this.isStorageAvailable()) return;

    try {
      const fullKey = this.getFullKey(key);
      const wrapper = {
        _value: value,
        _created: Date.now(),
        _expires: options?.ttl ? Date.now() + options.ttl : undefined,
      };

      localStorage.setItem(fullKey, JSON.stringify(wrapper));
    } catch (error) {
      console.error(`Failed to set value in localStorage: ${key}`, error);
      // Handle quota exceeded error
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        // Try to clear some space by removing expired items
        this.clearExpired();
        try {
          const fullKey = this.getFullKey(key);
          localStorage.setItem(fullKey, JSON.stringify({ _value: value, _created: Date.now() }));
        } catch {
          throw new Error('Storage quota exceeded and unable to clear space');
        }
      }
    }
  }

  remove(key: string): void {
    if (!this.isStorageAvailable()) return;
    localStorage.removeItem(this.getFullKey(key));
  }

  clear(): void {
    if (!this.isStorageAvailable()) return;

    // Only clear items with our prefix
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.prefix)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key));
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  keys(): string[] {
    if (!this.isStorageAvailable()) return [];

    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.prefix)) {
        // Remove prefix to get the actual key
        keys.push(key.substring(this.prefix.length));
      }
    }
    return keys;
  }

  size(): number {
    return this.keys().length;
  }

  private clearExpired(): void {
    const keys = this.keys();
    const now = Date.now();

    keys.forEach((key) => {
      try {
        const fullKey = this.getFullKey(key);
        const item = localStorage.getItem(fullKey);
        if (item) {
          const parsed = JSON.parse(item);
          if (parsed._expires && parsed._expires < now) {
            localStorage.removeItem(fullKey);
          }
        }
      } catch {
        // Invalid item, remove it
        localStorage.removeItem(this.getFullKey(key));
      }
    });
  }
}
