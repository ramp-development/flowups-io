/**
 * Field Manager
 *
 * Handles field discovery and navigation order.
 */

import { ATTR } from '../constants/attr';
import type { FieldItem, FieldParentHierarchy, FormFieldState, GroupItem, SetItem } from '../types';
import { parseElementAttribute } from '../utils';
import { HierarchyBuilder } from '../utils/managers/hierarchy-builder';
import { ItemManager } from './item-manager';

/**
 * FieldManager Implementation
 *
 * Discovers and manages field elements in the form hierarchy.
 * Builds navigation order.
 */
export class FieldManager extends ItemManager<FieldItem> {
  protected readonly itemType = 'field';

  /**
   * Create data object
   * Parses the element attribute and creates a FieldItem object
   *
   * @param element - HTMLElement
   * @param index - Index of the element within the list of fields
   * @returns FieldItem | undefined
   */
  protected createItemData(element: HTMLElement, index: number): FieldItem | undefined {
    if (!(element instanceof HTMLElement)) return;

    const attrValue = element.getAttribute(`${ATTR}-element`);
    if (!attrValue) return;

    const parsed = parseElementAttribute(attrValue);

    // Skip if not a field
    if (parsed.type !== this.itemType) return;

    // Generate id (use parsed id if available, otherwise generate from index)
    const id = parsed.id || `${this.itemType}-${index}`;

    // Find parent hierarchy
    const parent = this.findParentItem(element);
    if (!parent) {
      throw this.createError('Cannot discover fields: no parent element found', 'init', {
        cause: { manager: 'FieldManager', element },
      });
    }

    const parentHierarchy = this.findParentHierarchy<FieldParentHierarchy>(parent);
    const active = this.determineActive(element, index);

    // Create field item object
    return {
      element,
      index,
      id,
      visible: true,
      active,
      type: this.itemType,
      parentHierarchy,
      current: active && index === 0,
      visited: active,
      completed: false,
      isIncluded: true,
      isValid: false,
    };
  }

  /**
   * Calculate field-specific states
   * Aggregates data from all fields and their child groups and sets
   *
   * @returns FormFieldState - Complete field state object
   */
  public calculateStates(): FormFieldState {
    const currentField = this.getCurrent();
    const currentFieldIndex = currentField ? currentField.index : -1;
    const currentFieldId = currentField ? currentField.id : null;
    const previousFieldIndex = currentFieldIndex > 0 ? currentFieldIndex - 1 : null;
    const nextFieldIndex = currentFieldIndex < this.length - 1 ? currentFieldIndex + 1 : null;
    const completedFields = new Set(
      this.getByFilter((item) => item.completed).map((item) => item.id)
    );
    const visitedFields = new Set(this.getByFilter((item) => item.visited).map((item) => item.id));
    const totalFields = this.length;
    const totalIncludedFields = this.getByFilter((item) => item.isIncluded).length;
    const fieldsComplete = completedFields.size;
    const fieldValidity = this.getAll().reduce(
      (acc, item) => {
        acc[item.id] = item.isValid;
        return acc;
      },
      {} as Record<string, boolean>
    );

    return {
      currentFieldIndex,
      currentFieldId,
      activeFieldIndices: this.getActiveIndices(),
      previousFieldIndex,
      nextFieldIndex,
      completedFields,
      visitedFields,
      totalFields,
      totalIncludedFields,
      fieldsComplete,
      fieldValidity,
    };
  }

  protected buildItemData(item: FieldItem): FieldItem {
    const input = this.form.inputManager.getByFind(
      (input) => input.parentHierarchy.fieldId === item.id
    );

    if (!input) {
      throw this.createError('Cannot merge field data: input not found', 'runtime', {
        cause: { manager: 'FieldManager', element: item, input },
      });
    }

    const { completed, isValid } = input;

    // Evaluate conditional visibility
    const isIncluded = this.form.conditionManager.evaluateElementCondition(item.element);

    return {
      ...item,
      completed,
      isValid,
      isIncluded,
    };
  }

  /**
   * Find the parent item for a field
   *
   * @param element - The field element
   * @returns Parent data or null
   */
  protected findParentItem(element: HTMLElement): GroupItem | SetItem | undefined {
    const parentGroup = HierarchyBuilder.findParentByElement(element, 'group', () =>
      this.form.groupManager.getAll()
    );

    const parentSet = HierarchyBuilder.findParentByElement(element, 'set', () =>
      this.form.setManager.getAll()
    );

    return parentGroup ?? parentSet;
  }
}
