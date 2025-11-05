/**
 * Set Manager
 *
 * Handles set discovery and access throughout the form lifecycle.
 * Sets are semantic groupings of related fields (typically using <fieldset>).
 */

import { ATTR } from '../constants/attr';
import type {
  CardElement,
  FormSetState,
  ISetManager,
  SetElement,
  SetParentHierarchy,
} from '../types';
import { extractTitle, parseElementAttribute } from '../utils';
import { BaseManager } from './base-manager';

/**
 * SetManager Implementation
 *
 * Discovers and manages set elements in the form hierarchy.
 * Provides access to sets by index or ID.
 * Associates sets with their parent cards.
 */
export class SetManager extends BaseManager implements ISetManager {
  // ============================================
  // Properties
  // ============================================

  /** Array of discovered set elements with metadata */
  private sets: SetElement[] = [];

  /** Map for O(1) lookup by set ID */
  private setMap: Map<string, SetElement> = new Map();

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

    this.logDebug('SetManager initialized', {
      totalSets: this.sets.length,
      sets: this.sets,
    });
  }

  /**
   * Cleanup and remove references
   * Called during form destruction
   */
  public destroy(): void {
    this.sets = [];
    this.setMap.clear();

    this.logDebug('SetManager destroyed');
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
      throw this.createError('Cannot discover sets: root element is null', 'init', {
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
      const parentHierarchy = this.findParentHierarchy(element);
      const active = this.determineActive(element, index);

      // Create set element object
      const set: SetElement = {
        element,
        type: 'set',
        id: titleData.id,
        title: titleData.title,
        index,
        visited: active,
        completed: false,
        active,
        progress: 0,
        parentHierarchy,
        isValid: false,
      };

      // Store in array and map
      this.sets.push(set);
      this.setMap.set(set.id, set);

      this.setStates();
    });
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
  public setStates(): void {
    const currentSetIndex = this.sets.findIndex((set) => set.active);
    const currentSetId = currentSetIndex >= 0 ? this.sets[currentSetIndex].id : null;
    const currentSetTitle = currentSetIndex >= 0 ? this.sets[currentSetIndex].title : null;
    const previousSetIndex = currentSetIndex > 0 ? currentSetIndex - 1 : null;
    const nextSetIndex = currentSetIndex < this.sets.length - 1 ? currentSetIndex + 1 : null;
    const completedSets = new Set(this.sets.filter((set) => set.completed).map((set) => set.id));
    const visitedSets = new Set(this.sets.filter((set) => set.visited).map((set) => set.id));
    const totalSets = this.sets.length;
    const setsComplete = completedSets.size;
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
      setValidity,
    };

    this.form.setStates({ ...setState });
  }

  /**
   * Update metadata values
   * @param selector - Set ID or index
   * @param metadata - Metadata to update (visited, completed, active, progress, isValid)
   */
  public setMetadata(
    selector: string | number,
    metadata: Pick<Partial<SetElement>, 'active'> = {}
  ): void {
    const set =
      typeof selector === 'string' ? this.getSetById(selector) : this.getSetByIndex(selector);
    if (!set) return;

    const groups = this.form.groupManager.getGroupsBySetId(set.id);
    const fields = this.form.fieldManager
      .getFieldsBySetId(set.id)
      .filter((field) => field.isIncluded);

    const use = groups.length > 0 ? groups : fields;

    const completed = use.every((item) => item.completed);
    const isValid = use.every((item) => item.isValid);
    const progress = use.filter((item) => item.completed).length / use.length;

    const newData = {
      ...set,
      visited: true,
      completed,
      active: metadata.active ?? this.determineActive(set.element, set.index),
      isValid,
      progress,
    };

    this.setMap.set(set.id, newData);
    this.sets[set.index] = newData;
  }

  /**
   * Determine the active state of a set
   * @param element - Set element
   * @param index - Set index
   * @returns Active state
   */
  private determineActive(element: HTMLElement, index: number): boolean {
    const parentCard = this.findParentCard(element);
    const behavior = this.form.getBehavior();
    return parentCard
      ? ['byField', 'byGroup', 'bySet'].includes(behavior)
        ? parentCard.active && index === 0
        : parentCard.active
      : index === 0;
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
    if (!currentSetIndex) return null;
    return this.getSetByIndex(currentSetIndex);
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
    return this.sets.filter((set) => set.parentHierarchy?.cardId === cardId);
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
  private findParentCard(setElement: HTMLElement): CardElement | null {
    const parentCardElement = setElement.closest(`[${ATTR}-element^="card"]`);
    if (!parentCardElement) return null;

    const { cardManager } = this.form;
    if (!cardManager) {
      throw this.createError('Cannot find parent card: card manager is null', 'init', {
        cause: { manager: 'SetManager', setElement, cardManager },
      });
    }

    const parentCard = cardManager.getCards().find((card) => card.element === parentCardElement);
    if (!parentCard) {
      throw this.createError('Cannot find parent card: no parent card found', 'init', {
        cause: { manager: 'SetManager', setElement, parentCardElement },
      });
    }

    return parentCard;
  }

  /**
   * Find the parent hierarchy for a set
   *
   * @param setElement - The set element
   * @returns Parent hierarchy metadata or null
   */

  private findParentHierarchy(element: HTMLElement | CardElement): SetParentHierarchy {
    let parentCard: CardElement | null;

    if (element instanceof HTMLElement) {
      parentCard = this.findParentCard(element);
    } else {
      parentCard = element;
    }

    return {
      cardId: parentCard?.id || null,
      cardIndex: parentCard?.index || null,
    };
  }
}
