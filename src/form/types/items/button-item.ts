import type { BaseItem } from './base-item';
import type { CardItem, CardParentHierarchy } from './card-item';
import type { GroupParentHierarchy } from './group-item';
import type { SetItem, SetParentHierarchy } from './set-item';

export type ButtonContext = 'form' | 'card' | 'set';
export type ButtonParentElement = CardItem | SetItem;

export type ButtonParentHierarchy = CardParentHierarchy | SetParentHierarchy | GroupParentHierarchy;

/** Button type */
export type ButtonType = 'prev' | 'next' | 'submit';

/**
 * Navigation Button Item
 * @extends BaseItem
 */
export interface ButtonItem extends BaseItem {
  /** Button type */
  type: ButtonType;

  /** Parent hierarchy */
  parentHierarchy: ButtonParentHierarchy;

  /** The button DOM element */
  button: HTMLButtonElement;

  /** Whether button is currently disabled */
  disabled: boolean;

  /** Whether button is visible */
  visible: boolean;
}
