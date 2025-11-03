import type { FieldElement } from '../elements';
import type { IBaseManager } from './base-manager';

/**
 * Field Manager Interface
 * Handles field discovery and field-by-field navigation
 *
 * Note: Navigation methods (nextField, prevField, goToField) are internal APIs
 * intended to be called by NavigationManager only. NavigationManager provides
 * the unified navigation interface that routes to the appropriate manager
 * based on form behavior (byField, bySet, byGroup, byCard).
 */
export interface IFieldManager extends IBaseManager {
  /** Discover all fields in the form */
  discoverFields(): void;

  /** Build field navigation order */
  buildNavigationOrder(): void;

  // ============================================
  // Internal Navigation API (for NavigationManager)
  // ============================================

  /** Navigate to next field (internal - use NavigationManager.next() instead) */
  nextField(): Promise<void>;

  /** Navigate to previous field (internal - use NavigationManager.prev() instead) */
  prevField(): Promise<void>;

  /** Navigate to specific field by index (internal - use NavigationManager.goTo() instead) */
  goToField(index: number): Promise<void>;

  /** Get total number of fields */
  getTotalFields(): number;

  /** Get field by index */
  getFieldByIndex(index: number): FieldElement | null;

  /** Get current field */
  getCurrentField(): FieldElement | null;

  /** Get next visible field index (skips hidden fields) */
  getNextVisibleFieldIndex(): number | null;

  /** Get previous visible field index (skips hidden fields) */
  getPrevVisibleFieldIndex(): number | null;

  /** Check if on first field */
  isFirstField(): boolean;

  /** Check if on last field */
  isLastField(): boolean;
}
