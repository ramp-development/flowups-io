import { ATTR } from '../constants';
import type {
  ButtonItem,
  ButtonParentHierarchy,
  ButtonType,
  CardItem,
  SetItem,
  SubmitRequestedEvent,
} from '../types';
import type { NavigationRequestEvent } from '../types/events/navigation-events';
import { parseElementAttribute } from '../utils';
import { HierarchyBuilder } from '../utils/managers/hierarchy-builder';
import { ItemStore } from '../utils/managers/item-store';
import { BaseManager } from './base-manager';

/**
 * ButtonManager Implementation
 *
 * Discover buttons within the form hierarchy.
 * Implements lazy event binding - only the active buttons are bound to events.
 */
export class ButtonManager extends BaseManager {
  private store = new ItemStore<ButtonItem>();

  /** Active event listeners for cleanup */
  private activeListeners: Array<{
    button: HTMLButtonElement;
    index: number;
    type: ButtonType;
    event: 'click';
    handler: EventListener;
  }> = [];

  /**
   * Initialize the manager
   */
  public init(): void {
    this.groupStart(`Initializing Buttons`);
    this.discoverItems();
    this.setupEventListeners();
    this.applyStates(true);

    this.form.logDebug('Initialized');
    this.groupEnd();
  }

  /**
   * Cleanup manager resources
   */
  public destroy(): void {
    this.store.clear();
    this.unbindAllButtons();

    this.form.logDebug('ButtonManager destroyed');
  }

  // ============================================
  // Discovery
  // ============================================

  /**
   * Discover all navigation buttons in the form
   * Finds buttons with [data-form-element="prev"], [data-form-element="next"], [data-form-element="submit"]
   */
  public discoverItems(): void {
    const rootElement = this.form.getRootElement();
    if (!rootElement) {
      throw this.form.createError(
        'Cannot discover navigation buttons: root element is null',
        'init',
        {
          cause: rootElement,
        }
      );
    }

    // Query all buttons
    const items = this.form.queryAll<HTMLElement>(
      `[${ATTR}-element="prev"], [${ATTR}-element="next"], [${ATTR}-element="submit"]`
    );

    this.store.clear();

    items.forEach((item, index) => {
      const itemData = this.createItemData(item, index);
      if (!itemData) return;

      this.store.add(itemData);
    });

    this.form.logDebug(`Discovered ${this.store.length} buttons`, {
      prev: this.store.filter((item) => item.type === 'prev'),
      next: this.store.filter((item) => item.type === 'next'),
      submit: this.store.filter((item) => item.type === 'submit'),
    });
  }

  private createItemData(element: HTMLElement, index: number): ButtonItem | undefined {
    if (!(element instanceof HTMLElement)) return;

    const attrValue = element.getAttribute(`${ATTR}-element`);
    if (!attrValue) return;

    const parsed = parseElementAttribute(attrValue);

    // Skip if not prev, next or submit
    if (!['prev', 'next', 'submit'].includes(parsed.type)) return;

    /**
     * Button is hopefully the element with attribute applied
     * Otherwise, check if there's a button inside
     * Otherwise, check if there's a link inside
     * Otherwise throw an error
     */
    const button =
      element instanceof HTMLButtonElement
        ? element
        : (element.querySelector<HTMLButtonElement>(`button`) ??
          element.querySelector<HTMLAnchorElement>('a'));

    if (!button) {
      throw this.form.createError('Cannot discover navigation buttons: button is null', 'init', {
        cause: element,
      });
    }

    if (button instanceof HTMLAnchorElement) {
      throw this.form.createError('Cannot discover navigation buttons: button is a link', 'init', {
        cause: element,
      });
    }

    const id = `${parsed.type}-button-${index}`;

    // Create button item object
    return this.buildItemData({
      element,
      index,
      id,
      active: false, // Calculated
      type: parsed.type as ButtonType,
      parentHierarchy: this.findParentHierarchy(element),
      button,
      disabled: true, // Calculated
      visible: false, // Calculated
    });
  }

