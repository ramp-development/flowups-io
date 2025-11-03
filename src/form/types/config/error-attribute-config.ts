import type { BaseAttributeConfig } from './base-attribute-config';

/**
 * Error Display Attribute Configuration
 * Parsed from ${ATTR}-* attributes on error display elements
 */
export interface ErrorAttributeConfig extends BaseAttributeConfig {
  /** Error for field name */
  errorfor?: string;
}
