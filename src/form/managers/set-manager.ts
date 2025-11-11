/**
 * Set Manager
 *
 * Handles set discovery and access throughout the form lifecycle.
 * Sets are semantic groupings of related fields (typically using <fieldset>).
 */

import { ATTR } from '../constants/attr';
import type {
  CardItem,
  FormSetState,
  SetItem,
  SetParentHierarchy,
  UpdatableItemData,
} from '../types';
import { extractTitle, parseElementAttribute } from '../utils';
import { HierarchyBuilder } from '../utils/managers/hierarchy-builder';
import { ItemManager } from './item-manager';

/**
 * SetManager Implementation
 *
 * Discovers and manages set elements in the form hierarchy.
 * Provides access to sets by index or ID.
 * Associates sets with their parent cards.
 */
export class SetManager extends ItemManager<SetItem> {
  protected readonly itemType = 'set';

  /**
   * Create data object
   * Parses the element attribute and creates a SetItem object
   *
   * @param element - HTMLElement
   * @param index - Index of the element within the list of sets
   * @returns SetItem | undefined
   */
  protected createItemData(element: HTMLElement, index: number): SetItem | undefined {
    if (!(element instanceof HTMLElement)) return;

    const attrValue = element.getAttribute(`${ATTR}-element`);
    if (!attrValue) return;

    const parsed = parseElementAttribute(attrValue);

    // Skip if not a set
    if (parsed.type !== this.itemType) return;

    // Extract title with priority resolution
    const titleData = extractTitle(element, this.itemType, parsed.id, index);

    // Find parent card (if cards exist)
    const parentHierarchy = this.findParentHierarchy<SetParentHierarchy>(element);
    const active = this.determineActive(element, index);

    // Create set item object
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
   * Calculate set-specific states
   * Aggregates data from all sets and their child groups and fields
   *
   * @returns FormSetState - Complete set state object
   */
  public calculateStates(): FormSetState {
    const currentSet = this.getCurrent();
    const currentSetIndex = currentSet ? currentSet.index : -1;
    const currentSetId = currentSet ? currentSet.id : null;
    const currentSetTitle = currentSet ? currentSet.title : null;
    const previousSetIndex = currentSetIndex > 0 ? currentSetIndex - 1 : null;
    const nextSetIndex = currentSetIndex < this.length - 1 ? currentSetIndex + 1 : null;
    const completedSets = new Set(
      this.getByFilter((item) => item.completed).map((item) => item.id)
    );
    const visitedSets = new Set(this.getByFilter((item) => item.visited).map((item) => item.id));
    const totalSets = this.length;
    const setsComplete = completedSets.size;
    const setValidity = this.getAll().reduce(
      (acc, item) => {
        acc[item.id] = item.isValid;
        return acc;
      },
      {} as Record<string, boolean>
    );

    return {
      currentSetIndex,
      currentSetId,
      currentSetTitle,
      activeSetIndices: this.getActiveIndices(),
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
   * @param item - Set Item
   * @param data - Data to merge
   */
  protected mergeItemData(item: SetItem, data: UpdatableItemData<SetItem>): SetItem {
    const groups = this.form.groupManager.getAllByParentId(item.id, 'set');
    const fields = this.form.fieldManager
      .getAllByParentId(item.id, 'set')
      .filter((field) => field.isIncluded);

    const use = groups.length > 0 ? groups : fields;

    const completed = use.every((item) => item.completed);
    const isValid = use.every((item) => item.isValid);
    const progress = use.filter((item) => item.completed).length / use.length;

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
   * Find the parent item for a set
   *
   * @param element - The set element
   * @returns Parent data or null
   */
  protected findParentItem(element: HTMLElement): CardItem | undefined {
    return HierarchyBuilder.findParentByElement(element, 'card', () =>
      this.form.cardManager.getAll()
    );
  }
}
