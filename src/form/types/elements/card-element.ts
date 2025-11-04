import type { BaseElement } from './base-element';

/**
 * Card Element
 * Large UI sections (intro, form, success)
 */
export interface CardElement extends BaseElement {
  /** Type identifier */
  type: 'card';

  /** Progress of the card (0-100) */
  progress: number;

  /** Whether this set is valid */
  isValid: boolean;
}
