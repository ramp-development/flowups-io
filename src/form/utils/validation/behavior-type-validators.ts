/**
 * Behavior Type Validators
 *
 * Convenience wrappers for validating FormBehavior.
 */

import { VALID_BEHAVIOR_TYPE_MAP } from '../../constants';
import type { FormBehavior } from '../../types';
import { assertValidType } from './assert-valid-type';
import { getValidTypes } from './get-valid-types';
import { isValidType } from './is-valid-type';

/**
 * Check if a string is a valid FormBehavior
 *
 * @param value - The value to check
 * @returns Type predicate indicating if value is a valid FormBehavior
 *
 * @example
 * const behavior = element.getAttribute('data-form-behavior');
 * if (isValidBehaviorType(behavior)) {
 *   // TypeScript knows behavior is FormBehavior here
 *   config.behavior = behavior;
 * }
 */
export function isValidBehaviorType(value: string | null | undefined): value is FormBehavior {
  return isValidType(value, VALID_BEHAVIOR_TYPE_MAP);
}

/**
 * Assert that a value is a valid FormBehavior
 * Throws an error if invalid
 *
 * @param value - The value to check
 * @param context - Optional context for error message
 * @throws Error if value is not a valid FormBehavior
 *
 * @example
 * const behavior = assertValidBehaviorType(attrs.behavior);
 * // behavior is guaranteed to be FormBehavior here
 */
export function assertValidBehaviorType(
  value: string | null | undefined,
  context?: string
): asserts value is FormBehavior {
  assertValidType(value, VALID_BEHAVIOR_TYPE_MAP, 'behavior type', context);
}

/**
 * Get all valid behavior types
 * Useful for error messages or documentation
 *
 * @returns Array of all valid FormBehavior values
 *
 * @example
 * const types = getValidBehaviorTypes();
 * // ['byField'] (v1.0 - more in future versions)
 */
export function getValidBehaviorTypes(): FormBehavior[] {
  return getValidTypes(VALID_BEHAVIOR_TYPE_MAP);
}
