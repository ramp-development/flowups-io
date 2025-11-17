"use strict";
(() => {
  // bin/live-reload.js
  new EventSource(`${"http://localhost:3000"}/esbuild`).addEventListener("change", () => location.reload());

  // src/lib/core/events/event-bus.ts
  var EventBus = class _EventBus {
    static instance;
    events = /* @__PURE__ */ new Map();
    config;
    handlerIdCounter = 0;
    constructor(config = {}) {
      this.config = {
        maxListeners: config.maxListeners ?? 0,
        errorHandler: config.errorHandler ?? this.defaultErrorHandler,
        debug: config.debug ?? false
      };
    }
    static getInstance(config) {
      if (!_EventBus.instance) {
        _EventBus.instance = new _EventBus(config);
      }
      return _EventBus.instance;
    }
    on(event, handler, options = {}) {
      if (!this.events.has(event)) {
        this.events.set(event, []);
      }
      const handlers = this.events.get(event);
      if (this.config.maxListeners > 0 && handlers.length >= this.config.maxListeners) {
        console.error(
          `[EventBus] Max listeners (${this.config.maxListeners}) reached for event "${String(
            event
          )}"`
        );
      }
      this.handlerIdCounter += 1;
      const wrapper = {
        handler,
        options,
        id: `handler-${this.handlerIdCounter}`
      };
      const priority = options.priority ?? 0;
      const insertIndex = handlers.findIndex((h) => (h.options.priority ?? 0) < priority);
      if (insertIndex === -1) {
        handlers.push(wrapper);
      } else {
        handlers.splice(insertIndex, 0, wrapper);
      }
      return () => {
        this.off(event, handler);
      };
    }
    once(event, handler) {
      return this.on(event, handler, { once: true });
    }
    off(event, handler) {
      const handlers = this.events.get(event);
      if (!handlers) return;
      if (!handler) {
        this.events.delete(event);
        return;
      }
      const index = handlers.findIndex((h) => h.handler === handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
      if (handlers.length === 0) {
        this.events.delete(event);
      }
    }
    emit(event, payload, options = {}) {
      const handlers = this.events.get(event);
      if (!handlers || handlers.length === 0) {
        return;
      }
      const handlersToExecute = [...handlers];
      for (const wrapper of handlersToExecute) {
        try {
          const context = wrapper.options.context ?? void 0;
          wrapper.handler.call(context, payload);
          if (wrapper.options.once) {
            this.off(event, wrapper.handler);
          }
        } catch (error) {
          if (options.throwOnError) {
            throw error;
          }
          this.config.errorHandler(error, String(event));
        }
      }
    }
    async emitAsync(event, payload, options = {}) {
      const handlers = this.events.get(event);
      if (!handlers || handlers.length === 0) {
        return;
      }
      const handlersToExecute = [...handlers];
      const promises = [];
      for (const wrapper of handlersToExecute) {
        const promise = (async () => {
          try {
            const context = wrapper.options.context ?? void 0;
            await wrapper.handler.call(context, payload);
            if (wrapper.options.once) {
              this.off(event, wrapper.handler);
            }
          } catch (error) {
            if (options.throwOnError) {
              throw error;
            }
            this.config.errorHandler(error, String(event));
          }
        })();
        promises.push(promise);
      }
      await Promise.all(promises);
    }
    listenerCount(event) {
      return this.events.get(event)?.length ?? 0;
    }
    removeAllListeners(event) {
      if (event) {
        this.events.delete(event);
      } else {
        this.events.clear();
      }
    }
    setMaxListeners(max) {
      this.config.maxListeners = max;
    }
    getMaxListeners() {
      return this.config.maxListeners;
    }
    setDebugMode(enabled) {
      this.config.debug = enabled;
    }
    defaultErrorHandler(error, eventName) {
      console.error(`[EventBus] Error in handler for "${eventName}":`, error);
    }
    // Helper method to get all event names
    getEventNames() {
      return Array.from(this.events.keys());
    }
    // Helper method to check if event has listeners
    hasListeners(event) {
      return this.listenerCount(event) > 0;
    }
    // Cleanup method
    destroy() {
      this.removeAllListeners();
      if (_EventBus.instance === this) {
        _EventBus.instance = void 0;
      }
    }
  };

  // src/lib/core/storage/adapters/cookie-adapter.ts
  var CookieAdapter = class {
    prefix = "toolkit_";
    getFullKey(key) {
      return `${this.prefix}${key}`;
    }
    parseCookies() {
      const cookies = {};
      document.cookie.split(";").forEach((cookie) => {
        const [name, value] = cookie.trim().split("=");
        if (name && value) {
          cookies[name] = decodeURIComponent(value);
        }
      });
      return cookies;
    }
    setCookie(name, value, options) {
      const encodedValue = encodeURIComponent(value);
      let cookieString = `${name}=${encodedValue}`;
      if (options?.ttl) {
        const expires = new Date(Date.now() + options.ttl);
        cookieString += `; expires=${expires.toUTCString()}`;
      }
      cookieString += `; path=${options?.path || "/"}`;
      if (options?.domain) {
        cookieString += `; domain=${options.domain}`;
      }
      if (options?.secure) {
        cookieString += "; secure";
      }
      if (options?.sameSite) {
        cookieString += `; samesite=${options.sameSite}`;
      }
      document.cookie = cookieString;
    }
    deleteCookie(name) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
    }
    get(key) {
      try {
        const fullKey = this.getFullKey(key);
        const cookies = this.parseCookies();
        const value = cookies[fullKey];
        if (!value) return null;
        try {
          const parsed = JSON.parse(value);
          if (parsed && typeof parsed === "object" && "_value" in parsed) {
            if (parsed._expires && parsed._expires < Date.now()) {
              this.deleteCookie(fullKey);
              return null;
            }
            return parsed._value;
          }
          return parsed;
        } catch {
          return value;
        }
      } catch (error) {
        console.error(`Failed to get cookie: ${key}`, error);
        return null;
      }
    }
    set(key, value, options) {
      try {
        const fullKey = this.getFullKey(key);
        const wrapper = {
          _value: value,
          _created: Date.now(),
          _expires: options?.ttl ? Date.now() + options.ttl : void 0
        };
        const serialized = JSON.stringify(wrapper);
        if (serialized.length > 4096) {
          throw new Error(`Cookie value too large: ${serialized.length} bytes`);
        }
        this.setCookie(fullKey, serialized, options);
      } catch (error) {
        console.error(`Failed to set cookie: ${key}`, error);
        throw error;
      }
    }
    remove(key) {
      this.deleteCookie(this.getFullKey(key));
    }
    clear() {
      const cookies = this.parseCookies();
      Object.keys(cookies).forEach((name) => {
        if (name.startsWith(this.prefix)) {
          this.deleteCookie(name);
        }
      });
    }
    has(key) {
      return this.get(key) !== null;
    }
    keys() {
      const cookies = this.parseCookies();
      return Object.keys(cookies).filter((name) => name.startsWith(this.prefix)).map((name) => name.substring(this.prefix.length));
    }
    size() {
      return this.keys().length;
    }
  };

  // src/lib/core/storage/adapters/local-storage-adapter.ts
  var LocalStorageAdapter = class {
    prefix = "toolkit_";
    getFullKey(key) {
      return `${this.prefix}${key}`;
    }
    isStorageAvailable() {
      try {
        const testKey = "__toolkit_test__";
        localStorage.setItem(testKey, "test");
        localStorage.removeItem(testKey);
        return true;
      } catch {
        return false;
      }
    }
    get(key) {
      if (!this.isStorageAvailable()) return null;
      try {
        const fullKey = this.getFullKey(key);
        const item = localStorage.getItem(fullKey);
        if (!item) return null;
        const parsed = JSON.parse(item);
        if (parsed && typeof parsed === "object" && "_value" in parsed) {
          if (parsed._expires && parsed._expires < Date.now()) {
            localStorage.removeItem(fullKey);
            return null;
          }
          return parsed._value;
        }
        return parsed;
      } catch (error) {
        console.error(`Failed to get value from localStorage: ${key}`, error);
        return null;
      }
    }
    set(key, value, options) {
      if (!this.isStorageAvailable()) return;
      try {
        const fullKey = this.getFullKey(key);
        const wrapper = {
          _value: value,
          _created: Date.now(),
          _expires: options?.ttl ? Date.now() + options.ttl : void 0
        };
        localStorage.setItem(fullKey, JSON.stringify(wrapper));
      } catch (error) {
        console.error(`Failed to set value in localStorage: ${key}`, error);
        if (error instanceof DOMException && error.name === "QuotaExceededError") {
          this.clearExpired();
          try {
            const fullKey = this.getFullKey(key);
            localStorage.setItem(fullKey, JSON.stringify({ _value: value, _created: Date.now() }));
          } catch {
            throw new Error("Storage quota exceeded and unable to clear space");
          }
        }
      }
    }
    remove(key) {
      if (!this.isStorageAvailable()) return;
      localStorage.removeItem(this.getFullKey(key));
    }
    clear() {
      if (!this.isStorageAvailable()) return;
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(this.prefix)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
    }
    has(key) {
      return this.get(key) !== null;
    }
    keys() {
      if (!this.isStorageAvailable()) return [];
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(this.prefix)) {
          keys.push(key.substring(this.prefix.length));
        }
      }
      return keys;
    }
    size() {
      return this.keys().length;
    }
    clearExpired() {
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
          localStorage.removeItem(this.getFullKey(key));
        }
      });
    }
  };

  // src/lib/core/storage/adapters/memory-adapter.ts
  var MemoryAdapter = class {
    storage = /* @__PURE__ */ new Map();
    get(key) {
      const item = this.storage.get(key);
      if (!item) return null;
      if (item.expires && item.expires < Date.now()) {
        this.storage.delete(key);
        return null;
      }
      return item.value;
    }
    set(key, value, options) {
      const item = { value };
      if (options?.ttl) {
        item.expires = Date.now() + options.ttl;
      }
      this.storage.set(key, item);
    }
    remove(key) {
      this.storage.delete(key);
    }
    clear() {
      this.storage.clear();
    }
    has(key) {
      const value = this.get(key);
      return value !== null;
    }
    keys() {
      const now = Date.now();
      for (const [key, item] of this.storage.entries()) {
        if (item.expires && item.expires < now) {
          this.storage.delete(key);
        }
      }
      return Array.from(this.storage.keys());
    }
    size() {
      return this.keys().length;
    }
  };

  // src/lib/core/storage/adapters/session-storage-adapter.ts
  var SessionStorageAdapter = class {
    prefix = "toolkit_";
    getFullKey(key) {
      return `${this.prefix}${key}`;
    }
    isStorageAvailable() {
      try {
        const testKey = "__toolkit_test__";
        sessionStorage.setItem(testKey, "test");
        sessionStorage.removeItem(testKey);
        return true;
      } catch {
        return false;
      }
    }
    get(key) {
      if (!this.isStorageAvailable()) return null;
      try {
        const fullKey = this.getFullKey(key);
        const item = sessionStorage.getItem(fullKey);
        if (!item) return null;
        const parsed = JSON.parse(item);
        if (parsed && typeof parsed === "object" && "_value" in parsed) {
          if (parsed._expires && parsed._expires < Date.now()) {
            sessionStorage.removeItem(fullKey);
            return null;
          }
          return parsed._value;
        }
        return parsed;
      } catch (error) {
        console.error(`Failed to get value from sessionStorage: ${key}`, error);
        return null;
      }
    }
    set(key, value, options) {
      if (!this.isStorageAvailable()) return;
      try {
        const fullKey = this.getFullKey(key);
        const wrapper = {
          _value: value,
          _created: Date.now(),
          _expires: options?.ttl ? Date.now() + options.ttl : void 0
        };
        sessionStorage.setItem(fullKey, JSON.stringify(wrapper));
      } catch (error) {
        console.error(`Failed to set value in sessionStorage: ${key}`, error);
        if (error instanceof DOMException && error.name === "QuotaExceededError") {
          this.clearExpired();
          try {
            const fullKey = this.getFullKey(key);
            sessionStorage.setItem(fullKey, JSON.stringify({ _value: value, _created: Date.now() }));
          } catch {
            throw new Error("Storage quota exceeded and unable to clear space");
          }
        }
      }
    }
    remove(key) {
      if (!this.isStorageAvailable()) return;
      sessionStorage.removeItem(this.getFullKey(key));
    }
    clear() {
      if (!this.isStorageAvailable()) return;
      const keysToRemove = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key?.startsWith(this.prefix)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => sessionStorage.removeItem(key));
    }
    has(key) {
      return this.get(key) !== null;
    }
    keys() {
      if (!this.isStorageAvailable()) return [];
      const keys = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key?.startsWith(this.prefix)) {
          keys.push(key.substring(this.prefix.length));
        }
      }
      return keys;
    }
    size() {
      return this.keys().length;
    }
    clearExpired() {
      const keys = this.keys();
      const now = Date.now();
      keys.forEach((key) => {
        try {
          const fullKey = this.getFullKey(key);
          const item = sessionStorage.getItem(fullKey);
          if (item) {
            const parsed = JSON.parse(item);
            if (parsed._expires && parsed._expires < now) {
              sessionStorage.removeItem(fullKey);
            }
          }
        } catch {
          sessionStorage.removeItem(this.getFullKey(key));
        }
      });
    }
  };

  // src/lib/core/storage/storage-manager.ts
  var StorageManager = class _StorageManager {
    static instance;
    adapters;
    defaultType = "memory";
    eventBus;
    constructor() {
      this.eventBus = EventBus.getInstance();
      this.adapters = /* @__PURE__ */ new Map();
      this.adapters.set("memory", new MemoryAdapter());
      this.adapters.set("local", new LocalStorageAdapter());
      this.adapters.set("session", new SessionStorageAdapter());
      this.adapters.set("cookie", new CookieAdapter());
    }
    static getInstance() {
      if (!_StorageManager.instance) {
        _StorageManager.instance = new _StorageManager();
      }
      return _StorageManager.instance;
    }
    static init() {
      _StorageManager.getInstance();
    }
    /**
     * Get a specific storage adapter
     */
    getAdapter(type) {
      const adapter = this.adapters.get(type);
      if (!adapter) {
        throw new Error(`Storage adapter not found: ${type}`);
      }
      return adapter;
    }
    /**
     * Set the default storage type
     */
    setDefaultType(type) {
      if (!this.adapters.has(type)) {
        throw new Error(`Invalid storage type: ${type}`);
      }
      this.defaultType = type;
    }
    /**
     * Get a value from storage
     */
    get(key, type = this.defaultType) {
      try {
        const adapter = this.getAdapter(type);
        const value = adapter.get(key);
        this.eventBus.emit("storage:get", { key, type });
        return value;
      } catch (error) {
        this.eventBus.emit("storage:error", {
          error,
          operation: "get",
          key
        });
        return null;
      }
    }
    /**
     * Set a value in storage
     */
    set(key, value, type = this.defaultType, options) {
      try {
        const adapter = this.getAdapter(type);
        adapter.set(key, value, options);
        this.eventBus.emit("storage:set", { key, value, type });
      } catch (error) {
        this.eventBus.emit("storage:error", {
          error,
          operation: "set",
          key
        });
        throw error;
      }
    }
    /**
     * Remove a value from storage
     */
    remove(key, type = this.defaultType) {
      try {
        const adapter = this.getAdapter(type);
        adapter.remove(key);
        this.eventBus.emit("storage:remove", { key, type });
      } catch (error) {
        this.eventBus.emit("storage:error", {
          error,
          operation: "remove",
          key
        });
      }
    }
    /**
     * Clear all values from a storage type
     */
    clear(type = this.defaultType) {
      try {
        const adapter = this.getAdapter(type);
        adapter.clear();
        this.eventBus.emit("storage:clear", { type });
      } catch (error) {
        this.eventBus.emit("storage:error", {
          error,
          operation: "clear"
        });
      }
    }
    /**
     * Check if a key exists in storage
     */
    has(key, type = this.defaultType) {
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
    keys(type = this.defaultType) {
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
    size(type = this.defaultType) {
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
    copy(key, fromType, toType, options) {
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
    move(key, fromType, toType, options) {
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
    getStats() {
      const stats = {
        memory: { keys: 0, available: true },
        local: { keys: 0, available: true },
        session: { keys: 0, available: true },
        cookie: { keys: 0, available: true }
      };
      for (const [type, adapter] of this.adapters.entries()) {
        try {
          stats[type] = {
            keys: adapter.size(),
            available: true
          };
        } catch {
          stats[type] = {
            keys: 0,
            available: false
          };
        }
      }
      return stats;
    }
  };

  // src/lib/core/storage/persistance-manager.ts
  var PersistenceManager = class _PersistenceManager {
    static instance;
    storageManager;
    // EventBus can be used for persistence events in the future
    // private eventBus: EventBus;
    migrations = /* @__PURE__ */ new Map();
    constructor() {
      this.storageManager = StorageManager.getInstance();
    }
    static getInstance() {
      if (!_PersistenceManager.instance) {
        _PersistenceManager.instance = new _PersistenceManager();
      }
      return _PersistenceManager.instance;
    }
    static init() {
      _PersistenceManager.getInstance();
    }
    /**
     * Save data with persistence configuration
     */
    save(key, data, config) {
      try {
        const filteredData = this.filterData(data, config);
        const serialized = config.serialize ? config.serialize(filteredData) : this.defaultSerialize(filteredData);
        const wrapper = {
          _data: serialized,
          _version: config.version || 1,
          _saved: Date.now(),
          _key: config.key
        };
        this.storageManager.set(
          this.getStorageKey(key, config),
          wrapper,
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
    load(key, config) {
      try {
        const wrapper = this.storageManager.get(this.getStorageKey(key, config), config.storage);
        if (!wrapper || !wrapper._data) {
          return null;
        }
        let data = wrapper._data;
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
        const deserialized = config.deserialize ? config.deserialize(data) : this.defaultDeserialize(data);
        return deserialized;
      } catch (error) {
        console.error(`Failed to load persisted data: ${key}`, error);
        return null;
      }
    }
    /**
     * Remove persisted data
     */
    remove(key, config) {
      try {
        this.storageManager.remove(this.getStorageKey(key, config), config.storage);
      } catch (error) {
        console.error(`Failed to remove persisted data: ${key}`, error);
      }
    }
    /**
     * Register a migration function
     */
    registerMigration(key, fromVersion, _toVersion, migrator) {
      if (!this.migrations.has(key)) {
        this.migrations.set(key, /* @__PURE__ */ new Map());
      }
      const keyMigrations = this.migrations.get(key);
      keyMigrations.set(fromVersion, migrator);
    }
    /**
     * Migrate data through version changes
     */
    migrate(key, fromVersion, _toVersion, migrator) {
      this.registerMigration(key, fromVersion, _toVersion, migrator);
    }
    /**
     * Get all persisted keys for a namespace
     */
    getPersistedKeys(namespace) {
      const allKeys = [];
      const storageTypes = ["memory", "local", "session", "cookie"];
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
    clearNamespace(namespace) {
      const keys = this.getPersistedKeys(namespace);
      const storageTypes = ["memory", "local", "session", "cookie"];
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
    exportNamespace(namespace) {
      const keys = this.getPersistedKeys(namespace);
      const exported = {};
      const storageTypes = ["memory", "local", "session", "cookie"];
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
    importNamespace(namespace, data, targetStorage = "memory") {
      Object.entries(data).forEach(([key, value]) => {
        if (key.startsWith(`${namespace}:`)) {
          this.storageManager.set(key, value, targetStorage);
        }
      });
    }
    /**
     * Get the storage key for persistence
     */
    getStorageKey(key, config) {
      return `${config.key}:${key}`;
    }
    /**
     * Filter data based on include/exclude configuration
     */
    filterData(data, config) {
      if (!data || typeof data !== "object") {
        return data;
      }
      const obj = data;
      const filtered = {};
      if (config.include && config.include.length > 0) {
        config.include.forEach((field) => {
          if (field in obj) {
            filtered[field] = obj[field];
          }
        });
        return filtered;
      }
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
    defaultSerialize(data) {
      if (data === null || typeof data === "string" || typeof data === "number" || typeof data === "boolean") {
        return data;
      }
      if (Array.isArray(data) || typeof data === "object" && data !== null) {
        return JSON.parse(JSON.stringify(data));
      }
      throw new Error(`Cannot serialize data of type: ${typeof data}`);
    }
    /**
     * Default deserialization
     */
    defaultDeserialize(data) {
      return data;
    }
    /**
     * Migrate data through versions
     */
    migrateData(key, data, fromVersion, toVersion) {
      const keyMigrations = this.migrations.get(key);
      if (!keyMigrations) {
        console.warn(`No migrations found for key: ${key}`);
        return data;
      }
      let currentData = data;
      let currentVersion = fromVersion;
      while (currentVersion < toVersion) {
        const migrator = keyMigrations.get(currentVersion);
        if (migrator) {
          currentData = migrator(currentData);
        } else {
          console.warn(`No migration found from version ${currentVersion} to ${currentVersion + 1}`);
        }
        currentVersion += 1;
      }
      return currentData;
    }
  };

  // src/lib/core/state/state-manager.ts
  var StateManager = class _StateManager {
    static instance;
    state = /* @__PURE__ */ new Map();
    stateConfigs = /* @__PURE__ */ new Map();
    eventBus;
    // StorageManager is used indirectly through PersistenceManager
    // private storageManager: StorageManager;
    persistenceManager;
    namespace = "app-state";
    constructor() {
      this.eventBus = EventBus.getInstance();
      this.persistenceManager = PersistenceManager.getInstance();
    }
    static getInstance() {
      if (!_StateManager.instance) {
        _StateManager.instance = new _StateManager();
      }
      return _StateManager.instance;
    }
    static init() {
      const instance = _StateManager.getInstance();
      instance.restorePersistedState();
    }
    /**
     * Configure state with persistence options
     */
    configure(key, config) {
      this.stateConfigs.set(key, config);
      if (config.defaultValue !== void 0 && !this.state.has(key)) {
        this.set(key, config.defaultValue, { skipPersist: true });
      }
    }
    /**
     * Set a state value with optional persistence
     */
    set(key, value, options) {
      const from = this.state.get(key);
      this.state.set(key, value);
      const config = this.stateConfigs.get(key);
      if (config?.persistent && !options?.skipPersist) {
        this.persistValue(key, value, config);
      }
      this.eventBus.emit("state:changed", {
        key,
        from,
        to: value,
        timestamp: Date.now()
      });
    }
    /**
     * Get a state value with type safety
     */
    get(key) {
      return this.state.get(key);
    }
    /**
     * Get a state value with a fallback
     */
    getOrDefault(key, defaultValue) {
      return this.state.has(key) ? this.state.get(key) : defaultValue;
    }
    /**
     * Check if a state key exists
     */
    has(key) {
      return this.state.has(key);
    }
    /**
     * Remove a state value
     */
    remove(key) {
      const value = this.state.get(key);
      const config = this.stateConfigs.get(key);
      this.state.delete(key);
      this.stateConfigs.delete(key);
      if (config?.persistent) {
        this.removePersistedValue(key, config);
      }
      this.eventBus.emit("state:removed", {
        key,
        value,
        timestamp: Date.now()
      });
    }
    /**
     * Clear all state
     */
    clear(options) {
      const persistedKeys = options?.keepPersisted ? Array.from(this.stateConfigs.entries()).filter(([, config]) => config.persistent).map(([key]) => key) : [];
      this.state.clear();
      if (!options?.keepPersisted) {
        this.stateConfigs.clear();
        this.persistenceManager.clearNamespace(this.namespace);
      } else {
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
    keys() {
      return Array.from(this.state.keys());
    }
    /**
     * Get all state entries
     */
    entries() {
      return Array.from(this.state.entries());
    }
    /**
     * Get the size of the state
     */
    size() {
      return this.state.size;
    }
    /**
     * Subscribe to state changes for a specific key
     */
    watch(key, callback) {
      const handler = (event) => {
        if (event.key === key) {
          callback(event.to, event.from);
        }
      };
      return this.eventBus.on("state:changed", handler);
    }
    /**
     * Create a computed value based on state
     */
    computed(keys, compute) {
      return () => {
        const values = {};
        keys.forEach((key) => {
          values[key] = this.get(key);
        });
        return compute(values);
      };
    }
    /**
     * Batch update multiple state values
     */
    batch(updates) {
      Object.entries(updates).forEach(([key, value]) => {
        this.set(key, value);
      });
    }
    /**
     * Export state for debugging or persistence
     */
    export(includeConfigs = false) {
      const exported = {};
      this.state.forEach((value, key) => {
        exported[key] = value;
      });
      if (includeConfigs) {
        const configs = {};
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
    import(data) {
      if (data.configs) {
        Object.entries(data.configs).forEach(([key, config]) => {
          this.configure(key, config);
        });
      }
      this.batch(data.state);
    }
    /**
     * Persist a value based on its configuration
     */
    persistValue(key, value, config) {
      const persistConfig = {
        key: this.namespace,
        storage: config.storage || "local",
        version: 1
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
    loadPersistedValue(key, config) {
      const persistConfig = {
        key: this.namespace,
        storage: config.storage || "local",
        version: 1
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
    removePersistedValue(key, config) {
      const persistConfig = {
        key: this.namespace,
        storage: config.storage || "local",
        version: 1
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
    restorePersistedState() {
      this.stateConfigs.forEach((config, key) => {
        if (config.persistent && !this.state.has(key)) {
          const value = this.loadPersistedValue(key, config);
          if (value !== null) {
            this.set(key, value, { skipPersist: true });
          }
        }
      });
    }
  };

  // src/lib/types/core/component-types.ts
  var ComponentError = class extends Error {
    constructor(message, componentId, phase, cause) {
      super(message);
      this.componentId = componentId;
      this.phase = phase;
      this.cause = cause;
      this.name = "ComponentError";
    }
  };

  // src/lib/core/components/base-component.ts
  var BaseComponent = class {
    group;
    id;
    props;
    metadata;
    rootElement = null;
    elements = /* @__PURE__ */ new Map();
    constructor(props = {}) {
      this.metadata = {
        name: this.constructor.name,
        initialized: false,
        destroyed: false
      };
      this.props = props;
      this.group = props.group;
      this.id = props.id || this.generateId();
      if (props.autoInit) {
        this.init();
      }
    }
    /**
     * Initialize the component
     */
    async init() {
      if (this.metadata.initialized) {
        this.logWarn("Component already initialized");
        return;
      }
      try {
        this.metadata.initTime = Date.now();
        await this.onInit();
        this.metadata.initialized = true;
      } catch (error) {
        throw this.createError(`Failed to initialize: ${error}`, "init");
      }
    }
    /**
     * Destroy the component and clean up resources
     */
    async destroy() {
      if (this.metadata.destroyed) {
        this.logWarn("Component already destroyed");
        return;
      }
      try {
        this.metadata.destroyTime = Date.now();
        await this.onDestroy();
        this.elements.clear();
        this.rootElement = null;
        this.metadata.destroyed = true;
        this.metadata.initialized = false;
        this.logDebug("Component destroyed");
      } catch (error) {
        throw this.createError(`Failed to destroy: ${error}`, "destroy");
      }
    }
    /**
     * Query for a DOM element with enhanced options
     */
    query(selector, options = {}) {
      const { required = false, parent = this.rootElement || document } = options;
      if (selector instanceof HTMLElement) {
        return selector;
      }
      if (!selector) {
        if (required) {
          throw this.createError("Selector is required", "runtime");
        }
        return null;
      }
      const element = parent.querySelector(selector);
      if (!element && required) {
        throw this.createError(`Required element not found: ${selector}`, "runtime");
      }
      return element;
    }
    /**
     * Query for multiple DOM elements
     */
    queryAll(selector, options = {}) {
      const { parent = this.rootElement || document } = options;
      return Array.from(parent.querySelectorAll(selector));
    }
    /**
     * Set the root element for the component
     */
    setRootElement(selector, options) {
      const element = this.query(selector, { ...options, required: true });
      if (element) {
        this.rootElement = element;
        element.dataset["componentId"] = this.id;
        if (this.props.className) {
          element.classList.add(this.props.className);
        }
      }
    }
    /**
     * Get the root element for the component
     */
    getRootElement() {
      return this.rootElement;
    }
    /**
     * Cache an element reference for quick access
     */
    cacheElement(key, selector, options) {
      const element = this.query(selector, options);
      if (element) {
        this.elements.set(key, element);
      }
    }
    /**
     * Get a cached element
     */
    getElement(key) {
      return this.elements.get(key) || null;
    }
    /**
     * Check if component is initialized
     */
    isInitialized() {
      return this.metadata.initialized && !this.metadata.destroyed;
    }
    /**
     * Check if component is destroyed
     */
    isDestroyed() {
      return this.metadata.destroyed;
    }
    /**
     * Get component ID
     */
    getId() {
      return this.id;
    }
    /**
     * Get component metadata
     */
    getMetadata() {
      return { ...this.metadata };
    }
    /**
     * Generate unique component ID
     */
    generateId() {
      const id = crypto.randomUUID();
      return `${this.metadata.name}-${id}`;
    }
    /**
     * Create a component-specific error
     */
    createError(message, phase = "runtime", cause) {
      return new ComponentError(`[${this.id}] ${message}`, this.id, phase, cause);
    }
    /**
     * Safe element text content setter
     */
    setText(element, text) {
      if (element) {
        element.textContent = text;
      }
    }
    /**
     * Safe element HTML setter with optional sanitization
     */
    setHTML(element, html, sanitize = false) {
      if (!element) return;
      if (sanitize) {
        const temp = document.createElement("div");
        temp.textContent = html;
        element.innerHTML = temp.innerHTML;
      } else {
        element.innerHTML = html;
      }
    }
    /**
     * Safe attribute setter
     */
    setAttribute(element, name, value) {
      if (element) {
        element.setAttribute(name, value);
      }
    }
    /**
     * Toggle element visibility
     */
    toggleVisibility(element, visible) {
      if (!element) return;
      if (visible === void 0) {
        element.hidden = !element.hidden;
      } else {
        element.hidden = !visible;
      }
    }
    /**
     * Toggle CSS class
     */
    toggleClass(element, className, force) {
      if (element) {
        element.classList.toggle(className, force);
      }
    }
    /**
     * Start console group (only in debug mode)
     */
    groupStart(name, collapsed = true) {
      if (!this.props.debug) return;
      if (collapsed) console.groupCollapsed(name);
      else console.group(name);
    }
    /**
     * End console group (only in debug mode)
     */
    groupEnd() {
      console.groupEnd();
    }
    /**
     * Debug timer
     */
    timeDebug(name, end = false) {
      if (!this.props.debug) return;
      if (end) {
        console.timeEnd(name);
      }
      if (!end) {
        console.time(name);
      }
    }
    /**
     * Debug logging (only in debug mode)
     */
    logDebug(...args) {
      if (!this.props.debug) return;
      console.log(...args);
    }
    /**
     * Warning logging
     */
    logWarn(...args) {
      console.warn(...args);
    }
    /**
     * Error logging
     */
    logError(...args) {
      console.error(...args);
    }
    /** Table logging */
    logTable(data, columns) {
      console.table(data, columns);
    }
  };

  // src/lib/core/components/interactive-component.ts
  var InteractiveComponent = class extends BaseComponent {
    eventBus;
    listeners = /* @__PURE__ */ new Map();
    eventUnsubscribers = [];
    delegatedHandlers = /* @__PURE__ */ new Map();
    constructor(props = {}) {
      super(props);
      this.eventBus = EventBus.getInstance({ debug: true });
    }
    /**
     * Initialize component and set up event listeners
     */
    async onInit() {
      await this.setupEventListeners();
      if (this.props.events) {
        this.bindConfigEvents();
      }
    }
    /**
     * Clean up all event listeners and subscriptions
     */
    async onDestroy() {
      this.removeAllListeners();
      this.removeAllSubscriptions();
      this.removeDelegatedHandlers();
    }
    /**
     * Add an event listener with automatic cleanup
     */
    addEventListener(target, event, handler, options) {
      let element;
      let key;
      if (typeof target === "string") {
        const cached = this.getElement(target);
        if (!cached) {
          this.logWarn(`Cached element not found: ${target}`);
          return;
        }
        element = cached;
        key = `${target}-${event}`;
      } else {
        element = target;
        key = `${element.constructor.name}-${event}`;
      }
      if (this.listeners.has(key)) {
        this.removeEventListener(key);
      }
      element.addEventListener(event, handler, options);
      this.listeners.set(key, {
        element,
        event,
        handler,
        options: options || void 0
      });
      this.logDebug(`Added listener: ${key}`);
    }
    /**
     * Remove a specific event listener
     */
    removeEventListener(key) {
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
    removeAllListeners() {
      this.listeners.forEach((_, key) => {
        this.removeEventListener(key);
      });
    }
    /**
     * Set up event delegation for dynamic content
     */
    delegate(event, selector, handler, parent = document) {
      const delegatedHandler = (e) => {
        const target = e.target;
        const delegateTarget = target.closest(selector);
        if (delegateTarget && parent.contains(delegateTarget)) {
          handler.call(this, e, delegateTarget);
        }
      };
      const key = `${event}-${selector}`;
      if (this.delegatedHandlers.has(key)) {
        parent.removeEventListener(event, this.delegatedHandlers.get(key));
      }
      parent.addEventListener(event, delegatedHandler, true);
      this.delegatedHandlers.set(key, delegatedHandler);
    }
    /**
     * Remove delegated event handlers
     */
    removeDelegatedHandlers() {
      this.delegatedHandlers.forEach((handler, key) => {
        const [event] = key.split("-");
        if (event) {
          document.removeEventListener(event, handler, true);
        }
      });
      this.delegatedHandlers.clear();
    }
    /**
     * Subscribe to EventBus events
     * Uses the component's event map type (TEventMap)
     */
    subscribe(event, handler, options) {
      const unsubscribe = this.eventBus.on(
        event,
        handler,
        options
      );
      this.eventUnsubscribers.push(unsubscribe);
    }
    /**
     * Subscribe to a one-time EventBus event
     * Uses the component's event map type (TEventMap)
     */
    subscribeOnce(event, handler) {
      const unsubscribe = this.eventBus.once(
        event,
        handler
      );
      this.eventUnsubscribers.push(unsubscribe);
    }
    /**
     * Remove all EventBus subscriptions
     */
    removeAllSubscriptions() {
      this.eventUnsubscribers.forEach((unsubscribe) => unsubscribe());
      this.eventUnsubscribers = [];
    }
    /**
     * Emit an event through the EventBus
     * Uses the component's event map type (TEventMap)
     */
    emit(event, payload) {
      this.eventBus.emit(event, payload);
    }
    /**
     * Emit a custom DOM event
     */
    emitCustom(eventName, detail, target) {
      const element = target || this.rootElement || document.body;
      const event = new CustomEvent(eventName, {
        detail,
        bubbles: true,
        cancelable: true
      });
      element.dispatchEvent(event);
    }
    /**
     * Bind events from configuration
     */
    bindConfigEvents() {
      const config = this.props;
      if (!config.events || !this.rootElement) return;
      Object.entries(config.events).forEach(([eventName, handler]) => {
        this.addEventListener(this.rootElement, eventName, handler.bind(this));
      });
    }
    /**
     * Handle click events with optional debouncing
     */
    onClick(target, handler, debounceMs = 0) {
      const wrappedHandler = debounceMs > 0 ? this.debounce(handler, debounceMs) : handler;
      this.addEventListener(target, "click", wrappedHandler);
    }
    /**
     * Handle input events with optional debouncing
     */
    onInput(target, handler, debounceMs = 0) {
      const wrappedHandler = debounceMs > 0 ? this.debounce(handler, debounceMs) : handler;
      this.addEventListener(target, "input", wrappedHandler);
    }
    /**
     * Simple debounce implementation
     */
    debounce(callback, wait) {
      let timeoutId = null;
      return (...args) => {
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
    async waitForElement(selector, timeout = 5e3, parent = document) {
      return new Promise((resolve, reject) => {
        const element = parent.querySelector(selector);
        if (element) {
          resolve(element);
          return;
        }
        const observer = new MutationObserver((_, obs) => {
          const element2 = parent.querySelector(selector);
          if (element2) {
            obs.disconnect();
            resolve(element2);
          }
        });
        observer.observe(parent === document ? document.body : parent, {
          childList: true,
          subtree: true
        });
        setTimeout(() => {
          observer.disconnect();
          reject(this.createError(`Element not found: ${selector}`, "runtime"));
        }, timeout);
      });
    }
    /**
     * Get all active listeners (for debugging)
     */
    getActiveListeners() {
      return new Map(this.listeners);
    }
    /**
     * Get listener count
     */
    getListenerCount() {
      return this.listeners.size + this.eventUnsubscribers.length;
    }
  };

  // src/lib/core/components/stateful-component.ts
  var StatefulComponent = class extends InteractiveComponent {
    state;
    stateConfigs = /* @__PURE__ */ new Map();
    stateManager;
    storageManager;
    persistenceManager;
    statePrefix;
    initialState = {};
    constructor(props = {}) {
      super(props);
      this.state = {};
      this.stateManager = StateManager.getInstance();
      this.storageManager = StorageManager.getInstance();
      this.persistenceManager = PersistenceManager.getInstance();
      this.statePrefix = props.statePrefix || this.id;
      if (props.state) {
        const configs = Array.isArray(props.state) ? props.state : [props.state];
        configs.forEach((stateConfig) => this.configureState(stateConfig));
      }
    }
    /**
     * Initialize component and restore state
     */
    async onInit() {
      await super.onInit();
      this.restoreState();
      this.subscribeToStateChanges();
    }
    /**
     * Save state before destroying
     */
    async onDestroy() {
      if (this.props.persistState) {
        this.persistState();
      }
      await super.onDestroy();
    }
    /**
     * Configure a state property
     */
    configureState(config) {
      const key = config.key;
      this.stateConfigs.set(key, config);
      if (config.defaultValue !== void 0) {
        this.state[key] = config.defaultValue;
        this.initialState[key] = config.defaultValue;
      }
    }
    /**
     * Get state value
     */
    getState(key) {
      return this.state[key];
    }
    /**
     * Set state value with validation and change tracking
     */
    setState(key, value, options = {}) {
      const from = this.state[key];
      if (this.isEqual(from, value)) {
        return false;
      }
      const config = this.stateConfigs.get(key);
      if (config?.validate && !config.validate(value)) {
        this.logWarn(`State validation failed for ${String(key)}:`, value);
        return false;
      }
      const transformedValue = config?.transform ? config.transform(value) : value;
      this.state[key] = transformedValue;
      if (options.persist !== false) {
        this.persistStateKey(key, transformedValue);
      }
      if (!options.silent) {
        this.onStateChange(key, from, transformedValue);
      }
      return true;
    }
    /**
     * Batch update multiple state values
     */
    setStates(updates, options = {}) {
      const changes = [];
      Object.entries(updates).forEach(([key, value]) => {
        const typedKey = key;
        const from = this.state[typedKey];
        if (this.setState(typedKey, value, { ...options, silent: true })) {
          changes.push({ key: typedKey, from, to: value });
        }
      });
      if (!options.silent && changes.length > 0) {
        this.logDebug(`Batch state change`, { changes });
        changes.forEach(({ key, from, to }) => {
          this.onStateChange(key, from, to);
        });
      }
    }
    /**
     * Reset state to initial values
     */
    resetState(keys) {
      const keysToReset = keys || Object.keys(this.state);
      keysToReset.forEach((key) => {
        if (key in this.initialState) {
          this.setState(key, this.initialState[key]);
        }
      });
    }
    /**
     * Get all current state
     */
    getAllState() {
      return { ...this.state };
    }
    /**
     * Subscribe to global state changes
     */
    subscribeToStateChanges() {
      this.subscribe("state:changed", (payload) => {
        if (payload.key.startsWith(this.statePrefix)) {
          const localKey = payload.key.replace(`${this.statePrefix}.`, "");
          if (localKey in this.state) {
            this.setState(localKey, payload.to, {
              silent: false,
              persist: false
            });
          }
        }
      });
    }
    /**
     * Called when state changes
     */
    onStateChange(key, from, to) {
      this.emit("state:changed", {
        key: `${this.statePrefix}.${String(key)}`,
        from,
        to,
        timestamp: Date.now()
      });
      this.handleStateChange(key, from, to);
    }
    /**
     * Persist a single state key
     */
    persistStateKey(key, value) {
      const config = this.stateConfigs.get(key);
      if (!config) return;
      const persistConfig = {
        key: this.statePrefix,
        storage: config.storage || "memory",
        version: 1
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
    persistState() {
      Object.entries(this.state).forEach(([key, value]) => {
        this.persistStateKey(key, value);
      });
    }
    /**
     * Restore state from storage
     */
    restoreState() {
      this.stateConfigs.forEach((config, key) => {
        const persistConfig = {
          key: this.statePrefix,
          storage: config.storage || "memory",
          version: 1
        };
        try {
          const storedValue = this.persistenceManager.load(String(key), persistConfig);
          if (storedValue !== null) {
            this.setState(key, storedValue, {
              silent: true,
              persist: false
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
    isEqual(a, b) {
      if (a === b) return true;
      if (a == null || b == null) return false;
      if (typeof a !== "object" || typeof b !== "object") return false;
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      if (keysA.length !== keysB.length) return false;
      return keysA.every(
        (key) => this.isEqual(a[key], b[key])
      );
    }
    /**
     * Create a computed property
     */
    createComputed(_dependencies, compute) {
      return () => compute(this.state);
    }
    /**
     * Watch for state changes with a callback
     */
    watchState(key, callback) {
      const handler = (e) => {
        const { detail } = e;
        if (detail.key === String(key)) {
          callback(detail.to, detail.from);
        }
      };
      this.rootElement?.addEventListener("state:changed", handler);
      return () => {
        this.rootElement?.removeEventListener("state:changed", handler);
      };
    }
  };

  // src/form/constants/attr.ts
  var ATTR = "data-form";

  // src/form/constants/valid-behavior-type-map.ts
  var VALID_BEHAVIOR_TYPE_MAP = {
    byField: true,
    byGroup: true,
    bySet: true,
    byCard: true
  };

  // src/form/constants/valid-element-type-map.ts
  var VALID_ELEMENT_TYPE_MAP = {
    form: true,
    card: true,
    set: true,
    group: true,
    field: true,
    input: true,
    prev: true,
    next: true,
    submit: true,
    "progress-line": true
  };

  // src/form/constants/valid-error-display-type-map.ts
  var VALID_ERROR_DISPLAY_TYPE_MAP = {
    native: true
  };

  // src/form/constants/valid-storage-type-map.ts
  var VALID_STORAGE_TYPE_MAP = {
    memory: true
  };

  // src/form/constants/valid-transition-type-map.ts
  var VALID_TRANSITION_TYPE_MAP = {
    fade: true,
    slide: true,
    none: true
  };

  // src/form/utils/managers/hierarchy-builder.ts
  var HierarchyBuilder = class _HierarchyBuilder {
    /**
     * Build hierarchy object from parent item
     * Recursively walks up parent chain
     *
     * This is the core method used by ItemManager.findParentHierarchy() to create
     * hierarchy objects by recursively merging parent hierarchies:
     *
     * - CardParentHierarchy: { formId }
     * - SetParentHierarchy: { ..., cardId, cardIndex }
     * - GroupParentHierarchy: { ..., setId, setIndex }
     * - FieldParentHierarchy: { ..., groupId, groupIndex }
     * - InputParentHierarchy: { ..., fieldId, fieldIndex }
     * - ButtonParentHierarchy: CardParentHierarchy | SetParentHierarchy | GroupParentHierarchy
     *
     * @param parent - Parent item or null
     * @param formId - Form ID (required for all hierarchies)
     * @returns Hierarchy object with parent IDs and indices
     *
     * @example
     * // Building a FieldParentHierarchy from a group parent
     * const groupItem = { id: 'group-1', index: 0, type: 'group', parentHierarchy: { formId: 'form', cardId: 'card-1', cardIndex: 0, setId: 'set-1', setIndex: 0 } };
     * const hierarchy = HierarchyBuilder.buildFromParent(groupItem, 'form');
     * // Returns: { formId: 'form', cardId: 'card-1', cardIndex: 0, setId: 'set-1', setIndex: 0, groupId: 'group-1', groupIndex: 0 }
     */
    static buildFromParent(parent, formId) {
      const hierarchy = {
        formId
      };
      if (!parent) return hierarchy;
      hierarchy[`${parent.type}Id`] = parent.id;
      hierarchy[`${parent.type}Index`] = parent.index;
      if ("parentHierarchy" in parent && parent.parentHierarchy) {
        Object.assign(hierarchy, parent.parentHierarchy);
      }
      return hierarchy;
    }
    /**
     * Find parent hierarchy for an element by walking up the DOM tree
     *
     * This method discovers all parent items (field, group, set, card) by:
     * 1. Finding the immediate parent using findParentItem callback
     * 2. Recursively building the full hierarchy using buildFromParent
     *
     * Used by ItemManager during item discovery to establish parent relationships.
     *
     * @param child - HTMLElement or ItemData to find parents for
     * @param form - Form instance for accessing managers
     * @param findParentItem - Callback to find immediate parent (manager-specific)
     * @returns Complete hierarchy object
     *
     * @example
     * // In FieldManager.findParentHierarchy()
     * const hierarchy = HierarchyBuilder.findParentHierarchy<FieldParentHierarchy>(
     *   fieldElement,
     *   this.form,
     *   (el) => this.findParentByElement(el, 'group', () => this.form.groupManager.getAll())
     * );
     * // Returns: { formId, cardId, cardIndex, setId, setIndex, groupId, groupIndex }
     */
    static findParentHierarchy(child, form, findParentItem) {
      let parentItem;
      if (child instanceof HTMLElement) {
        parentItem = findParentItem(child);
      } else {
        parentItem = child;
      }
      return _HierarchyBuilder.buildFromParent(parentItem, form.getId());
    }
    /**
     * Generic helper to find parent item by selector
     * @param child - The child element
     * @param parentType - The parent type
     * @param getParentItems - The function to get the parent items
     * @returns The parent item or null
     */
    static findParentByElement(child, parentType, getParentItems) {
      const parentElement = child.closest(`[${ATTR}-element^="${parentType}"]`);
      if (!parentElement) return void 0;
      const parents = getParentItems();
      const parent = parents.find((parent2) => parent2.element === parentElement);
      return parent;
    }
  };

  // src/form/utils/managers/item-store.ts
  var ItemStore = class {
    items = [];
    itemMap = /* @__PURE__ */ new Map();
    /** Add item to storage */
    add(item) {
      this.items.push(item);
      this.itemMap.set(item.id, item);
    }
    /** Update item in storage */
    update(item) {
      this.itemMap.set(item.id, item);
      this.items[item.index] = item;
    }
    /** Update item data by merging */
    merge(item, data) {
      const updated = { ...item, ...data };
      this.update(updated);
    }
    /** Get all items */
    getAll() {
      return this.items;
    }
    /** Get by ID */
    getById(id) {
      return this.itemMap.get(id);
    }
    /** Get by index */
    getByIndex(index) {
      return this.items.find((item) => item.index === index);
    }
    /** Get by selector (ID or index) */
    getBySelector(selector) {
      return typeof selector === "string" ? this.getById(selector) : this.getByIndex(selector);
    }
    /** Get by DOM */
    getByDOM(dom) {
      return this.items.find((item) => item.element === dom);
    }
    /** Filter items by predicate */
    filter(predicate) {
      return this.items.filter(predicate);
    }
    /** Filter items by predicate */
    find(predicate) {
      return this.items.find(predicate);
    }
    /** Clear all items */
    clear() {
      this.items = [];
      this.itemMap.clear();
    }
    /** Get count */
    get length() {
      return this.items.length;
    }
  };

  // src/form/utils/parsing/generate-id-from-title.ts
  function generateIdFromTitle(title) {
    return title.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  }

  // src/form/utils/parsing/extract-title.ts
  function extractTitleFromLegend(element) {
    const legend = element.querySelector("legend");
    return legend?.textContent?.trim() || null;
  }
  function extractTitle(element, elementType, combinedId, index) {
    const titleAttr = element.getAttribute(`${ATTR}-${elementType}title`);
    if (titleAttr?.trim()) {
      const title = titleAttr.trim();
      return {
        title,
        source: "attribute",
        id: combinedId || generateIdFromTitle(title)
      };
    }
    if (elementType === "set" || elementType === "group") {
      const legendTitle = extractTitleFromLegend(element);
      if (legendTitle) {
        return {
          title: legendTitle,
          source: "legend",
          id: combinedId || generateIdFromTitle(legendTitle)
        };
      }
    }
    if (combinedId) {
      const title = combinedId.split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
      return {
        title,
        source: "attribute",
        id: combinedId
      };
    }
    const generatedId = `${elementType}-${index}`;
    const generatedTitle = `${elementType.charAt(0).toUpperCase() + elementType.slice(1)} ${index + 1}`;
    return {
      title: generatedTitle,
      source: "generated",
      id: generatedId
    };
  }

  // src/form/utils/parsing/get-config-attributes.ts
  function getConfigAttributes(element) {
    const config = {};
    Array.from(element.attributes).forEach((attr) => {
      if (attr.name.startsWith(`${ATTR}-`)) {
        const key = attr.name.replace(`${ATTR}-`, "");
        config[key] = attr.value;
      }
    });
    return config;
  }

  // src/form/utils/parsing/parse-boolean-attribute.ts
  function parseBooleanAttribute(value, defaultValue = false) {
    if (value === void 0) return defaultValue;
    return value === "true" || value === "";
  }

  // src/form/utils/validation/is-valid-type.ts
  function isValidType(value, typeMap) {
    if (!value) return false;
    return value in typeMap;
  }

  // src/form/utils/validation/assert-valid-type.ts
  function assertValidType(value, typeMap, typeName, context) {
    if (!isValidType(value, typeMap)) {
      const validTypes = Object.keys(typeMap).join(", ");
      const errorContext = context ? `${context}: ` : "";
      throw new Error(
        `${errorContext}Invalid ${typeName} "${value}". Valid types are: ${validTypes}`
      );
    }
  }

  // src/form/utils/validation/behavior-type-validators.ts
  function isValidBehaviorType(value) {
    return isValidType(value, VALID_BEHAVIOR_TYPE_MAP);
  }

  // src/form/utils/validation/element-type-validators.ts
  function assertValidElementType(value, context) {
    assertValidType(value, VALID_ELEMENT_TYPE_MAP, "element type", context);
  }

  // src/form/utils/validation/error-mode-type-validators.ts
  function isValidErrorModeType(value) {
    return isValidType(value, VALID_ERROR_DISPLAY_TYPE_MAP);
  }

  // src/form/utils/validation/storage-type-validators.ts
  function isValidStorageType(value) {
    return isValidType(value, VALID_STORAGE_TYPE_MAP);
  }

  // src/form/utils/validation/transition-type-validators.ts
  function isValidTransitionType(value) {
    return isValidType(value, VALID_TRANSITION_TYPE_MAP);
  }

  // src/form/utils/parsing/parse-element-attribute.ts
  function parseElementAttribute(value) {
    const trimmed = value.trim();
    if (trimmed.includes(":")) {
      const parts = trimmed.split(":");
      const type = parts[0].trim();
      assertValidElementType(type);
      return {
        type,
        id: parts[1].trim()
      };
    }
    assertValidElementType(trimmed);
    return {
      type: trimmed,
      id: void 0
    };
  }

  // src/form/utils/parsing/parse-number-attribute.ts
  function parseNumberAttribute(value, defaultValue) {
    if (value === void 0) return defaultValue;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  // src/form/utils/string/plural.ts
  var plural = (word, count) => {
    return count === 1 ? word : `${word}s`;
  };

  // src/form/utils/string/sentence-case.ts
  var sentenceCase = (string) => {
    return string.toLowerCase().replace(/(^\s*\w)/g, (match) => match.toUpperCase());
  };

  // src/form/managers/base-manager.ts
  var BaseManager = class {
    form;
    constructor(form) {
      this.form = form;
    }
    /** Start console group (only in debug mode) */
    groupStart(name, collapsed = true) {
      this.form.groupStart(name, collapsed);
    }
    /** End console group (only in debug mode) */
    groupEnd() {
      this.form.groupEnd();
    }
    /** Debug logging (only in debug mode) */
    logDebug(...args) {
      this.form.logDebug(...args);
    }
    /** Warning logging */
    logWarn(...args) {
      this.form.logWarn(...args);
    }
    /** Error logging */
    logError(...args) {
      this.form.logError(...args);
    }
    /** Table logging */
    logTable(data, columns) {
      this.form.logTable(data, columns);
    }
    /** Create error */
    createError(message, phase = "runtime", cause) {
      return this.form.createError(message, phase, cause);
    }
  };

  // src/form/managers/button-manager.ts
  var ButtonManager = class extends BaseManager {
    store = new ItemStore();
    /** Active event listeners for cleanup */
    activeListeners = [];
    /**
     * Initialize the manager
     */
    init() {
      this.groupStart(`Initializing Buttons`);
      this.discoverItems();
      this.setupEventListeners();
      this.applyStates(true);
      this.logDebug("Initialized");
      this.groupEnd();
    }
    /**
     * Cleanup manager resources
     */
    destroy() {
      this.store.clear();
      this.unbindAllButtons();
      this.logDebug("ButtonManager destroyed");
    }
    // ============================================
    // Discovery
    // ============================================
    /**
     * Discover all navigation buttons in the form
     * Finds buttons with [data-form-element="prev"], [data-form-element="next"], [data-form-element="submit"]
     */
    discoverItems() {
      const rootElement = this.form.getRootElement();
      if (!rootElement) {
        throw this.form.createError(
          "Cannot discover navigation buttons: root element is null",
          "init",
          {
            cause: rootElement
          }
        );
      }
      const items = this.form.queryAll(
        `[${ATTR}-element="prev"], [${ATTR}-element="next"], [${ATTR}-element="submit"]`
      );
      this.store.clear();
      items.forEach((item, index) => {
        const itemData = this.createItemData(item, index);
        if (!itemData) return;
        this.store.add(itemData);
      });
      this.logDebug(`Discovered ${this.store.length} buttons`);
    }
    createItemData(element, index) {
      if (!(element instanceof HTMLElement)) return;
      const attrValue = element.getAttribute(`${ATTR}-element`);
      if (!attrValue) return;
      const parsed = parseElementAttribute(attrValue);
      if (!["prev", "next", "submit"].includes(parsed.type)) return;
      const button = element instanceof HTMLButtonElement ? element : element.querySelector(`button`) ?? element.querySelector("a");
      if (!button) {
        throw this.form.createError("Cannot discover navigation buttons: button is null", "init", {
          cause: element
        });
      }
      if (button instanceof HTMLAnchorElement) {
        throw this.form.createError("Cannot discover navigation buttons: button is a link", "init", {
          cause: element
        });
      }
      const id = `${parsed.type}-button-${index}`;
      return this.buildItemData({
        element,
        index,
        id,
        active: false,
        // Calculated
        type: parsed.type,
        parentHierarchy: this.findParentHierarchy(element),
        button,
        disabled: true,
        // Calculated
        visible: false
        // Calculated
      });
    }
    /**
     * Build button item data
     * Used during discovery and state updates
     * Single source of truth for button data calculation
     */
    buildItemData(item) {
      const active = this.determineActive(item.element);
      const visible = this.determineVisible(item.type);
      const enabled = this.determineEnabled(item.type, active && visible);
      return {
        ...item,
        active,
        visible,
        disabled: !enabled
      };
    }
    /**
     * Determine if item should be active based on parent and behavior
     * Default implementation - can be overridden if needed
     *
     * @param element - HTMLElement to check
     * @returns Whether element should be active
     */
    determineActive(element) {
      const parent = this.findParentItem(element);
      return parent ? parent.active : true;
    }
    /**
     * Determine whether a button should be visible
     * - Need to get the parent hierarchy
     * - Check if parent Id is the currently active Card/Set
     */
    determineVisible(type) {
      const { current, total } = this.getRelevantState();
      const { currentCardIndex, totalCards, currentSetIndex, totalSets } = this.form.getAllState();
      switch (type) {
        case "prev":
          return totalCards > 0 && currentCardIndex > 0 || totalSets > 0 && currentSetIndex > 0;
        case "next":
          return current !== total - 1;
        case "submit":
          return current === total - 1;
      }
    }
    determineEnabled(type, activeAndVisible = true) {
      if (!activeAndVisible) return false;
      const valid = this.form.inputManager.getByFilter((input) => input.active && input.isIncluded).every((input) => input.isValid);
      const { current, total } = this.getRelevantState();
      switch (type) {
        case "prev":
          return activeAndVisible;
        case "next":
          return valid && current < total - 1;
        case "submit":
          return valid && current === total - 1;
      }
    }
    getRelevantState() {
      const behavior = this.form.getBehavior();
      const state = this.form.getAllState();
      let current;
      let total;
      switch (behavior) {
        case "byField":
          current = state.currentFieldIndex;
          total = state.totalFields;
          break;
        case "byGroup":
          current = state.currentGroupIndex;
          total = state.totalGroups;
          break;
        case "bySet":
          current = state.currentSetIndex;
          total = state.totalSets;
          break;
        case "byCard":
          current = state.currentCardIndex;
          total = state.totalCards;
          break;
        default:
          throw this.form.createError(
            "Cannot determine button visibility: invalid behavior",
            "init",
            { cause: behavior }
          );
      }
      return { current, total };
    }
    findParentHierarchy(child) {
      return HierarchyBuilder.findParentHierarchy(
        child,
        this.form,
        (element) => this.findParentItem(element)
      );
    }
    /**
     * Find the parent item for a field
     *
     * @param element - The field element
     * @returns Parent data or null
     */
    findParentItem(element) {
      const parentSet = HierarchyBuilder.findParentByElement(
        element,
        "set",
        () => this.form.setManager.getAll()
      );
      const parentCard = HierarchyBuilder.findParentByElement(
        element,
        "card",
        () => this.form.cardManager.getAll()
      );
      return parentSet ?? parentCard;
    }
    /**
     * Setup event listeners for button clicks
     */
    setupEventListeners() {
      this.bindActiveButtons();
      this.form.subscribe("form:navigation:changed", () => {
        this.calculateStates();
        this.applyStates();
        this.handleActiveButtons();
      });
      this.form.subscribe("form:input:changed", () => {
        this.calculateStates();
        this.applyStates();
      });
      this.form.subscribe("form:condition:evaluated", () => {
        this.calculateStates();
        this.applyStates();
      });
      this.logDebug("Event listeners setup");
    }
    // ============================================
    // Bind Listeners
    // ============================================
    /**
     * Bind events to the current buttons
     */
    bindActiveButtons() {
      const activeItems = this.getActive();
      if (activeItems.length === 0) return;
      activeItems.forEach((item) => {
        const { button } = item;
        const alreadyBound = this.activeListeners.some((listener) => listener.button === button);
        if (alreadyBound) return;
        const handler = () => {
          this.handleClick(item.type);
        };
        button.addEventListener("click", handler);
        this.activeListeners.push({
          button,
          index: item.index,
          type: item.type,
          event: "click",
          handler
        });
        const parent = this.findParentItem(item.element);
        if (!parent) return;
        this.logDebug(
          `Bound "click" events to "${item.type}" button within ${parent.type} "${parent.id}"`
        );
      });
    }
    /**
     * Unbind all inactive button listeners
     * @internal Used during cleanup
     */
    unbindInactiveButtons() {
      const activeItems = this.getActive();
      if (activeItems.length === 0) return;
      this.activeListeners = this.activeListeners.filter((listener) => {
        const shouldRemove = !activeItems.find((item) => item.index === listener.index);
        if (shouldRemove) {
          listener.button.removeEventListener(listener.event, listener.handler);
          const parent = this.findParentItem(listener.button);
          if (parent) {
            this.logDebug(
              `Unbound "${listener.event}" events from "${listener.type}" button within ${parent.type} "${parent.id}"`
            );
          }
        }
        return !shouldRemove;
      });
    }
    /**
     * Unbind all button listeners
     * @internal Used during cleanup
     */
    unbindAllButtons() {
      this.activeListeners.forEach((listener) => {
        listener.button.removeEventListener(listener.event, listener.handler);
      });
      this.activeListeners = [];
    }
    // ============================================
    // Button Click Handlers
    // ============================================
    /**
     * Handle button clicks
     */
    handleClick = (type) => {
      if (type === "submit") {
        const payload = {};
        this.logDebug("Submit button clicked: requesting form submission");
        this.form.emit("form:submit:request", payload);
        return;
      }
      this.logDebug(`${sentenceCase(type)} button clicked: requesting navigation`);
      this.form.emit("form:navigation:request", { type });
    };
    // ============================================
    // Button State Management
    // ============================================
    calculateStates() {
      this.getAll().forEach((item) => {
        const updated = this.buildItemData(item);
        this.store.update(updated);
      });
    }
    /**
     * Handle context change
     */
    handleActiveButtons() {
      this.unbindInactiveButtons();
      this.bindActiveButtons();
    }
    /**
     * Update button states based on current navigation position
     * Called after state changes
     */
    applyStates(isInitial = false) {
      this.logDebug(`${isInitial ? "Initializing" : "Updating"} button states`);
      this.getAll().forEach((item) => {
        item.button.disabled = item.disabled;
        if (item.visible) {
          item.element.style.removeProperty("display");
        } else {
          item.element.style.display = "none";
        }
      });
    }
    // ============================================
    // Private Helpers
    // ============================================
    /** Get all button elements */
    getAll() {
      return this.store.getAll();
    }
    /** Get by type */
    getByType(type) {
      return this.store.filter((item) => item.type === type);
    }
    /** Get active */
    getActive() {
      return this.store.filter((button) => button.active && button.visible);
    }
    /** Get all buttons by parent */
    getAllByParent(parentHierarchy) {
      return this.store.filter((item) => item.parentHierarchy === parentHierarchy);
    }
    /** Get all buttons of type by parent*/
    getTypeByParent(parentHierarchy, type) {
      const allByParent = this.getAllByParent(parentHierarchy);
      return allByParent.filter((button) => button.type === type);
    }
  };

  // src/form/managers/item-manager.ts
  var ItemManager = class extends BaseManager {
    store = new ItemStore();
    navigationOrder = [];
    // ============================================
    // Lifecycle Methods
    // ============================================
    init(runOnInitalzed = true) {
      this.groupStart(`Initializing ${this.itemType}s`);
      this.discoverItems();
      if (this.itemType !== "input") this.buildNavigationOrder();
      this.setStates();
      if (runOnInitalzed) this.onInitialized();
    }
    onInitialized() {
      this.logDebug(`Initialized`, { items: this.getAll() });
      this.groupEnd();
    }
    destroy() {
      this.clear();
      this.logDebug(`${this.constructor.name} destroyed`);
    }
    // ============================================
    // Implemented Methods
    // ============================================
    /**
     * Discover all items of this type in the form
     * Finds all items with [${ATTR}-item^="${this.itemType}"]
     */
    discoverItems() {
      const rootElement = this.form.getRootElement();
      if (!rootElement) {
        throw this.createError(
          `Cannot discover ${this.itemType}s: root element is undefined`,
          "init",
          {
            cause: { manager: this.constructor.name, rootElement }
          }
        );
      }
      const items = this.form.queryAll(`[${ATTR}-element^="${this.itemType}"]`);
      this.clear();
      items.forEach((item, index) => {
        const itemData = this.createItemData(item, index);
        if (!itemData) return;
        this.add(itemData);
      });
      this.logDebug(`Discovered ${items.length} ${plural(this.itemType, items.length)}`, {
        items
      });
    }
    /**
     * Update item data
     * TypeScript ensures only valid properties for this item type
     */
    updateItemData(selector, data = {}) {
      if (typeof selector === "number" && selector < 0 || typeof selector === "number" && selector >= this.length)
        return;
      const item = this.getBySelector(selector);
      if (!item) {
        this.logWarn(`Cannot update ${this.itemType} data: ${selector} not found`);
        return;
      }
      const updated = this.mergeItemData(item, data);
      this.update(updated);
    }
    /**
     * Merge item data - can be overridden
     * @virtual
     */
    mergeItemData(item, data) {
      const builtItem = this.buildItemData(item);
      return {
        ...builtItem,
        visited: true,
        // Always mark as visited when updated
        ...data
      };
    }
    /**
     * Rebuild item using buildItemData()
     * Ensures item data is fresh before calculating state
     */
    rebuildItem(item) {
      const rebuilt = this.buildItemData(item);
      this.update(rebuilt);
    }
    /**
     * Rebuild all items using buildItemData()
     * Ensures item data is fresh before calculating state
     */
    rebuildActive() {
      const active = this.getActive();
      if (active.length === 0) return;
      this.logDebug(`Rebuilding ${active.length} active ${plural(this.itemType, active.length)}`);
      active.forEach((item) => {
        this.logDebug("Pre", item);
        const rebuilt = this.buildItemData(item);
        this.update(rebuilt);
        this.logDebug("Post-rebuild", rebuilt);
      });
    }
    /**
     * Rebuild all items using buildItemData()
     * Ensures item data is fresh before calculating state
     */
    rebuildAll() {
      this.getAll().forEach((item) => {
        this.rebuildItem(item);
      });
    }
    /**
     * Determine if item should be active based on parent and behavior
     * Default implementation - can be overridden if needed
     *
     * @param element - HTMLElement to check
     * @param index - Element index
     * @returns Whether element should be active
     * @virtual
     */
    determineActive(element, index) {
      const behavior = this.form.getBehavior();
      const parent = this.findParentItem(element);
      if (!parent) return index === 0;
      const behaviorRequiresFirstOnly = this.behaviorRequiresFirstChild(behavior);
      return behaviorRequiresFirstOnly ? parent.active && index === 0 : parent.active;
    }
    /**
     * Check if current behavior requires only first child to be active
     * Can be overwritten for item-specific behavior
     * @virtual
     */
    behaviorRequiresFirstChild(behavior) {
      const firstChildBehaviors = {
        byField: ["field", "group", "set", "card"],
        byGroup: ["group", "set", "card"],
        bySet: ["set", "card"],
        byCard: ["card"]
      };
      return firstChildBehaviors[behavior]?.includes(this.itemType) ?? false;
    }
    /**
     * Get all active item indices
     * Returns array of indices for all items marked as active
     * Used by calculateStates() to populate active*Indices arrays
     *
     * @returns Array of active item indices
     */
    getActiveIndices() {
      return this.getByFilter((item) => item.active).map((item) => item.index);
    }
    /**
     * Set an item as current (focused/primary)
     * Automatically clears current flag from all other items
     * Validates that the item is active before setting as current
     *
     * @param selector - Item ID or index
     * @throws Warning if item is not active
     */
    setCurrent(selector) {
      const item = this.getBySelector(selector);
      if (!item) {
        this.logWarn(`Cannot set current: ${this.itemType} not found`, { selector });
        return;
      }
      if (!item.active) {
        this.logWarn(`Cannot set current: ${this.itemType} is not active`, {
          id: item.id,
          index: item.index
        });
        return;
      }
      this.clearCurrent();
      this.updateItemData(item.index, { current: true });
      this.logDebug(`Set ${this.itemType} "${item.id}" as current`);
    }
    /**
     * Clear current flag from all items
     */
    clearCurrent() {
      const items = this.getByFilter((item) => item.current);
      if (items.length === 0) return;
      items.forEach((item) => {
        this.updateItemData(item.index, { current: false });
      });
      this.logDebug(
        `Cleared current flag from ${items.length} ${plural(this.itemType, items.length)}`
      );
    }
    /**
     * Clear all active and current flags
     * Updates storage not states
     */
    clearActiveAndCurrent() {
      const items = this.getByFilter((item) => item.active || item.current);
      if (items.length === 0) return;
      items.forEach((item) => {
        const updated = { ...item, active: false, current: false };
        this.update(updated);
      });
      this.logDebug(
        `Cleared active and current flags from ${items.length} ${plural(this.itemType, items.length)}`
      );
    }
    /**
     * Set active flag
     * Updates storage not states
     */
    setActive(selector) {
      const item = this.getBySelector(selector);
      if (!item) {
        this.logWarn(`Cannot set active: ${this.itemType} not found`, { selector });
        return;
      }
      const updated = { ...item, active: true };
      this.update(updated);
      this.logDebug(`Set ${this.itemType} "${item.id}" as active`);
    }
    /**
     * Set active by parent
     * Updates storage not states
     * @param parentId - The parent item ID
     * @param parentType - The parent item type
     * @param options - Active (boolean, defaults to true) and firstIsCurrent (boolean, defaults to false)
     */
    setActiveByParent(parentId, parentType, options) {
      const { firstIsCurrent = false } = options ?? {};
      const children = this.getItemsByParentId(parentId, parentType);
      children.forEach((item, index) => {
        const builtItem = this.buildItemData(item);
        const updated = {
          ...builtItem,
          active: true,
          current: index === 0 && firstIsCurrent
        };
        this.update(updated);
      });
      this.logDebug(
        `Set ${children.length} ${plural(this.itemType, children.length)} within ${parentType} "${parentId}" as active`
      );
    }
    /**
     * Get items by parent ID
     * Uses type guards to safely access hierarchy properties
     * @virtual
     */
    getItemsByParentId(parentId, parentType) {
      return this.getByFilter((item) => {
        if (item.type === "card") return false;
        const { parentHierarchy } = item;
        if (!parentHierarchy) return false;
        switch (parentType) {
          case "field":
            return "fieldId" in parentHierarchy && parentHierarchy.fieldId === parentId;
          case "group":
            return "groupId" in parentHierarchy && parentHierarchy.groupId === parentId;
          case "set":
            return "setId" in parentHierarchy && parentHierarchy.setId === parentId;
          case "card":
            return "cardId" in parentHierarchy && parentHierarchy.cardId === parentId;
          default:
            return false;
        }
      });
    }
    /**
     * Generic helper to find parent item by selector
     * @param child - The child element
     * @param parentType - The parent type
     * @param getParentItems - The function to get the parent items
     * @returns The parent item or undefined
     */
    findParentByElement(child, parentType, getParentItems) {
      const parentElement = child.closest(`[${ATTR}-element^="${parentType}"]`);
      if (!parentElement) return void 0;
      const parents = getParentItems();
      const parent = parents.find((parent2) => parent2.element === parentElement);
      if (!parent) {
        throw this.createError(`Cannot find parent ${parentType}: no parent item found`, "init", {
          cause: { child, parentElement }
        });
      }
      return parent;
    }
    /**
     * Find parent hierarchy for an item
     * Builds hierarchy object by calling findParentItem recursively
     *
     * @param child - HTMLElement or parent item
     * @returns Parent hierarchy object
     * @throws If called on CardManager (cards have no parent hierarchy)
     * @protected
     */
    findParentHierarchy(child) {
      if (this.itemType === "card") {
        return { formId: this.form.getId() };
      }
      return HierarchyBuilder.findParentHierarchy(
        child,
        this.form,
        (child2) => this.findParentItem(child2)
      );
    }
    /**
     * Build navigation order
     *
     * Creates array of item indexes in display order, skipping excluded
     * To be called after discovery and whenever item visibility changes
     */
    buildNavigationOrder() {
      this.navigationOrder = this.getByFilter(
        (item) => "isIncluded" in item ? item.isIncluded : true
      ).map((item) => item.index);
      this.logDebug(`Navigation order built`);
    }
    /**
     * Update item inclusion and rebuild navigation order
     *
     * @param itemId - Item ID
     * @param isIncluded - Whether to include the item in the navigation order
     */
    handleInclusion(id, isIncluded) {
      const item = this.getById(id);
      if (!item) return;
      this.updateItemData(id, { isIncluded });
      this.buildNavigationOrder();
      this.logDebug(`${isIncluded ? "Included" : "Excluded"} ${this.itemType} "${id}"`);
    }
    // ============================================
    // Expore Store Methods
    // ============================================
    /** Add item to store */
    add(item) {
      this.store.add(item);
    }
    /** Update item in the store */
    update(item) {
      this.store.update(item);
    }
    /** Merge item data */
    merge(item, data) {
      this.store.merge(item, data);
    }
    /** Clear store */
    clear() {
      this.store.clear();
    }
    /** Get all items */
    getAll() {
      return this.store.getAll();
    }
    /** Get item by id */
    getById(id) {
      return this.store.getById(id);
    }
    /** Get item by index */
    getByIndex(index) {
      return this.store.getByIndex(index);
    }
    /** Get item by selector (id or index) */
    getBySelector(selector) {
      return this.store.getBySelector(selector);
    }
    /** Get item by DOM */
    getByDOM(dom) {
      return this.store.getByDOM(dom);
    }
    /** Get items filtered by predicate */
    getByFilter(predicate) {
      return this.store.filter(predicate);
    }
    /** Find item by predicate */
    getByFind(predicate) {
      return this.store.find(predicate);
    }
    /** Get count */
    get length() {
      return this.store.length;
    }
    /**
     * Get all active items
     */
    getActive() {
      return this.getByFilter((item) => item.active);
    }
    /** Get all items by parent ID */
    getAllByParentId(parentId, parentType) {
      return this.getByFilter((item) => {
        if (!("parentHierarchy" in item)) return false;
        switch (parentType) {
          case "card":
            return "cardId" in item.parentHierarchy && item.parentHierarchy.cardId === parentId;
          case "set":
            return "setId" in item.parentHierarchy && item.parentHierarchy.setId === parentId;
          case "group":
            return "groupId" in item.parentHierarchy && item.parentHierarchy.groupId === parentId;
          case "field":
            return "fieldId" in item.parentHierarchy && item.parentHierarchy.fieldId === parentId;
          default:
            return false;
        }
      });
    }
    /**
     * Get the current item
     */
    getCurrent() {
      return this.getByFind((item) => item.current);
    }
    /**
     * Get the current item index
     */
    getCurrentIndex() {
      const current = this.getCurrent();
      if (!current) return -1;
      return current.index;
    }
    /**
     * Get the current item id
     */
    getCurrentId() {
      return this.getCurrent()?.id;
    }
    /** Check if first */
    isFirst() {
      const currentIndex = this.getCurrentIndex();
      return currentIndex === 0;
    }
    /** Check if last */
    isLast() {
      const currentIndex = this.getCurrentIndex();
      return currentIndex === this.length - 1;
    }
    /**
     * Get navigation order
     * @returns Array of item indexes in display order
     */
    getNavigationOrder() {
      return this.navigationOrder;
    }
    /**
     * Get next position
     * @returns Next position or undefined if on last position
     */
    getNextPosition() {
      const currentIndex = this.getCurrentIndex();
      if (currentIndex === void 0) return void 0;
      const currentPosition = this.navigationOrder.indexOf(currentIndex);
      if (currentPosition >= this.navigationOrder.length - 1) {
        return void 0;
      }
      return this.navigationOrder[currentPosition + 1];
    }
    /**
     * Get previous position
     * @returns Previous position or undefined if on first position
     */
    getPrevPosition() {
      const currentIndex = this.getCurrentIndex();
      if (currentIndex === void 0) return void 0;
      const currentPosition = this.navigationOrder.indexOf(currentIndex);
      if (currentPosition <= 0) {
        return void 0;
      }
      return this.navigationOrder[currentPosition - 1];
    }
    /**
     * Write states to form
     */
    setStates() {
      const states = this.calculateStates();
      this.form.setStates(states);
    }
  };

  // src/form/managers/card-manager.ts
  var CardManager = class extends ItemManager {
    itemType = "card";
    /**
     * Create data object
     * Parses the element attribute and creates a CardItem object
     *
     * @param element - HTMLElement
     * @param index - Index of the element within the list of cards
     * @returns CardItem | undefined
     */
    createItemData(element, index) {
      if (!(element instanceof HTMLElement)) return;
      const attrValue = element.getAttribute(`${ATTR}-element`);
      if (!attrValue) return;
      const parsed = parseElementAttribute(attrValue);
      if (parsed.type !== this.itemType) return;
      const titleData = extractTitle(element, this.itemType, parsed.id, index);
      const hasSets = !!element.querySelector(`[${ATTR}-element^="set"]`);
      return {
        element,
        index,
        id: titleData.id,
        visible: true,
        active: index === 0,
        type: this.itemType,
        parentHierarchy: this.findParentHierarchy(element),
        visited: index === 0,
        completed: !hasSets,
        current: index === 0,
        title: titleData.title,
        progress: hasSets ? 0 : 100,
        isIncluded: true,
        isValid: !hasSets
      };
    }
    /**
     * Calculate card-specific states
     * Aggregates data from all cards and their child sets
     *
     * @returns FormCardState - Complete card state object
     */
    calculateStates() {
      const currentCard = this.getCurrent();
      const currentCardIndex = currentCard ? currentCard.index : -1;
      const currentCardId = currentCard ? currentCard.id : null;
      const currentCardTitle = currentCard ? currentCard.title : null;
      const previousCardIndex = currentCardIndex > 0 ? currentCardIndex - 1 : null;
      const nextCardIndex = currentCardIndex < this.length - 1 ? currentCardIndex + 1 : null;
      const completedCards = new Set(
        this.getByFilter((item) => item.completed).map((item) => item.id)
      );
      const visitedCards = new Set(this.getByFilter((item) => item.visited).map((item) => item.id));
      const totalCards = this.length;
      const cardsComplete = completedCards.size;
      const cardValidity = this.getAll().reduce(
        (acc, item) => {
          acc[item.id] = item.isValid;
          return acc;
        },
        {}
      );
      return {
        currentCardIndex,
        currentCardId,
        currentCardTitle,
        activeCardIndices: this.getActiveIndices(),
        previousCardIndex,
        nextCardIndex,
        completedCards,
        visitedCards,
        totalCards,
        cardsComplete,
        cardValidity
      };
    }
    buildItemData(item) {
      const sets = this.form.setManager.getAllByParentId(item.id, "card");
      const completed = sets.length > 0 ? sets.every((set) => set.completed) : true;
      const isValid = sets.length > 0 ? sets.every((set) => set.isValid) : true;
      const fieldsInCard = this.form.fieldManager.getAllByParentId(item.id, "card").filter((field) => field.isIncluded);
      const progress = fieldsInCard.filter((field) => field.completed).length / fieldsInCard.length * 100;
      const isIncluded = this.form.conditionManager.evaluateElementCondition(item.element);
      return {
        ...item,
        completed,
        isValid,
        progress,
        isIncluded
      };
    }
    /**
     * Find the parent item for a card
     *
     * @param element - The card element
     * @returns null (cards have no parent)
     */
    findParentItem(element) {
      this.logWarn("findParentElement should not be called on CardManager", "runtime", { element });
      return void 0;
    }
  };

  // src/form/managers/condition-manager.ts
  var ConditionManager = class extends BaseManager {
    /** All conditional elements indexed by element */
    conditionalElements = /* @__PURE__ */ new Map();
    /** Dependency graph: field name -> Set of elements that depend on it */
    affectedElements = /* @__PURE__ */ new Map();
    /**
     * Initialize ConditionManager
     */
    init() {
      this.groupStart("Initializing Conditions");
      this.discoverConditionalElements();
      this.setupEventListeners();
      this.logDebug("Initialized", {
        conditionalElements: this.conditionalElements.size,
        dependencies: Object.fromEntries(this.affectedElements)
      });
      this.groupEnd();
    }
    /**
     * Cleanup manager resources
     */
    destroy() {
      this.conditionalElements.clear();
      this.affectedElements.clear();
      this.logDebug("ConditionManager destroyed");
    }
    // ============================================
    // Discovery
    // ============================================
    /**
     * Discover all conditional elements in the form
     * Finds elements with [data-form-showif] or [data-form-hideif]
     */
    discoverConditionalElements() {
      const rootElement = this.form.getRootElement();
      if (!rootElement) {
        throw this.createError("Cannot discover conditional elements: root element is null", "init", {
          cause: rootElement
        });
      }
      const elements = this.form.queryAll(`[${ATTR}-showif], [${ATTR}-hideif]`);
      this.conditionalElements.clear();
      this.affectedElements.clear();
      elements.forEach((element) => {
        this.registerCondition(element);
      });
      this.logDebug(`Discovered ${this.conditionalElements.size} conditional elements`, {
        elements: Array.from(this.conditionalElements.values()),
        dependencyGraph: Object.fromEntries(this.affectedElements)
      });
    }
    /**
     * Register a conditional element
     * Parses expressions and builds dependency graph
     *
     * @param element - HTMLElement with showif/hideif attributes
     */
    registerCondition(element) {
      const showIfAttr = element.getAttribute(`${ATTR}-showif`);
      const hideIfAttr = element.getAttribute(`${ATTR}-hideif`);
      if (!showIfAttr && !hideIfAttr) return;
      const conditionalElement = {
        element,
        showIfExpression: showIfAttr ? this.parseExpression(showIfAttr) : void 0,
        hideIfExpression: hideIfAttr ? this.parseExpression(hideIfAttr) : void 0,
        dependsOn: /* @__PURE__ */ new Set()
      };
      if (conditionalElement.showIfExpression) {
        conditionalElement.showIfExpression.conditions.forEach((condition) => {
          conditionalElement.dependsOn.add(condition.field);
          this.addToDependencyGraph(condition.field, element);
        });
      }
      if (conditionalElement.hideIfExpression) {
        conditionalElement.hideIfExpression.conditions.forEach((condition) => {
          conditionalElement.dependsOn.add(condition.field);
          this.addToDependencyGraph(condition.field, element);
        });
      }
      this.conditionalElements.set(element, conditionalElement);
    }
    /**
     * Add element to dependency graph
     *
     * @param fieldName - Field name that affects visibility
     * @param element - Element that depends on the field
     */
    addToDependencyGraph(fieldName, element) {
      if (!this.affectedElements.has(fieldName)) {
        this.affectedElements.set(fieldName, /* @__PURE__ */ new Set());
      }
      this.affectedElements.get(fieldName).add(element);
    }
    // ============================================
    // Expression Parsing
    // ============================================
    /**
     * Parse condition expression
     * Supports: {fieldName} operator value && {fieldName2} operator2 value2
     *
     * @param expression - Raw expression string
     * @returns Parsed expression tree
     */
    parseExpression(expression) {
      const conditions = [];
      const logicalOperators = [];
      const parts = expression.split(/(\s*(?:&&|\|\|)\s*)/);
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i].trim();
        if (part === "&&" || part === "||") {
          logicalOperators.push(part);
          continue;
        }
        const condition = this.parseCondition(part);
        if (condition) {
          conditions.push(condition);
        }
      }
      return { conditions, logicalOperators };
    }
    /**
     * Parse single condition: {fieldName} operator value
     *
     * @param conditionStr - Single condition string
     * @returns Parsed condition or undefined
     */
    parseCondition(conditionStr) {
      const fieldMatch = conditionStr.match(/\{([^}]+)\}/);
      if (!fieldMatch) {
        this.logWarn(`Invalid condition syntax: ${conditionStr}`);
        return void 0;
      }
      const field = fieldMatch[1].trim();
      const remainder = conditionStr.substring(fieldMatch.index + fieldMatch[0].length).trim();
      const operatorMatch = remainder.match(/^(>=|<=|\*=|\^=|\$=|!=|=|>|<)/);
      if (!operatorMatch) {
        this.logWarn(`Invalid operator in condition: ${conditionStr}`);
        return void 0;
      }
      const operator = operatorMatch[1];
      const value = remainder.substring(operator.length).trim();
      return { field, operator, value };
    }
    // ============================================
    // Public Evaluation API
    // ============================================
    /**
     * Evaluate condition for an element
     * Called by hierarchy managers during buildItemData()
     *
     * @param element - Element to evaluate
     * @returns Whether element should be included (visible)
     */
    evaluateElementCondition(element) {
      const conditionalElement = this.conditionalElements.get(element);
      if (!conditionalElement) return true;
      let showIfResult = true;
      let hideIfResult = false;
      if (conditionalElement.showIfExpression) {
        showIfResult = this.evaluateExpression(conditionalElement.showIfExpression);
      }
      if (conditionalElement.hideIfExpression) {
        hideIfResult = this.evaluateExpression(conditionalElement.hideIfExpression);
      }
      return showIfResult && !hideIfResult;
    }
    /**
     * Check if element has conditions
     *
     * @param element - Element to check
     * @returns Whether element has showif/hideif attributes
     */
    hasConditions(element) {
      return this.conditionalElements.has(element);
    }
    // ============================================
    // Expression Evaluation
    // ============================================
    /**
     * Evaluate expression tree with logical operators
     *
     * @param expression - Parsed expression
     * @returns Evaluation result
     */
    evaluateExpression(expression) {
      const { conditions, logicalOperators } = expression;
      if (conditions.length === 0) return true;
      if (conditions.length === 1) {
        return this.evaluateConditionPart(conditions[0]);
      }
      let result = this.evaluateConditionPart(conditions[0]);
      for (let i = 0; i < logicalOperators.length; i++) {
        const operator = logicalOperators[i];
        const nextCondition = conditions[i + 1];
        if (!nextCondition) break;
        const nextResult = this.evaluateConditionPart(nextCondition);
        if (operator === "&&") {
          result = result && nextResult;
        } else if (operator === "||") {
          result = result || nextResult;
        }
      }
      return result;
    }
    /**
     * Evaluate single condition part
     *
     * @param condition - Parsed condition
     * @returns Evaluation result
     */
    evaluateConditionPart(condition) {
      const { field, operator, value } = condition;
      const currentValue = this.getFieldValue(field);
      const currentValueStr = String(currentValue ?? "").toLowerCase();
      const expectedValueStr = value.toLowerCase();
      switch (operator) {
        case "=":
          return currentValueStr === expectedValueStr;
        case "!=":
          return currentValueStr !== expectedValueStr;
        case ">":
          return parseFloat(currentValueStr) > parseFloat(expectedValueStr);
        case "<":
          return parseFloat(currentValueStr) < parseFloat(expectedValueStr);
        case ">=":
          return parseFloat(currentValueStr) >= parseFloat(expectedValueStr);
        case "<=":
          return parseFloat(currentValueStr) <= parseFloat(expectedValueStr);
        case "*=":
          return currentValueStr.includes(expectedValueStr);
        case "^=":
          return currentValueStr.startsWith(expectedValueStr);
        case "$=":
          return currentValueStr.endsWith(expectedValueStr);
        default:
          this.logWarn(`Unknown operator: ${operator}`);
          return false;
      }
    }
    /**
     * Get field value from input manager or form state
     *
     * @param fieldName - Name of the field/input
     * @returns Current value
     */
    getFieldValue(fieldName) {
      const input = this.form.inputManager.getById(fieldName);
      if (input) {
        return input.value;
      }
      if (fieldName.startsWith("form.")) {
        const stateKey = fieldName.substring(5);
        const state = this.form.getAllState();
        return state[stateKey];
      }
      this.logWarn(`Field not found: ${fieldName}`);
      return void 0;
    }
    // ============================================
    // Event Listeners
    // ============================================
    /**
     * Setup event listeners
     */
    setupEventListeners() {
      this.form.subscribe("form:input:changed", (payload) => {
        this.onInputChange(payload);
      });
      this.logDebug("Event listeners setup");
    }
    /**
     * Handle field value change
     * Triggers rebuilds for affected hierarchy items
     * Defers rebuild to next tick to ensure input values are fresh
     *
     * @param payload - Input change payload
     */
    onInputChange(payload) {
      const { name } = payload;
      const affectedElements = this.affectedElements.get(name);
      if (!affectedElements || affectedElements.size === 0) return;
      this.logDebug(
        `Rebuilding ${affectedElements.size} affected ${plural("element", affectedElements.size)}`
      );
      this.form.cardManager.rebuildActive();
      this.form.setManager.rebuildActive();
      this.form.groupManager.rebuildActive();
      this.form.fieldManager.rebuildActive();
      this.form.inputManager.rebuildActive();
      this.form.inputManager.applyStates();
      affectedElements.forEach((element) => {
        const attrValue = element.getAttribute(`${ATTR}-element`);
        if (!attrValue) return;
        const parsed = parseElementAttribute(attrValue);
        if (!parsed) return;
        this.form.emit("form:condition:evaluated", {
          element,
          type: parsed.type
        });
      });
    }
    // ============================================
    // Public API
    // ============================================
    /**
     * Get all elements affected by a field
     *
     * @param fieldName - Field name
     * @returns Set of affected elements
     */
    getAffectedElements(fieldName) {
      return this.affectedElements.get(fieldName) || /* @__PURE__ */ new Set();
    }
  };

  // src/form/managers/display-manager.ts
  var DisplayManager = class extends BaseManager {
    // ============================================
    // Lifecycle
    // ============================================
    /**
     * Initialize the manager
     */
    init() {
      this.groupStart(`Initializing Display`);
      this.setupEventListeners();
      this.initializeDisplay();
      this.logDebug("Initialized");
      this.groupEnd();
    }
    /**
     * Cleanup manager resources
     */
    destroy() {
      this.logDebug("DisplayManager destroyed");
    }
    // ============================================
    // Event Listeners
    // ============================================
    /**
     * Setup event listeners for navigation events based on behavior
     */
    setupEventListeners() {
      this.form.subscribe("form:navigation:changed", (payload) => {
        this.updateDisplay(payload.target);
      });
      this.form.subscribe("form:condition:evaluated", (payload) => {
        let manager;
        switch (payload.type) {
          case "card":
            manager = this.form.cardManager;
            break;
          case "set":
            manager = this.form.setManager;
            break;
          case "group":
            manager = this.form.groupManager;
            break;
          case "field":
            manager = this.form.fieldManager;
            break;
          default:
            return;
        }
        this.handleVisibility(manager);
      });
      this.logDebug("DisplayManager event listeners setup");
    }
    // ============================================
    // Handle Navigation Changes
    // ============================================
    /**
     * Initialize the display
     */
    initializeDisplay() {
      this.handleVisibility(this.form.cardManager);
      this.handleVisibility(this.form.setManager);
      this.handleVisibility(this.form.groupManager);
      this.handleVisibility(this.form.fieldManager);
      this.removeInitialStyles();
    }
    /**
     * Remove initial styles from all elements
     */
    removeInitialStyles() {
      const elements = this.form.queryAll(`[${ATTR}-initialdisplay]`);
      elements.forEach((element) => {
        element.removeAttribute(`${ATTR}-initialdisplay`);
      });
    }
    /**
     * Update display depending on the state changed, no need for behavior
     */
    updateDisplay(key) {
      switch (key) {
        case "card":
          this.handleVisibility(this.form.cardManager);
          break;
        case "set":
          this.handleVisibility(this.form.setManager);
          break;
        case "group":
          this.handleVisibility(this.form.groupManager);
          break;
        case "field":
          this.handleVisibility(this.form.fieldManager);
          break;
        default:
          return;
      }
    }
    /**
     * Handle item visibility based on data
     */
    handleVisibility(manager) {
      const items = manager.getAll();
      items.forEach((item) => {
        this.showElement(
          item,
          (visible) => manager.updateItemData(item.index, { visible })
        );
      });
    }
    /**
     * Show/Hide an element
     * Sets "display: none" or removes display property based on active state AND isIncluded
     * Updates the "active" data-attribute to be inline with the display property
     * Updates the visible flag to be inline with the active state
     */
    showElement(item, updateVisible) {
      const { element, active, type, isIncluded } = item;
      const shouldBeVisible = active && isIncluded;
      if (shouldBeVisible) element.style.removeProperty("display");
      else element.style.setProperty("display", "none");
      element.setAttribute(`${ATTR}-${type}-active`, active.toString());
      element.setAttribute(`${ATTR}-${type}-included`, isIncluded.toString());
      updateVisible(shouldBeVisible);
    }
  };

  // src/form/managers/field-manager.ts
  var FieldManager = class extends ItemManager {
    itemType = "field";
    /**
     * Create data object
     * Parses the element attribute and creates a FieldItem object
     *
     * @param element - HTMLElement
     * @param index - Index of the element within the list of fields
     * @returns FieldItem | undefined
     */
    createItemData(element, index) {
      if (!(element instanceof HTMLElement)) return;
      const attrValue = element.getAttribute(`${ATTR}-element`);
      if (!attrValue) return;
      const parsed = parseElementAttribute(attrValue);
      if (parsed.type !== this.itemType) return;
      const id = parsed.id || `${this.itemType}-${index}`;
      const parent = this.findParentItem(element);
      if (!parent) {
        throw this.createError("Cannot discover fields: no parent element found", "init", {
          cause: { manager: "FieldManager", element }
        });
      }
      const parentHierarchy = this.findParentHierarchy(parent);
      const active = this.determineActive(element, index);
      return {
        element,
        index,
        id,
        visible: true,
        active,
        type: this.itemType,
        parentHierarchy,
        current: active && index === 0,
        visited: active,
        completed: false,
        isIncluded: true,
        isValid: false
      };
    }
    /**
     * Calculate field-specific states
     * Aggregates data from all fields and their child groups and sets
     *
     * @returns FormFieldState - Complete field state object
     */
    calculateStates() {
      const currentField = this.getCurrent();
      const currentFieldIndex = currentField ? currentField.index : -1;
      const currentFieldId = currentField ? currentField.id : null;
      const previousFieldIndex = currentFieldIndex > 0 ? currentFieldIndex - 1 : null;
      const nextFieldIndex = currentFieldIndex < this.length - 1 ? currentFieldIndex + 1 : null;
      const completedFields = new Set(
        this.getByFilter((item) => item.completed).map((item) => item.id)
      );
      const visitedFields = new Set(this.getByFilter((item) => item.visited).map((item) => item.id));
      const totalFields = this.length;
      const totalIncludedFields = this.getByFilter((item) => item.isIncluded).length;
      const fieldsComplete = completedFields.size;
      const fieldValidity = this.getAll().reduce(
        (acc, item) => {
          acc[item.id] = item.isValid;
          return acc;
        },
        {}
      );
      return {
        currentFieldIndex,
        currentFieldId,
        activeFieldIndices: this.getActiveIndices(),
        previousFieldIndex,
        nextFieldIndex,
        completedFields,
        visitedFields,
        totalFields,
        totalIncludedFields,
        fieldsComplete,
        fieldValidity
      };
    }
    buildItemData(item) {
      const input = this.form.inputManager.getByFind(
        (input2) => input2.parentHierarchy.fieldId === item.id
      );
      if (!input) {
        throw this.createError("Cannot merge field data: input not found", "runtime", {
          cause: { manager: "FieldManager", element: item, input }
        });
      }
      const { completed, isValid } = input;
      const isIncluded = this.form.conditionManager.evaluateElementCondition(item.element);
      return {
        ...item,
        completed,
        isValid,
        isIncluded
      };
    }
    /**
     * Find the parent item for a field
     *
     * @param element - The field element
     * @returns Parent data or null
     */
    findParentItem(element) {
      const parentGroup = HierarchyBuilder.findParentByElement(
        element,
        "group",
        () => this.form.groupManager.getAll()
      );
      const parentSet = HierarchyBuilder.findParentByElement(
        element,
        "set",
        () => this.form.setManager.getAll()
      );
      return parentGroup ?? parentSet;
    }
  };

  // src/form/managers/focus-manager.ts
  var FocusManager = class extends BaseManager {
    /** Initialize the manager */
    init() {
      this.setupEventListeners();
    }
    /** Cleanup manager resources */
    destroy() {
    }
    // ============================================
    // Event Listeners
    // ============================================
    /**
     * Setup event listeners for navigation events based on behavior
     */
    setupEventListeners() {
      this.form.subscribe("form:navigation:changed", () => {
        this.handleNavigationChanged();
      });
      this.form.subscribe("form:navigation:denied", () => {
        this.handleNavigationDenied();
      });
    }
    // ============================================
    // Focus Utilities
    // ============================================
    /**
     * Check if element can receive focus
     */
    isFocusable(element) {
      return !element.hasAttribute("disabled") && element.offsetParent !== null && // Not hidden
      element.tabIndex >= 0;
    }
    /**
     * Safely focus an element with error handling and scroll behavior
     * @param element - Element to focus
     * @param scrollIntoView - Whether to ensure element is visible (default: true)
     * @returns true if focus succeeded, false otherwise
     */
    focusElement(element, scrollIntoView = true) {
      if (!this.isFocusable(element)) {
        return false;
      }
      try {
        element.focus();
        if (scrollIntoView) {
          element.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "nearest"
          });
        }
        return true;
      } catch (error) {
        this.logError("Failed to focus element", error);
        return false;
      }
    }
    // ============================================
    // Handle State Changes
    // ============================================
    /**
     * Handle navigation changes and focus current field
     */
    handleNavigationChanged = () => {
      const currentFieldIndex = this.form.getState("currentFieldIndex");
      if (currentFieldIndex < 0) return;
      const currentInput = this.form.inputManager.getByIndex(currentFieldIndex);
      if (!currentInput || !currentInput.active) return;
      this.focusElement(currentInput.element);
    };
    /**
     * Handle navigation denied
     */
    handleNavigationDenied = () => {
      const activeInputs = this.form.inputManager.getByFilter(
        (input) => input.active && input.isIncluded
      );
      if (activeInputs.length === 0) return;
      const firstInvalidInput = activeInputs.find((input) => !input.isValid);
      if (!firstInvalidInput) return;
      this.focusElement(firstInvalidInput.element);
    };
  };

  // src/form/managers/group-manager.ts
  var GroupManager = class extends ItemManager {
    itemType = "group";
    /**
     * Create data object
     * Parses the element attribute and creates a GroupItem object
     *
     * @param element - HTMLElement
     * @param index - Index of the element within the list of groups
     * @returns GroupItem | undefined
     */
    createItemData(element, index) {
      if (!(element instanceof HTMLElement)) return;
      const attrValue = element.getAttribute(`${ATTR}-element`);
      if (!attrValue) return;
      const parsed = parseElementAttribute(attrValue);
      if (parsed.type !== this.itemType) return;
      const titleData = extractTitle(element, this.itemType, parsed.id, index);
      const parentHierarchy = this.findParentHierarchy(element);
      const active = this.determineActive(element, index);
      return {
        element,
        index,
        id: titleData.id,
        visible: true,
        active,
        type: this.itemType,
        parentHierarchy,
        current: active && index === 0,
        visited: active,
        completed: false,
        title: titleData.title,
        progress: 0,
        isIncluded: true,
        isValid: false
      };
    }
    /**
     * Calculate group-specific states
     * Aggregates data from all groups and their child fields
     *
     * @returns FormGroupState - Complete group state object
     */
    calculateStates() {
      const currentGroup = this.getCurrent();
      const currentGroupIndex = currentGroup ? currentGroup.index : -1;
      const currentGroupId = currentGroup ? currentGroup.id : null;
      const currentGroupTitle = currentGroup ? currentGroup.title : null;
      const previousGroupIndex = currentGroupIndex > 0 ? currentGroupIndex - 1 : null;
      const nextGroupIndex = currentGroupIndex < this.length - 1 ? currentGroupIndex + 1 : null;
      const completedGroups = new Set(
        this.getByFilter((item) => item.completed).map((item) => item.id)
      );
      const visitedGroups = new Set(this.getByFilter((item) => item.visited).map((item) => item.id));
      const totalGroups = this.length;
      const groupsComplete = completedGroups.size;
      const groupValidity = this.getAll().reduce(
        (acc, item) => {
          acc[item.id] = item.isValid;
          return acc;
        },
        {}
      );
      return {
        currentGroupIndex,
        currentGroupId,
        currentGroupTitle,
        activeGroupIndices: this.getActiveIndices(),
        previousGroupIndex,
        nextGroupIndex,
        completedGroups,
        visitedGroups,
        totalGroups,
        groupsComplete,
        groupValidity
      };
    }
    buildItemData(item) {
      const includedFields = this.form.fieldManager.getAllByParentId(item.id, "group").filter((field) => field.isIncluded);
      const completed = includedFields.every((field) => field.completed);
      const isValid = includedFields.every((field) => field.isValid);
      const progress = includedFields.filter((field) => field.completed).length / includedFields.length * 100;
      const isIncluded = this.form.conditionManager.evaluateElementCondition(item.element);
      return {
        ...item,
        completed,
        isValid,
        progress,
        isIncluded
      };
    }
    /**
     * Find the parent item for a group
     *
     * @param element - The group element
     * @returns Parent data or null
     */
    findParentItem(element) {
      return HierarchyBuilder.findParentByElement(
        element,
        "set",
        () => this.form.setManager.getAll()
      );
    }
  };

  // src/form/managers/input-manager.ts
  var InputManager = class extends ItemManager {
    itemType = "input";
    /** Active event listeners for cleanup */
    activeListeners = [];
    /**
     * Initialize InputManager
     */
    init() {
      super.init(false);
      this.setupEventListeners();
      this.onInitialized();
    }
    /**
     * Destroy InputManager
     */
    destroy() {
      this.unbindAllInputs();
      super.destroy();
    }
    /**
     * Discover all inputs in the form
     * Queries within each field wrapper and groups by name attribute
     */
    discoverItems() {
      const fields = this.form.fieldManager.getAll();
      this.clear();
      const processedNames = /* @__PURE__ */ new Set();
      fields.forEach((field, index) => {
        const inputs = Array.from(
          field.element.querySelectorAll("input, select, textarea")
        );
        if (inputs.length === 0) {
          this.form.logWarn(`Field "${field.id}" has no inputs`, { field });
          return;
        }
        const parentHierarchy = this.findParentHierarchy(field);
        inputs.forEach((input) => {
          const data = this.createInputData(input, index, {
            field,
            processedNames,
            parentHierarchy,
            isGroup: inputs.length > 1
          });
          if (!data) return;
          this.update(data);
        });
      });
      this.logDebug(`Discovered ${this.length} ${this.itemType}s`, {
        elements: this.getAll()
      });
    }
    /**
     * Not used - use createInputData instead
     */
    createItemData() {
      return void 0;
    }
    /**
     * Create input item data with additional context
     * Private helper used by discoverElements() to handle input-specific logic
     *
     * @param input - InputElement (input/select/textarea)
     * @param index - Index of the input within field
     * @param props - Additional context for input discovery
     * @returns InputItem | undefined
     */
    createInputData(input, index, props) {
      const { field, processedNames, parentHierarchy, isGroup } = props;
      const name = input.getAttribute("name");
      if (!name) {
        throw this.createError("Cannot discover inputs: Input missing name attribute", "init", {
          cause: {
            input,
            field: parentHierarchy.fieldId,
            group: parentHierarchy.groupId,
            set: parentHierarchy.setId,
            card: parentHierarchy.cardId,
            form: parentHierarchy.formId
          }
        });
      }
      if (processedNames.has(name)) {
        const existingInput = this.getById(name);
        if (existingInput) {
          existingInput.inputs.push(input);
          existingInput.isGroup = existingInput.inputs.length > 1;
          this.mergeItemData(existingInput, {});
        }
        return;
      }
      processedNames.add(name);
      const inputType = this.getInputType(input);
      const isRequired = this.checkIfRequired(input);
      const isValid = this.checkIfValid(input);
      const { visited, active, current, isIncluded } = field;
      const format = input.getAttribute(`${ATTR}-format`) || void 0;
      let formatConfig;
      if (format && (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement)) {
        const { formattedLength, rawLength } = this.calculateFormatLengths(format);
        const originalMaxLength = input.maxLength > -1 ? input.maxLength : null;
        if (originalMaxLength !== null && originalMaxLength < formattedLength) {
          input.maxLength = formattedLength;
        } else if (originalMaxLength !== null && originalMaxLength > rawLength) {
          input.maxLength = originalMaxLength - rawLength + formattedLength;
        } else {
          input.maxLength = formattedLength;
        }
        input.minLength = formattedLength;
        formatConfig = {
          pattern: format,
          formattedLength,
          rawLength,
          originalMaxLength
        };
      }
      return {
        element: input,
        index,
        id: name,
        visible: true,
        active,
        type: "input",
        parentHierarchy,
        current,
        visited,
        completed: isValid,
        inputs: [input],
        inputType,
        value: this.getInputValue(input),
        name,
        isGroup,
        isRequiredOriginal: isRequired,
        isRequired,
        isValid,
        isIncluded,
        format,
        formatConfig
      };
    }
    /**
     * Calculate input-specific states
     * Returns formData object with all input values
     *
     * @returns FormInputState - Complete input state object
     */
    calculateStates() {
      return {
        formData: this.getFormData()
      };
    }
    buildItemData(item) {
      const parentField = this.form.fieldManager.getById(item.parentHierarchy.fieldId);
      const isIncluded = parentField ? parentField.isIncluded : true;
      const isRequired = isIncluded ? item.isRequiredOriginal : false;
      if (isRequired !== item.isRequired) {
        this.setInputRequired(item, isRequired);
      }
      const isValid = this.checkIfValid(item.element);
      return {
        ...item,
        completed: isValid,
        value: this.getValue(item.name),
        isIncluded,
        isRequired,
        isValid
      };
    }
    applyStates() {
      this.getAll().forEach((item) => {
        item.inputs.forEach((input) => {
          input.required = item.isRequired;
        });
      });
    }
    /**
     * Setup event listeners for state changes
     */
    setupEventListeners() {
      this.bindActiveInputs();
      this.form.subscribe("form:navigation:changed", (payload) => {
        if (payload.target === "field") {
          this.handleActiveFieldsChanged();
        }
      });
    }
    handleActiveFieldsChanged() {
      this.bindActiveInputs();
      this.unbindInactiveInputs();
    }
    /**
     * Bind events to the current field's input
     * Automatically determines the correct event type based on input type
     */
    bindActiveInputs() {
      const activeItems = this.getActive();
      if (activeItems.length === 0) return;
      activeItems.forEach((item) => {
        const alreadyBound = item.inputs.some(
          (input) => this.activeListeners.some((listener) => listener.element === input)
        );
        if (alreadyBound) return;
        const eventType = this.getEventTypeForInput(item.element);
        item.inputs.forEach((input) => {
          const needsFormatting = item.format && (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement);
          const handler = () => {
            if (needsFormatting) {
              this.handleFormatting(
                input,
                item.format,
                item
              );
            }
            const value = this.extractInputValue(item);
            this.handleInputChange(item.name, value);
          };
          input.addEventListener(eventType, handler);
          this.activeListeners.push({
            element: input,
            index: item.index,
            name: item.name,
            event: eventType,
            handler
          });
        });
        this.logDebug(`Bound "${eventType}" events to input "${item.name}"`);
      });
    }
    /**
     * Unbind events from inputs not associated with active field indices
     * @param activeIndices - Array of active field indices to keep bound
     */
    unbindInactiveInputs() {
      const activeItems = this.getActive();
      if (activeItems.length === 0) return;
      this.activeListeners = this.activeListeners.filter((listener) => {
        const shouldRemove = !activeItems.find((item) => item.index === listener.index);
        if (shouldRemove) {
          listener.element.removeEventListener(listener.event, listener.handler);
          this.logDebug(`Unbound "${listener.event}" events from input "${listener.name}"`);
        }
        return !shouldRemove;
      });
    }
    /**
     * Unbind all active input listeners
     * @internal Used during cleanup
     */
    unbindAllInputs() {
      this.activeListeners.forEach((listener) => {
        listener.element.removeEventListener(listener.event, listener.handler);
      });
      this.activeListeners = [];
    }
    // ============================================
    // Event Type Selection
    // ============================================
    /**
     * Determine the correct event type for an input
     * @param input - Input element to check
     * @returns Event type to bind to
     */
    getEventTypeForInput(input) {
      if (input instanceof HTMLSelectElement) return "change";
      if (input instanceof HTMLTextAreaElement) return "input";
      const type = input.type.toLowerCase();
      if (["radio", "checkbox"].includes(type)) return "change";
      return "input";
    }
    // ============================================
    // Value Extraction
    // ============================================
    /**
     * Extract value from an input item
     * Handles all input types including radio/checkbox groups
     * @param item - InputItem to extract value from
     * @returns Extracted value (string, boolean, or array)
     */
    extractInputValue(item) {
      const { element } = item;
      if (element instanceof HTMLSelectElement) {
        return element.value;
      }
      if (element instanceof HTMLTextAreaElement) {
        if (item.format) {
          return this.stripFormatting(element.value);
        }
        return element.value;
      }
      const type = item.inputType;
      if (type === "checkbox") {
        if (item.isGroup) {
          return item.inputs.filter((cb) => cb.checked).map((cb) => cb.value);
        }
        return element.checked;
      }
      if (type === "radio") {
        const checked = item.inputs.find((r) => r.checked);
        return checked ? checked.value : null;
      }
      if (item.format) {
        return this.stripFormatting(element.value);
      }
      return element.value;
    }
    /**
     * Get input value
     * @param selector - ID or Index
     * @returns Current value or undefined
     */
    getValue(selector) {
      const item = this.getBySelector(selector);
      if (!item) return void 0;
      return item.value;
    }
    getInputValue(input) {
      if (input instanceof HTMLSelectElement || input instanceof HTMLTextAreaElement) {
        return input.value;
      }
      const type = input.type.toLowerCase();
      if (type === "checkbox" || type === "radio") {
        return input.checked;
      }
      return input.value;
    }
    // ============================================
    // Value Setting
    // ============================================
    /**
     * Set input value
     * @param name - Input name attribute
     * @param value - Value to set
     */
    setValue(selector, value) {
      const item = this.getBySelector(selector);
      if (!item) {
        this.form.logWarn(`Cannot set value for input "${selector}" - not found`);
        return;
      }
      const { element } = item;
      if (element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement) {
        element.value = String(value);
        return;
      }
      const type = item.inputType;
      if (type === "checkbox") {
        if (Array.isArray(value)) {
          item.inputs.forEach((cb) => {
            cb.checked = value.includes(cb.value);
          });
        } else {
          element.checked = Boolean(value);
        }
        return;
      }
      if (type === "radio") {
        item.inputs.forEach((r) => {
          r.checked = r.value === String(value);
        });
        return;
      }
      element.value = String(value);
    }
    // ============================================
    // Form Data
    // ============================================
    /**
     * Get form data as key-value pairs
     * @returns Object with input names and values
     */
    getFormData() {
      const formData = {};
      this.getAll().forEach((item) => {
        formData[item.name] = this.extractInputValue(item);
      });
      return formData;
    }
    // ============================================
    // Input Formatting
    // ============================================
    /**
     * Calculate format lengths from pattern string
     * @param pattern - Format pattern (e.g., "(xxx) xxx-xxxx")
     * @returns Object with formattedLength and rawLength
     */
    calculateFormatLengths(pattern) {
      const rawLength = (pattern.match(/[Xx]/g) || []).length;
      const formattedLength = pattern.length;
      return { formattedLength, rawLength };
    }
    /**
     * Update minLength and maxLength attributes based on current raw value length
     * Dynamically adjusts constraints when user exceeds or returns within format capacity
     *
     * IMPORTANT: Attribute order matters to avoid browser constraint violations:
     * - When increasing (raw → formatted): Set maxLength first, then minLength
     * - When decreasing (formatted → raw): Set minLength first, then maxLength
     *
     * @param input - Input element to update
     * @param item - InputItem containing formatConfig
     * @param rawLength - Current length of raw (digits only) value
     */
    updateLengthConstraints(input, item, rawLength) {
      if (!item.formatConfig) return;
      const { formattedLength, rawLength: maxRawLength, originalMaxLength } = item.formatConfig;
      const withinFormatCapacity = rawLength <= maxRawLength;
      if (withinFormatCapacity) {
        let targetMaxLength;
        if (originalMaxLength !== null && originalMaxLength > maxRawLength) {
          targetMaxLength = originalMaxLength - maxRawLength + formattedLength;
        } else {
          targetMaxLength = formattedLength;
        }
        if (input.maxLength !== targetMaxLength) {
          input.maxLength = targetMaxLength;
        }
        if (input.minLength !== formattedLength) {
          input.minLength = formattedLength;
        }
      } else {
        if (input.minLength !== maxRawLength) {
          input.minLength = maxRawLength;
        }
        const newMaxLength = originalMaxLength !== null ? originalMaxLength : -1;
        if (input.maxLength !== newMaxLength) {
          input.maxLength = newMaxLength;
        }
      }
    }
    /**
     * Apply format pattern to input value
     * Formats the value according to pattern (e.g., "(XXX) XXX-XXXX")
     * Maintains cursor position after formatting
     * Updates minLength and maxLength constraints dynamically
     *
     * @param input - Input element to format
     * @param pattern - Format pattern (X = digit placeholder)
     * @param item - InputItem containing formatConfig
     */
    handleFormatting(input, pattern, item) {
      const cursorPosition = input.selectionStart || 0;
      const oldValue = input.value;
      const rawValue = this.stripFormatting(oldValue);
      this.updateLengthConstraints(input, item, rawValue.length);
      const formattedValue = this.applyFormat(rawValue, pattern);
      if (formattedValue !== oldValue) {
        input.value = formattedValue;
        const newCursorPosition = this.calculateCursorPosition(
          oldValue,
          formattedValue,
          cursorPosition
        );
        input.setSelectionRange(newCursorPosition, newCursorPosition);
      }
    }
    /**
     * Strip all non-digit characters from value
     * @param value - Value to strip
     * @returns Raw digits only
     */
    stripFormatting(value) {
      return value.replace(/\D/g, "");
    }
    /**
     * Apply format pattern to raw digits
     * If value exceeds pattern length, returns unformatted digits
     * @param rawValue - Raw digit string
     * @param pattern - Format pattern (X = digit)
     * @returns Formatted value or raw digits if overflow
     */
    applyFormat(rawValue, pattern) {
      const maxDigits = (pattern.match(/[Xx]/g) || []).length;
      if (rawValue.length > maxDigits) {
        return rawValue;
      }
      let formatted = "";
      let rawIndex = 0;
      for (let i = 0; i < pattern.length && rawIndex < rawValue.length; i++) {
        const patternChar = pattern[i];
        if (patternChar === "X" || patternChar === "x") {
          formatted += rawValue[rawIndex];
          rawIndex += 1;
        } else {
          formatted += patternChar;
        }
      }
      return formatted;
    }
    /**
     * Calculate new cursor position after formatting
     * Accounts for added/removed formatting characters
     *
     * @param oldValue - Value before formatting
     * @param newValue - Value after formatting
     * @param oldCursor - Cursor position before formatting
     * @param pattern - Format pattern
     * @returns New cursor position
     */
    calculateCursorPosition(oldValue, newValue, oldCursor) {
      const digitsBeforeCursor = oldValue.slice(0, oldCursor).replace(/\D/g, "").length;
      let digitCount = 0;
      let newCursor = 0;
      for (let i = 0; i < newValue.length; i++) {
        if (/\d/.test(newValue[i])) {
          digitCount += 1;
          if (digitCount === digitsBeforeCursor) {
            newCursor = i + 1;
            break;
          }
        }
      }
      if (digitCount < digitsBeforeCursor) {
        newCursor = newValue.length;
      }
      return newCursor;
    }
    // ============================================
    // Input Change Handling
    // ============================================
    /**
     * Handle input value change
     * Updates formData state and emits event for ConditionManager
     * @param name - Input name
     * @param value - New value
     * @internal Called by event handlers
     */
    handleInputChange(name, value) {
      this.logDebug(`Input "${name}" changed to "${value}"`);
      this.updateItemData(name, { value });
      const formData = this.form.getState("formData");
      this.form.setState("formData", { ...formData, [name]: value });
      this.form.emit("form:input:changed", { name, value });
    }
    /**
     * Set required state for an input
     * Updates both the InputItem and DOM attributes
     *
     * @param item - InputItem to update
     * @param isRequired - New required state
     * @internal
     */
    setInputRequired(item, isRequired) {
      item.isRequired = isRequired;
      item.inputs.forEach((input) => {
        input.required = isRequired;
      });
    }
    // ============================================
    // Private Helpers
    // ============================================
    /**
     * Find the parent field item for a field
     *
     * @param element - The input element
     * @returns Parent field item
     */
    findParentItem(element) {
      const parentField = HierarchyBuilder.findParentByElement(
        element,
        "field",
        () => this.form.fieldManager.getAll()
      );
      if (!parentField) {
        throw this.createError("Cannot discover inputs: no parent field found", "init", {
          cause: { manager: "InputManager", element }
        });
      }
      return parentField;
    }
    /**
     * Get the input type from an element
     */
    getInputType(element) {
      if (element instanceof HTMLSelectElement) {
        return "select";
      }
      if (element instanceof HTMLTextAreaElement) {
        return "textarea";
      }
      return element.type.toLowerCase();
    }
    /**
     * Check if an input is required
     */
    checkIfRequired(element) {
      return element.required;
    }
    /**
     * Check if an input is valid
     */
    checkIfValid(element) {
      if (element instanceof HTMLInputElement) {
        const { minLength, maxLength, value } = element;
        if (minLength > -1 && value.length < minLength || maxLength > -1 && value.length > maxLength) {
          return false;
        }
      }
      return element.checkValidity();
    }
  };

  // src/form/managers/navigation-manager.ts
  var NavigationManager = class extends BaseManager {
    navigationEnabled = true;
    enterKeyHandler = null;
    /**
     * Initialize the manager
     */
    init() {
      this.groupStart(`Initializing Navigation`);
      this.setupEventListeners();
      this.form.logDebug("Initialized");
      this.groupEnd();
    }
    /**
     * Cleanup manager resources
     */
    destroy() {
      this.removeEventListeners();
      this.form.logDebug("NavigationManager destroyed");
    }
    // ============================================
    // Event Listeners
    // ============================================
    /**
     * Setup event listeners for button clicks and boundary events
     */
    setupEventListeners() {
      this.form.subscribe("form:navigation:request", (payload) => {
        this.handleMove(payload.type);
      });
      this.setupEnterKeyListener();
      this.form.logDebug("Event listeners setup");
    }
    /**
     * Remove event listeners
     */
    removeEventListeners() {
      if (this.enterKeyHandler) {
        document.removeEventListener("keydown", this.enterKeyHandler);
        this.enterKeyHandler = null;
      }
    }
    /**
     * Setup global Enter key listener for form progression
     * Allows users to press Enter to advance through the form
     */
    setupEnterKeyListener() {
      this.enterKeyHandler = (event) => {
        if (event.key !== "Enter" || event.shiftKey) return;
        this.form.logDebug("Enter key pressed", { event });
        const formElement = this.form.getRootElement();
        const { activeElement } = document;
        const isWithinForm = formElement.contains(activeElement);
        if (!isWithinForm && activeElement !== document.body || activeElement?.tagName === "BUTTON")
          return;
        event.preventDefault();
        this.form.emit("form:navigation:request", { type: "next" });
      };
      document.addEventListener("keydown", this.enterKeyHandler);
      this.form.logDebug("Global Enter key listener setup");
    }
    // ============================================
    // Navigation requests
    // ============================================
    /**
     * Handle move in a direction
     */
    handleMove(direction) {
      if (!this.navigationEnabled) return;
      const canMove = direction === "next" && this.validateCurrent() || direction === "prev";
      const behavior = this.form.getBehavior();
      if (canMove) {
        this.logDebug(`Moving to ${direction} ${behavior.toLowerCase().replace("by", "")}`);
      } else {
        this.logDebug(`Cannot move to ${direction} ${behavior.toLowerCase().replace("by", "")}`);
        this.form.emit("form:navigation:denied", { reason: "invalid" });
        return;
      }
      switch (behavior) {
        case "byField":
          this.byField(direction);
          break;
        case "byGroup":
          this.byGroup(direction);
          break;
        case "bySet":
          this.bySet(direction);
          break;
        case "byCard":
          this.byCard(direction);
          break;
        default:
          throw this.form.createError("Invalid behavior", "runtime", {
            cause: { behavior }
          });
      }
    }
    validateCurrent() {
      const inputsToValidate = this.form.inputManager.getByFilter(
        (input) => input.active && input.isIncluded
      );
      return inputsToValidate.every((input) => input.isValid);
    }
    // /**
    //  * Handle submit request
    //  * Emits form:submit:requested event with button metadata
    //  * @param button - Button element that triggered the submit
    //  */
    // public async handleSubmit(): Promise<void> {
    //   const behavior = this.form.getBehavior();
    //   // // Emit submit requested event
    //   // this.form.emit('form:submit:requested', { behavior });
    //   this.form.logDebug('Form submit requested', {
    //     behavior,
    //   });
    // }
    /**
     * Navigate to next field (byField behavior)
     */
    byField(direction) {
      const targetPosition = direction === "prev" ? this.form.fieldManager.getPrevPosition() : this.form.fieldManager.getNextPosition();
      if (targetPosition === void 0) {
        return this.byGroup(direction);
      }
      const targetField = this.form.fieldManager.getByIndex(targetPosition);
      if (!targetField) {
        throw this.form.createError("Cannot handle navigation: target field is null", "runtime", {
          cause: { targetPosition, targetField, direction }
        });
      }
      this.clearHierarchyData("field");
      this.setChildrenActive(targetField);
      this.updateHierarchyData(targetField);
      this.batchStateUpdates();
      return "field";
    }
    /**
     * Navigate to next group (byGroup behavior)
     */
    byGroup(direction) {
      const targetPosition = direction === "prev" ? this.form.groupManager.getPrevPosition() : this.form.groupManager.getNextPosition();
      if (targetPosition === void 0) {
        return this.bySet(direction);
      }
      const targetGroup = this.form.groupManager.getByIndex(targetPosition);
      if (!targetGroup) {
        throw this.form.createError("Cannot handle navigation: target group is null", "runtime", {
          cause: { targetPosition, targetGroup, direction }
        });
      }
      this.clearHierarchyData("group");
      this.form.groupManager.setActive(targetGroup.id);
      this.form.groupManager.setCurrent(targetGroup.id);
      this.setChildrenActive(targetGroup);
      this.updateHierarchyData(targetGroup);
      this.batchStateUpdates();
      return "group";
    }
    /**
     * Navigate to next group (byGroup behavior)
     */
    bySet(direction) {
      const targetPosition = direction === "prev" ? this.form.setManager.getPrevPosition() : this.form.setManager.getNextPosition();
      if (targetPosition === void 0) {
        return this.byCard(direction);
      }
      const targetSet = this.form.setManager.getByIndex(targetPosition);
      if (!targetSet) {
        throw this.form.createError("Cannot handle navigation: target set is null", "runtime", {
          cause: { targetPosition, targetSet, direction }
        });
      }
      this.clearHierarchyData("set");
      this.form.setManager.setActive(targetSet.id);
      this.form.setManager.setCurrent(targetSet.id);
      this.setChildrenActive(targetSet);
      this.updateHierarchyData(targetSet);
      this.batchStateUpdates();
      return "set";
    }
    /**
     * Navigate to next group (byGroup behavior)
     */
    byCard(direction) {
      const targetPosition = direction === "prev" ? this.form.cardManager.getPrevPosition() : this.form.cardManager.getNextPosition();
      if (targetPosition === void 0) {
        return void 0;
      }
      const targetCard = this.form.cardManager.getByIndex(targetPosition);
      if (!targetCard) {
        throw this.form.createError("Cannot handle navigation: target card is null", "runtime", {
          cause: { targetPosition, targetCard, direction }
        });
      }
      this.clearHierarchyData("card");
      this.form.cardManager.setActive(targetCard.id);
      this.form.cardManager.setCurrent(targetCard.id);
      this.setChildrenActive(targetCard);
      this.batchStateUpdates();
      return "card";
    }
    /**
     * Clear child metadata for any element
     * Cascades down the hierarchy: card → set → group → field
     * Clears all levels below and including the given element type
     *
     * @param elementType - The element type to start clearing from
     */
    clearHierarchyData(elementType) {
      if (elementType === "card") {
        this.form.cardManager.clearActiveAndCurrent();
      }
      if (elementType === "card" || elementType === "set") {
        this.form.setManager.clearActiveAndCurrent();
      }
      if (elementType === "card" || elementType === "set" || elementType === "group") {
        this.form.groupManager.clearActiveAndCurrent();
      }
      this.form.fieldManager.clearActiveAndCurrent();
    }
    /**
     * Set children active (first is current)
     */
    setChildrenActive(element) {
      if (element.type === "card") {
        this.form.setManager.setActiveByParent(element.id, element.type, { firstIsCurrent: true });
      }
      if (element.type === "card" || element.type === "set") {
        this.form.groupManager.setActiveByParent(element.id, element.type, { firstIsCurrent: true });
      }
      if (element.type === "card" || element.type === "set" || element.type === "group") {
        this.form.fieldManager.setActiveByParent(element.id, element.type, { firstIsCurrent: true });
      }
      this.form.inputManager.clearActiveAndCurrent();
      const activeFields = this.form.fieldManager.getActive();
      activeFields.forEach((field, index) => {
        this.form.inputManager.setActiveByParent(field.id, "field", {
          firstIsCurrent: index === 0
        });
      });
    }
    /**
     * Update parent metadata for any element
     * Cascades up the hierarchy: field � group � set � card
     * Only updates parents that exist in the element's hierarchy
     *
     * @param element - Any form element (field, group, set, card)
     */
    updateHierarchyData(element) {
      if (element.type === "field") {
        const { groupIndex } = element.parentHierarchy;
        if (groupIndex !== null && groupIndex >= 0) {
          this.form.groupManager.clearActiveAndCurrent();
          this.form.groupManager.setActive(groupIndex);
          this.form.groupManager.setCurrent(groupIndex);
        }
      }
      if (element.type === "field" || element.type === "group") {
        const { setIndex } = element.parentHierarchy;
        if (setIndex !== null && setIndex >= 0) {
          this.form.setManager.clearActiveAndCurrent();
          this.form.setManager.setActive(setIndex);
          this.form.setManager.setCurrent(setIndex);
        }
      }
      const { cardIndex } = element.parentHierarchy;
      if (cardIndex !== null && cardIndex >= 0) {
        this.form.cardManager.clearActiveAndCurrent();
        this.form.cardManager.setActive(cardIndex);
        this.form.cardManager.setCurrent(cardIndex);
      }
    }
    /**
     * Batch all manager state calculations into one setStates() call
     * Prevents multiple state:changed events and DisplayManager flicker
     */
    batchStateUpdates() {
      this.form.inputManager.rebuildAll();
      this.form.fieldManager.rebuildAll();
      this.form.groupManager.rebuildAll();
      this.form.setManager.rebuildAll();
      this.form.cardManager.rebuildAll();
      const allStates = {
        ...this.form.inputManager.calculateStates(),
        ...this.form.fieldManager.calculateStates(),
        ...this.form.groupManager.calculateStates(),
        ...this.form.setManager.calculateStates(),
        ...this.form.cardManager.calculateStates()
      };
      this.form.setStates(allStates);
    }
  };

  // src/form/managers/progress-manager.ts
  var ProgressManager = class _ProgressManager extends BaseManager {
    store = new ItemStore();
    init() {
      this.groupStart(`Initializing Progress`);
      this.discoverItems();
      this.setupEventListeners();
      this.form.logDebug("Initialized");
      this.groupEnd();
    }
    destroy() {
      this.store.clear();
    }
    discoverItems() {
      const rootElement = this.form.getRootElement();
      if (!rootElement) {
        throw this.form.createError("Cannot discover progress items: root element is null", "init", {
          cause: rootElement
        });
      }
      const items = this.form.queryAll(`[${ATTR}-element="progress-line"]`);
      this.store.clear();
      items.forEach((item, index) => {
        const itemData = this.createItemData(item, index);
        if (!itemData) return;
        this.store.add(itemData);
      });
      this.form.logDebug(`Discovered ${this.store.length} progress lines`, {
        items: this.store.getAll()
      });
    }
    createItemData(element, index) {
      if (!(element instanceof HTMLElement)) return;
      const attrValue = element.getAttribute(`${ATTR}-element`);
      if (!attrValue) return;
      const parsed = parseElementAttribute(attrValue);
      if (!parsed) return;
      return this.buildItemData({
        element,
        index,
        id: parsed.id ?? `progress-line-${index}`,
        visible: true,
        active: false,
        // Calculated
        type: parsed.type,
        parentHierarchy: this.findParentHierarchy(element)
      });
    }
    buildItemData(item) {
      return {
        ...item,
        active: true
      };
    }
    findParentHierarchy(child) {
      return HierarchyBuilder.findParentHierarchy(
        child,
        this.form,
        (element) => this.findParentItem(element)
      );
    }
    /**
     * Find the parent item for a field
     *
     * @param element - The field element
     * @returns Parent data or null
     */
    findParentItem(element) {
      const parentGroup = HierarchyBuilder.findParentByElement(
        element,
        "group",
        () => this.form.groupManager.getAll()
      );
      const parentSet = HierarchyBuilder.findParentByElement(
        element,
        "set",
        () => this.form.setManager.getAll()
      );
      const parentCard = HierarchyBuilder.findParentByElement(
        element,
        "card",
        () => this.form.cardManager.getAll()
      );
      return parentGroup ?? parentSet ?? parentCard;
    }
    setupEventListeners() {
      this.form.subscribe("form:navigation:changed", () => {
        this.updateProgress();
      });
    }
    updateProgress() {
      this.store.getAll().forEach((item) => {
        const progress = this.getProgressForBehavior(item);
        if (progress === void 0) return;
        item.element.style.setProperty("--progress", progress.toString());
      });
    }
    /**
     * Progress calculation config
     * First key: Where progress bar is placed (parent context)
     * Second key: What we're tracking (behavior)
     */
    static PROGRESS_CONFIG = {
      form: {
        byCard: {
          manager: "cardManager",
          parentType: "form",
          stateKey: "currentCardIndex"
        },
        bySet: {
          manager: "setManager",
          parentType: "form",
          stateKey: "currentSetIndex"
        },
        byGroup: {
          manager: "groupManager",
          parentType: "form",
          stateKey: "currentGroupIndex"
        },
        byField: {
          manager: "fieldManager",
          parentType: "form",
          stateKey: "currentFieldIndex"
        }
      },
      card: {
        bySet: {
          manager: "setManager",
          parentType: "card",
          stateKey: "currentSetIndex"
        },
        byGroup: {
          manager: "groupManager",
          parentType: "card",
          stateKey: "currentGroupIndex"
        },
        byField: {
          manager: "fieldManager",
          parentType: "card",
          stateKey: "currentFieldIndex"
        }
      },
      set: {
        byGroup: {
          manager: "groupManager",
          parentType: "set",
          stateKey: "currentGroupIndex"
        },
        byField: {
          manager: "fieldManager",
          parentType: "set",
          stateKey: "currentFieldIndex"
        }
      }
    };
    /**
     * Get progress for item based on its parent context and current behavior
     */
    getProgressForBehavior(item) {
      const behavior = this.form.getBehavior();
      const { parentHierarchy } = item;
      const parentContext = this.getParentContext(parentHierarchy);
      if (!parentContext) return void 0;
      const [contextLevel, parentId] = parentContext;
      const config = _ProgressManager.PROGRESS_CONFIG[contextLevel]?.[behavior];
      if (!config) return void 0;
      const { manager, parentType, stateKey } = config;
      const managerInstance = this.form[manager];
      const siblings = parentType === "form" ? managerInstance.getAll() : managerInstance.getAllByParentId(parentId, parentType);
      if (siblings.length === 0) return void 0;
      const state = this.form.getAllState();
      const currentIndex = state[stateKey];
      const currentPosition = siblings.findIndex((s) => s.index === currentIndex);
      if (currentPosition === -1) return void 0;
      return (currentPosition + 1) / siblings.length * 100;
    }
    /**
     * Determine the parent context level for a progress item
     * Returns [contextLevel, parentId] or undefined
     * Checks from most specific (group) to least specific (form)
     */
    getParentContext(hierarchy) {
      if ("setId" in hierarchy && hierarchy.setId) {
        return ["set", hierarchy.setId];
      }
      if ("cardId" in hierarchy && hierarchy.cardId) {
        return ["card", hierarchy.cardId];
      }
      if (hierarchy.formId) {
        return ["form", hierarchy.formId];
      }
      return void 0;
    }
  };

  // src/form/managers/set-manager.ts
  var SetManager = class extends ItemManager {
    itemType = "set";
    /**
     * Create data object
     * Parses the element attribute and creates a SetItem object
     *
     * @param element - HTMLElement
     * @param index - Index of the element within the list of sets
     * @returns SetItem | undefined
     */
    createItemData(element, index) {
      if (!(element instanceof HTMLElement)) return;
      const attrValue = element.getAttribute(`${ATTR}-element`);
      if (!attrValue) return;
      const parsed = parseElementAttribute(attrValue);
      if (parsed.type !== this.itemType) return;
      const titleData = extractTitle(element, this.itemType, parsed.id, index);
      const parentHierarchy = this.findParentHierarchy(element);
      const active = this.determineActive(element, index);
      return {
        element,
        index,
        id: titleData.id,
        visible: true,
        active,
        parentHierarchy,
        current: active && index === 0,
        visited: active,
        completed: false,
        type: this.itemType,
        title: titleData.title,
        progress: 0,
        isIncluded: true,
        isValid: false
      };
    }
    /**
     * Calculate set-specific states
     * Aggregates data from all sets and their child groups and fields
     *
     * @returns FormSetState - Complete set state object
     */
    calculateStates() {
      const currentSet = this.getCurrent();
      const currentSetIndex = currentSet ? currentSet.index : -1;
      const currentSetId = currentSet ? currentSet.id : null;
      const currentSetTitle = currentSet ? currentSet.title : null;
      const previousSetIndex = currentSetIndex > 0 ? currentSetIndex - 1 : null;
      const nextSetIndex = currentSetIndex < this.length - 1 ? currentSetIndex + 1 : null;
      const completedSets = new Set(
        this.getByFilter((item) => item.completed).map((item) => item.id)
      );
      const visitedSets = new Set(this.getByFilter((item) => item.visited).map((item) => item.id));
      const totalSets = this.length;
      const setsComplete = completedSets.size;
      const setValidity = this.getAll().reduce(
        (acc, item) => {
          acc[item.id] = item.isValid;
          return acc;
        },
        {}
      );
      return {
        currentSetIndex,
        currentSetId,
        currentSetTitle,
        activeSetIndices: this.getActiveIndices(),
        previousSetIndex,
        nextSetIndex,
        completedSets,
        visitedSets,
        totalSets,
        setsComplete,
        setValidity
      };
    }
    buildItemData(item) {
      const groups = this.form.groupManager.getAllByParentId(item.id, "set");
      const fields = this.form.fieldManager.getAllByParentId(item.id, "set").filter((field) => field.isIncluded);
      const use = groups.length > 0 ? groups : fields;
      const completed = use.every((item2) => item2.completed);
      const isValid = use.every((item2) => item2.isValid);
      const progress = use.filter((item2) => item2.completed).length / use.length * 100;
      const isIncluded = this.form.conditionManager.evaluateElementCondition(item.element);
      return {
        ...item,
        completed,
        isValid,
        progress,
        isIncluded
      };
    }
    /**
     * Find the parent item for a set
     *
     * @param element - The set element
     * @returns Parent data or null
     */
    findParentItem(element) {
      return HierarchyBuilder.findParentByElement(
        element,
        "card",
        () => this.form.cardManager.getAll()
      );
    }
  };

  // src/form/index.ts
  var FlowupsForm = class extends StatefulComponent {
    config;
    cardManager;
    setManager;
    groupManager;
    fieldManager;
    inputManager;
    buttonManager;
    navigationManager;
    displayManager;
    progressManager;
    focusManager;
    conditionManager;
    // private accessibilityManager: AccessibilityManager;
    // private animationManager: AnimationManager;
    // private errorManager: ErrorManager;
    // private renderManager: RenderManager;
    // private validationManager: ValidationManager;
    /**
     * Create a new MultiStepForm instance
     * @param props - Props for the MultiStepForm component
     */
    constructor(props) {
      super(props);
      this.setRootElement(props.selector);
      this.config = this.parseConfiguration();
      this.cardManager = new CardManager(this);
      this.setManager = new SetManager(this);
      this.groupManager = new GroupManager(this);
      this.fieldManager = new FieldManager(this);
      this.inputManager = new InputManager(this);
      this.buttonManager = new ButtonManager(this);
      this.navigationManager = new NavigationManager(this);
      this.displayManager = new DisplayManager(this);
      this.progressManager = new ProgressManager(this);
      this.focusManager = new FocusManager(this);
      this.conditionManager = new ConditionManager(this);
      if (this.config.autoInit && !this.isInitialized()) this.init();
    }
    /**
     * Parse configuration from ${ATTR}* attributes
     * Attributes override config object
     */
    parseConfiguration() {
      const attrs = getConfigAttributes(this.rootElement);
      if (!attrs.name) {
        throw this.createError(`Invalid configuration: No name is provided for form`, "init", {
          cause: {
            element: this.rootElement,
            name: attrs.name
          }
        });
      }
      if (attrs.behavior && !isValidBehaviorType(attrs.behavior)) {
        throw this.createError(
          `Invalid configuration: Behavior must be 'byField', 'bySet', 'byGroup', or 'byCard'`,
          "init",
          {
            cause: {
              behavior: attrs.behavior
            }
          }
        );
      }
      if (attrs.transition && !isValidTransitionType(attrs.transition)) {
        throw this.createError(
          `Invalid configuration: Transition must be "fade", "slide", or "none"`,
          "init",
          {
            cause: {
              transition: attrs.transition
            }
          }
        );
      }
      if (attrs.transitionduration && isNaN(parseFloat(attrs.transitionduration))) {
        throw this.createError(
          `Invalid configuration: Transition duration must be a number`,
          "init",
          {
            cause: {
              transitionDuration: attrs.transitionduration
            }
          }
        );
      }
      if (attrs.allowinvalid && !["true", "false", ""].includes(attrs.allowinvalid)) {
        throw this.createError(
          `Invalid configuration: Allow invalid must be 'true' or 'false'`,
          "init",
          {
            cause: {
              allowInvalid: attrs.allowinvalid
            }
          }
        );
      }
      if (attrs.errordisplay && !isValidErrorModeType(attrs.errordisplay)) {
        throw this.createError(`Invalid configuration: Error display mode must be 'native'`, "init", {
          cause: { errordisplay: attrs.errordisplay }
        });
      }
      if (attrs.ariaannounce && !["true", "false", ""].includes(attrs.ariaannounce)) {
        throw this.createError(
          `Invalid configuration: Aria announce must be 'true' or 'false'`,
          "init",
          {
            cause: {
              ariaAnnounce: attrs.ariaannounce
            }
          }
        );
      }
      if (attrs.focusonchange && !["true", "false", ""].includes(attrs.focusonchange)) {
        throw this.createError(
          `Invalid configuration: Focus on change must be 'true' or 'false'`,
          "init",
          {
            cause: {
              focusOnChange: attrs.focusonchange
            }
          }
        );
      }
      if (attrs.autoinit && !["true", "false", ""].includes(attrs.autoinit)) {
        throw this.createError(`Invalid configuration: Auto init must be 'true' or 'false'`, "init", {
          cause: { autoInit: attrs.autoinit }
        });
      }
      if (attrs.persist && !isValidStorageType(attrs.persist)) {
        throw this.createError(`Invalid configuration: Persist must be 'memory'`, "init", {
          cause: { persist: attrs.persist }
        });
      }
      return {
        name: attrs.name || "untitled-form",
        behavior: attrs.behavior || "byField",
        transition: attrs.transition || "none",
        transitionDuration: parseNumberAttribute(attrs.transitionduration, 300),
        validateOn: attrs.validateon || "blur",
        allowInvalid: parseBooleanAttribute(attrs.allowinvalid, false),
        errorDisplay: attrs.errordisplay || "native",
        ariaAnnounce: parseBooleanAttribute(attrs.ariaannounce, true),
        focusOnChange: parseBooleanAttribute(attrs.focusonchange, true),
        autoInit: parseBooleanAttribute(attrs.autoinit, false),
        persist: attrs.persist || "memory",
        debug: parseBooleanAttribute(attrs.debug, false)
      };
    }
    // ============================================
    // Event Listeners
    // ============================================
    /**
     * Set up event listeners
     * Required by InteractiveComponent
     */
    async setupEventListeners() {
    }
    /**
     * Initialize the form
     * Called by StatefulComponent lifecycle
     */
    async onInit() {
      await super.onInit();
      this.groupStart(`[FLOWUPS-DEBUG] Form: Initializing "${this.getId()}"`, false);
      this.logDebug(`Started at ${(/* @__PURE__ */ new Date()).toISOString()}`);
      this.timeDebug("form:init");
      this.conditionManager.init();
      this.cardManager.init();
      this.setManager.init();
      this.groupManager.init();
      this.fieldManager.init();
      this.inputManager.init();
      this.buttonManager.init();
      this.displayManager.init();
      this.navigationManager.init();
      this.progressManager.init();
      this.focusManager.init();
      this.logDebug(`Form initialized`, {
        state: this.getAllState(),
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
      this.timeDebug("form:init", true);
      this.groupEnd();
    }
    /**
     * Cleanup on destroy
     * Called by StatefulComponent lifecycle
     */
    async onDestroy() {
      this.logDebug(`Destroying form`);
      this.cardManager.destroy();
      this.setManager.destroy();
      this.groupManager.destroy();
      this.fieldManager.destroy();
      this.inputManager.destroy();
      this.navigationManager.destroy();
      this.displayManager.destroy();
      this.buttonManager.destroy();
      this.progressManager.destroy();
      this.focusManager.destroy();
      this.conditionManager.destroy();
      await super.onDestroy();
    }
    /**
     * Handle state changes
     * Called by StatefulComponent when state changes
     */
    handleStateChange(key, from, to) {
      switch (key) {
        case "currentCardIndex":
          return this.emit("form:navigation:changed", { target: "card" });
        case "currentSetIndex":
          return this.emit("form:navigation:changed", { target: "set" });
        case "currentGroupIndex":
          return this.emit("form:navigation:changed", { target: "group" });
        case "currentFieldIndex":
          return this.emit("form:navigation:changed", { target: "field" });
        case "activeFieldIndices":
          return this.emit("form:navigation:changed", { target: "field" });
        default:
          return;
      }
    }
    /**
     * Get form name
     */
    getFormName() {
      return this.config.name;
    }
    /**
     * Get current behavior
     */
    getBehavior() {
      return this.config.behavior;
    }
    /**
     * Get configuration
     */
    getFormConfig() {
      return Object.freeze({ ...this.config });
    }
    /**
     * Get state value
     */
    getState(key) {
      return super.getState(key);
    }
  };

  // src/index.ts
  window.Webflow ||= [];
  window.Webflow.push(() => {
    const form = document.querySelector(`form[${ATTR}-element="form"]`);
    if (!form || !(form instanceof HTMLFormElement)) return;
    const name = form.getAttribute("name") ?? "untitled-form";
    new FlowupsForm({
      group: "FORM",
      id: name,
      debug: true,
      autoInit: false,
      selector: form
    });
  });
})();
//# sourceMappingURL=index.js.map
