import type { BaseAttributeConfig } from './base-attribute-config';

/**
 * Group Attribute Configuration
 * Parsed from ${ATTR}-* attributes on group elements
 */
export interface GroupAttributeConfig extends BaseAttributeConfig {
  /** Group title */
  grouptitle?: string;

  /** Show-if condition */
  showif?: string;

  /** Hide-if condition */
  hideif?: string;
}
