import type { IBaseManager } from './base-manager';

/**
 * Navigation Manager Interface
 * Handles navigation buttons and coordination with FieldManager
 */
export interface INavigationManager extends IBaseManager {
  /** Discover all navigation buttons */
  discoverButtons(): void;

  /** Handle next button click */
  handleNext(): Promise<void>;

  /** Handle previous button click */
  handlePrev(): Promise<void>;

  /** Update button states (enabled/disabled) */
  updateButtonStates(): void;

  /** Enable navigation */
  enableNavigation(): void;

  /** Disable navigation (during transitions) */
  disableNavigation(): void;
}
