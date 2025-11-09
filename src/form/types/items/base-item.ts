import type { CardParentHierarchy, FormElementType } from '.';

/**
 * Base item interface shared by all hierarchy items
 */
export interface BaseItem {
  /** The DOM element */
  element: HTMLElement;

  /** Index in parent collection (0-based) */
  index: number;

  /** Unique identifier (parsed or generated) */
  id: string;

  /** Whether this element is currently active/visible */
  active: boolean;

  /** Whether this element is the current focused/primary element (only one can be current at a time) */
  current: boolean;

  /** Whether this element has been visited */
  visited: boolean;

  /** Whether this element is completed */
  completed: boolean;

  /** Element type @override */
  type: FormElementType;

  /** Parent hierarchy @override */
  parentHierarchy: CardParentHierarchy;
}
