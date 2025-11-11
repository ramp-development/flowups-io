import type { SetParentHierarchy } from './set-item';
import type { NavigableItem } from './navigable-item';

export interface GroupParentHierarchy extends SetParentHierarchy {
  setId: string;
  setIndex: number;
}

/**
 * Group Item
 * Logical subgroup within a set (optional, uses <fieldset>)
 * @extends BaseItem
 */
export interface GroupItem extends NavigableItem {
  /** Type identifier */
  type: 'group';

  /** Parent hierarchy */
  parentHierarchy: GroupParentHierarchy;

  /** Display title (from attribute or <legend>) */
  title: string;

  /** Progress of the group (0-100) */
  progress: number;

  /** Whether this group is included in the navigation order (conditional visibility) */
  isIncluded: boolean;

  /** Validity of the group */
  isValid: boolean;
}
