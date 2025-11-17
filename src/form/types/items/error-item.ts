import type { BaseItem } from './base-item';
import type { CardItem, CardParentHierarchy } from './card-item';
import type { GroupItem, GroupParentHierarchy } from './group-item';
import type { SetItem, SetParentHierarchy } from './set-item';

export type ErrorParentElement = CardItem | SetItem | GroupItem;

export type ErrorParentHierarchy = CardParentHierarchy | SetParentHierarchy | GroupParentHierarchy;

/**
 * Error Item
 * @extends BaseItem
 */
export interface ErrorItem extends BaseItem {
  /** Type identifier */
  type: 'error';

  /** Parent hierarchy */
  parentHierarchy: ErrorParentHierarchy;
}
