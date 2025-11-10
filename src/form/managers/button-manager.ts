import { ATTR } from '../constants';
import type {
  ButtonContext,
  ButtonItem,
  ButtonParentElement,
  ButtonParentHierarchy,
  ButtonType,
  SubmitRequestedEvent,
} from '../types';
import type { NavigationRequestEvent } from '../types/events/navigation-events';
import { BaseManager } from './base-manager';

/**
 * ButtonManager Implementation
 *
 * Discover buttons within the form hierarchy.
 * Implements lazy event binding - only the active buttons are bound to events.
 */
export class ButtonManager extends BaseManager {
  private items: ButtonItem[] = [];
  private itemMap: Map<string, ButtonItem> = new Map();
  private prevButtons: ButtonItem[] = [];
  private nextButtons: ButtonItem[] = [];
  private submitButtons: ButtonItem[] = [];

  /** Active event listeners for cleanup */
  private activeListeners: Array<{
    button: HTMLButtonElement;
    type: ButtonType;
    event: 'click';
    handler: EventListener;
  }> = [];

  /**
   * Initialize the manager
   */
  public init(): void {
    this.groupStart(`Initializing Buttons`);
    this.discoverButtons();
    this.setupEventListeners();
    this.updateButtonStates(true);

    this.form.logDebug('Initialized');
    this.groupEnd();
  }

  /**
   * Cleanup manager resources
   */
  public destroy(): void {
    this.items = [];
    this.itemMap.clear();
    this.prevButtons = [];
    this.nextButtons = [];
    this.submitButtons = [];
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
  public discoverButtons(): void {
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

    this.discoverButtonsForKey(rootElement, 'prev');
    this.discoverButtonsForKey(rootElement, 'next');
    this.discoverButtonsForKey(rootElement, 'submit');

    this.form.logDebug(
      `Discovered ${[...this.prevButtons, ...this.nextButtons, ...this.submitButtons].length} buttons`,
      {
        prev: this.prevButtons,
        next: this.nextButtons,
        submit: this.submitButtons,
      }
    );
  }

  private discoverButtonsForKey(rootElement: HTMLElement, key: ButtonType): void {
    const elements = rootElement.querySelectorAll<HTMLElement>(`[${ATTR}-element="${key}"]`);

    elements.forEach((element, index) => {
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
        throw this.form.createError(
          'Cannot discover navigation buttons: button is a link',
          'init',
          {
            cause: element,
          }
        );
      }

      this[`${key}Buttons`].push({
        element,
        index,
        id: `${key}-button-${index}`,
        active: false,
        current: false,
        visited: false,
        completed: false,
        type: key,
        parentHierarchy: this.findParentHierarchy(element),
        button,
        disabled: button.disabled,
      });
    });
  }

  /**
   * Get the parent hierarchy for a button
   * @param container - The element with `[${ATTR}-element="prev/next/submit"]` applied
   * @returns The parent hierarchy for the button
   */
  private findParentHierarchy(container: HTMLElement): ButtonParentHierarchy {
    // Check if the closest element is a set and return set data if so
    const closestSet = container.closest<HTMLElement>(`[${ATTR}-element="set"]`);
    const closestCard = container.closest<HTMLElement>(`[${ATTR}-element="card"]`);

    const parentElement = closestSet
      ? this.form.setManager.getByDOM(closestSet)
      : closestCard
        ? this.form.cardManager.getByDOM(closestCard)
        : null;
    return parentElement
      ? this.buildHierarchyFromParent(parentElement)
      : { formId: this.form.getId() };
  }

  /**
   * Build hierarchy object from parent element
   * Recursively walks up parent chain
   * @param parent - Card or Set element
   * @returns Hierarchy context for the button
   */
  private buildHierarchyFromParent(parent: ButtonParentElement): ButtonParentHierarchy {
    const hierarchy: Partial<ButtonParentHierarchy> = {
      [`${parent.type}Id`]: parent.id,
      [`${parent.type}Index`]: parent.index,
    };

    // If parent has hierarchy, merge it
    if ('parentHierarchy' in parent && parent.parentHierarchy) {
      Object.assign(hierarchy, parent.parentHierarchy);
    }

    return hierarchy as ButtonParentHierarchy;
  }

