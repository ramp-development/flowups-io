import type { BaseItem } from './base-item';
import type { FieldParentHierarchy } from './field-item';

export interface InputParentHierarchy extends FieldParentHierarchy {
  fieldId: string;
  fieldIndex: number;
}

export type InputElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

/**
 * Input Item
 * Represents a form input (text, select, textarea, radio group, checkbox group)
 *
 * Note: For radio/checkbox groups, the `inputs` array contains all inputs
 * with the same name attribute. This allows proper value extraction and event binding.
 * The `element` property (from BaseItem) points to the first input.
 * @extends BaseItem
 */
export interface InputItem extends BaseItem {
  /** The primary input element */
  element: InputElement;

  /** All input elements (accounts for radio/checkbox groups) */
  inputs: InputElement[];

  /** Input type (from the first element's type attribute, e.g. 'text', 'select', 'textarea', 'radio', 'checkbox') */
  inputType: string;

  /** Value of the input (string, number, boolean, etc.) */
  value: unknown;

  /** Parent hierarchy */
  parentHierarchy: InputParentHierarchy;

  /** Input name attribute (for formData) */
  name: string;

  /** Whether this is a group input (radio/checkbox group) */
  isGroup: boolean;

  /** Original required state from HTML (never changes) */
  isRequiredOriginal: boolean;

  /** Current required state (updated dynamically based on parent field's isIncluded state) */
  isRequired: boolean;

  /** Whether this input is included in the form flow (synced from parent field's isIncluded state) */
  isIncluded: boolean;

  /** Whether this input is valid (true if all validation rules pass) */
  isValid: boolean;
}
