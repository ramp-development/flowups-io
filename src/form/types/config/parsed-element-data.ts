import type { FormElementType } from '../items';

/**
 * Parsed Element Data
 * Result of parsing ${ATTR}-element attribute
 */
export interface ParsedElementData {
  /** Element type (card, set, group, field, etc.) */
  type: FormElementType;

  /** Element ID (if provided via combined syntax) */
  id?: string;
}
