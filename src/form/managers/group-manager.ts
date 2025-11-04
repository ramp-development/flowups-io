/**
 * Group Manager
 *
 * Handles group discovery and access throughout the form lifecycle.
 * Groups are optional logical subgroups within sets (typically using <fieldset>).
 */

import { ATTR } from '../constants/attr';
import type { FormGroupState, GroupElement, IGroupManager } from '../types';
import { extractTitle, parseElementAttribute } from '../utils';
import { BaseManager } from './base-manager';

/**
 * GroupManager Implementation
 *
 * Discovers and manages group elements in the form hierarchy.
 * Provides access to groups by index or ID.
 * Associates groups with their parent sets and cards.
 */
export class GroupManager extends BaseManager implements IGroupManager {
  // ============================================
  // Properties
  // ============================================

  /** Array of discovered group elements with metadata */
  private groups: GroupElement[] = [];

  /** Map for O(1) lookup by group ID */
  private groupMap: Map<string, GroupElement> = new Map();

  // ============================================
  // Lifecycle
  // ============================================

  /**
   * Initialize the manager
   * Called during form initialization
   */
  public init(): void {
    this.discoverGroups();
    this.setStates();

    this.logDebug('GroupManager initialized', {
      totalGroups: this.groups.length,
      groups: this.groups.map((g) => ({
        id: g.id,
        title: g.title,
        index: g.index,
        setId: g.setId,
      })),
    });
  }

  /**
   * Cleanup and remove references
   * Called during form destruction
   */
  public destroy(): void {
    this.groups = [];
    this.groupMap.clear();

    this.logDebug('GroupManager destroyed');
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
      throw this.createError('Cannot discover groups: root element is null', 'init', {
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

      // Find parent hierarchy
      const parentHierarchy = this.findParentHierarchy(element);

      // Create group element object
      const group: GroupElement = {
        element,
        type: 'group',
        id: titleData.id,
        title: titleData.title,
        index,
        visited: false,
        completed: false,
        active: index === 0,
        progress: 0,
        isValid: false,
        setId: parentHierarchy.setId,
        setIndex: parentHierarchy.setIndex,
      };

      // Store in array and map
      this.groups.push(group);
      this.groupMap.set(group.id, group);
    });

    this.logDebug('Groups discovered', {
      count: this.groups.length,
      groups: this.groups.map((g) => ({ id: g.id, title: g.title, setId: g.setId })),
    });
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
  // State Management
  // ============================================

  /**
   * Set the form states for groups
   * Subscribers only notified if the states have changed
   */
  private setStates(): void {
    const currentGroupIndex = this.groups.findIndex((group) => group.active);
    console.log('currentGroupIndex', currentGroupIndex);
    const currentGroupId = this.groups[currentGroupIndex].id;
    console.log('currentGroupId', currentGroupId);
    const currentGroupTitle = this.groups[currentGroupIndex].title;
    console.log('currentGroupTitle', currentGroupTitle);
    const previousGroupIndex = currentGroupIndex > 0 ? currentGroupIndex - 1 : null;
    console.log('previousGroupIndex', previousGroupIndex);
    const nextGroupIndex =
      currentGroupIndex < this.groups.length - 1 ? currentGroupIndex + 1 : null;
    console.log('nextGroupIndex', nextGroupIndex);
    const completedGroups = new Set(
      this.groups.filter((group) => group.completed).map((group) => group.id)
    );
    console.log('completedGroups', completedGroups);
    const visitedGroups = new Set(
      this.groups.filter((group) => group.visited).map((group) => group.id)
    );
    console.log('visitedGroups', visitedGroups);
    const totalGroups = this.groups.length;
    console.log('totalGroups', totalGroups);
    const groupsComplete = completedGroups.size;
    console.log('groupsComplete', groupsComplete);
    const groupProgress = this.groups[currentGroupIndex].progress;
    console.log('groupProgress', groupProgress);
    const groupValidity = this.groups.reduce(
      (acc, group) => {
        acc[group.id] = group.isValid;
        return acc;
      },
      {} as Record<string, boolean>
    );
    console.log('groupValidity', groupValidity);

    const groupState: FormGroupState = {
      currentGroupIndex,
      currentGroupId,
      currentGroupTitle,
      previousGroupIndex,
      nextGroupIndex,
      completedGroups,
      visitedGroups,
      totalGroups,
      groupsComplete,
      groupProgress,
      groupValidity,
    };

    this.form.setStates({ ...groupState });
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

  // ============================================
  // Private Helpers
  // ============================================

  /**
   * Find the parent set and card elements for a group
   *
   * @param groupElement - The group element
   * @returns Parent hierarchy metadata or null
   */
  private findParentHierarchy(groupElement: HTMLElement): { setId: string; setIndex: number } {
    // Find the parent set element
    const parentSetElement = groupElement.closest(`[${ATTR}-element^="set"]`);
    if (!parentSetElement) {
      throw this.createError('Cannot discover groups: no parent set element found', 'init', {
        cause: { manager: 'GroupManager', groupElement },
      });
    }

    // Get the set manager
    const { setManager } = this.form;
    if (!setManager) {
      throw this.createError('Cannot discover groups: set manager is null', 'init', {
        cause: { manager: 'GroupManager', groupElement, setManager },
      });
    }

    // Get the sets
    const sets = setManager.getSets();
    const parentSet = sets.find((set) => set.element === parentSetElement);
    if (!parentSet) {
      throw this.createError('Cannot discover groups: no parent set found', 'init', {
        cause: { manager: 'GroupManager', groupElement, parentSet },
      });
    }

    return {
      setId: parentSet.id,
      setIndex: parentSet.index,
    };
  }
}
