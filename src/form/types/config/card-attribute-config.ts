import type { BaseAttributeConfig } from './base-attribute-config';

/**
 * Card Attribute Configuration
 * Parsed from data-form-* attributes on card elements
 */
export interface CardAttributeConfig extends BaseAttributeConfig {
  /** Card title */
  cardtitle?: string;

  /** Show-if condition */
  showif?: string;

  /** Hide-if condition */
  hideif?: string;
}
