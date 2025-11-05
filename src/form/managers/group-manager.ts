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
  SetElement,
  UpdatableElementData,
} from '../types';
import { extractTitle, parseElementAttribute } from '../utils';
import { ElementManager } from './element-manager';

/**
 * GroupManager Implementation
 *
 * Discovers and manages group elements in the form hierarchy.
 * Provides access to groups by index or ID.
 * Associates groups with their parent sets and cards.
 */
export class GroupManager extends ElementManager<GroupElement> {
  protected elements: GroupElement[] = [];
  protected elementMap: Map<string, GroupElement> = new Map();
  protected readonly elementType = 'group';

  /**
   * Create element data object
   * Parses the element attribute and creates a GroupElement object
   *
   * @param element - HTMLElement
   * @param index - Index of the element within the list of groups
   * @returns GroupElement | undefined
   */
  protected createElementData(element: HTMLElement, index: number): GroupElement | undefined {
    if (!(element instanceof HTMLElement)) return;

    const attrValue = element.getAttribute(`${ATTR}-element`);
    if (!attrValue) return;

    const parsed = parseElementAttribute(attrValue);

    // Skip if not a group
    if (parsed.type !== this.elementType) return;

    // Extract title with priority resolution
    const titleData = extractTitle(element, this.elementType, parsed.id, index);

    // Find parent hierarchy
    const parentHierarchy = this.findParentHierarchy<GroupParentHierarchy>(element);
    const active = this.determineActive(element, index);

    // Create group element object
    return {
      element,
      type: this.elementType,
      id: titleData.id,
      title: titleData.title,
      index,
      visited: active,
      completed: false,
      active,
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
    const currentGroupIndex = this.elements.findIndex((element) => element.active);
    const currentGroupId = currentGroupIndex >= 0 ? this.elements[currentGroupIndex].id : null;
    const currentGroupTitle =
      currentGroupIndex >= 0 ? this.elements[currentGroupIndex].title : null;
    const previousGroupIndex = currentGroupIndex > 0 ? currentGroupIndex - 1 : null;
    const nextGroupIndex =
      currentGroupIndex < this.elements.length - 1 ? currentGroupIndex + 1 : null;
    const completedGroups = new Set(
      this.elements.filter((element) => element.completed).map((element) => element.id)
    );
    const visitedGroups = new Set(
      this.elements.filter((element) => element.visited).map((element) => element.id)
    );
    const totalGroups = this.elements.length;
    const groupsComplete = completedGroups.size;
    const groupValidity = this.elements.reduce(
      (acc, element) => {
        acc[element.id] = element.isValid;
        return acc;
      },
      {} as Record<string, boolean>
    );

    return {
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
  }

  /**
   * Update data values
   * @param element - Group Element
   * @param data - Data to merge
   */
  protected mergeElementData(
    element: GroupElement,
    data: UpdatableElementData<GroupElement>
  ): GroupElement {
    const includedFields = this.form.fieldManager
      .getAllByParentId(element.id, 'group')
      .filter((field) => field.isIncluded);

    const completed = includedFields.every((field) => field.completed);
    const isValid = includedFields.every((field) => field.isValid);
    const progress =
      includedFields.filter((field) => field.completed).length / includedFields.length;

    return {
      ...element,
      visited: true,
      completed,
      active: data.active ?? this.determineActive(element.element, element.index),
      isValid,
      progress,
      ...data,
    };
  }

  /**
   * Find the parent element for a group
   *
   * @param element - The set element
   * @returns Parent data or null
   */
  protected findParentElement(element: HTMLElement): SetElement | null {
    return this.findParentBySelector(element, 'set', () => this.form.setManager.getAll());
  }
}
