import type { IBaseManager } from './base-manager';

/**
 * Display Manager Interface
 * Handles showing/hiding elements based on navigation (without animations)
 */
export interface IDisplayManager extends IBaseManager {
  /** Show an element */
  showElement(element: HTMLElement): void;

  /** Hide an element */
  hideElement(element: HTMLElement): void;

  /** Show elements by field ID */
  showField(fieldIndex: number): void;

  /** Hide elements by field ID */
  hideField(fieldIndex: number): void;

  /** Show all fields */
  showAllFields(): void;

  /** Hide all fields */
  hideAllFields(): void;
}
