/**
 * Card Manager
 *
 * Handles card discovery and access throughout the form lifecycle.
 * Cards are optional large UI sections (e.g., intro, form, success).
 */

import { ATTR } from '../constants';
import type { CardItem, CardParentHierarchy, FormCardState } from '../types';
import { extractTitle, parseElementAttribute } from '../utils';
import { ItemManager } from './item-manager';

/**
 * CardManager Implementation
 *
 * Discovers and manages card elements in the form hierarchy.
 * Provides access to cards by index or ID.
 */
export class CardManager extends ItemManager<CardItem> {
  protected readonly itemType = 'card';

  /**
   * Create data object
   * Parses the element attribute and creates a CardItem object
   *
   * @param element - HTMLElement
   * @param index - Index of the element within the list of cards
   * @returns CardItem | undefined
   */
  protected createItemData(element: HTMLElement, index: number): CardItem | undefined {
    if (!(element instanceof HTMLElement)) return;

    const attrValue = element.getAttribute(`${ATTR}-element`);
    if (!attrValue) return;

    const parsed = parseElementAttribute(attrValue);

    // Skip if not a card
    if (parsed.type !== this.itemType) return;

    // Extract title with priority resolution
    const titleData = extractTitle(element, this.itemType, parsed.id, index);

    // Check if the card has any sets
    const hasSets = !!element.querySelector(`[${ATTR}-element^="set"]`);

    // Create card item object
    return {
      element,
      type: this.itemType,
      id: titleData.id,
      title: titleData.title,
      index,
      visited: index === 0,
      completed: !hasSets,
      active: index === 0,
      current: index === 0,
      progress: hasSets ? 0 : 100,
      parentHierarchy: this.findParentHierarchy<CardParentHierarchy>(element),
      isIncluded: true,
      isValid: !hasSets,
    };
  }

  /**
   * Calculate card-specific states
   * Aggregates data from all cards and their child sets
   *
   * @returns FormCardState - Complete card state object
   */
  public calculateStates(): FormCardState {
    const currentCard = this.getCurrent();
    const currentCardIndex = currentCard ? currentCard.index : -1;
    const currentCardId = currentCard ? currentCard.id : null;
    const currentCardTitle = currentCard ? currentCard.title : null;
    const previousCardIndex = currentCardIndex > 0 ? currentCardIndex - 1 : null;
    const nextCardIndex = currentCardIndex < this.length - 1 ? currentCardIndex + 1 : null;
    const completedCards = new Set(
      this.getByFilter((item) => item.completed).map((item) => item.id)
    );
    const visitedCards = new Set(this.getByFilter((item) => item.visited).map((item) => item.id));
    const totalCards = this.length;
    const cardsComplete = completedCards.size;
    const cardValidity = this.getAll().reduce(
      (acc, item) => {
        acc[item.id] = item.isValid;
        return acc;
      },
      {} as Record<string, boolean>
    );

    return {
      currentCardIndex,
      currentCardId,
      currentCardTitle,
      activeCardIndices: this.getActiveIndices(),
      previousCardIndex,
      nextCardIndex,
      completedCards,
      visitedCards,
      totalCards,
      cardsComplete,
      cardValidity,
    };
  }

  protected buildItemData(item: CardItem): CardItem {
    const sets = this.form.setManager.getAllByParentId(item.id, 'card');
    const completed = sets.length > 0 ? sets.every((set) => set.completed) : true;
    const isValid = sets.length > 0 ? sets.every((set) => set.isValid) : true;
    const progress =
      sets.length > 0 ? sets.reduce((acc, set) => acc + set.progress, 0) / sets.length : 100;

    return {
      ...item,
      completed,
      isValid,
      progress,
    };
  }

  /**
   * Find the parent item for a card
   *
   * @param element - The card element
   * @returns null (cards have no parent)
   */
  protected findParentItem(element: HTMLElement): undefined {
    this.logWarn('findParentElement should not be called on CardManager', 'runtime', { element });
    return undefined;
  }
}
