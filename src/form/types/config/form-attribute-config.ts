import type { ErrorDisplayMode, FormBehavior, TransitionType, ValidationTiming } from '.';
import type { BaseAttributeConfig } from './base-attribute-config';

/**
 * Form Attribute Configuration
 * Parsed from ${ATTR}-* attributes on the <form> element
 */
export interface FormAttributeConfig extends BaseAttributeConfig {
  /** Form name */
  name?: string;

  /** Form behavior mode */
  behavior?: FormBehavior;

  /** Transition type */
  transition?: TransitionType;

  /** Transition duration */
  transitionduration?: string;

  /** Validation timing */
  validateon?: ValidationTiming;

  /** Allow invalid navigation */
  allowinvalid?: string;

  /** Error display mode */
  errordisplay?: ErrorDisplayMode;

  /** ARIA announcements */
  ariaannounce?: string;

  /** Focus on change */
  focusonchange?: string;

  /** Auto-init */
  autoinit?: string;

  /** Persist data */
  persist?: string;

  /** Debug mode */
  debug?: string;
}
