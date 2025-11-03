import type { BaseAttributeConfig } from './base-attribute-config';

/**
 * Set Attribute Configuration
 * Parsed from ${ATTR}-* attributes on set elements
 */
export interface SetAttributeConfig extends BaseAttributeConfig {
  /** Set title */
  settitle?: string;

  /** Show-if condition */
  showif?: string;

  /** Hide-if condition */
  hideif?: string;
}
