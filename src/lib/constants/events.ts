/**
 * Event name constants for the EventBus system
 * These constants should match the events defined in AppEventMap.ts
 */

export const EVENTS = {
  // State events
  STATE_CHANGED: 'state:changed',
  STATE_REMOVED: 'state:removed',

  // Validation events
  VALIDATION_RESULT: 'validation:result',
  VALIDATION_PASSED: 'validation:passed',
  VALIDATION_FAILED: 'validation:failed',

  // Input events
  INPUT_CHANGED: 'input:changed',
  INPUT_FOCUSED: 'input:focused',
  INPUT_BLURRED: 'input:blurred',

  // Calculation events
  CALCULATION_COMPLETED: 'calculation:completed',
  CALCULATION_ERROR: 'calculation:error',

  // UI events
  VISIBILITY_CHANGED: 'visibility:changed',
  FOCUS_CHANGED: 'focus:changed',

  // Navigation events
  STEP_CHANGED: 'step:changed',
  TAB_CHANGED: 'tab:changed',

  // Session events
  SESSION_STARTED: 'session:started',
  SESSION_ENDED: 'session:ended',
  SESSION_EXPIRED: 'session:expired',

  // Analytics events
  ANALYTICS_EVENT: 'analytics:event',
  ANALYTICS_PAGE: 'analytics:page',

  // Error events
  ERROR_CAPTURED: 'error:captured',
  ERROR_LOGGED: 'error:logged',

  // Content events
  CONTENT_LOADED: 'content:loaded',
  CONTENT_ERROR: 'content:error',

  // Modal events
  MODAL_OPENED: 'modal:opened',
  MODAL_CLOSED: 'modal:closed',

  // Toast events
  TOAST_SHOWN: 'toast:shown',
  TOAST_HIDDEN: 'toast:hidden',

  // Form events
  FORM_SUBMITTED: 'form:submitted',
  FORM_RESET: 'form:reset',
  FORM_VALIDATION_START: 'form:validation:start',
  FORM_VALIDATION_END: 'form:validation:end',

  // Progress events
  PROGRESS_UPDATED: 'progress:updated',
  PROGRESS_COMPLETED: 'progress:completed',
} as const;

// Type to extract event names
export type EventName = (typeof EVENTS)[keyof typeof EVENTS];
