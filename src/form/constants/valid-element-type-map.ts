import type { FormElementType } from '../types';

/**
 * Valid element types as a Record<FormElementType, true>
 * TypeScript enforces that all FormElementType values are present as keys
 */
export const VALID_ELEMENT_TYPE_MAP: Record<FormElementType, true> = {
  form: true,
  card: true,
  set: true,
  group: true,
  field: true,
  input: true,
  prev: true,
  next: true,
  submit: true,
  error: true,
  'progress-line': true,
} as const;
