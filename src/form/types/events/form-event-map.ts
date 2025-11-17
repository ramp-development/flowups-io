import type { AppEventMap } from '$lib/types';

import type { ConditionEvaluatedEvent } from './condition-events';
import type { DataChangedEvent, FormDataUpdatedEvent } from './data-events';
import type { InputChangedEvent } from './input-events';
import type {
  NavigationChangedEvent,
  NavigationDeniedEvent,
  NavigationRequestEvent,
} from './navigation-events';
import type {
  SubmitErrorEvent,
  SubmitRequestedEvent,
  SubmitStartedEvent,
  SubmitSuccessEvent,
} from './submission-events';

/**
 * Form Event Map
 * Maps form-specific event names to their payload types for type-safe EventBus usage
 * Extends AppEventMap to include base events as well
 */
export interface FormEventMap extends AppEventMap {
  // Navigation
  'form:navigation:request': NavigationRequestEvent;
  'form:navigation:changed': NavigationChangedEvent;
  'form:navigation:denied': NavigationDeniedEvent;

  // Input
  'form:input:changed': InputChangedEvent;

  // Condition
  'form:condition:evaluated': ConditionEvaluatedEvent;

  // Data
  'form:data:changed': DataChangedEvent;
  'form:data:updated': FormDataUpdatedEvent;

  // Submission
  'form:submit:requested': SubmitRequestedEvent;
  'form:submit:started': SubmitStartedEvent;
  'form:submit:success': SubmitSuccessEvent;
  'form:submit:error': SubmitErrorEvent;
}
