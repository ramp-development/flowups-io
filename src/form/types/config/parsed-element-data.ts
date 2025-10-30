import type { FormElementType } from '../elements';

/**
 * Parsed Element Data
 * Result of parsing data-form-element attribute
 */
export interface ParsedElementData {
  /** Element type (card, set, group, field, etc.) */
  type: FormElementType;

  /** Element ID (if provided via combined syntax) */
  id?: string;
}
