import type { BaseElement } from './base-element';
import type { SetParentHierarchy } from './set-element';

export interface GroupParentHierarchy extends SetParentHierarchy {
  setId: string;
  setIndex: number;
}

/**
 * Group Element
 * Logical subgroup within a set (optional, uses <fieldset>)
 */
export interface GroupElement extends BaseElement {
  /** Type identifier */
  type: 'group';

  /** Progress of the group (0-100) */
  progress: number;

  /** Parent hierarchy */
  parentHierarchy: GroupParentHierarchy;

  /** Validity of the group */
  isValid: boolean;
}
