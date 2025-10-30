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

  /** The input element within this field */
  input: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;

  /** Input name attribute (for formData) */
  inputName: string;

  /** Whether this field is required */
  isRequired: boolean;

  /** Whether this field is valid */
  isValid: boolean;

  /** Whether this field is visible (for conditional visibility) */
  isVisible: boolean;

  /** Validation error messages */
  errors: string[];
}
