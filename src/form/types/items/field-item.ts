import type { BaseItem } from './base-item';
import type { GroupParentHierarchy } from './group-item';

export interface FieldParentHierarchy extends GroupParentHierarchy {
  groupId: string | null;
  groupIndex: number | null;
}

/**
 * Field Item
 * Wrapper for label, input, error, hint
 * @extends BaseItem
 */
export interface FieldItem extends BaseItem {
  /** Type identifier */
  type: 'field';

  /** Parent hierarchy */
  parentHierarchy: FieldParentHierarchy;

  /** Whether this field is included in the navigation order (conditional visibility) */
  isIncluded: boolean;

  /** Whether this field is valid */
  isValid: boolean;
}
