/**
 * Visibility Checker
 *
 * Check element visibility via CSS and ARIA attributes.
 */

/**
 * Check if element is hidden via CSS
 *
 * @param element - The DOM element
 * @returns True if element is hidden
 *
 * @example
 * isElementHidden(element) // false
 */
export function isElementHidden(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  return (
    style.display === 'none' ||
    style.visibility === 'hidden' ||
    element.hasAttribute('hidden') ||
    element.getAttribute('aria-hidden') === 'true'
  );
}
