/**
 * Storage key constants for persistence
 * Prefixed with app namespace to avoid conflicts
 */

export const STORAGE_KEYS = {
  // Application prefix
  APP_PREFIX: 'toolkit',

  // User preferences
  USER_PREFERENCES: 'toolkit:user:preferences',
  USER_THEME: 'toolkit:user:theme',
  USER_LOCALE: 'toolkit:user:locale',

  // Session data
  SESSION_DATA: 'toolkit:session:data',
  SESSION_ID: 'toolkit:session:id',
  SESSION_TIMESTAMP: 'toolkit:session:timestamp',
  SESSION_ACTIVITY: 'toolkit:session:activity',

  // Form data
  FORM_DRAFTS: 'toolkit:form:drafts',
  FORM_HISTORY: 'toolkit:form:history',

  // UI state
  UI_STATE: 'toolkit:ui:state',
  UI_COLLAPSED_SECTIONS: 'toolkit:ui:collapsed',
  UI_TAB_POSITIONS: 'toolkit:ui:tabs',
  UI_MODAL_STATE: 'toolkit:ui:modal',

  // Navigation state
  NAV_CURRENT_STEP: 'toolkit:nav:step',
  NAV_COMPLETED_STEPS: 'toolkit:nav:completed',
  NAV_HISTORY: 'toolkit:nav:history',

  // Validation cache
  VALIDATION_CACHE: 'toolkit:validation:cache',
  VALIDATION_RULES: 'toolkit:validation:rules',

  // Analytics
  ANALYTICS_QUEUE: 'toolkit:analytics:queue',
  ANALYTICS_USER_ID: 'toolkit:analytics:userId',
  ANALYTICS_SESSION_ID: 'toolkit:analytics:sessionId',

  // Error tracking
  ERROR_LOG: 'toolkit:error:log',
  ERROR_CONTEXT: 'toolkit:error:context',

  // Feature flags
  FEATURE_FLAGS: 'toolkit:features:flags',
  FEATURE_OVERRIDES: 'toolkit:features:overrides',

  // Cache
  CACHE_PREFIX: 'toolkit:cache',
  CACHE_METADATA: 'toolkit:cache:metadata',

  // Version and migration
  SCHEMA_VERSION: 'toolkit:schema:version',
  MIGRATION_HISTORY: 'toolkit:migration:history',

  // Debug
  DEBUG_ENABLED: 'toolkit:debug:enabled',
  DEBUG_LOG: 'toolkit:debug:log',
} as const;

// Storage configuration
export const STORAGE_CONFIG = {
  // TTL values in milliseconds
  TTL: {
    SESSION: 30 * 60 * 1000, // 30 minutes
    CACHE: 5 * 60 * 1000, // 5 minutes
    FORM_DRAFT: 24 * 60 * 60 * 1000, // 24 hours
    ERROR_LOG: 7 * 24 * 60 * 60 * 1000, // 7 days
  },

  // Size limits
  LIMITS: {
    MAX_LOG_ENTRIES: 1000,
    MAX_ERROR_ENTRIES: 100,
    MAX_CACHE_SIZE: 50 * 1024 * 1024, // 50MB
    MAX_FORM_DRAFTS: 10,
  },

  // Cleanup intervals
  CLEANUP: {
    INTERVAL: 60 * 60 * 1000, // 1 hour
    BATCH_SIZE: 100,
  },
} as const;

// Type exports
export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
export type StorageTTL = (typeof STORAGE_CONFIG.TTL)[keyof typeof STORAGE_CONFIG.TTL];
