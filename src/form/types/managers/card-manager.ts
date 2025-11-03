import type { IBaseManager } from './base-manager';

/**
 * Card Manager Interface
 * Handles card discovery and navigation
 */
export interface ICardManager extends IBaseManager {
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
