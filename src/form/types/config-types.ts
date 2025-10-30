/**
 * Configuration Type Definitions
 *
 * Configuration options for the multi-step form component and its managers.
 */

/**
 * Form Behavior Type
 * v1.0: Only 'byField' supported
 * Future: 'byCard' | 'bySet' | 'byGroup'
 */
export type FormBehavior = 'byField';

/**
 * Transition Type
 * Animation style for field/set/card transitions
 */
export type TransitionType = 'fade' | 'slide' | 'none';

/**
 * Validation Timing
 * When to trigger validation
 */
export type ValidationTiming = 'blur' | 'change' | 'input' | 'next' | 'submit';

/**
 * Error Display Mode
 * How to display validation errors
 */
export type ErrorDisplayMode = 'native' | 'inline' | 'toast';

/**
 * Storage Type
 * Where to persist form data (future feature)
 */
export type StorageType = 'local' | 'session' | 'cookie' | false;

/**
 * Multi-Step Form Configuration
 * Top-level configuration for the form component
 */
export interface MultiStepFormConfig {
  /** Form element */
  element: HTMLFormElement;

  /** Form behavior mode (v1.0: byField only) */
  behavior?: FormBehavior;

  /** Transition type */
  transition?: TransitionType;

  /** Transition duration in milliseconds */
  transitionDuration?: number;

  /** Validation timing */
  validateOn?: ValidationTiming;

  /** Allow navigation with invalid fields */
  allowInvalid?: boolean;

  /** Error display mode */
  errorDisplay?: ErrorDisplayMode;

  /** Enable ARIA announcements */
  ariaAnnounce?: boolean;

  /** Focus first input on field change */
  focusOnChange?: boolean;

  /** Auto-initialize (future feature) */
  autoInit?: boolean;

  /** State persistence (future feature) */
  persist?: StorageType;

  /** Debug mode */
  debug?: boolean;
}

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

/**
 * Parsed Element Data
 * Result of parsing data-form-element attribute
 */
export interface ParsedElementData {
  /** Element type (card, set, group, field, etc.) */
  type: string;

  /** Element ID (if provided via combined syntax) */
  id?: string;
}

/**
 * Title Extraction Result
 * Result of extracting title from <legend> or attribute
 */
export interface TitleExtractionResult {
  /** Extracted title */
  title: string;

  /** Source of the title */
  source: 'legend' | 'attribute' | 'generated';

  /** Generated ID from title */
  id: string;
}

/**
 * Element Discovery Result
 * Result of discovering and parsing an element
 */
export interface ElementDiscoveryResult {
  /** The DOM element */
  element: HTMLElement;

  /** Element type */
  type: string;

  /** Element ID */
  id: string;

  /** Element title */
  title: string;

  /** Element index */
  index: number;

  /** Parent element ID (if applicable) */
  parentId?: string;

  /** Raw attribute config */
  config: AttributeConfig;
}
