import type { BaseElement } from './base-element';
import type { FieldElement } from './field-element';

/**
 * Group Element
 * Logical subgroup within a set (optional, uses <fieldset>)
 */
export interface GroupElement extends BaseElement {
  /** Type identifier */
  type: 'group';

  /** Progress of the group (0-100) */
  progress: number;

  /** Parent set ID */
  setId: string;

  /** Parent set index */
  setIndex: number;

  /** Parent card ID */
  cardId: string;

  /** Fields contained within this group */
  fields: FieldElement[];
}
