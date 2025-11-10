/**
 * Condition Events
 */
export interface ConditionEvaluatedEvent {
  element: HTMLElement;
  visible: boolean;
  condition: string;
}
