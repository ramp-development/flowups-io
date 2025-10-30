/**
 * Generic Type Assertion
 *
 * Assert that a value is a valid type, throws error if invalid.
 */

import { isValidType } from './is-valid-type';

/**
 * Assert that a value is a valid type based on a type map
 * Throws an error if invalid
 *
 * @template T - The union type to validate against
 * @param value - The value to check
 * @param typeMap - Record map of valid types
 * @param typeName - Human-readable name for error message (e.g., "element type", "transition")
 * @param context - Optional context for error message
 * @throws Error if value is not a valid T
 *
 * @example
 * const elementType = assertValidType(
 *   element.getAttribute('data-form-element'),
 *   VALID_ELEMENT_TYPE_MAP,
 *   'element type',
 *   'Card element'
 * );
 * // elementType is guaranteed to be FormElementType here
 *
 * @example
 * const behavior = assertValidType(
 *   attrs.behavior,
 *   VALID_BEHAVIOR_TYPE_MAP,
 *   'behavior'
 * );
 * // behavior is guaranteed to be FormBehavior here
 */
export function assertValidType<T extends string>(
  value: string | null | undefined,
  typeMap: Record<T, true>,
  typeName: string,
  context?: string
): asserts value is T {
  if (!isValidType(value, typeMap)) {
    const validTypes = Object.keys(typeMap).join(', ');
    const errorContext = context ? `${context}: ` : '';
    throw new Error(
      `${errorContext}Invalid ${typeName} "${value}". Valid types are: ${validTypes}`
    );
  }
}
