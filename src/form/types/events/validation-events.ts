/**
 * Validation Events
 */
export interface ValidationStartedEvent {
  target: string; // field name or set ID
  type: 'field' | 'set';
}

export interface ValidationCompleteEvent {
  target: string;
  type: 'field' | 'set';
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  rule: string;
  message: string;
}
