/**
 * Parse boolean attribute value
 *
 * @param value - Attribute value string
 * @param defaultValue - Default value if not set
 * @returns Boolean value
 *
 * @example
 * parseBooleanAttribute('true') // true
 * parseBooleanAttribute('false') // false
 * parseBooleanAttribute(undefined, true) // true
 */
export function parseBooleanAttribute(
  value: string | undefined,
  defaultValue: boolean = false
): boolean {
  if (value === undefined) return defaultValue;
  return value === 'true' || value === '';
}
