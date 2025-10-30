/**
 * Generic Type Getter
 *
 * Get all valid types from a type map.
 */

/**
 * Get all valid types from a type map
 * Useful for error messages or documentation
 *
 * @template T - The union type
 * @param typeMap - Record map of valid types
 * @returns Array of all valid T values
 *
 * @example
 * const elementTypes = getValidTypes(VALID_ELEMENT_TYPE_MAP);
 * // ['form', 'card', 'set', 'group', 'field', 'prev', 'next', 'submit', 'error']
 *
 * @example
 * const transitions = getValidTypes(VALID_TRANSITION_TYPE_MAP);
 * // ['fade', 'slide', 'none']
 */
export function getValidTypes<T extends string>(typeMap: Record<T, true>): T[] {
  return Object.keys(typeMap) as T[];
}
