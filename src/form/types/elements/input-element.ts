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

  /** Input name attribute (for formData) */
  name: string;

  /**
   * Whether this is a group input (radio/checkbox group)
   * True if elements.length > 1
   */
  isGroup: boolean;

  /**
   * Original required state from HTML (never changes)
   * Stored during discovery to preserve the developer's intent
   */
  isRequiredOriginal: boolean;

  /**
   * Current required state (may differ from original)
   * Updated dynamically based on parent field's isIncluded state
   * - When field.isIncluded = false: isRequired = false (remove DOM required attribute)
   * - When field.isIncluded = true: isRequired = isRequiredOriginal (restore original state)
   */
  isRequired: boolean;

  /** Whether this input is valid */
  isValid: boolean;

  /**
   * Whether this input is included in the form flow
   * Synced from parent field's isIncluded state
   */
  isIncluded: boolean;

  /** Validation error messages */
  errors: string[];
}
