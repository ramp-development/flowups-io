/**
 * Element Type Validation
 *
 * Validates element types against the FormElementType union.
 */

import type { FormElementType } from '../../types/elements';
import { VALID_ELEMENT_TYPES } from '../../constants';

/**
 * Check if string is a valid FormElementType
 *
 * @param value - String to check
 * @returns True if valid element type
 *
 * @example
 * isValidElementType('card') // true
 * isValidElementType('invalid') // false
 */
export function isValidElementType(value: string): value is FormElementType {
  return VALID_ELEMENT_TYPES.includes(value as FormElementType);
}
