import type { AttributeConfig } from './attribute-config';

/**
 * Element Discovery Result
 * Result of discovering and parsing an element
 */
export interface ElementDiscoveryResult {
  /** The DOM element */
  element: HTMLElement;

  /** Element type */
  type: string;

  /** Element ID */
  id: string;

  /** Element title */
  title: string;

  /** Element index */
  index: number;

  /** Parent element ID (if applicable) */
  parentId?: string;

  /** Raw attribute config */
  config: AttributeConfig;
}
