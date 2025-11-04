import type { SetElement } from '../elements';
import type { IBaseManager } from './base-manager';

/**
 * Set Manager Interface
 * Handles set discovery, title extraction, and navigation
 */
export interface ISetManager extends IBaseManager {
  /** Discover all sets in the form */
  discoverSets(): void;

  /** Extract title from <legend> or attribute */
  extractSetTitle(setElement: HTMLElement): string;

  /** Get total number of sets */
  getTotalSets(): number;

  /** Get set by index */
  getSetByIndex(index: number): SetElement | null;

  /** Get set by ID */
  getSetById(id: string): SetElement | null;

  /** Get current set */
  getCurrentSet(): SetElement | null;
}
