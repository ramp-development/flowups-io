import type { BaseElement } from './base-element';

/**
 * Input Element
 * Represents a form input (text, select, textarea, radio group, checkbox group)
 *
 * Note: For radio/checkbox groups, the `inputElements` array contains all inputs
 * with the same name attribute. This allows proper value extraction and event binding.
 * The `element` property (from BaseElement) points to the first input element.
 */
export interface InputElement extends Omit<BaseElement, 'element'> {
  /**
   * The primary input element (reference to inputElements[0])
   * Convenience property for quick access to the first/only element
   */
  element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

  /**
   * All input elements for this input (always use this for iteration)
   * - Single input: [input] (length 1)
   * - Single select: [select] (length 1)
   * - Single textarea: [textarea] (length 1)
   * - Radio group: [radio1, radio2, radio3] (length > 1)
   * - Checkbox group: [cb1, cb2, cb3] (length > 1)
   */
  inputElements: (HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement)[];

  /** Type identifier */
  type: 'input';

  /**
   * Input type (from the first element's type attribute)
   * For radio/checkbox groups, this is 'radio' or 'checkbox'
   */
  inputType: string;

  /** Parent field ID */
  fieldId: string;

  /** Parent group ID (if in a group) */
  groupId: string | null;

  /** Parent set ID */
  setId: string;

  /** Parent card ID */
  cardId: string;

  /** Input name attribute (for formData) */
  name: string;

  /**
   * Whether this is a group input (radio/checkbox group)
   * True if elements.length > 1
   */
  isGroup: boolean;

  /** Whether this input is required */
  isRequired: boolean;

  /** Whether this input is valid */
  isValid: boolean;

  /** Whether this input is visible (for conditional visibility) */
  isVisible: boolean;

  /** Validation error messages */
  errors: string[];
}
