import type { FormBehavior } from '../config';

/**
 * Submission Events
 */

/**
 * Submit Requested Event
 * Emitted when user clicks submit button
 * Form will validate and gather data before emitting form:submit:started
 */
export interface SubmitRequestedEvent {
  /** Current form behavior mode */
  behavior: FormBehavior;

  /** Button element that triggered the submit (useful for loading states) */
  button: HTMLButtonElement;

  /** Whether to skip validation (if button has data-form-skipvalidation attribute) */
  skipValidation?: boolean;

  /** Custom action (if button has data-form-action attribute, for multi-action forms) */
  action?: string;
}

export interface SubmitStartedEvent {
  formData: Record<string, unknown>;
}

export interface SubmitSuccessEvent {
  response: unknown;
}

export interface SubmitErrorEvent {
  error: Error;
}
