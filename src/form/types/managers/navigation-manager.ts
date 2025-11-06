import type { IBaseManager } from './base-manager';

/**
 * Navigation Manager Interface
 * Handles navigation buttons and coordination with FieldManager
 */
export interface INavigationManager extends IBaseManager {
  /** Discover all navigation buttons */
  discoverButtons(): void;

  /** Handle next button click */
  handleMove(direction: 'prev' | 'next'): void;

  /** Update button states (enabled/disabled) */
  updateButtonStates(): void;

  /** Toggle navigation */
  toggleNavigation(enabled?: boolean): void;
}
