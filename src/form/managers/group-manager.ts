/**
 * Group Manager
 *
 * Handles group discovery and access throughout the form lifecycle.
 * Groups are optional logical subgroups within sets (typically using <fieldset>).
 */

import { ATTR } from '../constants/attr';
import type { FormGroupState, GroupItem, GroupParentHierarchy, SetItem } from '../types';
import { extractTitle, parseElementAttribute } from '../utils';
import { HierarchyBuilder } from '../utils/managers/hierarchy-builder';
import { ItemManager } from './item-manager';

/**
 * GroupManager Implementation
 *
 * Discovers and manages group elements in the form hierarchy.
 * Provides access to groups by index or ID.
 * Associates groups with their parent sets and cards.
 */
export class GroupManager extends ItemManager<GroupItem> {
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
      index,
      id: titleData.id,
      visible: true,
      active,
      type: this.itemType,
      parentHierarchy,
      current: active && index === 0,
      visited: active,
      completed: false,
      title: titleData.title,
      progress: 0,
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
    const nextGroupIndex = currentGroupIndex < this.length - 1 ? currentGroupIndex + 1 : null;
    const completedGroups = new Set(
      this.getByFilter((item) => item.completed).map((item) => item.id)
    );
    const visitedGroups = new Set(this.getByFilter((item) => item.visited).map((item) => item.id));
    const totalGroups = this.length;
    const groupsComplete = completedGroups.size;
    const groupValidity = this.getAll().reduce(
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

  protected buildItemData(item: GroupItem): GroupItem {
    const includedFields = this.form.fieldManager
      .getAllByParentId(item.id, 'group')
      .filter((field) => field.isIncluded);

    const completed = includedFields.every((field) => field.completed);
    const isValid = includedFields.every((field) => field.isValid);
    const progress =
      (includedFields.filter((field) => field.completed).length / includedFields.length) * 100;

    return {
      ...item,
      completed,
      isValid,
      progress,
    };
  }

  /**
   * Find the parent item for a group
   *
   * @param element - The group element
   * @returns Parent data or null
   */
  protected findParentItem(element: HTMLElement): SetItem | undefined {
    return HierarchyBuilder.findParentByElement(element, 'set', () =>
      this.form.setManager.getAll()
    );
  }
}
