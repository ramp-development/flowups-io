/**
 * Group Manager
 *
 * Handles group discovery and access throughout the form lifecycle.
 * Groups are optional logical subgroups within sets (typically using <fieldset>).
 */

import type { FlowupsForm } from '..';
import { ATTR } from '../constants/attr';
import type { GroupElement, IGroupManager } from '../types';
import { extractTitle, parseElementAttribute } from '../utils';

/**
 * GroupManager Implementation
 *
 * Discovers and manages group elements in the form hierarchy.
 * Provides access to groups by index or ID.
 * Associates groups with their parent sets and cards.
 */
export class GroupManager implements IGroupManager {
  // ============================================
  // Properties
  // ============================================

  /** Reference to parent form component */
  public readonly form: FlowupsForm;

  /** Array of discovered group elements with metadata */
  private groups: GroupElement[] = [];

  /** Map for O(1) lookup by group ID */
  private groupMap: Map<string, GroupElement> = new Map();

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
    this.discoverGroups();

    if (this.form.getFormConfig().debug) {
      this.form.logDebug('GroupManager initialized', {
        totalGroups: this.groups.length,
        groups: this.groups.map((g) => ({
          id: g.id,
          title: g.title,
          index: g.index,
          setId: g.setId,
          cardId: g.cardId,
        })),
      });
    }
  }

  /**
   * Cleanup and remove references
   * Called during form destruction
   */
  public destroy(): void {
    this.groups = [];
    this.groupMap.clear();

    if (this.form.getFormConfig().debug) {
      this.form.logDebug('GroupManager destroyed');
    }
  }

  // ============================================
  // Discovery
  // ============================================

  /**
   * Discover all groups in the form
   *
   * Finds all elements with [data-form-element="group"] or [data-form-element="group:id"]
   * Parses titles/IDs according to priority rules
   * Associates groups with their parent sets and cards
   */
  public discoverGroups(): void {
    const rootElement = this.form.getRootElement();
    if (!rootElement) {
      throw this.form.createError('Cannot discover groups: root element is null', 'init', {
        cause: { manager: 'GroupManager', rootElement },
      });
    }

    // Query all group elements
    const groupElements = this.form.queryAll(`[${ATTR}-element^="group"]`);

    this.groups = [];
    this.groupMap.clear();

    groupElements.forEach((element, index) => {
      if (!(element instanceof HTMLElement)) return;

      const attrValue = element.getAttribute(`${ATTR}-element`);
      if (!attrValue) return;

      const parsed = parseElementAttribute(attrValue);

      // Skip if not a group
      if (parsed.type !== 'group') return;

      // Extract title with priority resolution
      const titleData = extractTitle(element, 'group', parsed.id, index);

      // Find parent set and card (if they exist)
      const parentHierarchy = this.findParentHierarchy(element);

      // Create group element object
      const group: GroupElement = {
        element,
        type: 'group',
        id: titleData.id,
        title: titleData.title,
        index,
        setId: parentHierarchy?.setId || '',
        setIndex: parentHierarchy?.setIndex ?? -1,
        cardId: parentHierarchy?.cardId || '',
        visited: false,
        completed: false,
        active: false,
        fields: [], // Will be populated by FieldManager
      };

      // Store in array and map
      this.groups.push(group);
      this.groupMap.set(group.id, group);
    });

    if (this.form.getFormConfig().debug) {
      this.form.logDebug('Groups discovered', {
        count: this.groups.length,
        groups: this.groups.map((g) => ({ id: g.id, title: g.title, setId: g.setId })),
      });
    }
  }

  /**
   * Extract title from <legend> or attribute
   *
   * Note: This is a convenience method that delegates to extractTitle utility
   * It's part of the interface for backward compatibility
   *
   * @param groupElement - The group element
   * @returns The extracted title
   */
  public extractGroupTitle(groupElement: HTMLElement): string {
    const index = this.groups.findIndex((g) => g.element === groupElement);
    const titleData = extractTitle(groupElement, 'group', undefined, index);
    return titleData.title;
  }

  // ============================================
  // Access Methods
  // ============================================

  /**
   * Get total number of groups
   */
  public getTotalGroups(): number {
    return this.groups.length;
  }

  /**
   * Get group by index
   *
   * @param index - Zero-based group index
   * @returns Group element or null if not found
   */
  public getGroupByIndex(index: number): GroupElement | null {
    const group = this.groups[index];
    return group || null;
  }

  /**
   * Get group by ID
   *
   * @param id - Group ID
   * @returns Group element or null if not found
   */
  public getGroupById(id: string): GroupElement | null {
    const group = this.groupMap.get(id);
    return group || null;
  }

  /**
   * Get current group based on form state
   *
   * @returns Current group element or null
   */
  public getCurrentGroup(): GroupElement | null {
    const currentGroupIndex = this.form.getState('currentGroupIndex');
    return this.getGroupByIndex(currentGroupIndex) || null;
  }

  // ============================================
  // Internal Access (for other managers)
  // ============================================

  /**
   * Get all group metadata
   * Used by other managers for hierarchy traversal
   *
   * @returns Array of group elements
   */
  public getGroups(): GroupElement[] {
    return [...this.groups];
  }

  /**
   * Get group metadata by ID
   * Used by other managers for hierarchy traversal
   *
   * @param id - Group ID
   * @returns Group element or undefined
   */
  public getGroupMetadataById(id: string): GroupElement | undefined {
    return this.groupMap.get(id);
  }

  /**
   * Get group metadata by index
   * Used by other managers for hierarchy traversal
   *
   * @param index - Group index
   * @returns Group element or undefined
   */
  public getGroupMetadataByIndex(index: number): GroupElement | undefined {
    return this.groups[index];
  }

  /**
   * Get all groups within a specific set
   * Used by other managers for set-scoped operations
   *
   * @param setId - Set ID
   * @returns Array of groups in the set
   */
  public getGroupsBySetId(setId: string): GroupElement[] {
    return this.groups.filter((group) => group.setId === setId);
  }

  /**
   * Get all groups within a specific card
   * Used by other managers for card-scoped operations
   *
   * @param cardId - Card ID
   * @returns Array of groups in the card
   */
  public getGroupsByCardId(cardId: string): GroupElement[] {
    return this.groups.filter((group) => group.cardId === cardId);
  }

  // ============================================
  // Private Helpers
  // ============================================

  /**
   * Find the parent set and card elements for a group
   *
   * @param groupElement - The group element
   * @returns Parent hierarchy metadata or null
   */
  private findParentHierarchy(
    groupElement: HTMLElement
  ): { setId: string; setIndex: number; cardId: string } | null {
    // Walk up the DOM tree to find parent set and card
    let current = groupElement.parentElement;
    let parentSet: { id: string; index: number } | null = null;
    let parentCard: { id: string } | null = null;

    while (current && current !== this.form.getRootElement()) {
      const elementAttr = current.getAttribute(`${ATTR}-element`);

      if (elementAttr?.startsWith('set') && !parentSet) {
        // Found a set parent - get its metadata from SetManager
        const { setManager } = this.form;
        if (setManager) {
          const sets = setManager.getSets();
          const set = sets.find((s) => s.element === current);
          if (set) {
            parentSet = { id: set.id, index: set.index };
            // Also get the card from the set if available
            if (set.cardId) {
              parentCard = { id: set.cardId };
            }
          }
        }
      }

      if (elementAttr?.startsWith('card') && !parentCard) {
        // Found a card parent - get its metadata from CardManager
        const { cardManager } = this.form;
        if (cardManager) {
          const cards = cardManager.getCards();
          const card = cards.find((c) => c.element === current);
          if (card) {
            parentCard = { id: card.id };
          }
        }
      }

      // Stop if we've found both
      if (parentSet && parentCard) break;

      current = current.parentElement;
    }

    if (parentSet) {
      return {
        setId: parentSet.id,
        setIndex: parentSet.index,
        cardId: parentCard?.id || '',
      };
    }

    return null;
  }
}
