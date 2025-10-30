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
