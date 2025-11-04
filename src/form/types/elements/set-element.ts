import type { BaseElement } from './base-element';

/**
 * Set Element
 * Semantic grouping of related fields (uses <fieldset>)
 */
export interface SetElement extends BaseElement {
  /** Type identifier */
  type: 'set';

  /** Progress of the set (0-100) */
  progress: number;

  /** Parent card ID */
  cardId: string | null;

  /** Parent card index */
  cardIndex: number | null;

  /** Whether this set is valid */
  isValid: boolean;
}
