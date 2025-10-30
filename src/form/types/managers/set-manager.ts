import type { BaseManager } from './base-manager';

/**
 * Set Manager Interface
 * Handles set discovery, title extraction, and navigation
 */
export interface SetManager extends BaseManager {
  /** Discover all sets in the form */
  discoverSets(): void;

  /** Extract title from <legend> or attribute */
  extractSetTitle(setElement: HTMLElement): string;

  /** Get total number of sets */
  getTotalSets(): number;

  /** Get set by index */
  getSetByIndex(index: number): HTMLElement | null;

  /** Get set by ID */
  getSetById(id: string): HTMLElement | null;

  /** Get current set */
  getCurrentSet(): HTMLElement | null;
}
