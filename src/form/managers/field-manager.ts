/**
 * Field Manager
 *
 * Handles field discovery and navigation order.
 */

import { ATTR } from '../constants/attr';
import type {
  FieldElement,
  FieldParentHierarchy,
  FormFieldState,
  GroupElement,
  SetElement,
  UpdatableElementData,
} from '../types';
import { parseElementAttribute } from '../utils';
import { ElementManager } from './element-manager';

/**
 * FieldManager Implementation
 *
 * Discovers and manages field elements in the form hierarchy.
 * Builds navigation order.
 */
export class FieldManager extends ElementManager<FieldElement> {
  protected elements: FieldElement[] = [];
  protected elementMap: Map<string, FieldElement> = new Map();
  protected readonly elementType = 'field';
  protected navigationOrder: number[] = [];

  /**
   * Create element data object
   * Parses the element attribute and creates a FieldElement object
   *
   * @param element - HTMLElement
   * @param index - Index of the element within the list of fields
   * @returns FieldElement | undefined
   */
  protected createElementData(element: HTMLElement, index: number): FieldElement | undefined {
    if (!(element instanceof HTMLElement)) return;

    const attrValue = element.getAttribute(`${ATTR}-element`);
    if (!attrValue) return;

    const parsed = parseElementAttribute(attrValue);

    // Skip if not a field
    if (parsed.type !== this.elementType) return;

    // Generate id (use parsed id if available, otherwise generate from index)
    const id = parsed.id || `${this.elementType}-${index}`;

    // Generate title (use id)
    const title = id;

    // Find parent hierarchy
    const parent = this.findParentElement(element);
    if (!parent) {
      throw this.createError('Cannot discover fields: no parent element found', 'init', {
        cause: { manager: 'FieldManager', element },
      });
    }
    // const parent = this.findParentGroup(element) ?? this.findParentSet(element);
    const parentHierarchy = this.findParentHierarchy<FieldParentHierarchy>(parent);
    const active = this.determineActive(element, index);

    // Create field element object
    return {
      element,
      type: this.elementType,
      id,
      title,
      index,
      visited: active,
      completed: false,
      active,
      parentHierarchy,
      isIncluded: true,
      isValid: false,
      errors: [],
    };
  }

  /**
   * Calculate field-specific states
   * Aggregates data from all fields and their child groups and sets
   *
   * @returns FormFieldState - Complete field state object
   */
  public calculateStates(): FormFieldState {
    const currentFieldIndex = this.elements.findIndex((element) => element.active);
    const currentFieldId = currentFieldIndex >= 0 ? this.elements[currentFieldIndex].id : null;
    const previousFieldIndex = currentFieldIndex > 0 ? currentFieldIndex - 1 : null;
    const nextFieldIndex =
      currentFieldIndex < this.elements.length - 1 ? currentFieldIndex + 1 : null;
    const completedFields = new Set(
      this.elements.filter((element) => element.completed).map((element) => element.id)
    );
    const visitedFields = new Set(
      this.elements.filter((element) => element.visited).map((element) => element.id)
    );
    const totalFields = this.elements.length;
    const totalIncludedFields = this.elements.filter((element) => element.isIncluded).length;
    const fieldsComplete = completedFields.size;
    const fieldValidity = this.elements.reduce(
      (acc, element) => {
        acc[element.id] = element.isValid;
        return acc;
      },
      {} as Record<string, boolean>
    );

    return {
      currentFieldIndex,
      currentFieldId,
      activeFieldIndices: [currentFieldIndex],
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
   * @param element - Field Element
   * @param data - Data to merge
   */
  protected mergeElementData(
    element: FieldElement,
    data: UpdatableElementData<FieldElement>
  ): FieldElement {
    const input = this.form.inputManager.getInputByFieldId(element.id);
    if (!input) {
      throw this.createError('Cannot merge field data: input not found', 'runtime', {
        cause: { manager: 'FieldManager', element, input },
      });
    }

    const { completed, isValid } = input;

    return {
      ...element,
      visited: true,
      completed,
      active: data.active ?? this.determineActive(element.element, element.index),
      isValid,
      ...data,
    };
  }

  /**
   * Find the parent element for a field
   *
   * @param element - The field element
   * @returns Parent data or null
   */
  protected findParentElement(element: HTMLElement): GroupElement | SetElement | null {
    const parentGroup = this.findParentBySelector(element, 'group', () =>
      this.form.groupManager.getAll()
    );

    const parentSet = this.findParentBySelector(element, 'set', () =>
      this.form.setManager.getAll()
    );

    return parentGroup ?? parentSet;
  }
}
