import type { CardElement } from '../elements';
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
  getCardByIndex(index: number): CardElement | null;

  /** Get card by ID */
  getCardById(id: string): CardElement | null;

  /** Get current card */
  getCurrentCard(): CardElement | null;
}
