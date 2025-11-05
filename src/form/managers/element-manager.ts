// src/form/managers/element-manager.ts

import { ATTR } from '../constants';
import type {
  ElementData,
  FormBehavior,
  IElementManager,
  SetParentHierarchy,
  StateForElement,
  UpdatableElementData,
} from '../types';
import { BaseManager } from './base-manager';

/**
 * Abstract ElementManager class
 * Provides common functionality for all element managers
 */
export abstract class ElementManager<TElement extends ElementData>
  extends BaseManager
  implements IElementManager<TElement>
{
  // ============================================
  // Abstract Properties
  // ============================================

  protected abstract elements: TElement[];
  protected abstract elementMap: Map<string, TElement>;
  protected abstract readonly elementType: string;
  protected navigationOrder: number[] = [];

  // ============================================
  // Abstract Methods
  // ============================================

  protected abstract createElementData(element: HTMLElement, index: number): TElement | undefined;
  public abstract calculateStates(): StateForElement<TElement>;
  protected abstract findParentElement(element: HTMLElement): ElementData | null;

  // ============================================
  // Lifecycle Methods
  // ============================================

  public init(): void {
    this.discoverElements();
    this.buildNavigationOrder();
    this.setStates();

    this.logDebug(`${this.constructor.name} initialized`, {
      totalElements: this.elements.length,
      includedElements: this.navigationOrder.length,
      elements: this.elements,
    });
  }

  public destroy(): void {
    this.elements = [];
    this.elementMap.clear();

    this.logDebug(`${this.constructor.name} destroyed`);
  }

  // ============================================
  // Implemented Methods
  // ============================================

  /**
   * Discover all elements of this type in the form
   * Finds all elements with [${ATTR}-element^="${this.elementType}"]
   */
  protected discoverElements(): void {
    const rootElement = this.form.getRootElement();
    if (!rootElement) {
      throw this.createError(`Cannot discover ${this.elementType}s: root element is null`, 'init', {
        cause: { manager: this.constructor.name, rootElement },
      });
    }

    // Query all elements of this type
    const elements = this.form.queryAll(`[${ATTR}-element^="${this.elementType}"]`);

    this.elements = [];
    this.elementMap.clear();

    elements.forEach((element, index) => {
      const elementData = this.createElementData(element, index);
      if (!elementData) return;

      this.updateStorage(elementData);
    });
  }

  /**
   * Update element data
   * TypeScript ensures only valid properties for this element type
   */
  public updateElementData(
    selector: string | number,
    data: UpdatableElementData<TElement> = {} as UpdatableElementData<TElement>
  ): void {
    const element =
      typeof selector === 'string' ? this.getById(selector) : this.getByIndex(selector);

    if (!element) {
      this.logWarn(`Update ${this.elementType} data: Element not found`, { selector });
      return;
    }

    // Merge data (can be overridden for custom logic)
    const updated = this.mergeElementData(element, data);

    // Update storage using helper method
    this.updateStorage(updated);

    this.logDebug(`${this.elementType}: Updated element`, {
      id: element.id,
      index: element.index,
      data,
    });
  }

  /**
   * Merge element data - can be overridden
   * @virtual
   */
  protected mergeElementData(element: TElement, data: UpdatableElementData<TElement>): TElement {
    return {
      ...element,
      visited: true, // Always mark as visited when updated
      ...data,
    } as TElement;
  }

  /**
   * Determine if element should be active based on parent and behavior
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
    const parent = this.findParentElement(element);

    if (!parent) {
      // No parent - first element is active
      return index === 0;
    }

    // Behavior determines if only first child is active
    const behaviorRequiresFirstOnly = this.behaviorRequiresFirstChild(behavior);

    return behaviorRequiresFirstOnly ? parent.active && index === 0 : parent.active;
  }

  /**
   * Check if current behavior requires only first child to be active
   * Can be overridden for element-specific behavior
   * @virtual
   */
  protected behaviorRequiresFirstChild(behavior: FormBehavior): boolean {
    const firstChildBehaviors: Record<FormBehavior, string[]> = {
      byField: ['field', 'group', 'set', 'card'],
      byGroup: ['group', 'set', 'card'],
      bySet: ['set', 'card'],
      byCard: ['card'],
    };

    return firstChildBehaviors[behavior]?.includes(this.elementType) ?? false;
  }

  /**
   * Clear all active flags
   */
  public clearActive(): void {
    this.elements.forEach((element) => {
      const updated = { ...element, active: false } as TElement;
      this.updateStorage(updated);
    });

    this.logDebug(`Cleared active flags for all ${this.elementType} elements`, {
      count: this.elements.length,
    });
  }

  /**
   * Set active by parent
   */
  public setActiveByParent(
    parentId: string,
    parentType: 'card' | 'set' | 'group',
    active: boolean = true
  ): void {
    const children = this.getElementsByParentId(parentId, parentType);

    children.forEach((element) => {
      this.updateElementData(element.index, { active } as UpdatableElementData<TElement>);
    });

    this.logDebug(`${this.elementType}: Set active by parent`, {
      parentId,
      parentType,
      active,
      count: children.length,
    });
  }

  /**
   * Get elements by parent ID
   * Uses type guards to safely access hierarchy properties
   * @virtual
   */
  protected getElementsByParentId(
    parentId: string,
    parentType: 'card' | 'set' | 'group'
  ): TElement[] {
    return this.elements.filter((element) => {
      // Cards have no parent
      if (element.type === 'card') return false;

      const { parentHierarchy } = element;
      if (!parentHierarchy) return false;

      // Only Fields have groupId, Groups and Fields have setId, All elements (except cards) have cardId
      switch (parentType) {
        case 'group':
          return 'groupId' in parentHierarchy && parentHierarchy.groupId === parentId;
        case 'set':
          return 'setId' in parentHierarchy && parentHierarchy.setId === parentId;
        case 'card':
          return 'cardId' in parentHierarchy && parentHierarchy.cardId === parentId;
      }
    });
  }

  /**
   * Generic helper to find parent element by selector
   * @param childElement - The child element
   * @param parentType - The parent type
   * @param getParentElements - The function to get the parent elements
   * @returns The parent element or null
   */
  protected findParentBySelector<T extends ElementData>(
    childElement: HTMLElement,
    parentType: string,
    getParentElements: () => T[]
  ): T | null {
    const parentElement = childElement.closest(`[${ATTR}-element^="${parentType}"]`);
    if (!parentElement) return null;

    const parents = getParentElements();
    const parent = parents.find((p) => p.element === parentElement);

    if (!parent) {
      throw this.createError(`Cannot find parent ${parentType}: no parent found`, 'init', {
        cause: { childElement, parentElement },
      });
    }

    return parent;
  }

  /**
   * Find parent hierarchy for an element
   * Builds hierarchy object by calling findParentElement recursively
   *
   * @param element - HTMLElement or parent element
   * @returns Parent hierarchy object
   * @throws If called on CardManager (cards have no parent hierarchy)
   * @protected
   */
  protected findParentHierarchy<THierarchy extends SetParentHierarchy>(
    element: HTMLElement | ElementData
  ): THierarchy {
    if (this.elementType === 'card') {
      throw this.createError('findParentHierarchy should not be called on CardManager', 'runtime');
    }

    let parentElement: ElementData | null;

    if (element instanceof HTMLElement) {
      parentElement = this.findParentElement(element);
    } else {
      parentElement = element;
    }

    // Build hierarchy based on what parent exists
    return this.buildHierarchyFromParent(parentElement) as THierarchy;
  }

  /**
   * Build hierarchy object from parent element
   * Recursively walks up parent chain
   * @virtual - can be overridden for custom hierarchy building
   */
  protected buildHierarchyFromParent(parent: ElementData | null): Record<string, unknown> {
    if (!parent) return {};

    const hierarchy: Record<string, unknown> = {
      [`${parent.type}Id`]: parent.id,
      [`${parent.type}Index`]: parent.index,
    };

    // If parent has hierarchy, merge it
    if ('parentHierarchy' in parent && parent.parentHierarchy) {
      Object.assign(hierarchy, parent.parentHierarchy);
    }

    return hierarchy;
  }

  /**
   * Build navigation order
   *
   * Creates array of element indexes in display order, skipping excluded
   * To be called after discovery and whenever element visibility changes
   */
  public buildNavigationOrder(): void {
    this.navigationOrder = this.elements
      .filter((element) => {
        // Check if element has isIncluded property and if it's true
        return 'isIncluded' in element ? element.isIncluded : true;
      })
      .map((element) => element.index);

    this.logDebug(`${this.elementType} element navigation order built`, {
      total: this.navigationOrder.length,
      order: this.navigationOrder,
    });
  }

  /**
   * Update element inclusion and rebuild navigation order
   *
   * @param elementId - Element ID
   * @param isIncluded - Whether to include the element in the navigation order
   */
  public handleInclusion(id: string, isIncluded: boolean): void {
    const element = this.getById(id);
    if (!element) return;

    // Type assertion needed because not all TElement types may have isIncluded at compile time
    this.updateElementData(id, { isIncluded } as UpdatableElementData<TElement>);

    // Rebuild navigation order (excludes elements with isIncluded: false)
    this.buildNavigationOrder();

    this.logDebug(`Element "${id}" inclusion updated: ${isIncluded}`);
  }

  /**
   * Get the total number of elements
   */
  public getTotal(): number {
    return this.elements.length;
  }

  /**
   * Get element by id
   */
  public getById(id: string): TElement | null {
    return this.elementMap.get(id) || null;
  }

  /**
   * Get element by index
   */
  public getByIndex(index: number): TElement | null {
    return this.elements[index] || null;
  }

  /**
   * Get all elements (returns copy)
   */
  public getAll(): TElement[] {
    return [...this.elements];
  }

  /**
   * Get the current element
   */
  public getCurrent(): TElement | null {
    const element = this.elements.find((element) => element.active);
    return element || null;
  }

  /**
   * Get the current element
   */
  public getCurrentIndex(): number | null {
    const current = this.getCurrent();
    if (!current) return null;

    return current.index;
  }

  /** Check if first */
  public isFirst(): boolean {
    const currentIndex = this.getCurrentIndex();
    return currentIndex === 0;
  }

  /** Check if last */
  public isLast(): boolean {
    const currentIndex = this.getCurrentIndex();
    return currentIndex === this.elements.length - 1;
  }

  /**
   * Get navigation order
   * @returns Array of element indexes in display order
   */
  public getNavigationOrder(): number[] {
    return this.navigationOrder;
  }

  /**
   * Get next position
   * @returns Next position or null if on last position
   */
  public getNextPosition(): number | null {
    const currentIndex = this.getCurrentIndex();
    if (currentIndex === null) return null;

    const currentPosition = this.navigationOrder.indexOf(currentIndex);

    if (currentPosition >= this.navigationOrder.length - 1) {
      return null;
    }

    return this.navigationOrder[currentPosition + 1];
  }

  /**
   * Get previous position
   * @returns Previous position or null if on first position
   */
  public getPrevPosition(): number | null {
    const currentIndex = this.getCurrentIndex();
    if (currentIndex === null) return null;

    const currentPosition = this.navigationOrder.indexOf(currentIndex);

    if (currentPosition <= 0) {
      return null;
    }

    return this.navigationOrder[currentPosition - 1];
  }

  /**
   * Write states to form
   */
  public setStates(): void {
    const states = this.calculateStates();
    this.form.setStates(states as StateForElement<TElement>);
  }

  /**
   * Update storage with the complete element
   * Updates both the array and map
   */
  public updateStorage(element: TElement): void {
    this.elementMap.set(element.id, element);
    this.elements[element.index] = element;
  }
}
