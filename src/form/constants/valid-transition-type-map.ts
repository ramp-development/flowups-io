import type { TransitionType } from '../types';

/**
 * Valid transition types as a Record<TransitionType, true>
 * TypeScript enforces that all TransitionType values are present as keys
 */
export const VALID_TRANSITION_TYPE_MAP: Record<TransitionType, true> = {
  fade: true,
  slide: true,
  none: true,
} as const;
