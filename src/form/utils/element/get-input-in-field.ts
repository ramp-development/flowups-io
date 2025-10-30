/**
 * Input Finder
 *
 * Find input elements within field wrappers.
 */

/**
 * Get input element within a field wrapper
 *
 * Finds the first input, select, or textarea within the field element
 *
 * @param fieldElement - The field wrapper element
 * @returns The input element or null
 *
 * @example
 * getInputInField(fieldElement) // <input name="email" />
 */
export function getInputInField(
  fieldElement: HTMLElement
): HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null {
  return fieldElement.querySelector('input, select, textarea');
}
