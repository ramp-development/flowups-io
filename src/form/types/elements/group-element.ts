import type { BaseElement } from './base-element';

/**
 * Group Element
 * Logical subgroup within a set (optional, uses <fieldset>)
 */
export interface GroupElement extends BaseElement {
  /** Type identifier */
  type: 'group';

  /** Progress of the group (0-100) */
  progress: number;

  /** Validity of the group */
  isValid: boolean;

  /** Parent set ID */
  setId: string;

  /** Parent set index */
  setIndex: number;
}
