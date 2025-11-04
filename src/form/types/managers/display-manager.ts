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
}