  /**
   * Build button item data
   * Used during discovery and state updates
   * Single source of truth for button data calculation
   */
  private buildItemData(item: ButtonItem): ButtonItem {
    const active = this.determineActive(item.element);
    const visible = this.determineVisible(item.type);
    const enabled = this.determineEnabled(item.type, active && visible);

    return {
      ...item,
      active,
      visible,
      disabled: !enabled,
    };
  }

  /**
   * Determine if item should be active based on parent and behavior
   * Default implementation - can be overridden if needed
   *
   * @param element - HTMLElement to check
   * @returns Whether element should be active
   */
  protected determineActive(element: HTMLElement): boolean {
    // Get parent based on element type
    const parent = this.findParentItem(element);
    return parent ? parent.active : true;
  }

  /**
   * Determine whether a button should be visible
   * - Need to get the parent hierarchy
   * - Check if parent Id is the currently active Card/Set
   */
  private determineVisible(type: ButtonType): boolean {
    const { current, total } = this.getRelevantState();

    switch (type) {
      case 'prev':
        return current > 0;
      case 'next':
        return current !== total - 1;
      case 'submit':
        return current === total - 1;
    }
  }

  private determineEnabled(type: ButtonType, activeAndVisible: boolean = true): boolean {
    if (!activeAndVisible) return false;
    const { current, total } = this.getRelevantState();

    const valid = this.form.inputManager.getActive().every((input) => input.isValid);

    switch (type) {
      case 'prev':
        return current > 0;
      case 'next': // valid && current < total - 1
        return valid && current < total - 1;
      case 'submit': // valid && current === total - 1
        return valid && current === total - 1;
    }
  }

  private getRelevantState(): { current: number; total: number } {
    const behavior = this.form.getBehavior();
    const state = this.form.getAllState();

    let current: number;
    let total: number;

    switch (behavior) {
      case 'byField':
        current = state.currentFieldIndex;
        total = state.totalFields;
        break;
      case 'byGroup':
        current = state.currentGroupIndex;
        total = state.totalGroups;
        break;
      case 'bySet':
        current = state.currentSetIndex;
        total = state.totalSets;
        break;
      case 'byCard':
        current = state.currentCardIndex;
        total = state.totalCards;
        break;
      default:
        throw this.form.createError(
          'Cannot determine button visibility: invalid behavior',
          'init',
          { cause: behavior }
        );
    }

    return { current, total };
  }

  private findParentHierarchy(child: HTMLElement): ButtonParentHierarchy {
    return HierarchyBuilder.findParentHierarchy<ButtonParentHierarchy>(
      child,
      this.form,
      (element) => this.findParentItem(element)
    );
  }

  /**
   * Find the parent item for a field
   *
   * @param element - The field element
   * @returns Parent data or null
   */
  protected findParentItem(element: HTMLElement): CardItem | SetItem | undefined {
    const parentSet = HierarchyBuilder.findParentByElement(element, 'set', () =>
      this.form.setManager.getAll()
    );

    const parentCard = HierarchyBuilder.findParentByElement(element, 'card', () =>
      this.form.cardManager.getAll()
    );

    return parentSet ?? parentCard;
  }

  /**
   * Setup event listeners for button clicks
   */
  private setupEventListeners(): void {
    this.bindActiveButtons();

    this.form.subscribe('form:navigation:changed', () => {
      this.calculateStates();
      this.applyStates();
      this.handleActiveButtons();
    });

    this.form.subscribe('form:input:changed', () => {
      this.calculateStates();
      this.applyStates();
    });

    this.form.logDebug('Event listeners setup');
  }

  // ============================================
  // Bind Listeners
  // ============================================

  /**
   * Bind events to the current buttons
   */
  public bindActiveButtons(): void {
    let boundCount = 0;

    const activeItems = this.getActive();
    activeItems.forEach((item) => {
      const { button } = item;

      // If already bound, skip
      const alreadyBound = this.activeListeners.some((listener) => listener.button === button);
      if (alreadyBound) return;

      // Bind event to button
      const handler: EventListener = () => {
        this.handleClick(item.type);
      };

      button.addEventListener('click', handler);
      this.activeListeners.push({
        button,
        index: item.index,
        type: item.type,
        event: 'click',
        handler,
      });

      this.logDebug(`Bound "click" events to "${item.type}" button`, {
        ...item.parentHierarchy,
      });
      boundCount += 1;
    });

    this.logDebug(`Bound listeners to ${boundCount} button${boundCount !== 1 ? 's' : ''}`);
  }

