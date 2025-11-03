import type { IBaseManager } from './base-manager';

/**
 * Condition Manager Interface
 * Handles conditional visibility (show-if/hide-if)
 */
export interface IConditionManager extends IBaseManager {
  /** Discover all conditional elements */
  discoverConditionalElements(): void;

  /** Build dependency graph */
  buildDependencyGraph(): void;

  /** Evaluate all conditions */
  evaluateAllConditions(): void;

  /** Evaluate conditions for specific field */
  evaluateFieldConditions(fieldName: string): void;

  /** Check if element should be visible */
  isElementVisible(element: HTMLElement): boolean;
}
