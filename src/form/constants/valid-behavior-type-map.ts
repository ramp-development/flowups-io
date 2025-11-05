import type { FormBehavior } from '../types';

/**
 * Valid transition types as a Record<TransitionType, true>
 * TypeScript enforces that all TransitionType values are present as keys
 */
export const VALID_BEHAVIOR_TYPE_MAP: Record<FormBehavior, true> = {
  byField: true,
  byGroup: true,
  bySet: true,
  byCard: true,
} as const;
