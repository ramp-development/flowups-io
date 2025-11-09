import type { BaseItem } from './base-item';
import type { CardParentHierarchy } from './card-item';

export interface SetParentHierarchy extends CardParentHierarchy {
  cardId: string | null;
  cardIndex: number | null;
}

/**
 * Set Item
 * Semantic grouping of related fields (uses <fieldset>)
 * @extends BaseItem
 */
export interface SetItem extends BaseItem {
  /** Type identifier */
  type: 'set';

  /** Parent hierarchy */
  parentHierarchy: SetParentHierarchy;

  /** Display title (from attribute or <legend>) */
  title: string;

  /** Progress of the set (0-100) */
  progress: number;

  /** Whether this set is included in the navigation order (conditional visibility) */
  isIncluded: boolean;

  /** Whether this set is valid */
  isValid: boolean;
}
