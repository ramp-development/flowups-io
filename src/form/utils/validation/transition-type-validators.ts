/**
 * Transition Type Validators
 *
 * Convenience wrappers for validating TransitionType.
 */

import { VALID_TRANSITION_TYPE_MAP } from '../../constants';
import type { TransitionType } from '../../types';
import { assertValidType } from './assert-valid-type';
import { getValidTypes } from './get-valid-types';
import { isValidType } from './is-valid-type';

/**
 * Check if a string is a valid TransitionType
 *
 * @param value - The value to check
 * @returns Type predicate indicating if value is a valid TransitionType
 *
 * @example
 * const transition = element.getAttribute('${ATTR}-transition');
 * if (isValidTransitionType(transition)) {
 *   // TypeScript knows transition is TransitionType here
 *   config.transition = transition;
 * }
 */
export function isValidTransitionType(value: string | null | undefined): value is TransitionType {
  return isValidType(value, VALID_TRANSITION_TYPE_MAP);
}

/**
 * Assert that a value is a valid TransitionType
 * Throws an error if invalid
 *
 * @param value - The value to check
 * @param context - Optional context for error message
 * @throws Error if value is not a valid TransitionType
 *
 * @example
 * const transition = assertValidTransitionType(attrs.transition);
 * // transition is guaranteed to be TransitionType here
 */
export function assertValidTransitionType(
  value: string | null | undefined,
  context?: string
): asserts value is TransitionType {
  assertValidType(value, VALID_TRANSITION_TYPE_MAP, 'transition type', context);
}

/**
 * Get all valid transition types
 * Useful for error messages or documentation
 *
 * @returns Array of all valid TransitionType values
 *
 * @example
 * const types = getValidTransitionTypes();
 * // ['fade', 'slide', 'none']
 */
export function getValidTransitionTypes(): TransitionType[] {
  return getValidTypes(VALID_TRANSITION_TYPE_MAP);
}
