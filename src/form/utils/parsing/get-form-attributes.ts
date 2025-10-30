/**
 * Attribute Config Parser
 *
 * Parse all data-form-* attributes from an element.
 */

import { VALID_CONFIG_KEYS } from 'src/form/constants/valid-config-keys';

import type { AttributeConfig } from '../../types/config';

/**
 * Check if key is a valid AttributeConfig key
 */
function isValidConfigKey(key: string): key is keyof AttributeConfig {
  return VALID_CONFIG_KEYS.includes(key as keyof AttributeConfig) as boolean;
}

/**
 * Get all data-form-* attributes from element
 *
 * @param element - The DOM element
 * @returns Parsed attribute configuration
 *
 * @example
 * getFormAttributes(element)
 * // Returns: { element: 'card', cardtitle: 'Introduction', transition: 'fade', ... }
 */
export function getFormAttributes(element: HTMLElement): AttributeConfig {
  const config: Record<string, string> = {};

  // Get all attributes
  Array.from(element.attributes).forEach((attr) => {
    if (attr.name.startsWith('data-form-')) {
      // Remove 'data-form-' prefix
      const key = attr.name.replace('data-form-', '');

      // Only add if it's a valid config key
      if (isValidConfigKey(key)) {
        config[key] = attr.value;
      }
    }
  });

  return config as AttributeConfig;
}
