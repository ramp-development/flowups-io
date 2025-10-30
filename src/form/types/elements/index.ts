/**
 * Element Type Definitions
 *
 * Interfaces for the form element hierarchy:
 * Form → Card → Set → Group → Field
 */

/**
 * Form Element Type
 * Valid element types for data-form-element attribute
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
