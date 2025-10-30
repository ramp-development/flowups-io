import type { ErrorDisplayMode, FormBehavior, TransitionType } from '.';

/**
 * Attribute Configuration
 * Parsed from data-form-* attributes
 */
export interface AttributeConfig {
  /** Element type from data-form-element */
  element?: string;

  /** Element ID (parsed from combined syntax or explicit attribute) */
  id?: string;

  /** Card title */
  cardtitle?: string;

  /** Set title */
  settitle?: string;

  /** Group title */
  grouptitle?: string;

  /** Behavior override */
  behavior?: FormBehavior;

  /** Transition type */
  transition?: TransitionType;

  /** Transition duration */
  transitionduration?: string;

  /** Validation timing */
  validateon?: string;

  /** Allow invalid navigation */
  allowinvalid?: string;

  /** Error display mode */
  errordisplay?: ErrorDisplayMode;

  /** ARIA announcements */
  ariaannounce?: string;

  /** Focus on change */
  focusonchange?: string;

  /** Show-if condition */
  showif?: string;

  /** Hide-if condition */
  hideif?: string;

  /** Text content template */
  textcontent?: string;

  /** Style width template */
  stylewidth?: string;

  /** Error for field name */
  errorfor?: string;

  /** Auto-init */
  autoinit?: string;

  /** Persist data */
  persist?: string;
}
