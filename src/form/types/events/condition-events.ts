/**
 * Condition Events
 */
export interface ConditionEvaluatedEvent {
  element: HTMLElement;
  type: 'card' | 'set' | 'group' | 'field';
}
