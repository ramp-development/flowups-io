import type { BaseElement } from './base-element';

export interface SetParentHierarchy {
  cardId: string | null;
  cardIndex: number | null;
}

/**
 * Set Element
 * Semantic grouping of related fields (uses <fieldset>)
 */
export interface SetElement extends BaseElement {
  /** Type identifier */
  type: 'set';

  /** Progress of the set (0-100) */
  progress: number;

  /** Parent hierarchy */
  parentHierarchy: SetParentHierarchy;

  /** Whether this set is valid */
  isValid: boolean;
}
