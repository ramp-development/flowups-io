import type { StorageType } from '../types';

/**
 * Valid storage types as a Record<StorageType, true>
 * TypeScript enforces that all StorageType values are present as keys
 */
export const VALID_STORAGE_TYPE_MAP: Record<StorageType, true> = {
  memory: true,
} as const;
