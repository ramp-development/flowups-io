/**
 * Application-specific event type map
 */

import type { StateValue } from '../core';
import type { EventMap } from './event-bus-types';

// State events
export interface StateChangePayload {
  key: string;
  from: StateValue;
  to: StateValue;
  timestamp: number;
}

export interface StateRemovePayload {
  key: string;
  value: StateValue;
  timestamp: number;
}

// Validation events
export interface ValidationResultPayload {
  field: string;
  valid: boolean;
  errors: string[];
  timestamp: number;
}

export interface ValidationRequestPayload {
  field: string;
  value: StateValue;
}

// UI events
export interface VisibilityChangePayload {
  element: HTMLElement;
  visible: boolean;
  timestamp: number;
}

export interface FocusChangePayload {
  element: HTMLElement;
  previousElement?: HTMLElement;
  timestamp: number;
}

// Input events
export interface InputChangePayload {
  element: HTMLInputElement;
  value: string;
  previousValue?: string;
  timestamp: number;
}

// Navigation events
export interface StepChangePayload {
  currentStep: number;
  previousStep: number;
  totalSteps: number;
  timestamp: number;
}

export interface TabChangePayload {
  currentTab: string;
  previousTab?: string;
  timestamp: number;
}

// Calculation events
export interface CalculationResultPayload {
  expression: string;
  result: number;
  variables: Record<string, number>;
  timestamp: number;
}

export interface CalculationErrorPayload {
  expression: string;
  error: Error;
  variables: Record<string, number>;
  timestamp: number;
}

// Complete event map for the application
export interface AppEventMap extends EventMap {
  // State events
  'state:changed': StateChangePayload;
  'state:removed': StateRemovePayload;

  // Validation events
  'validation:request': ValidationRequestPayload;
  'validation:result': ValidationResultPayload;
  'validation:passed': ValidationResultPayload;
  'validation:failed': ValidationResultPayload;

  // UI events
  'visibility:changed': VisibilityChangePayload;
  'focus:changed': FocusChangePayload;

  // Input events
  'input:changed': InputChangePayload;
  'input:focused': FocusChangePayload;
  'input:blurred': FocusChangePayload;

  // Navigation events
  'step:changed': StepChangePayload;
  'tab:changed': TabChangePayload;

  // Calculation events
  'calculation:completed': CalculationResultPayload;
  'calculation:error': CalculationErrorPayload;
}
