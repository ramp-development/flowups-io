import type { BaseManager } from './base-manager';

/**
 * Validation Manager Interface
 * Handles HTML5 validation and field/set validation
 */
export interface ValidationManager extends BaseManager {
  /** Validate current field */
  validateCurrentField(): Promise<boolean>;

  /** Validate specific field by name */
  validateField(fieldName: string): Promise<boolean>;

  /** Validate entire set */
  validateSet(setId: string): Promise<boolean>;

  /** Check if field is valid */
  isFieldValid(fieldName: string): boolean;

  /** Get field errors */
  getFieldErrors(fieldName: string): string[];

  /** Clear field errors */
  clearFieldErrors(fieldName: string): void;
}
