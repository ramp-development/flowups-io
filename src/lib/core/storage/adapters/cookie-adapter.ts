import type { IStorageAdapter, StorageOptions, StorageValue } from '$lib/types';

/**
 * Cookie storage adapter
 */
export class CookieAdapter implements IStorageAdapter {
  private prefix = 'toolkit_';

  private getFullKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  private parseCookies(): Record<string, string> {
    const cookies: Record<string, string> = {};
    document.cookie.split(';').forEach((cookie) => {
      const [name, value] = cookie.trim().split('=');
      if (name && value) {
        cookies[name] = decodeURIComponent(value);
      }
    });
    return cookies;
  }

  private setCookie(name: string, value: string, options?: StorageOptions): void {
    const encodedValue = encodeURIComponent(value);
    let cookieString = `${name}=${encodedValue}`;

    // Add expiration
    if (options?.ttl) {
      const expires = new Date(Date.now() + options.ttl);
      cookieString += `; expires=${expires.toUTCString()}`;
    }

    // Add path
    cookieString += `; path=${options?.path || '/'}`;

    // Add domain
    if (options?.domain) {
      cookieString += `; domain=${options.domain}`;
    }

    // Add secure flag
    if (options?.secure) {
      cookieString += '; secure';
    }

    // Add SameSite
    if (options?.sameSite) {
      cookieString += `; samesite=${options.sameSite}`;
    }

    document.cookie = cookieString;
  }

  private deleteCookie(name: string): void {
    // Set cookie with past expiration to delete it
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
  }

  get(key: string): StorageValue | null {
    try {
      const fullKey = this.getFullKey(key);
      const cookies = this.parseCookies();
      const value = cookies[fullKey];

      if (!value) return null;

      // Try to parse as JSON
      try {
        const parsed = JSON.parse(value);

        // Check if it's a wrapped value with metadata
        if (parsed && typeof parsed === 'object' && '_value' in parsed) {
          // Check expiration (cookies handle their own expiration, but we double-check)
          if (parsed._expires && parsed._expires < Date.now()) {
            this.deleteCookie(fullKey);
            return null;
          }
          return parsed._value;
        }

        return parsed;
      } catch {
        // If not valid JSON, return as string
        return value;
      }
    } catch (error) {
      console.error(`Failed to get cookie: ${key}`, error);
      return null;
    }
  }

  set(key: string, value: StorageValue, options?: StorageOptions): void {
    try {
      const fullKey = this.getFullKey(key);
      const wrapper = {
        _value: value,
        _created: Date.now(),
        _expires: options?.ttl ? Date.now() + options.ttl : undefined,
      };

      const serialized = JSON.stringify(wrapper);

      // Check cookie size limit (4KB)
      if (serialized.length > 4096) {
        throw new Error(`Cookie value too large: ${serialized.length} bytes`);
      }

      this.setCookie(fullKey, serialized, options);
    } catch (error) {
      console.error(`Failed to set cookie: ${key}`, error);
      throw error;
    }
  }

  remove(key: string): void {
    this.deleteCookie(this.getFullKey(key));
  }

  clear(): void {
    // Clear all cookies with our prefix
    const cookies = this.parseCookies();
    Object.keys(cookies).forEach((name) => {
      if (name.startsWith(this.prefix)) {
        this.deleteCookie(name);
      }
    });
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  keys(): string[] {
    const cookies = this.parseCookies();
    return Object.keys(cookies)
      .filter((name) => name.startsWith(this.prefix))
      .map((name) => name.substring(this.prefix.length));
  }

  size(): number {
    return this.keys().length;
  }
}
