/**
 * Element Type Definitions
 *
 * Interfaces for the form element hierarchy:
 * Form → Card → Set → Group → Field
 */

/**
 * Form Element Type
 * Valid element types for ${ATTR}-element attribute
 */
export type FormElementType =
  | 'form'
  | 'card'
  | 'set'
  | 'group'
  | 'field'
  | 'input'
  | 'prev'
  | 'next'
  | 'submit'
  | 'error'
  | 'progress-line';

export * from './base-item';
export * from './button-item';
export * from './card-item';
export * from './error-item';
export * from './field-item';
export * from './group-item';
export * from './input-item';
export * from './navigable-item';
export * from './progress-item';
export * from './set-item';
