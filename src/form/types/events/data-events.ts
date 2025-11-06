import type { StateValue } from '$lib/types';

/**
 * Data Events
 */
export interface DataChangedEvent {
  field: string;
  to: StateValue;
  from: StateValue;
}

export interface FormDataUpdatedEvent {
  formData: Record<string, unknown>;
}
