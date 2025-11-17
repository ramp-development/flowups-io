import { ATTR } from '../constants';
import type {
  CardParentHierarchy,
  FormBehavior,
  ItemData,
  StateForItem,
  UpdatableItemData,
} from '../types';
import { HierarchyBuilder, ItemStore, plural } from '../utils';
import { BaseManager } from './base-manager';

/**
 * Abstract ItemManager class
 * Provides common functionality for all item managers
 */
export abstract class ItemManager<TItem extends ItemData> extends BaseManager {
  protected store = new ItemStore<TItem>();
  protected abstract readonly itemType: string;
  protected navigationOrder: number[] = [];

  // ============================================
  // Abstract Methods
  // ============================================

  protected abstract buildItemData(item: TItem): TItem;
  protected abstract createItemData(element: HTMLElement, index: number): TItem | undefined;
  public abstract calculateStates(): StateForItem<TItem>;
  protected abstract findParentItem(element: HTMLElement): ItemData | undefined;

  // ============================================
  // Lifecycle Methods
  // ============================================

  public init(runOnInitalzed: boolean = true): void {
    this.groupStart(`Initializing ${this.itemType}s`);
    this.discoverItems();
    if (this.itemType !== 'input') this.buildNavigationOrder();
    this.setStates();

    if (runOnInitalzed) this.onInitialized();
  }

  public onInitialized(): void {
    this.logDebug(`Initialized`, { items: this.getAll() });
    this.groupEnd();
  }

  public destroy(): void {
    this.clear();

    this.logDebug(`${this.constructor.name} destroyed`);
  }

  // ============================================
  // Implemented Methods
  // ============================================

  /**
   * Discover all items of this type in the form
   * Finds all items with [${ATTR}-item^="${this.itemType}"]
   */
  protected discoverItems(): void {
    const rootElement = this.form.getRootElement();
    if (!rootElement) {
      throw this.createError(
        `Cannot discover ${this.itemType}s: root element is undefined`,
        'init',
        {
          cause: { manager: this.constructor.name, rootElement },
        }
      );
    }

    // Query all items of this type
    const items = this.form.queryAll(`[${ATTR}-element^="${this.itemType}"]`);

    this.clear();

    items.forEach((item, index) => {
      const itemData = this.createItemData(item, index);
      if (!itemData) return;

      this.add(itemData);
    });

    this.logDebug(`Discovered ${items.length} ${plural(this.itemType, items.length)}`, {
      items,
    });
  }

  /**
   * Update item data
   * TypeScript ensures only valid properties for this item type
   */
  public updateItemData(
    selector: string | number,
    data: UpdatableItemData<TItem> = {} as UpdatableItemData<TItem>
  ): void {
    if (
      (typeof selector === 'number' && selector < 0) ||
      (typeof selector === 'number' && selector >= this.length)
    )
      return;

    const item = this.getBySelector(selector);
    if (!item) {
      this.logWarn(`Cannot update ${this.itemType} data: ${selector} not found`);
      return;
    }

    // Merge data with existing item data
    const updated = this.mergeItemData(item, data);
    this.update(updated);
  }

  /**
   * Merge item data - can be overridden
   * @virtual
   */

  protected mergeItemData(item: TItem, data: UpdatableItemData<TItem>): TItem {
    const builtItem = this.buildItemData(item);
    return {
      ...builtItem,
      visited: true, // Always mark as visited when updated
      ...data,
    } as TItem;
  }

  /**
   * Rebuild item using buildItemData()
   * Ensures item data is fresh before calculating state
   */
  public rebuildItem(item: TItem): void {
    const rebuilt = this.buildItemData(item);
    this.update(rebuilt);
  }

  /**
   * Rebuild all items using buildItemData()
   * Ensures item data is fresh before calculating state
   */
  public rebuildActive(): void {
    const active = this.getActive();
    if (active.length === 0) return;

    active.forEach((item) => {
      const rebuilt = this.buildItemData(item);
      this.update(rebuilt);
    });
  }

  /**
   * Rebuild all items using buildItemData()
   * Ensures item data is fresh before calculating state
   */
  public rebuildAll(): void {
    this.getAll().forEach((item) => {
      this.rebuildItem(item);
    });
  }

