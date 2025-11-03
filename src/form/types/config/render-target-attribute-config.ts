import type { BaseAttributeConfig } from './base-attribute-config';

/**
 * Render Target Attribute Configuration
 * Parsed from ${ATTR}-* attributes on elements that display dynamic content
 */
export interface RenderTargetAttributeConfig extends BaseAttributeConfig {
  /** Text content template */
  textcontent?: string;

  /** Style width template */
  stylewidth?: string;

  /** Show-if condition */
  showif?: string;

  /** Hide-if condition */
  hideif?: string;
}
