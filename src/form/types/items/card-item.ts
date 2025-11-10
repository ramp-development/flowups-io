import type { RollupItem } from './rollup-item';

export interface CardParentHierarchy {
  formId: string;
}

/**
 * Card Item
 * Large UI sections (intro, form, success, etc.)
 * @extends BaseItem
 */
export interface CardItem extends RollupItem {
  /** Type identifier */
  type: 'card';

  /** Display title (from attribute or <legend>) */
  title: string;

  /** Progress of the card (0-100) */
  progress: number;

  /** Whether this card is included in the navigation order (conditional visibility) */
  isIncluded: boolean;

  /** Whether this card is valid */
  isValid: boolean;
}
