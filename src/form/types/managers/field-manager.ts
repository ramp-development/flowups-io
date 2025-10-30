import type { BaseManager } from './base-manager';

/**
 * Field Manager Interface
 * Handles field discovery and field-by-field navigation
 */
export interface FieldManager extends BaseManager {
  /** Discover all fields in the form */
  discoverFields(): void;

  /** Build field navigation order */
  buildNavigationOrder(): void;

  /** Navigate to next field */
  nextField(): Promise<void>;

  /** Navigate to previous field */
  prevField(): Promise<void>;

  /** Navigate to specific field by index */
  goToField(index: number): Promise<void>;

  /** Get total number of fields */
  getTotalFields(): number;

  /** Get field by index */
  getFieldByIndex(index: number): HTMLElement | null;

  /** Get current field */
  getCurrentField(): HTMLElement | null;

  /** Get next visible field index (skips hidden fields) */
  getNextVisibleFieldIndex(): number | null;

  /** Get previous visible field index (skips hidden fields) */
  getPrevVisibleFieldIndex(): number | null;

  /** Check if on first field */
  isFirstField(): boolean;

  /** Check if on last field */
  isLastField(): boolean;
}
