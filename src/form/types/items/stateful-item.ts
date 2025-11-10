import type { BaseItem } from '.';

/**
 * Base item interface shared by all hierarchy items
 */
export interface StatefulItem extends BaseItem {
  /** Whether this element is the current focused/primary element (only one can be current at a time) */
  current: boolean;

  /** Whether this element has been visited */
  visited: boolean;

  /** Whether this element is completed */
  completed: boolean;
}
