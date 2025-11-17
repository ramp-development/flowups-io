/**
 * Submission Events
 */

/**
 * Submit Requested Event
 * Emitted when user clicks submit button
 * Form will validate and gather data before emitting form:submit:started
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface SubmitRequestedEvent {}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface SubmitStartedEvent {}

export interface SubmitSuccessEvent {
  response: unknown;
}

export interface SubmitErrorEvent {
  error: Error;
}