  /**
   * Setup event listeners for button clicks
   */
  private setupEventListeners(): void {
    this.bindButtons();

    this.form.subscribe('form:navigation:changed', (payload) => {
      if (payload.to === 'field' || payload.to === 'group') return;
      this.handleContextChange(payload.to);
    });

    this.form.subscribe('form:input:changed', (payload) => {
      this.handleInputChanged(payload);
    });

    this.form.logDebug('Event listeners setup');
  }

  // ============================================
  // Bind Listeners
  // ============================================

  /**
   * Bind events to the current buttons
   */
  public bindButtons(items: ButtonItem[]): void {
    let boundCount = 0;

    items.forEach((item) => {
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

    this.activeListeners = this.activeListeners.filter((listener) => {
      const shouldRemove = true;

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
  private handleInputChanged(): void {
    this.updateButtonStates();
  }

  /**
   * Handle context change
   */
  private handleContextChange(context: ButtonContext): void {
    let parent: ButtonParentElement;
    if (context === 'set') [parent] = this.form.setManager.getAllActive();
    if (context === 'card') [parent] = this.form.cardManager.getAllActive();
    else return;

    const buttonsInContext = this.getAllByParent(parent.parentHierarchy);

    this.unbindAllButtons();
    this.bindButtons(buttonsInContext);
  }

  /**
   * Update button states based on current navigation position
   * Called after state changes
   */
  public updateButtonStates(isInitial: boolean = false): void {
    this.logDebug(`${isInitial ? 'Initializing' : 'Updating'} button states`);

    const {
      totalCards,
      currentCardIndex,
      totalSets,
      currentSetIndex,
      totalGroups,
      currentGroupIndex,
      totalFields,
      currentFieldIndex,
    } = this.form.getAllState();

    let total: number;
    let current: number;

    if (totalCards > 0) {
      total = totalCards;
      current = currentCardIndex;
    } else if (totalSets > 0) {
      total = totalSets;
      current = currentSetIndex;
    } else if (totalGroups > 0) {
      total = totalGroups;
      current = currentGroupIndex;
    } else if (totalFields > 0) {
      total = totalFields;
      current = currentFieldIndex;
    } else {
      total = 0;
      current = 0;
    }

    const inputs = this.form.inputManager.getAllActive();
    const valid = inputs.every((input) => input.isValid);

    this.enableButtons(this.prevButtons, current > 0, current === 0);
    this.enableButtons(this.nextButtons, valid && current < total - 1, current === total - 1);
    this.enableButtons(this.submitButtons, current === total - 1, current !== total - 1);
  }

  /**
   * Toggle navigation
   * @param enabled - Whether to enable navigation (default: toggle current state)
   *
   * @todo call this when button is clicked and again when we want to be interactive again
   */
  public toggleNavigation(enabled?: boolean): void {
    this.navigationEnabled = enabled ?? !this.navigationEnabled;
    this.updateButtonStates();

    this.form.logDebug(`Navigation ${this.navigationEnabled ? 'enabled' : 'disabled'}`);
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
    return [...this.prevButtons, ...this.nextButtons, ...this.submitButtons];
  }

  /** Get all buttons by parent */
  private getAllByParent(parentHierarchy: ButtonParentHierarchy): ButtonItem[] {
    return this.getAll().filter((button) => button.parentHierarchy === parentHierarchy);
  }

  /** Get all buttons of type by parent*/
  private getTypeByParent(parentHierarchy: ButtonParentHierarchy, type: ButtonType): ButtonItem[] {
    const allByParent = this.getAllByParent(parentHierarchy);
    return allByParent.filter((button) => button.type === type);
  }
}
