/**
 * Element Type Definitions
 *
 * Interfaces for the form element hierarchy:
 * Form → Card → Set → Group → Field
 */

/**
 * Base element interface shared by all hierarchy elements
 */
export interface BaseElement {
  /** The DOM element */
  element: HTMLElement;

  /** Unique identifier (parsed or generated) */
  id: string;

  /** Display title (from attribute or <legend>) */
  title: string;

  /** Index in parent collection (0-based) */
  index: number;

  /** Whether this element has been visited */
  visited: boolean;

  /** Whether this element is completed */
  completed: boolean;

  /** Whether this element is currently active/visible */
  active: boolean;
}

/**
 * Card Element
 * Large UI sections (intro, form, success)
 */
export interface CardElement extends BaseElement {
  /** Type identifier */
  type: 'card';

  /** Sets contained within this card */
  sets: SetElement[];
}

/**
 * Set Element
 * Semantic grouping of related fields (uses <fieldset>)
 */
export interface SetElement extends BaseElement {
  /** Type identifier */
  type: 'set';

  /** Parent card ID */
  cardId: string;

  /** Parent card index */
  cardIndex: number;

  /** Groups contained within this set (optional) */
  groups: GroupElement[];

  /** Fields contained directly in this set (if no groups) */
  fields: FieldElement[];

  /** Whether this set is valid */
  isValid: boolean;
}

/**
 * Group Element
 * Logical subgroup within a set (optional, uses <fieldset>)
 */
export interface GroupElement extends BaseElement {
  /** Type identifier */
  type: 'group';

  /** Parent set ID */
  setId: string;

  /** Parent set index */
  setIndex: number;

  /** Parent card ID */
  cardId: string;

  /** Fields contained within this group */
  fields: FieldElement[];
}

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

/**
 * Navigation Button Element
 */
export interface ButtonElement {
  /** The button DOM element */
  element: HTMLButtonElement;

  /** Button type */
  type: 'prev' | 'next' | 'submit';

  /** Whether button is currently enabled */
  enabled: boolean;
}

/**
 * Error Container Element
 */
export interface ErrorElement {
  /** The error container DOM element */
  element: HTMLElement;

  /** Field name this error is for */
  fieldName: string;

  /** Whether error is currently visible */
  visible: boolean;
}

/**
 * Form Element Hierarchy
 * Complete representation of the form structure
 */
export interface FormHierarchy {
  /** The form element */
  form: HTMLFormElement;

  /** Form name (from name attribute) */
  formName: string;

  /** All cards in order */
  cards: CardElement[];

  /** All sets in order (flattened) */
  sets: SetElement[];

  /** All groups in order (flattened) */
  groups: GroupElement[];

  /** All fields in order (flattened) */
  fields: FieldElement[];

  /** Navigation buttons */
  buttons: {
    prev: ButtonElement[];
    next: ButtonElement[];
    submit: ButtonElement[];
  };

  /** Error containers */
  errors: ErrorElement[];
}
