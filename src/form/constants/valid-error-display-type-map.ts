import type { ErrorDisplayMode } from '../types';

/**
 * Valid error display types as a Record<ErrorDisplayMode, true>
 * TypeScript enforces that all ErrorDisplayMode values are present as keys
 */
export const VALID_ERROR_DISPLAY_TYPE_MAP: Record<ErrorDisplayMode, true> = {
  native: true,
} as const;
