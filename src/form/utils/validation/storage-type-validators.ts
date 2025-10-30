/**
 * Storage Type Validators
 *
 * Convenience wrappers for validating StorageType.
 */

import { VALID_STORAGE_TYPE_MAP } from '../../constants';
import type { StorageType } from '../../types';
import { assertValidType } from './assert-valid-type';
import { getValidTypes } from './get-valid-types';
import { isValidType } from './is-valid-type';

/**
 * Check if a string is a valid StorageType
 *
 * @param value - The value to check
 * @returns Type predicate indicating if value is a valid StorageType
 *
 * @example
 * const storageType = element.getAttribute('data-form-persist');
 * if (isValidStorageType(storageType)) {
 *   // TypeScript knows storageType is StorageType here
 *   config.persist = storageType;
 * }
 */
export function isValidStorageType(value: string | null | undefined): value is StorageType {
  return isValidType(value, VALID_STORAGE_TYPE_MAP);
}

/**
 * Assert that a value is a valid StorageType
 * Throws an error if invalid
 *
 * @param value - The value to check
 * @param context - Optional context for error message
 * @throws Error if value is not a valid StorageType
 *
 * @example
 * const storageType = assertValidStorageType(attrs.persist);
 * // storageType is guaranteed to be StorageType here
 */
export function assertValidBehaviorType(
  value: string | null | undefined,
  context?: string
): asserts value is StorageType {
  assertValidType(value, VALID_STORAGE_TYPE_MAP, 'storage type', context);
}

/**
 * Get all valid storage types
 * Useful for error messages or documentation
 *
 * @returns Array of all valid StorageType values
 *
 * @example
 * const types = getValidStorageTypes();
 * // ['memory'] (v1.0 - more in future versions)
 */
export function getValidStorageTypes(): StorageType[] {
  return getValidTypes(VALID_STORAGE_TYPE_MAP);
}
