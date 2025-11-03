import type { IBaseManager } from './base-manager';

/**
 * Accessibility Manager Interface
 * Handles ARIA attributes, announcements, and focus management
 */
export interface IAccessibilityManager extends IBaseManager {
  /** Setup ARIA attributes for all elements */
  setupAriaAttributes(): void;

  /** Announce field change to screen readers */
  announceFieldChange(fieldTitle: string, fieldIndex: number): void;

  /** Focus on current field's first input */
  focusCurrentField(): void;

  /** Update tabindex for all fields (only current field tabbable) */
  updateTabindex(): void;

  /** Announce error to screen readers */
  announceError(message: string): void;
}
