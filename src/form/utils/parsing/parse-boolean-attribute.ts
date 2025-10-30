/**
 * Attribute Value Parsers
 *
 * Parse attribute values to specific types (boolean, number, etc.).
 */

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

/**
 * Parse number attribute value
 *
 * @param value - Attribute value string
 * @param defaultValue - Default value if not set or invalid
 * @returns Number value
 *
 * @example
 * parseNumberAttribute('300') // 300
 * parseNumberAttribute('invalid', 500) // 500
 */
export function parseNumberAttribute(value: string | undefined, defaultValue: number): number {
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}
