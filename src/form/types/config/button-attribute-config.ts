import type { BaseAttributeConfig } from './base-attribute-config';

/**
 * Button Attribute Configuration
 * Parsed from ${ATTR}* attributes on button elements (prev/next/submit)
 */

export interface ButtonAttributeConfig extends BaseAttributeConfig {
  /** Show-if condition */
  showif?: string;

  /** Hide-if condition */
  hideif?: string;
}
