import type { BaseManager } from './base-manager';

/**
 * Card Manager Interface
 * Handles card discovery and navigation
 */
export interface CardManager extends BaseManager {
  /** Discover all cards in the form */
  discoverCards(): void;

  /** Get total number of cards */
  getTotalCards(): number;

  /** Get card by index */
  getCardByIndex(index: number): HTMLElement | null;

  /** Get card by ID */
  getCardById(id: string): HTMLElement | null;

  /** Get current card */
  getCurrentCard(): HTMLElement | null;
}
