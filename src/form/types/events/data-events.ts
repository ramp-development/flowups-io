/**
 * Data Events
 */
export interface DataChangedEvent {
  field: string;
  value: unknown;
  oldValue: unknown;
}

export interface FormDataUpdatedEvent {
  formData: Record<string, unknown>;
}
