import type { AppEventMap } from '$lib/types';

import type { ConditionEvaluatedEvent, FieldInclusionChangedEvent } from './condition-events';
import type { DataChangedEvent, FormDataUpdatedEvent } from './data-events';
import type { InputChangedEvent } from './input-events';
import type { FormDestroyedEvent, FormInitializedEvent } from './lifecycle-events';
import type {
  CardChangedEvent,
  CardChangingEvent,
  CardCompleteEvent,
} from './navigation-card-events';
import type {
  BoundaryReachedEvent,
  NavigationGoToEvent,
  NavigationNextEvent,
  NavigationPrevEvent,
} from './navigation-command-events';
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
import type {
  SubmitErrorEvent,
  SubmitRequestedEvent,
  SubmitStartedEvent,
  SubmitSuccessEvent,
} from './submission-events';
import type { ValidationCompleteEvent, ValidationStartedEvent } from './validation-events';

/**
 * Form Event Map
 * Maps form-specific event names to their payload types for type-safe EventBus usage
 * Extends AppEventMap to include base events as well
 */
export interface FormEventMap extends AppEventMap {
  // Lifecycle
  'form:initialized': FormInitializedEvent;
  'form:destroyed': FormDestroyedEvent;

  // Navigation commands (emitted by NavigationManager)
  'form:navigation:next': NavigationNextEvent;
  'form:navigation:prev': NavigationPrevEvent;
  'form:navigation:goTo': NavigationGoToEvent;

  // Boundary events (emitted by managers when reaching start/end)
  'form:navigation:boundary': BoundaryReachedEvent;

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

  // Input
  'form:input:changed': InputChangedEvent;

  // Validation
  'form:validation:started': ValidationStartedEvent;
  'form:validation:complete': ValidationCompleteEvent;

  // Conditions
  'form:condition:evaluated': ConditionEvaluatedEvent;
  'form:field:inclusion-changed': FieldInclusionChangedEvent;

  // Progress
  'form:progress:updated': ProgressUpdatedEvent;

  // Submission
  'form:submit:requested': SubmitRequestedEvent;
  'form:submit:started': SubmitStartedEvent;
  'form:submit:success': SubmitSuccessEvent;
  'form:submit:error': SubmitErrorEvent;
}
