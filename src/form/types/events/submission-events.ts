/**
 * Submission Events
 */

/**
 * Submit Requested Event
 * Emitted when user clicks submit button
 * Form will validate and gather data before emitting form:submit:started
 */
export interface SubmitRequestedEvent {}

export interface SubmitStartedEvent {
  formData: Record<string, unknown>;
}

export interface SubmitSuccessEvent {
  response: unknown;
}

export interface SubmitErrorEvent {
  error: Error;
}
