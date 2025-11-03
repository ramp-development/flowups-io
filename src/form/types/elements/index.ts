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
  | 'prev'
  | 'next'
  | 'submit'
  | 'error';

export * from './base-element';
export * from './button-element';
export * from './card-element';
export * from './error-element';
export * from './field-element';
export * from './form-hierarchy';
export * from './group-element';
export * from './set-element';
