import type { ComponentError } from '$lib/types';

import type { FlowupsForm } from '..';
import type { IBaseManager } from '../types';

export abstract class BaseManager implements IBaseManager {
  public readonly form: FlowupsForm;

  constructor(form: FlowupsForm) {
    this.form = form;
  }

  abstract init(): void;

  abstract destroy(): void;

  /**
   * Debug logging (only in debug mode)
   */
  logDebug(...args: unknown[]): void {
    this.form.logDebug(...args);
  }

  /**
   * Warning logging
   */
  logWarn(...args: unknown[]): void {
    this.form.logWarn(...args);
  }

  /**
   * Error logging
   */
  logError(...args: unknown[]): void {
    this.form.logError(...args);
  }

  /**
   * Create error
   */
  createError(
    message: string,
    phase: 'init' | 'runtime' | 'destroy' = 'runtime',
    cause?: unknown
  ): ComponentError {
    return this.form.createError(message, phase, cause);
  }
}
