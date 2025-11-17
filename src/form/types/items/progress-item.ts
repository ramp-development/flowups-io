import type { BaseItem } from './base-item';
import type { CardItem, CardParentHierarchy } from './card-item';
import type { GroupItem, GroupParentHierarchy } from './group-item';
import type { SetItem, SetParentHierarchy } from './set-item';

export type ProgressParentElement = CardItem | SetItem | GroupItem;

export type ProgressParentHierarchy =
  | CardParentHierarchy
  | SetParentHierarchy
  | GroupParentHierarchy;

/**
 * Progress Item
 * @extends BaseItem
 */
export interface ProgressItem extends BaseItem {
  /** Type identifier */
  type: 'progress-line';

  /** Parent hierarchy */
  parentHierarchy: ProgressParentHierarchy;
}
