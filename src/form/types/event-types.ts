/**
 * Event Type Definitions
 *
 * Internal event types used by managers to communicate via EventBus.
 * These are for internal form component communication, not public API.
 */

/**
 * Form Lifecycle Events
 */
export interface FormInitializedEvent {
  formName: string;
  totalCards: number;
  totalSets: number;
  totalGroups: number;
  totalFields: number;
}

export interface FormDestroyedEvent {
  formName: string;
}

/**
 * Navigation Events - Card
 */
export interface CardChangingEvent {
  fromIndex: number;
  toIndex: number;
  fromId: string;
  toId: string;
}

export interface CardChangedEvent {
  cardIndex: number;
  cardId: string;
  cardTitle: string;
}

export interface CardCompleteEvent {
  cardId: string;
  cardIndex: number;
}

/**
 * Navigation Events - Set
 */
export interface SetChangingEvent {
  fromIndex: number;
  toIndex: number;
  fromId: string;
  toId: string;
}

export interface SetChangedEvent {
  setIndex: number;
  setId: string;
  setTitle: string;
  cardIndex: number;
  cardId: string;
}

export interface SetCompleteEvent {
  setId: string;
  setIndex: number;
}

/**
 * Navigation Events - Group
 */
export interface GroupChangingEvent {
  fromIndex: number;
  toIndex: number;
  fromId: string;
  toId: string;
}

export interface GroupChangedEvent {
  groupIndex: number;
  groupId: string;
  groupTitle: string;
  setIndex: number;
  setId: string;
}

export interface GroupCompleteEvent {
  groupId: string;
  groupIndex: number;
}

/**
 * Navigation Events - Field
 */
export interface FieldChangingEvent {
  fromIndex: number;
  toIndex: number;
  fromId: string;
  toId: string;
  direction: 'forward' | 'backward';
}

export interface FieldChangedEvent {
  fieldIndex: number;
  fieldId: string;
  inputName: string;
  setIndex: number;
  setId: string;
  cardIndex: number;
  cardId: string;
}

export interface FieldCompleteEvent {
  fieldId: string;
  fieldIndex: number;
  inputName: string;
}

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

/**
 * Progress Events
 */
export interface ProgressUpdatedEvent {
  formProgress: number;
  cardProgress: number;
  setProgress: number;
  groupProgress: number;
  cardsComplete: number;
  setsComplete: number;
  groupsComplete: number;
  fieldsComplete: number;
}

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

/**
 * App Event Map
 * Maps event names to their payload types for type-safe EventBus usage
 */
export interface FormEventMap {
  // Lifecycle
  'form:initialized': FormInitializedEvent;
  'form:destroyed': FormDestroyedEvent;

  // Card navigation
  'form:card:changing': CardChangingEvent;
  'form:card:changed': CardChangedEvent;
  'form:card:complete': CardCompleteEvent;

  // Set navigation
  'form:set:changing': SetChangingEvent;
  'form:set:changed': SetChangedEvent;
  'form:set:complete': SetCompleteEvent;

  // Group navigation
  'form:group:changing': GroupChangingEvent;
  'form:group:changed': GroupChangedEvent;
  'form:group:complete': GroupCompleteEvent;

  // Field navigation
  'form:field:changing': FieldChangingEvent;
  'form:field:changed': FieldChangedEvent;
  'form:field:complete': FieldCompleteEvent;

  // Data
  'form:data:changed': DataChangedEvent;
  'form:data:updated': FormDataUpdatedEvent;

  // Validation
  'form:validation:started': ValidationStartedEvent;
  'form:validation:complete': ValidationCompleteEvent;

  // Conditions
  'form:condition:evaluated': ConditionEvaluatedEvent;
  'form:field:visibility-changed': FieldVisibilityChangedEvent;

  // Progress
  'form:progress:updated': ProgressUpdatedEvent;

  // Submission
  'form:submit:started': SubmitStartedEvent;
  'form:submit:success': SubmitSuccessEvent;
  'form:submit:error': SubmitErrorEvent;
}
