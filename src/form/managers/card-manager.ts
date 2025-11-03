/**
 * Card Manager
 *
 * Handles card discovery and access throughout the form lifecycle.
 * Cards are optional large UI sections (e.g., intro, form, success).
 */

import type { FlowupsForm } from '..';
import { ATTR } from '../constants/attr';
import type { CardElement, ICardManager } from '../types';
import { extractTitle, parseElementAttribute } from '../utils';

/**
 * CardManager Implementation
 *
 * Discovers and manages card elements in the form hierarchy.
 * Provides access to cards by index or ID.
 */
export class CardManager implements ICardManager {
  // ============================================
  // Properties
  // ============================================

  /** Reference to parent form component */
  public readonly form: FlowupsForm;

  /** Array of discovered card elements with metadata */
  private cards: CardElement[] = [];

  /** Map for O(1) lookup by card ID */
  private cardMap: Map<string, CardElement> = new Map();

  // ============================================
  // Constructor
  // ============================================

  constructor(form: FlowupsForm) {
    this.form = form;
  }

  // ============================================
  // Lifecycle
  // ============================================

  /**
   * Initialize the manager
   * Called during form initialization
   */
  public init(): void {
    this.discoverCards();

    if (this.form.getFormConfig().debug) {
      this.form.logDebug('CardManager initialized', {
        totalCards: this.cards.length,
        cards: this.cards.map((c) => ({ id: c.id, title: c.title, index: c.index })),
      });
    }
  }

  /**
   * Cleanup and remove references
   * Called during form destruction
   */
  public destroy(): void {
    this.cards = [];
    this.cardMap.clear();

    if (this.form.getFormConfig().debug) {
      this.form.logDebug('CardManager destroyed');
    }
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
      throw this.form.createError('Cannot discover cards: root element is null', 'init', {
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

      // Create card element object
      const card: CardElement = {
        element,
        type: 'card',
        id: titleData.id,
        title: titleData.title,
        index,
        visited: false,
        completed: false,
        active: false,
        sets: [], // Will be populated by SetManager
      };

      // Store in array and map
      this.cards.push(card);
      this.cardMap.set(card.id, card);
    });

    if (this.form.getFormConfig().debug) {
      this.form.logDebug('Cards discovered', {
        count: this.cards.length,
        cards: this.cards.map((c) => ({ id: c.id, title: c.title })),
      });
    }
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
  public getCardByIndex(index: number): HTMLElement | null {
    const card = this.cards[index];
    return card?.element || null;
  }

  /**
   * Get card by ID
   *
   * @param id - Card ID
   * @returns Card element or null if not found
   */
  public getCardById(id: string): HTMLElement | null {
    const card = this.cardMap.get(id);
    return card?.element || null;
  }

  /**
   * Get current card based on form state
   *
   * @returns Current card element or null
   */
  public getCurrentCard(): HTMLElement | null {
    const currentCardIndex = this.form.getState('currentCardIndex');
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
