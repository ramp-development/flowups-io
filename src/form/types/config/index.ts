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
export type FormBehavior = 'byField' | 'byGroup' | 'bySet' | 'byCard';

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
 * v1.0: Only 'native' supported, inline and toast are future features
 */
export type ErrorDisplayMode = 'native';

/**
 * Storage Type
 * Where to persist form data
 * v1.0: Only 'memory'. Future: 'local', 'session', and 'cookie'
 */
export type StorageType = 'memory';

export * from './base-attribute-config';
export * from './button-attribute-config';
export * from './button-attribute-config';
export * from './card-attribute-config';
export * from './element-discovery-result';
export * from './error-attribute-config';
export * from './field-attribute-config';
export * from './form-attribute-config';
export * from './group-attribute-config';
export * from './multi-step-form-config';
export * from './multi-step-form-props';
export * from './parsed-element-data';
export * from './render-target-attribute-config';
export * from './set-attribute-config';
export * from './title-extraction-result';
