import type { BaseElement } from './base-element';

export interface CardParentHierarchy {
  formId: string;
}

/**
 * Card Element
 * Large UI sections (intro, form, success)
 */
export interface CardElement extends BaseElement {
  /** Type identifier */
  type: 'card';

  /** Progress of the card (0-100) */
  progress: number;

  /** Parent hierarchy */
  parentHierarchy: CardParentHierarchy;

  /** Whether this card is included in the navigation order (conditional visibility) */
  isIncluded: boolean;

  /** Whether this card is valid */
  isValid: boolean;
}
