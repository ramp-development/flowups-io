/**
 * Group Manager
 *
 * Handles group discovery and access throughout the form lifecycle.
 * Groups are optional logical subgroups within sets (typically using <fieldset>).
 */

import { ATTR } from '../constants/attr';
import type {
  FormGroupState,
  GroupElement,
  GroupParentHierarchy,
  IGroupManager,
  SetElement,
} from '../types';
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
      groups: this.groups,
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
      const parentSet = this.findParentSet(element);
      const parentHierarchy = this.findParentHierarchy(parentSet);
      const active = this.determineActive(element, index);

      // Create group element object
      const group: GroupElement = {
        element,
        type: 'group',
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
      this.groups.push(group);
      this.groupMap.set(group.id, group);

      this.setStates();
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
  public setStates(): void {
    const currentGroupIndex = this.groups.findIndex((group) => group.active);
    const currentGroupId = currentGroupIndex >= 0 ? this.groups[currentGroupIndex].id : null;
    const currentGroupTitle = currentGroupIndex >= 0 ? this.groups[currentGroupIndex].title : null;
    const previousGroupIndex = currentGroupIndex > 0 ? currentGroupIndex - 1 : null;
    const nextGroupIndex =
      currentGroupIndex < this.groups.length - 1 ? currentGroupIndex + 1 : null;
    const completedGroups = new Set(
      this.groups.filter((group) => group.completed).map((group) => group.id)
    );
    const visitedGroups = new Set(
      this.groups.filter((group) => group.visited).map((group) => group.id)
    );
    const totalGroups = this.groups.length;
    const groupsComplete = completedGroups.size;
    const groupValidity = this.groups.reduce(
      (acc, group) => {
        acc[group.id] = group.isValid;
        return acc;
      },
      {} as Record<string, boolean>
    );

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
      groupValidity,
    };

    this.form.setStates({ ...groupState });
  }

  /**
   * Update metadata values
   * @param selector - Group ID or index
   * @param metadata - Metadata to update (visited, completed, active, progress, isValid)
   */
  public setMetadata(
    selector: string | number,
    metadata: Pick<Partial<GroupElement>, 'active'> = {}
  ): void {
    const group =
      typeof selector === 'string' ? this.getGroupById(selector) : this.getGroupByIndex(selector);
    if (!group) return;

    const includedFields = this.form.fieldManager
      .getFieldsByGroupId(group.id)
      .filter((field) => field.isIncluded);

    const completed = includedFields.every((field) => field.completed);
    const isValid = includedFields.every((field) => field.isValid);
    const progress =
      includedFields.filter((field) => field.completed).length / includedFields.length;

    const newData = {
      ...group,
      visited: true,
      completed,
      active: metadata.active ?? this.determineActive(group.element, group.index),
      isValid,
      progress,
    };

    this.groupMap.set(group.id, newData);
    this.groups[group.index] = newData;

    console.log('groupManager setMetadata', newData);
    console.log(this.groups);
    console.log(this.groupMap);
  }

  /**
   * Determine the active state of a group
   * @param element - Group element
   * @param index - Group index
   * @returns Active state
   */
  private determineActive(element: HTMLElement, index: number): boolean {
    const parentSet = this.findParentSet(element);
    const behavior = this.form.getBehavior();
    return ['byField', 'byGroup'].includes(behavior)
      ? parentSet.active && index === 0
      : parentSet.active;
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
    if (!currentGroupIndex) return null;
    return this.getGroupByIndex(currentGroupIndex);
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
    return this.groups.filter((group) => group.parentHierarchy.setId === setId);
  }

  // ============================================
  // Private Helpers
  // ============================================

  /**
   * Find the parent set element for a group
   *
   * @param groupElement - The set element
   * @returns Parent set metadata
   */

  private findParentSet(groupElement: HTMLElement): SetElement {
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

    return parentSet;
  }

  /**
   * Find the parent set and card elements for a group
   *
   * @param groupElement - The group element
   * @returns Parent hierarchy metadata or null
   */
  private findParentHierarchy(element: HTMLElement | SetElement): GroupParentHierarchy {
    let parentSet: SetElement;

    if (element instanceof HTMLElement) {
      parentSet = this.findParentSet(element);
    } else {
      parentSet = element;
    }

    return {
      setId: parentSet.id,
      setIndex: parentSet.index,
      ...parentSet.parentHierarchy,
    };
  }
}
