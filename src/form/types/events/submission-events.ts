/**
 * Submission Events
 */
export interface SubmitStartedEvent {
  formData: Record<string, unknown>;
}

export interface SubmitSuccessEvent {
  response: unknown;
}

export interface SubmitErrorEvent {
  error: Error;
}
