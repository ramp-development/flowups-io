/**
 * Attribute Config Parser
 *
 * Parse all ${ATTR}* attributes from an element with compile-time type safety.
 * No manual key lists needed - TypeScript validates keys automatically!
 */

import { ATTR } from 'src/form/constants';

import type { BaseAttributeConfig } from '../../types/config';

/**
 * Get all ${ATTR}* attributes from element
 *
 * This version accepts ALL ${ATTR}* attributes and returns them as Partial<T>.
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

  // Get all data-f orm-* attributes
  Array.from(element.attributes).forEach((attr) => {
    if (attr.name.startsWith(`${ATTR}-`)) {
      // Remove `${ATTR}-` prefix
      const key = attr.name.replace(`${ATTR}-`, '');
      config[key] = attr.value;
    }
  });

  // TypeScript will validate property access based on T
  return config as Partial<T>;
}
