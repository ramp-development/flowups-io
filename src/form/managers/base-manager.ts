import type { ComponentError } from '$lib/types';

import type { FlowupsForm } from '..';

export abstract class BaseManager {
  public readonly form: FlowupsForm;

  constructor(form: FlowupsForm) {
    this.form = form;
  }

  abstract init(): void;

  abstract destroy(): void;

  /** Start console group (only in debug mode) */
  protected groupStart(name: string, collapsed = true): void {
    this.form.groupStart(name, collapsed);
  }

  /** End console group (only in debug mode) */
  protected groupEnd(): void {
    this.form.groupEnd();
  }

  /** Debug logging (only in debug mode) */
  protected logDebug(...args: unknown[]): void {
    this.form.logDebug(...args);
  }

  /** Warning logging */
  protected logWarn(...args: unknown[]): void {
    this.form.logWarn(...args);
  }

  /** Error logging */
  protected logError(...args: unknown[]): void {
    this.form.logError(...args);
  }

  /** Table logging */
  protected logTable(data: unknown[], columns?: string[]): void {
    this.form.logTable(data, columns);
  }

  /** Create error */
  protected createError(
    message: string,
    phase: 'init' | 'runtime' | 'destroy' = 'runtime',
    cause?: unknown
  ): ComponentError {
    return this.form.createError(message, phase, cause);
  }
}
