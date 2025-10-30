import type { ConditionEvaluatedEvent, FieldVisibilityChangedEvent } from './condition-events';
import type { DataChangedEvent, FormDataUpdatedEvent } from './data-events';
import type { FormDestroyedEvent, FormInitializedEvent } from './lifecycle-events';
import type {
  CardChangedEvent,
  CardChangingEvent,
  CardCompleteEvent,
} from './navigation-card-events';
import type {
  FieldChangedEvent,
  FieldChangingEvent,
  FieldCompleteEvent,
} from './navigation-field-events';
import type {
  GroupChangedEvent,
  GroupChangingEvent,
  GroupCompleteEvent,
} from './navigation-group-events';
import type { SetChangedEvent, SetChangingEvent, SetCompleteEvent } from './navigation-set-events';
import type { ProgressUpdatedEvent } from './progress-events';
import type { SubmitErrorEvent, SubmitStartedEvent, SubmitSuccessEvent } from './submission-events';
import type { ValidationCompleteEvent, ValidationStartedEvent } from './validation-events';

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
