/**
 * Element Type Constants
 *
 * Valid element types for data-form-element attribute.
 */

import type { FormElementType } from '../types/elements';

/**
 * Valid form element types
 */
export const VALID_ELEMENT_TYPES: readonly FormElementType[] = [
  'form',
  'card',
  'set',
  'group',
  'field',
  'prev',
  'next',
  'submit',
  'error',
] as const;
