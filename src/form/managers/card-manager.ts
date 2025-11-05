/**
 * Card Manager
 *
 * Handles card discovery and access throughout the form lifecycle.
 * Cards are optional large UI sections (e.g., intro, form, success).
 */

import { ATTR } from '../constants';
import type { CardElement, FormCardState, ICardManager } from '../types';
import { extractTitle, parseElementAttribute } from '../utils';
import { BaseManager } from './base-manager';

/**
 * CardManager Implementation
 *
 * Discovers and manages card elements in the form hierarchy.
 * Provides access to cards by index or ID.
 */
export class CardManager extends BaseManager implements ICardManager {
  // ============================================
  // Properties
  // ============================================

  /** Array of discovered card elements with metadata */
  private cards: CardElement[] = [];

  /** Map for O(1) lookup by card ID */
  private cardMap: Map<string, CardElement> = new Map();

  // ============================================
  // Lifecycle
  // ============================================

  /**
   * Initialize the manager
   * Called during form initialization
   */
  public init(): void {
    this.discoverCards();
    this.setStates();

    this.logDebug('CardManager initialized', {
      totalCards: this.cards.length,
      cards: this.cards,
    });
  }

  /**
   * Cleanup and remove references
   * Called during form destruction
   */
  public destroy(): void {
    this.cards = [];
    this.cardMap.clear();

    this.logDebug('CardManager destroyed');
  }

  // ============================================
  // Discovery
  // ============================================

  /**
   * Discover all cards in the form
   *
   * Finds all elements with [data-form-element="card"] or [data-form-element="card:id"]
   * Parses titles/IDs according to priority rules
   */
  public discoverCards(): void {
    const rootElement = this.form.getRootElement();
    if (!rootElement) {
      throw this.createError('Cannot discover cards: root element is null', 'init', {
        cause: { manager: 'CardManager', rootElement },
      });
    }

    // Query all card elements
    const cardElements = this.form.queryAll(`[${ATTR}-element^="card"]`);

    this.cards = [];
    this.cardMap.clear();

    cardElements.forEach((element, index) => {
      if (!(element instanceof HTMLElement)) return;

      const attrValue = element.getAttribute(`${ATTR}-element`);
      if (!attrValue) return;

      const parsed = parseElementAttribute(attrValue);

      // Skip if not a card
      if (parsed.type !== 'card') return;

      // Extract title with priority resolution
      const titleData = extractTitle(element, 'card', parsed.id, index);

      // Check if the card has any sets
      const hasSets = !!element.querySelector(`[${ATTR}-element^="set"]`);

      // Create card element object
      const card: CardElement = {
        element,
        type: 'card',
        id: titleData.id,
        title: titleData.title,
        index,
        visited: index === 0,
        completed: !hasSets,
        active: index === 0,
        progress: hasSets ? 0 : 100,
        isValid: !hasSets,
      };

      // Store in array and map
      this.cards.push(card);
      this.cardMap.set(card.id, card);
    });
  }

  // ============================================
  // State Management
  // ============================================

  /**
   * Set the form states for cards
   * Subscribers only notified if the states have changed
   */
  public setStates(): void {
    const currentCardIndex = this.cards.findIndex((card) => card.active);
    const currentCardId = currentCardIndex >= 0 ? this.cards[currentCardIndex].id : null;
    const currentCardTitle = currentCardIndex >= 0 ? this.cards[currentCardIndex].title : null;
    const previousCardIndex = currentCardIndex > 0 ? currentCardIndex - 1 : null;
    const nextCardIndex = currentCardIndex < this.cards.length - 1 ? currentCardIndex + 1 : null;
    const completedCards = new Set(
      this.cards.filter((card) => card.completed).map((card) => card.id)
    );
    const visitedCards = new Set(this.cards.filter((card) => card.visited).map((card) => card.id));
    const totalCards = this.cards.length;
    const cardsComplete = completedCards.size;
    const cardValidity = this.cards.reduce(
      (acc, card) => {
        acc[card.id] = card.isValid;
        return acc;
      },
      {} as Record<string, boolean>
    );

    const cardState: FormCardState = {
      currentCardIndex,
      currentCardId,
      currentCardTitle,
      previousCardIndex,
      nextCardIndex,
      completedCards,
      visitedCards,
      totalCards,
      cardsComplete,
      cardValidity,
    };

    this.form.setStates({ ...cardState });
  }

  /**
   * Update metadata values
   * @param selector - Card ID or index
   * @param metadata - Metadata to update (visited, completed, active, progress, isValid)
   */
  public setMetadata(
    selector: string | number,
    metadata: Pick<Partial<CardElement>, 'active'> = {}
  ): void {
    const card =
      typeof selector === 'string' ? this.getCardById(selector) : this.getCardByIndex(selector);
    if (!card) return;

    const sets = this.form.setManager.getSetsByCardId(card.id);
    const completed = sets.length > 0 ? sets.every((set) => set.completed) : true;
    const isValid = sets.length > 0 ? sets.every((set) => set.isValid) : true;
    const progress =
      sets.length > 0 ? sets.reduce((acc, set) => acc + set.progress, 0) / sets.length : 100;

    const newData = {
      ...card,
      visited: true,
      completed,
      isValid,
      progress,
      ...metadata,
    };

    this.cardMap.set(card.id, newData);
    this.cards[card.index] = newData;
  }

  // ============================================
  // Access Methods
  // ============================================

  /**
   * Get total number of cards
   */
  public getTotalCards(): number {
    return this.cards.length;
  }

  /**
   * Get card by index
   *
   * @param index - Zero-based card index
   * @returns Card element or null if not found
   */
  public getCardByIndex(index: number): CardElement | null {
    const card = this.cards[index];
    return card || null;
  }

  /**
   * Get card by ID
   *
   * @param id - Card ID
   * @returns Card element or null if not found
   */
  public getCardById(id: string): CardElement | null {
    const card = this.cardMap.get(id);
    return card || null;
  }

  /**
   * Get current card based on form state
   *
   * @returns Current card element or null
   */
  public getCurrentCard(): CardElement | null {
    const currentCardIndex = this.form.getState('currentCardIndex');
    if (!currentCardIndex) return null;
    return this.getCardByIndex(currentCardIndex);
  }

  // ============================================
  // Internal Access (for other managers)
  // ============================================

  /**
   * Get all card metadata
   * Used by other managers for hierarchy traversal
   *
   * @returns Array of card elements
   */
  public getCards(): CardElement[] {
    return [...this.cards];
  }

  /**
   * Get card metadata by ID
   * Used by other managers for hierarchy traversal
   *
   * @param id - Card ID
   * @returns Card element or undefined
   */
  public getCardMetadataById(id: string): CardElement | undefined {
    return this.cardMap.get(id);
  }

  /**
   * Get card metadata by index
   * Used by other managers for hierarchy traversal
   *
   * @param index - Card index
   * @returns Card element or undefined
   */
  public getCardMetadataByIndex(index: number): CardElement | undefined {
    return this.cards[index];
  }
}
