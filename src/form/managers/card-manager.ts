/**
 * Card Manager
 *
 * Handles card discovery and access throughout the form lifecycle.
 * Cards are optional large UI sections (e.g., intro, form, success).
 */

import { ATTR } from '../constants';
import type {
  CardElement,
  CardParentHierarchy,
  FormCardState,
  UpdatableElementData,
} from '../types';
import { extractTitle, parseElementAttribute } from '../utils';
import { ElementManager } from './element-manager';

/**
 * CardManager Implementation
 *
 * Discovers and manages card elements in the form hierarchy.
 * Provides access to cards by index or ID.
 */
export class CardManager extends ElementManager<CardElement> {
  protected elements: CardElement[] = [];
  protected elementMap: Map<string, CardElement> = new Map();
  protected readonly elementType = 'card';

  /**
   * Create element data object
   * Parses the element attribute and creates a CardElement object
   *
   * @param element - HTMLElement
   * @param index - Index of the element within the list of cards
   * @returns CardElement | undefined
   */
  protected createElementData(element: HTMLElement, index: number): CardElement | undefined {
    if (!(element instanceof HTMLElement)) return;

    const attrValue = element.getAttribute(`${ATTR}-element`);
    if (!attrValue) return;

    const parsed = parseElementAttribute(attrValue);

    // Skip if not a card
    if (parsed.type !== this.elementType) return;

    // Extract title with priority resolution
    const titleData = extractTitle(element, this.elementType, parsed.id, index);

    // Check if the card has any sets
    const hasSets = !!element.querySelector(`[${ATTR}-element^="set"]`);

    // Create card element object
    return {
      element,
      type: this.elementType,
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
    const nextCardIndex = currentCardIndex < this.elements.length - 1 ? currentCardIndex + 1 : null;
    const completedCards = new Set(
      this.elements.filter((element) => element.completed).map((element) => element.id)
    );
    const visitedCards = new Set(
      this.elements.filter((element) => element.visited).map((element) => element.id)
    );
    const totalCards = this.elements.length;
    const cardsComplete = completedCards.size;
    const cardValidity = this.elements.reduce(
      (acc, element) => {
        acc[element.id] = element.isValid;
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

  /**
   * Update data values
   * @param element - Card Element
   * @param data - Data to merge
   */
  protected mergeElementData(
    element: CardElement,
    data: UpdatableElementData<CardElement> = {}
  ): CardElement {
    const sets = this.form.setManager.getAllByParentId(element.id, 'card');
    const completed = sets.length > 0 ? sets.every((set) => set.completed) : true;
    const isValid = sets.length > 0 ? sets.every((set) => set.isValid) : true;
    const progress =
      sets.length > 0 ? sets.reduce((acc, set) => acc + set.progress, 0) / sets.length : 100;

    return {
      ...element,
      visited: true,
      completed,
      isValid,
      progress,
      ...data,
    };
  }

  /**
   * Find the parent element for a card
   *
   * @param element - The card element
   * @returns null (cards have no parent)
   */
  protected findParentElement(element: HTMLElement): null {
    this.logWarn('findParentElement should not be called on CardManager', 'runtime', { element });
    return null;
  }
}
