/**
 * Configuration Type Definitions
 *
 * Configuration options for the multi-step form component and its managers.
 */

/**
 * Form Behavior Type
 * v1.0: Only 'byField' supported
 * Future: 'byCard' | 'bySet' | 'byGroup'
 */
export type FormBehavior = 'byField';

/**
 * Transition Type
 * Animation style for field/set/card transitions
 */
export type TransitionType = 'fade' | 'slide' | 'none';

/**
 * Validation Timing
 * When to trigger validation
 */
export type ValidationTiming = 'blur' | 'change' | 'input' | 'next' | 'submit';

/**
 * Error Display Mode
 * How to display validation errors
 */
export type ErrorDisplayMode = 'native' | 'inline' | 'toast';

/**
 * Storage Type
 * Where to persist form data (future feature)
 */
export type StorageType = 'memory' | 'local' | 'session' | 'cookie' | false;

export * from './attribute-config';
export * from './element-discovery-result';
export * from './multi-step-form-config';
export * from './parsed-element-data';
export * from './title-extraction-result';
