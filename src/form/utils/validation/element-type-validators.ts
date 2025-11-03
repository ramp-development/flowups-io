/**
 * Element Type Validators
 *
 * Convenience wrappers for validating FormElementType.
 */

import { VALID_ELEMENT_TYPE_MAP } from '../../constants';
import type { FormElementType } from '../../types';
import { assertValidType } from './assert-valid-type';
import { getValidTypes } from './get-valid-types';
import { isValidType } from './is-valid-type';

/**
 * Check if a string is a valid FormElementType
 *
 * @param value - The value to check
 * @returns Type predicate indicating if value is a valid FormElementType
 *
 * @example
 * const elementType = element.getAttribute('${ATTR}-element');
 * if (isValidElementType(elementType)) {
 *   // TypeScript knows elementType is FormElementType here
 *   console.log(elementType); // 'card' | 'set' | 'field' | etc.
 * }
 */
export function isValidElementType(value: string | null | undefined): value is FormElementType {
  return isValidType(value, VALID_ELEMENT_TYPE_MAP);
}

/**
 * Assert that a value is a valid FormElementType
 * Throws an error if invalid
 *
 * @param value - The value to check
 * @param context - Optional context for error message
 * @throws Error if value is not a valid FormElementType
 *
 * @example
 * const elementType = assertValidElementType(
 *   element.getAttribute('${ATTR}-element'),
 *   'Card element'
 * );
 * // elementType is guaranteed to be FormElementType here
 */
export function assertValidElementType(
  value: string | null | undefined,
  context?: string
): asserts value is FormElementType {
  assertValidType(value, VALID_ELEMENT_TYPE_MAP, 'element type', context);
}

/**
 * Get all valid element types
 * Useful for error messages or documentation
 *
 * @returns Array of all valid FormElementType values
 *
 * @example
 * const types = getValidElementTypes();
 * // ['form', 'card', 'set', 'group', 'field', 'prev', 'next', 'submit', 'error']
 */
export function getValidElementTypes(): FormElementType[] {
  return getValidTypes(VALID_ELEMENT_TYPE_MAP);
}
