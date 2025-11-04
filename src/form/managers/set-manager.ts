/**
 * Set Manager
 *
 * Handles set discovery and access throughout the form lifecycle.
 * Sets are semantic groupings of related fields (typically using <fieldset>).
 */

import type { FlowupsForm } from '..';
import { ATTR } from '../constants/attr';
import type { FormSetState, ISetManager, SetElement } from '../types';
import { extractTitle, parseElementAttribute } from '../utils';

/**
 * SetManager Implementation
 *
 * Discovers and manages set elements in the form hierarchy.
 * Provides access to sets by index or ID.
 * Associates sets with their parent cards.
 */
export class SetManager implements ISetManager {
  // ============================================
  // Properties
  // ============================================

  /** Reference to parent form component */
  public readonly form: FlowupsForm;

  /** Array of discovered set elements with metadata */
  private sets: SetElement[] = [];

  /** Map for O(1) lookup by set ID */
  private setMap: Map<string, SetElement> = new Map();

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
    this.discoverSets();
    this.setStates();

    if (this.form.getFormConfig().debug) {
      this.form.logDebug('SetManager initialized', {
        totalSets: this.sets.length,
        sets: this.sets.map((s) => ({
          id: s.id,
          title: s.title,
          index: s.index,
          cardId: s.cardId,
        })),
      });
    }
  }

  /**
   * Cleanup and remove references
   * Called during form destruction
   */
  public destroy(): void {
    this.sets = [];
    this.setMap.clear();

    if (this.form.getFormConfig().debug) {
      this.form.logDebug('SetManager destroyed');
    }
  }

  // ============================================
  // Discovery
  // ============================================

  /**
   * Discover all sets in the form
   *
   * Finds all elements with [data-form-element="set"] or [data-form-element="set:id"]
   * Parses titles/IDs according to priority rules
   * Associates sets with their parent cards
   */
  public discoverSets(): void {
    const rootElement = this.form.getRootElement();
    if (!rootElement) {
      throw this.form.createError('Cannot discover sets: root element is null', 'init', {
        cause: { manager: 'SetManager', rootElement },
      });
    }

    // Query all set elements
    const setElements = this.form.queryAll(`[${ATTR}-element^="set"]`);

    this.sets = [];
    this.setMap.clear();

    setElements.forEach((element, index) => {
      if (!(element instanceof HTMLElement)) return;

      const attrValue = element.getAttribute(`${ATTR}-element`);
      if (!attrValue) return;

      const parsed = parseElementAttribute(attrValue);

      // Skip if not a set
      if (parsed.type !== 'set') return;

      // Extract title with priority resolution
      const titleData = extractTitle(element, 'set', parsed.id, index);

      // Find parent card (if cards exist)
      const parentCard = this.findParentCard(element);

      // Create set element object
      const set: SetElement = {
        element,
        type: 'set',
        id: titleData.id,
        title: titleData.title,
        index,
        visited: false,
        completed: false,
        active: index === 0,
        progress: 0,
        cardId: parentCard?.id || null,
        cardIndex: parentCard?.index ?? null,
        isValid: false,
      };

      // Store in array and map
      this.sets.push(set);
      this.setMap.set(set.id, set);
    });

    if (this.form.getFormConfig().debug) {
      this.form.logDebug('Sets discovered', {
        count: this.sets.length,
        sets: this.sets.map((s) => ({ id: s.id, title: s.title, cardId: s.cardId })),
      });
    }
  }

  /**
   * Extract title from <legend> or attribute
   *
   * Note: This is a convenience method that delegates to extractTitle utility
   * It's part of the interface for backward compatibility
   *
   * @param setElement - The set element
   * @returns The extracted title
   */
  public extractSetTitle(setElement: HTMLElement): string {
    const index = this.sets.findIndex((s) => s.element === setElement);
    const titleData = extractTitle(setElement, 'set', undefined, index);
    return titleData.title;
  }

  // ============================================
  // State Management
  // ============================================

  /**
   * Set the form states for sets
   * Subscribers only notified if the states have changed
   */
  private setStates(): void {
    const currentSetIndex = this.sets.findIndex((set) => set.active);
    const currentSetId = this.sets[currentSetIndex].id;
    const currentSetTitle = this.sets[currentSetIndex].title;
    const previousSetIndex = currentSetIndex > 0 ? currentSetIndex - 1 : null;
    const nextSetIndex = currentSetIndex < this.sets.length - 1 ? currentSetIndex + 1 : null;
    const completedSets = new Set(this.sets.filter((set) => set.completed).map((set) => set.id));
    const visitedSets = new Set(this.sets.filter((set) => set.visited).map((set) => set.id));
    const totalSets = this.sets.length;
    const setsComplete = completedSets.size;
    const setProgress = this.sets[currentSetIndex].progress;
    const setValidity = this.sets.reduce(
      (acc, set) => {
        acc[set.id] = set.isValid;
        return acc;
      },
      {} as Record<string, boolean>
    );

    const setState: FormSetState = {
      currentSetIndex,
      currentSetId,
      currentSetTitle,
      previousSetIndex,
      nextSetIndex,
      completedSets,
      visitedSets,
      totalSets,
      setsComplete,
      setProgress,
      setValidity,
    };

    this.form.setStates({ ...setState });
  }

  // ============================================
  // Access Methods
  // ============================================

  /**
   * Get total number of sets
   */
  public getTotalSets(): number {
    return this.sets.length;
  }

  /**
   * Get set by index
   *
   * @param index - Zero-based set index
   * @returns Set element or null if not found
   */
  public getSetByIndex(index: number): SetElement | null {
    const set = this.sets[index];
    return set || null;
  }

  /**
   * Get set by ID
   *
   * @param id - Set ID
   * @returns Set element or null if not found
   */
  public getSetById(id: string): SetElement | null {
    const set = this.setMap.get(id);
    return set || null;
  }

  /**
   * Get current set based on form state
   *
   * @returns Current set element or null
   */
  public getCurrentSet(): SetElement | null {
    const currentSetIndex = this.form.getState('currentSetIndex');
    return this.getSetByIndex(currentSetIndex) || null;
  }

  // ============================================
  // Internal Access (for other managers)
  // ============================================

  /**
   * Get all set metadata
   * Used by other managers for hierarchy traversal
   *
   * @returns Array of set elements
   */
  public getSets(): SetElement[] {
    return [...this.sets];
  }

  /**
   * Get set metadata by ID
   * Used by other managers for hierarchy traversal
   *
   * @param id - Set ID
   * @returns Set element or undefined
   */
  public getSetMetadataById(id: string): SetElement | undefined {
    return this.setMap.get(id);
  }

  /**
   * Get set metadata by index
   * Used by other managers for hierarchy traversal
   *
   * @param index - Set index
   * @returns Set element or undefined
   */
  public getSetMetadataByIndex(index: number): SetElement | undefined {
    return this.sets[index];
  }

  /**
   * Get all sets within a specific card
   * Used by other managers for card-scoped operations
   *
   * @param cardId - Card ID
   * @returns Array of sets in the card
   */
  public getSetsByCardId(cardId: string): SetElement[] {
    return this.sets.filter((set) => set.cardId === cardId);
  }

  // ============================================
  // Private Helpers
  // ============================================

  /**
   * Find the parent card element for a set
   *
   * @param setElement - The set element
   * @returns Parent card metadata or null
   */
  private findParentCard(setElement: HTMLElement): { id: string; index: number } | null {
    // Walk up the DOM tree to find parent card
    let current = setElement.parentElement;

    while (current && current !== this.form.getRootElement()) {
      const elementAttr = current.getAttribute(`${ATTR}-element`);
      if (elementAttr?.startsWith('card')) {
        // Found a card parent - get its metadata from CardManager
        const { cardManager } = this.form;
        if (cardManager) {
          const cards = cardManager.getCards();
          const card = cards.find((c) => c.element === current);
          if (card) {
            return { id: card.id, index: card.index };
          }
        }
        break;
      }
      current = current.parentElement;
    }

    return null;
  }
}