  /**
   * Determine if item should be active based on parent and behavior
   * Default implementation - can be overridden if needed
   *
   * @param element - HTMLElement to check
   * @param index - Element index
   * @returns Whether element should be active
   * @virtual
   */
  protected determineActive(element: HTMLElement, index: number): boolean {
    const behavior = this.form.getBehavior();

    // Get parent based on element type
    const parent = this.findParentItem(element);

    // No parent - first element is active
    if (!parent) return index === 0;

    // Behavior determines if only first child is active
    const behaviorRequiresFirstOnly = this.behaviorRequiresFirstChild(behavior);

    return behaviorRequiresFirstOnly ? parent.active && index === 0 : parent.active;
  }

  /**
   * Check if current behavior requires only first child to be active
   * Can be overwritten for item-specific behavior
   * @virtual
   */
  protected behaviorRequiresFirstChild(behavior: FormBehavior): boolean {
    const firstChildBehaviors: Record<FormBehavior, string[]> = {
      byField: ['field', 'group', 'set', 'card'],
      byGroup: ['group', 'set', 'card'],
      bySet: ['set', 'card'],
      byCard: ['card'],
    };

    return firstChildBehaviors[behavior]?.includes(this.itemType) ?? false;
  }

  /**
   * Get all active item indices
   * Returns array of indices for all items marked as active
   * Used by calculateStates() to populate active*Indices arrays
   *
   * @returns Array of active item indices
   */
  protected getActiveIndices(): number[] {
    return this.getByFilter((item) => item.active).map((item) => item.index);
  }

  /**
   * Set an item as current (focused/primary)
   * Automatically clears current flag from all other items
   * Validates that the item is active before setting as current
   *
   * @param selector - Item ID or index
   * @throws Warning if item is not active
   */
  public setCurrent(selector: string | number): void {
    const item = this.getBySelector(selector);
    if (!item) {
      this.logWarn(`Cannot set current: ${this.itemType} not found`, { selector });
      return;
    }

    // Validate: current item must be active
    if (!item.active) {
      this.logWarn(`Cannot set current: ${this.itemType} is not active`, {
        id: item.id,
        index: item.index,
      });

      return;
    }

    // Clear current flag from current item
    this.clearCurrent();
    this.updateItemData(item.index, { current: true } as UpdatableItemData<TItem>);

    this.logDebug(`Set ${this.itemType} "${item.id}" as current`);
  }

  /**
   * Clear current flag from all items
   */
  public clearCurrent(): void {
    const items = this.getByFilter((item) => item.current);
    if (items.length === 0) return;

    items.forEach((item) => {
      this.updateItemData(item.index, { current: false } as UpdatableItemData<TItem>);
    });

    this.logDebug(
      `Cleared current flag from ${items.length} ${plural(this.itemType, items.length)}`
    );
  }

  /**
   * Clear all active and current flags
   * Updates storage not states
   */
  public clearActiveAndCurrent(): void {
    const items = this.getByFilter((item) => item.active || item.current);
    if (items.length === 0) return;

    items.forEach((item) => {
      const updated = { ...item, active: false, current: false } as TItem;
      this.update(updated);
    });

    this.logDebug(
      `Cleared active and current flags from ${items.length} ${plural(this.itemType, items.length)}`
    );
  }

  /**
   * Set active flag
   * Updates storage not states
   */
  public setActive(selector: string | number): void {
    const item = this.getBySelector(selector);
    if (!item) {
      this.logWarn(`Cannot set active: ${this.itemType} not found`, { selector });
      return;
    }

    const updated = { ...item, active: true } as TItem;
    this.update(updated);

    this.logDebug(`Set ${this.itemType} "${item.id}" as active`);
  }

  /**
   * Set active by parent
   * Updates storage not states
   * @param parentId - The parent item ID
   * @param parentType - The parent item type
   * @param options - Active (boolean, defaults to true) and firstIsCurrent (boolean, defaults to false)
   */
  public setActiveByParent(
    parentId: string,
    parentType: 'card' | 'set' | 'group' | 'field',
    options?: { firstIsCurrent?: boolean }
  ): void {
    const { firstIsCurrent = false } = options ?? {};

    const children = this.getItemsByParentId(parentId, parentType);

    children.forEach((item, index) => {
      const builtItem = this.buildItemData(item);
      const updated = {
        ...builtItem,
        active: true,
        current: index === 0 && firstIsCurrent,
      } as TItem;
      this.update(updated);
    });

    this.logDebug(
      `Set ${children.length} ${plural(this.itemType, children.length)} within ${parentType} "${parentId}" as active`
    );
  }

