import type { ButtonElement } from './button-element';
import type { CardElement } from './card-element';
import type { ErrorElement } from './error-element';
import type { FieldElement } from './field-element';
import type { GroupElement } from './group-element';
import type { SetElement } from './set-element';

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
