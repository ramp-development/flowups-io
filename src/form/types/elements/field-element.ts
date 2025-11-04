import type { BaseElement } from './base-element';
import type { GroupParentHierarchy } from './group-element';

export interface FieldParentHierarchy extends GroupParentHierarchy {
  groupId: string | null;
  groupIndex: number | null;
}

/**
 * Field Element
 * Wrapper for label, input, error, hint
 */
export interface FieldElement extends BaseElement {
  /** Type identifier */
  type: 'field';

  /** Parent hierarchy */
  parentHierarchy: FieldParentHierarchy;

  /** Whether this field is included in the navigation order (conditional visibility) */
  isIncluded: boolean;

  /** Whether this field is valid */
  isValid: boolean;

  /** Validation error messages */
  errors: string[];
}