  /**
   * Get items by parent ID
   * Uses type guards to safely access hierarchy properties
   * @virtual
   */
  protected getItemsByParentId(
    parentId: string,
    parentType: 'card' | 'set' | 'group' | 'field'
  ): TItem[] {
    return this.getByFilter((item) => {
      // Cards have no parent
      if (item.type === 'card') return false;

      const { parentHierarchy } = item;
      if (!parentHierarchy) return false;

      // Only Fields have groupId, Groups and Fields have setId, All items (except cards) have cardId
      switch (parentType) {
        case 'field':
          return 'fieldId' in parentHierarchy && parentHierarchy.fieldId === parentId;
        case 'group':
          return 'groupId' in parentHierarchy && parentHierarchy.groupId === parentId;
        case 'set':
          return 'setId' in parentHierarchy && parentHierarchy.setId === parentId;
        case 'card':
          return 'cardId' in parentHierarchy && parentHierarchy.cardId === parentId;
        default:
          return false;
      }
    });
  }

  /**
   * Generic helper to find parent item by selector
   * @param child - The child element
   * @param parentType - The parent type
   * @param getParentItems - The function to get the parent items
   * @returns The parent item or undefined
   */
  protected findParentByElement<T extends ItemData>(
    child: HTMLElement,
    parentType: string,
    getParentItems: () => T[]
  ): T | undefined {
    const parentElement = child.closest(`[${ATTR}-element^="${parentType}"]`);
    if (!parentElement) return undefined;

    const parents = getParentItems();
    const parent = parents.find((parent) => parent.element === parentElement);

    if (!parent) {
      throw this.createError(`Cannot find parent ${parentType}: no parent item found`, 'init', {
        cause: { child, parentElement },
      });
    }

    return parent;
  }

  /**
   * Find parent hierarchy for an item
   * Builds hierarchy object by calling findParentItem recursively
   *
   * @param child - HTMLElement or parent item
   * @returns Parent hierarchy object
   * @throws If called on CardManager (cards have no parent hierarchy)
   * @protected
   */
  protected findParentHierarchy<THierarchy extends CardParentHierarchy>(
    child: HTMLElement | ItemData
  ): THierarchy {
    if (this.itemType === 'card') {
      return { formId: this.form.getId() } as THierarchy;
    }

    // Use HierarchyBuilder
    return HierarchyBuilder.findParentHierarchy<THierarchy>(child, this.form, (child) =>
      this.findParentItem(child)
    );
  }

  /**
   * Build navigation order
   *
   * Creates array of item indexes in display order, skipping excluded
   * To be called after discovery and whenever item visibility changes
   */
  public buildNavigationOrder(): void {
    this.navigationOrder = this.getByFilter((item) =>
      'isIncluded' in item ? item.isIncluded : true
    ).map((item) => item.index);

    // // reduce the navigation order array to say "${index[0].id} --> ${index[1].id} --> ${index[2].id} --> ..."
    // const orderString = this.navigationOrder.reduce(
    //   (acc, index) => {
    //     if (index === 0) return acc;
    //     const item = this.getByIndex(index);
    //     return `${acc} --> ${item?.id}`;
    //   },
    //   `${this.getByIndex(0)?.id}`
    // );

    this.logDebug(`Navigation order built`);
  }

  /**
   * Update item inclusion and rebuild navigation order
   *
   * @param itemId - Item ID
   * @param isIncluded - Whether to include the item in the navigation order
   */
  public handleInclusion(id: string, isIncluded: boolean): void {
    const item = this.getById(id);
    if (!item) return;

    // Type assertion needed because not all TItem types may have isIncluded at compile time
    this.updateItemData(id, { isIncluded } as UpdatableItemData<TItem>);

    // Rebuild navigation order (excludes items with isIncluded: false)
    this.buildNavigationOrder();

    this.logDebug(`${isIncluded ? 'Included' : 'Excluded'} ${this.itemType} "${id}"`);
  }