  /**
   * Unbind all inactive button listeners
   * @internal Used during cleanup
   */
  private unbindInactiveButtons(): void {
    let removedCount = 0;

    const activeItems = this.getActive();
    this.activeListeners = this.activeListeners.filter((listener) => {
      const shouldRemove = !activeItems.find((item) => item.index === listener.index);

      if (shouldRemove) {
        listener.button.removeEventListener(listener.event, listener.handler);
        const parentHierarchy = this.findParentHierarchy(listener.button);
        this.logDebug(`Unbound "${listener.event}" events from ${listener.type} button`, {
          ...parentHierarchy,
        });
        removedCount += 1;
      }

      return !shouldRemove; // Keep listeners that should NOT be removed
    });

    this.logDebug(`Unbound listeners from ${removedCount} input${removedCount !== 1 ? 's' : ''}`);
  }

  /**
   * Unbind all button listeners
   * @internal Used during cleanup
   */
  private unbindAllButtons(): void {
    this.activeListeners.forEach((listener) => {
      listener.button.removeEventListener(listener.event, listener.handler);
    });
    this.activeListeners = [];
  }

  // ============================================
  // Button Click Handlers
  // ============================================

  /**
   * Handle button clicks
   */
  private handleClick = (type: 'prev' | 'next' | 'submit'): void => {
    if (type === 'submit') {
      /** @update submit event and payload */
      const payload: SubmitRequestedEvent = {};
      this.form.logDebug('Submit clicked: requesting form submission', { payload });
      this.form.emit('form:submit:request', payload);
      return;
    }

    const payload: NavigationRequestEvent = { type };
    this.form.logDebug(`Button clicked: requesting navigation to ${type}`, { payload });
    this.form.emit('form:navigation:request', payload);
  };

  // ============================================
  // Button State Management
  // ============================================

  // private handleNavigationChanged(payload: NavigationChangedEvent): void {
  private calculateStates(): void {
    this.getAll().forEach((item) => {
      const updated = this.buildItemData(item);
      this.store.update(updated);
    });
  }

  /**
   * Handle context change
   */
  private handleActiveButtons(): void {
    this.unbindInactiveButtons();
    this.bindActiveButtons();
  }

  /**
   * Update button states based on current navigation position
   * Called after state changes
   */
  public applyStates(isInitial: boolean = false): void {
    this.logDebug(`${isInitial ? 'Initializing' : 'Updating'} button states`);

    this.getAll().forEach((item) => {
      item.button.disabled = item.disabled;
      if (item.visible) {
        item.element.style.removeProperty('display');
      } else {
        item.element.style.display = 'none';
      }
    });
  }

  /**
   * Enable buttons
   * @param items - The buttons to enable/disable
   * @param enabled - true to enable, false to disable
   * @param hide - true to hide, false to show (defaults to false)
   */
  public enableButtons(items: ButtonItem[], enabled: boolean, hide: boolean = false): void {
    items.forEach((item) => {
      item.button.disabled = !enabled;
      if (hide) {
        item.element.style.display = 'none';
      } else {
        item.element.style.removeProperty('display');
      }
    });
  }

  // ============================================
  // Private Helpers
  // ============================================

  /** Get all button elements */
  private getAll(): ButtonItem[] {
    return this.store.getAll();
  }

  /** Get by type */
  private getByType(type: ButtonType): ButtonItem[] {
    return this.store.filter((item) => item.type === type);
  }

  /** Get active */
  private getActive(): ButtonItem[] {
    return this.store.filter((button) => button.active && button.visible);
  }

  /** Get all buttons by parent */
  private getAllByParent(parentHierarchy: ButtonParentHierarchy): ButtonItem[] {
    return this.store.filter((item) => item.parentHierarchy === parentHierarchy);
  }

  /** Get all buttons of type by parent*/
  private getTypeByParent(parentHierarchy: ButtonParentHierarchy, type: ButtonType): ButtonItem[] {
    const allByParent = this.getAllByParent(parentHierarchy);
    return allByParent.filter((button) => button.type === type);
  }
}
