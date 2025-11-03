import type { IBaseManager } from './base-manager';

/**
 * Error Manager Interface
 * Handles browser native error display
 */
export interface IErrorManager extends IBaseManager {
  /** Display native browser error */
  showNativeError(fieldName: string, message: string): void;

  /** Clear native browser error */
  clearNativeError(fieldName: string): void;

  /** Clear all errors */
  clearAllErrors(): void;
}
