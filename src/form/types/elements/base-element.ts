import type { FormElementType } from '.';

/**
 * Base element interface shared by all hierarchy elements
 */
export interface BaseElement {
  /** The DOM element */
  element: HTMLElement;

  /** Element type */
  type: FormElementType;

  /** Unique identifier (parsed or generated) */
  id: string;

  /** Display title (from attribute or <legend>) */
  title: string;

  /** Index in parent collection (0-based) */
  index: number;

  /** Whether this element has been visited */
  visited: boolean;

  /** Whether this element is completed */
  completed: boolean;

  /** Whether this element is currently active/visible */
  active: boolean;

  /** Whether this element is the current focused/primary element (only one can be current at a time) */
  current: boolean;
}
