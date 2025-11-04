/**
 * Data Events
 */
export interface DataChangedEvent {
  field: string;
  newValue: unknown;
  oldValue: unknown;
}

export interface FormDataUpdatedEvent {
  formData: Record<string, unknown>;
}