  // ============================================
  // Expore Store Methods
  // ============================================

  /** Add item to store */
  protected add(item: TItem): void {
    this.store.add(item);
  }

  /** Update item in the store */
  protected update(item: TItem): void {
    this.store.update(item);
  }

  /** Merge item data */
  protected merge(item: TItem, data: Partial<TItem>): void {
    this.store.merge(item, data);
  }

  /** Clear store */
  public clear(): void {
    this.store.clear();
  }

  /** Get all items */
  public getAll(): TItem[] {
    return this.store.getAll();
  }

  /** Get item by id */
  public getById(id: string): TItem | undefined {
    return this.store.getById(id);
  }

  /** Get item by index */
  public getByIndex(index: number): TItem | undefined {
    return this.store.getByIndex(index);
  }

  /** Get item by selector (id or index) */
  public getBySelector(selector: string | number): TItem | undefined {
    return this.store.getBySelector(selector);
  }

  /** Get item by DOM */
  public getByDOM(dom: HTMLElement): TItem | undefined {
    return this.store.getByDOM(dom);
  }

  /** Get items filtered by predicate */
  public getByFilter(predicate: (item: TItem) => boolean): TItem[] {
    return this.store.filter(predicate);
  }

  /** Find item by predicate */
  public getByFind(predicate: (item: TItem) => boolean): TItem | undefined {
    return this.store.find(predicate);
  }

  /** Get count */
  public get length(): number {
    return this.store.length;
  }

  /**
   * Get all active items
   */
  public getActive(): TItem[] {
    return this.getByFilter((item) => item.active);
  }

  /** Get all items by parent ID */
  public getAllByParentId(
    parentId: string,
    parentType: 'card' | 'set' | 'group' | 'field'
  ): TItem[] {
    return this.getByFilter((item) => {
      if (!('parentHierarchy' in item)) return false;
      switch (parentType) {
        case 'card':
          return 'cardId' in item.parentHierarchy && item.parentHierarchy.cardId === parentId;
        case 'set':
          return 'setId' in item.parentHierarchy && item.parentHierarchy.setId === parentId;
        case 'group':
          return 'groupId' in item.parentHierarchy && item.parentHierarchy.groupId === parentId;
        case 'field':
          return 'fieldId' in item.parentHierarchy && item.parentHierarchy.fieldId === parentId;
        default:
          return false;
      }
    });
  }

  /**
   * Get the current item
   */
  public getCurrent(): TItem | undefined {
    return this.getByFind((item) => item.current);
  }

  /**
   * Get the current item index
   */
  public getCurrentIndex(): number {
    const current = this.getCurrent();
    if (!current) return -1;

    return current.index;
  }

  /**
   * Get the current item id
   */
  public getCurrentId(): string | undefined {
    return this.getCurrent()?.id;
  }

  /** Check if first */
  public isFirst(): boolean {
    const currentIndex = this.getCurrentIndex();
    return currentIndex === 0;
  }

  /** Check if last */
  public isLast(): boolean {
    const currentIndex = this.getCurrentIndex();
    return currentIndex === this.length - 1;
  }

  /**
   * Get navigation order
   * @returns Array of item indexes in display order
   */
  public getNavigationOrder(): number[] {
    return this.navigationOrder;
  }

  /**
   * Get next position
   * @returns Next position or undefined if on last position
   */
  public getNextPosition(): number | undefined {
    const currentIndex = this.getCurrentIndex();
    if (currentIndex === undefined) return undefined;

    const currentPosition = this.navigationOrder.indexOf(currentIndex);

    if (currentPosition >= this.navigationOrder.length - 1) {
      return undefined;
    }

    return this.navigationOrder[currentPosition + 1];
  }

  /**
   * Get previous position
   * @returns Previous position or undefined if on first position
   */
  public getPrevPosition(): number | undefined {
    const currentIndex = this.getCurrentIndex();
    if (currentIndex === undefined) return undefined;

    const currentPosition = this.navigationOrder.indexOf(currentIndex);

    if (currentPosition <= 0) {
      return undefined;
    }

    return this.navigationOrder[currentPosition - 1];
  }

  /**
   * Write states to form
   */
  public setStates(): void {
    const states = this.calculateStates();
    this.form.setStates(states as StateForItem<TItem>);
  }
}
