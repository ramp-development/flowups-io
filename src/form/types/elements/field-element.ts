import type { BaseElement } from './base-element';

/**
 * Field Element
 * Wrapper for label, input, error, hint
 */
export interface FieldElement extends BaseElement {
  /** Type identifier */
  type: 'field';

  /** Parent group ID (if in a group) */
  groupId: string | null;

  /** Parent set ID */
  setId: string;

  /** Parent card ID */
  cardId: string;

  /** Whether this field is visible (for conditional visibility) */
  isVisible: boolean;

  /** Validation error messages */
  errors: string[];
}
