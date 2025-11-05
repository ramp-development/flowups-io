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
  SetElement,
  SetParentHierarchy,
  UpdatableElementData,
} from '../types';
import { extractTitle, parseElementAttribute } from '../utils';
import { ElementManager } from './element-manager';

/**
 * SetManager Implementation
 *
 * Discovers and manages set elements in the form hierarchy.
 * Provides access to sets by index or ID.
 * Associates sets with their parent cards.
 */
export class SetManager extends ElementManager<SetElement> {
  protected elements: SetElement[] = [];
  protected elementMap: Map<string, SetElement> = new Map();
  protected readonly elementType = 'set';

  /**
   * Create element data object
   * Parses the element attribute and creates a SetElement object
   *
   * @param element - HTMLElement
   * @param index - Index of the element within the list of sets
   * @returns SetElement | undefined
   */
  protected createElementData(element: HTMLElement, index: number): SetElement | undefined {
    if (!(element instanceof HTMLElement)) return;

    const attrValue = element.getAttribute(`${ATTR}-element`);
    if (!attrValue) return;

    const parsed = parseElementAttribute(attrValue);

    // Skip if not a set
    if (parsed.type !== this.elementType) return;

    // Extract title with priority resolution
    const titleData = extractTitle(element, this.elementType, parsed.id, index);

    // Find parent card (if cards exist)
    const parentHierarchy = this.findParentHierarchy<SetParentHierarchy>(element);
    const active = this.determineActive(element, index);

    // Create set element object
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
   * Calculate set-specific states
   * Aggregates data from all sets and their child groups and fields
   *
   * @returns FormSetState - Complete set state object
   */
  public calculateStates(): FormSetState {
    const currentSetIndex = this.elements.findIndex((element) => element.active);
    const currentSetId = currentSetIndex >= 0 ? this.elements[currentSetIndex].id : null;
    const currentSetTitle = currentSetIndex >= 0 ? this.elements[currentSetIndex].title : null;
    const previousSetIndex = currentSetIndex > 0 ? currentSetIndex - 1 : null;
    const nextSetIndex = currentSetIndex < this.elements.length - 1 ? currentSetIndex + 1 : null;
    const completedSets = new Set(
      this.elements.filter((element) => element.completed).map((element) => element.id)
    );
    const visitedSets = new Set(
      this.elements.filter((element) => element.visited).map((element) => element.id)
    );
    const totalSets = this.elements.length;
    const setsComplete = completedSets.size;
    const setValidity = this.elements.reduce(
      (acc, element) => {
        acc[element.id] = element.isValid;
        return acc;
      },
      {} as Record<string, boolean>
    );

    return {
      currentSetIndex,
      currentSetId,
      currentSetTitle,
      activeSetIndices: [currentSetIndex],
      previousSetIndex,
      nextSetIndex,
      completedSets,
      visitedSets,
      totalSets,
      setsComplete,
      setValidity,
    };
  }

  /**
   * Update data values
   * @param element - Set Element
   * @param data - Data to merge
   */
  protected mergeElementData(
    element: SetElement,
    data: UpdatableElementData<SetElement>
  ): SetElement {
    const groups = this.form.groupManager.getAllByParentId(element.id, 'set');
    const fields = this.form.fieldManager
      .getAllByParentId(element.id, 'set')
      .filter((field) => field.isIncluded);

    const use = groups.length > 0 ? groups : fields;

    const completed = use.every((item) => item.completed);
    const isValid = use.every((item) => item.isValid);
    const progress = use.filter((item) => item.completed).length / use.length;

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
   * Find the parent element for a set
   *
   * @param element - The set element
   * @returns Parent data or null
   */
  protected findParentElement(element: HTMLElement): CardElement | null {
    return this.findParentBySelector(element, 'card', () => this.form.cardManager.getAll());
  }
}
