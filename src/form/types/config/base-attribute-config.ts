/**
 * Base Attribute Configuration
 * Common attributes for all elements
 */
export interface BaseAttributeConfig {
  /** Element type from data-form-element */
  element?: string;

  /** Element ID (parsed from combined syntax or explicit attribute) */
  id?: string;
}
