/**
 * State-related type definitions
 */
export interface StateConfig {
  persistent?: boolean;
  storage?: 'local' | 'session';
  defaultValue?: unknown;
}

export interface StateEntry<T = unknown> {
  value: T;
  config?: StateConfig;
  lastModified: number;
}
