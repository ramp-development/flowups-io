/**
 * Generic Type Validator
 *
 * Type-safe validation for any union type using a Record map.
 * Works with FormElementType, TransitionType, FormBehavior, etc.
 */

/**
 * Check if a string is a valid type based on a type map
 *
 * This uses a Record lookup which is O(1) and type-safe.
 *
 * @template T - The union type to validate against
 * @param value - The value to check
 * @param typeMap - Record map of valid types (e.g., VALID_ELEMENT_TYPE_MAP)
 * @returns Type predicate indicating if value is a valid T
 *
 * @example
 * const elementType = element.getAttribute('${ATTR}-element');
 * if (isValidType(elementType, VALID_ELEMENT_TYPE_MAP)) {
 *   // TypeScript knows elementType is FormElementType here
 *   console.log(elementType);
 * }
 *
 * @example
 * const transition = element.getAttribute('${ATTR}-transition');
 * if (isValidType(transition, VALID_TRANSITION_TYPE_MAP)) {
 *   // TypeScript knows transition is TransitionType here
 *   config.transition = transition;
 * }
 */
export function isValidType<T extends string>(
  value: string | null | undefined,
  typeMap: Record<T, true>
): value is T {
  if (!value) return false;
  return value in typeMap;
}
