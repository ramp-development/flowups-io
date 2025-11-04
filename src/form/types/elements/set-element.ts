import type { BaseElement } from './base-element';
import type { FieldElement } from './field-element';
import type { GroupElement } from './group-element';

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
