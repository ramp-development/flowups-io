import type { BaseAttributeConfig } from './base-attribute-config';

/**
 * Field Attribute Configuration
 * Parsed from data-form-* attributes on field elements
 */

export interface FieldAttributeConfig extends BaseAttributeConfig {
  /** Show-if condition */
  showif?: string;

  /** Hide-if condition */
  hideif?: string;
}
