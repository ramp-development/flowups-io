// src/form/managers/element-manager.ts

import type { ElementData, IElementManager, StateForElement, UpdatableElementData } from '../types';
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

  // ============================================
  // Abstract Methods
  // ============================================

  public abstract discoverElements(): void;
  public abstract calculateStates(): Partial<StateForElement<TElement>>;

  // ============================================
  // Implemented Methods
  // ============================================

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
   * Write states to form
   */
  public writeStatesToForm(): void {
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
