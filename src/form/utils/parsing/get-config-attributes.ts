/**
 * Attribute Config Parser
 *
 * Parse all data-form-* attributes from an element with compile-time type safety.
 * No manual key lists needed - TypeScript validates keys automatically!
 */

import type { BaseAttributeConfig } from '../../types/config';

/**
 * Get all data-form-* attributes from element
 *
 * This version accepts ALL data-form-* attributes and returns them as Partial<T>.
 * TypeScript will enforce type safety when you ACCESS the properties, not when parsing.
 *
 * @template T - The attribute config interface to use
 * @param element - The DOM element
 * @returns Parsed attribute configuration (all keys are optional)
 *
 * @example
 * const attrs = getConfigAttributes<FormAttributeConfig>(element);
 * // TypeScript knows: attrs.behavior is valid
 * // TypeScript errors: attrs.cardtitle (doesn't exist on FormAttributeConfig)
 */
export function getConfigAttributes<T extends BaseAttributeConfig>(
  element: HTMLElement
): Partial<T> {
  const config: Record<string, string> = {};

  // Get all data-form-* attributes
  Array.from(element.attributes).forEach((attr) => {
    if (attr.name.startsWith('data-form-')) {
      // Remove 'data-form-' prefix
      const key = attr.name.replace('data-form-', '');
      config[key] = attr.value;
    }
  });

  // TypeScript will validate property access based on T
  return config as Partial<T>;
}
