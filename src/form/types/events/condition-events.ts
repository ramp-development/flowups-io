/**
 * Condition Events
 */
export interface ConditionEvaluatedEvent {
  element: HTMLElement;
  visible: boolean;
  condition: string;
}

export interface FieldVisibilityChangedEvent {
  fieldId: string;
  visible: boolean;
}
