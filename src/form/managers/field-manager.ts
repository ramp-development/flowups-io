/**
 * Field Manager
 *
 * Handles field discovery and navigation order.
 */

import { ATTR } from '../constants/attr';
import type {
  FieldItem,
  FieldParentHierarchy,
  FormFieldState,
  GroupItem,
  SetItem,
  UpdatableItemData,
} from '../types';
import { parseElementAttribute } from '../utils';
import { ItemManager } from './item-manager';

/**
 * FieldManager Implementation
 *
 * Discovers and manages field elements in the form hierarchy.
 * Builds navigation order.
 */
export class FieldManager extends ItemManager<FieldItem> {
  protected items: FieldItem[] = [];
  protected itemMap: Map<string, FieldItem> = new Map();
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
      type: this.itemType,
      id,
      index,
      visited: active,
      completed: false,
      active,
      current: active && index === 0,
      parentHierarchy,
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
    const nextFieldIndex = currentFieldIndex < this.items.length - 1 ? currentFieldIndex + 1 : null;
    const completedFields = new Set(
      this.items.filter((item) => item.completed).map((item) => item.id)
    );
    const visitedFields = new Set(this.items.filter((item) => item.visited).map((item) => item.id));
    const totalFields = this.items.length;
    const totalIncludedFields = this.items.filter((item) => item.isIncluded).length;
    const fieldsComplete = completedFields.size;
    const fieldValidity = this.items.reduce(
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

  /**
   * Update data values
   * @param item - Field Item
   * @param data - Data to merge
   */
  protected mergeItemData(item: FieldItem, data: UpdatableItemData<FieldItem>): FieldItem {
    const input = this.form.inputManager.getAllByParentId(item.id, 'field')[0];
    if (!input) {
      throw this.createError('Cannot merge field data: input not found', 'runtime', {
        cause: { manager: 'FieldManager', element: item, input },
      });
    }

    const { completed, isValid } = input;

    return {
      ...item,
      visited: true,
      completed,
      active: data.active ?? item.active,
      isValid,
      ...data,
    };
  }

  /**
   * Find the parent item for a field
   *
   * @param element - The field element
   * @returns Parent data or null
   */
  protected findParentItem(element: HTMLElement): GroupItem | SetItem | null {
    const parentGroup = this.findParentByElement(element, 'group', () =>
      this.form.groupManager.getAll()
    );

    const parentSet = this.findParentByElement(element, 'set', () => this.form.setManager.getAll());

    return parentGroup ?? parentSet;
  }
}
