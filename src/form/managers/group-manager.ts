/**
 * Group Manager
 *
 * Handles group discovery and access throughout the form lifecycle.
 * Groups are optional logical subgroups within sets (typically using <fieldset>).
 */

import { ATTR } from '../constants/attr';
import type {
  FormGroupState,
  GroupItem,
  GroupParentHierarchy,
  SetItem,
  UpdatableItemData,
} from '../types';
import { extractTitle, parseElementAttribute } from '../utils';
import { ItemManager } from './item-manager';

/**
 * GroupManager Implementation
 *
 * Discovers and manages group elements in the form hierarchy.
 * Provides access to groups by index or ID.
 * Associates groups with their parent sets and cards.
 */
export class GroupManager extends ItemManager<GroupItem> {
  protected items: GroupItem[] = [];
  protected itemMap: Map<string, GroupItem> = new Map();
  protected readonly itemType = 'group';

  /**
   * Create data object
   * Parses the element attribute and creates a GroupItem object
   *
   * @param element - HTMLElement
   * @param index - Index of the element within the list of groups
   * @returns GroupItem | undefined
   */
  protected createItemData(element: HTMLElement, index: number): GroupItem | undefined {
    if (!(element instanceof HTMLElement)) return;

    const attrValue = element.getAttribute(`${ATTR}-element`);
    if (!attrValue) return;

    const parsed = parseElementAttribute(attrValue);

    // Skip if not a group
    if (parsed.type !== this.itemType) return;

    // Extract title with priority resolution
    const titleData = extractTitle(element, this.itemType, parsed.id, index);

    // Find parent hierarchy
    const parentHierarchy = this.findParentHierarchy<GroupParentHierarchy>(element);
    const active = this.determineActive(element, index);

    // Create group item object
    return {
      element,
      type: this.itemType,
      id: titleData.id,
      title: titleData.title,
      index,
      visited: active,
      completed: false,
      active,
      current: active && index === 0,
      progress: 0,
      parentHierarchy,
      isIncluded: true,
      isValid: false,
    };
  }

  /**
   * Calculate group-specific states
   * Aggregates data from all groups and their child fields
   *
   * @returns FormGroupState - Complete group state object
   */
  public calculateStates(): FormGroupState {
    const currentGroup = this.getCurrent();
    const currentGroupIndex = currentGroup ? currentGroup.index : -1;
    const currentGroupId = currentGroup ? currentGroup.id : null;
    const currentGroupTitle = currentGroup ? currentGroup.title : null;
    const previousGroupIndex = currentGroupIndex > 0 ? currentGroupIndex - 1 : null;
    const nextGroupIndex = currentGroupIndex < this.items.length - 1 ? currentGroupIndex + 1 : null;
    const completedGroups = new Set(
      this.items.filter((item) => item.completed).map((item) => item.id)
    );
    const visitedGroups = new Set(this.items.filter((item) => item.visited).map((item) => item.id));
    const totalGroups = this.items.length;
    const groupsComplete = completedGroups.size;
    const groupValidity = this.items.reduce(
      (acc, item) => {
        acc[item.id] = item.isValid;
        return acc;
      },
      {} as Record<string, boolean>
    );

    return {
      currentGroupIndex,
      currentGroupId,
      currentGroupTitle,
      activeGroupIndices: this.getActiveIndices(),
      previousGroupIndex,
      nextGroupIndex,
      completedGroups,
      visitedGroups,
      totalGroups,
      groupsComplete,
      groupValidity,
    };
  }

  /**
   * Update data values
   * @param item - Group Item
   * @param data - Data to merge
   */
  protected mergeItemData(item: GroupItem, data: UpdatableItemData<GroupItem>): GroupItem {
    const includedFields = this.form.fieldManager
      .getAllByParentId(item.id, 'group')
      .filter((field) => field.isIncluded);

    const completed = includedFields.every((field) => field.completed);
    const isValid = includedFields.every((field) => field.isValid);
    const progress =
      includedFields.filter((field) => field.completed).length / includedFields.length;

    return {
      ...item,
      visited: true,
      completed,
      active: data.active ?? item.active,
      isValid,
      progress,
      ...data,
    };
  }

  /**
   * Find the parent item for a group
   *
   * @param element - The group element
   * @returns Parent data or null
   */
  protected findParentItem(element: HTMLElement): SetItem | null {
    return this.findParentByElement(element, 'set', () => this.form.setManager.getAll());
  }
}
