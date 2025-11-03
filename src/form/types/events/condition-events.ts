/**
 * Condition Events
 */
export interface ConditionEvaluatedEvent {
  element: HTMLElement;
  visible: boolean;
  condition: string;
}

export interface FieldInclusionChangedEvent {
  fieldId: string;
  isIncluded: boolean;
}
