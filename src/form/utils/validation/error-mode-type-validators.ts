/**
 * Element Type Validators
 *
 * Convenience wrappers for validating FormElementType.
 */

import { VALID_ERROR_DISPLAY_TYPE_MAP } from 'src/form/constants/valid-error-display-type-map';

import type { ErrorDisplayMode } from '../../types';
import { assertValidType } from './assert-valid-type';
import { getValidTypes } from './get-valid-types';
import { isValidType } from './is-valid-type';

/**
 * Check if a string is a valid ErrorDisplayMode
 *
 * @param value - The value to check
 * @returns Type predicate indicating if value is a valid ErrorDisplayMode
 *
 * @example
 * const errorMode = element.getAttribute('data-form-errormode');
 * if (isValidErrorModeType(errorMode)) {
 *   // TypeScript knows errorMode is ErrorDisplayMode here
 *   console.log(errorMode); // 'native'
 * }
 */
export function isValidErrorModeType(value: string | null | undefined): value is ErrorDisplayMode {
  return isValidType(value, VALID_ERROR_DISPLAY_TYPE_MAP);
}

/**
 * Assert that a value is a valid ErrorDisplayMode
 * Throws an error if invalid
 *
 * @param value - The value to check
 * @param context - Optional context for error message
 * @throws Error if value is not a valid ErrorDisplayMode
 *
 * @example
 * const errorMode = assertValidErrorModeType(
 *   element.getAttribute('data-form-errormode'),
 *   'Native error display mode'
 * );
 * // errorMode is guaranteed to be ErrorDisplayMode here
 */
export function assertValidElementType(
  value: string | null | undefined,
  context?: string
): asserts value is ErrorDisplayMode {
  assertValidType(value, VALID_ERROR_DISPLAY_TYPE_MAP, 'error display mode', context);
}

/**
 * Get all valid error display modes
 * Useful for error messages or documentation
 *
 * @returns Array of all valid ErrorDisplayMode values
 *
 * @example
 * const types = getValidErrorModeTypes();
 * // ['native']
 */
export function getValidErrorModeTypes(): ErrorDisplayMode[] {
  return getValidTypes(VALID_ERROR_DISPLAY_TYPE_MAP);
}
