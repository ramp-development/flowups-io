import type {
  ErrorDisplayMode,
  FormBehavior,
  StorageType,
  TransitionType,
  ValidationTiming,
} from '.';

/**
 * Form Configuration
 * Top-level configuration for the form component
 */
export interface MultiStepFormConfig {
  /** Form name (from name attribute) */
  name: string;

  /** Form behavior mode (v1.0: byField only) */
  behavior: FormBehavior;

  /** Transition type */
  transition: TransitionType;

  /** Transition duration in milliseconds */
  transitionDuration: number;

  /** Validation timing */
  validateOn: ValidationTiming;

  /** Allow navigation with invalid fields */
  allowInvalid: boolean;

  /** Error display mode */
  errorDisplay: ErrorDisplayMode;

  /** Enable ARIA announcements */
  ariaAnnounce: boolean;

  /** Focus first input on field change */
  focusOnChange: boolean;

  /** Auto-initialize (future feature) */
  autoInit: boolean;

  /** State persistence (future feature) */
  persist: StorageType;

  /** Debug mode */
  debug: boolean;
}
