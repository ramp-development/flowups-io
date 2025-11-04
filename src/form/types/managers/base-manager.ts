import type { FlowupsForm } from 'src/form';

import type { ComponentError } from '$lib/types';

/**
 * Base Manager Interface
 * All managers extend this base interface
 */
export interface IBaseManager {
  /** Reference to parent form component */
  form: FlowupsForm;

  /** Initialize the manager */
  init(): void;

  /** Cleanup and remove event listeners */
  destroy(): void;

  /** Debug logging */
  logDebug(...args: unknown[]): void;

  /** Warning logging */
  logWarn(...args: unknown[]): void;

  /** Error logging */
  logError(...args: unknown[]): void;

  /** Create error */
  createError(
    message: string,
    phase: 'init' | 'runtime' | 'destroy',
    cause?: unknown
  ): ComponentError;
}
