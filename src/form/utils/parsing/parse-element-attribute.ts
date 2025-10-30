/**
 * Element Attribute Parser
 *
 * Parse data-form-element attribute with combined or simple syntax.
 */

import type { ParsedElementData } from '../../types/config';
import { assertValidElementType } from '../validation';

/**
 * Parse data-form-element attribute
 *
 * Supports combined syntax: "card:intro" or simple: "card"
 *
 * @param value - Attribute value
 * @returns Parsed element type and optional ID
 * @throws Error if element type is invalid
 *
 * @example
 * parseElementAttribute('card:intro') // { type: 'card', id: 'intro' }
 * parseElementAttribute('card') // { type: 'card', id: undefined }
 */
export function parseElementAttribute(value: string): ParsedElementData {
  const trimmed = value.trim();

  // Check for combined syntax (element:id)
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':');
    const type = parts[0].trim();

    // Assert throws error with helpful message if invalid
    assertValidElementType(type);

    return {
      type,
      id: parts[1].trim(),
    };
  }

  // Simple syntax (just element type)
  // Assert throws error with helpful message if invalid
  assertValidElementType(trimmed);

  return {
    type: trimmed,
    id: undefined,
  };
}
