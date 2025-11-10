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

  /** Element type @override */
  type: FormElementType;

  /** Parent hierarchy @override */
  parentHierarchy: CardParentHierarchy;
}
