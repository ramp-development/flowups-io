/**
 * Navigation Manager
 *
 * Handles navigation buttons (prev/next/submit) states based on Form State.
 * coordinates with managers to progress through the form.
 */

import { ATTR } from '../constants/attr';
import type {
  // ButtonContext,
  ButtonItem,
  ButtonParentElement,
  ButtonParentHierarchy,
  ButtonType,
  CardItem,
  FieldItem,
  FormStateKeys,
  GroupItem,
  SetItem,
} from '../types';
import { BaseManager } from './base-manager';

/**
 * NavigationManager Implementation
 *
 * Discovers navigation buttons and emits navigation:next/prev events.
 * Listens for boundary events to update button states.
 */
export class NavigationManager extends BaseManager {
  private prevButtons: ButtonItem[] = [];
  private nextButtons: ButtonItem[] = [];
  private submitButtons: ButtonItem[] = [];
  private navigationEnabled: boolean = true;

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
    this.groupStart(`Initializing Navigation`);
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
    this.prevButtons = [];
    this.nextButtons = [];
    this.submitButtons = [];
    this.unbindAllButtons();

    this.form.logDebug('NavigationManager destroyed');
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

  // ============================================
  // Event Listeners
  // ============================================

  /**
   * Setup event listeners for button clicks and boundary events
   */
  private setupEventListeners(): void {
    this.bindActiveButtons();

    this.form.subscribe('state:changed', (payload) => {
      // payload.key follows pattern `${formName}.${key}`
      const key = payload.key.includes('.')
        ? (payload.key.split('.').pop() as FormStateKeys)
        : (payload.key as FormStateKeys);

      if (!key) return;

      switch (key) {
        case 'formData':
          this.handleNavigationChanged();
          break;
        // case 'activeCardIndices':
        //   this.handleContextChange('card', payload.to as number[]);
        //   break;
        // case 'activeSetIndices':
        //   this.handleContextChange('set', payload.to as number[]);
        //   break;
        default:
          break;
      }
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

    const buttons = this.getAll();
    buttons.forEach((button) => {
      const element = button.button;

      // If already bound, skip - check if any of this input's elements are already bound
      const alreadyBound = this.activeListeners.some((listener) => listener.button === element);
      if (alreadyBound) return;

      // Bind events to ALL elements in the input (for radio/checkbox groups)
      const handler: EventListener = () => {
        this.handleClick(button.type);
      };

      element.addEventListener('click', handler);
      this.activeListeners.push({
        button: element,
        type: button.type,
        event: 'click',
        handler,
      });

      this.logDebug(`Bound "click" events to "${button.type}" button`, {
        ...button.parentHierarchy,
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
   * Handle prev button click
   */
  private handleClick = (type: 'prev' | 'next' | 'submit'): void => {
    if (!this.navigationEnabled) return;

    if (type === 'submit') {
      this.handleSubmit();
      return;
    }

    this.handleMove(type);
  };

  /**
   * Handle next navigation
   * Emits form:navigation:next event for managers to respond to
   */
  public handleMove(direction: 'prev' | 'next'): void {
    if (!this.navigationEnabled) return;

    // const canAdvance = this.validateCurrent();
    // if (!canAdvance) {
    //   this.showValidationErrors();
    //   return;
    // }

    const behavior = this.form.getBehavior();

    let success = false;

    switch (behavior) {
      case 'byField':
        success = this.byField(direction);
        break;
      case 'byGroup':
        success = this.byGroup(direction);
        break;
      case 'bySet':
        success = this.bySet(direction);
        break;
      case 'byCard':
        success = this.byCard(direction);
        break;
      default:
        throw this.form.createError('Invalid behavior', 'runtime', {
          cause: { behavior },
        });
    }

    if (!success) return;

    this.handleNavigationChanged();
  }

  /**
   * Handle submit request
   * Emits form:submit:requested event with button metadata
   * @param button - Button element that triggered the submit
   */
  public async handleSubmit(): Promise<void> {
    const behavior = this.form.getBehavior();

    // // Emit submit requested event
    // this.form.emit('form:submit:requested', { behavior });

    this.form.logDebug('Form submit requested', {
      behavior,
    });
  }

  // /**
  //  * Handle context change
  //  */
  // private handleContextChange(context: ButtonContext, activeIndices: number[]): void {
  //   const buttonsInContext = this.getAllByParent();
  // }

  /**
   * Navigate to next field (byField behavior)
   */
  private byField(direction: 'prev' | 'next'): boolean {
    const targetPosition =
      direction === 'prev'
        ? this.form.fieldManager.getPrevPosition()
        : this.form.fieldManager.getNextPosition();

    // At end of fields - check if we can advance to next group/set/card
    if (targetPosition === null) {
      return this.byGroup(direction);
    }

    const targetField = this.form.fieldManager.getByIndex(targetPosition);
    if (!targetField) {
      throw this.form.createError('Cannot handle navigation: target field is null', 'runtime', {
        cause: { targetPosition, targetField, direction },
      });
    }

    this.clearHierarchyData('field');
    this.setChildrenActive(targetField);
    this.updateHierarchyData(targetField);
    this.batchStateUpdates();

    return true;
  }

  /**
   * Navigate to next group (byGroup behavior)
   */
  private byGroup(direction: 'prev' | 'next'): boolean {
    const targetPosition =
      direction === 'prev'
        ? this.form.groupManager.getPrevPosition()
        : this.form.groupManager.getNextPosition();

    // At end of groups - check if we can advance to next group/set/card
    if (targetPosition === null) {
      return this.bySet(direction);
    }

    const targetGroup = this.form.groupManager.getByIndex(targetPosition);
    if (!targetGroup) {
      throw this.form.createError('Cannot handle navigation: target group is null', 'runtime', {
        cause: { targetPosition, targetGroup, direction },
      });
    }

    // Clear active flags
    this.clearHierarchyData('group');

    // Set new group active and current
    this.form.groupManager.setActive(targetGroup.id);
    this.form.groupManager.setCurrent(targetGroup.id);
    this.setChildrenActive(targetGroup);
    this.updateHierarchyData(targetGroup);
    this.batchStateUpdates();

    return true;
  }

  /**
   * Navigate to next group (byGroup behavior)
   */
  private bySet(direction: 'prev' | 'next'): boolean {
    const targetPosition =
      direction === 'prev'
        ? this.form.setManager.getPrevPosition()
        : this.form.setManager.getNextPosition();

    // At end of sets - check if we can advance to next group/set/card
    if (targetPosition === null) {
      return this.byCard(direction);
    }

    const targetSet = this.form.setManager.getByIndex(targetPosition);
    if (!targetSet) {
      throw this.form.createError('Cannot handle navigation: target set is null', 'runtime', {
        cause: { targetPosition, targetSet, direction },
      });
    }

    // Clear active flags
    this.clearHierarchyData('set');

    // Set new group active and current
    this.form.setManager.setActive(targetSet.id);
    this.form.setManager.setCurrent(targetSet.id);
    this.setChildrenActive(targetSet);
    this.updateHierarchyData(targetSet);
    this.batchStateUpdates();

    return true;
  }

  /**
   * Navigate to next group (byGroup behavior)
   */
  private byCard(direction: 'prev' | 'next'): boolean {
    const targetPosition =
      direction === 'prev'
        ? this.form.cardManager.getPrevPosition()
        : this.form.cardManager.getNextPosition();

    // At end of cards - check if we can advance to next group/set/card
    if (targetPosition === null) {
      // this.handleFormComplete();
      return false;
    }

    const targetCard = this.form.cardManager.getByIndex(targetPosition);
    if (!targetCard) {
      throw this.form.createError('Cannot handle navigation: target card is null', 'runtime', {
        cause: { targetPosition, targetCard, direction },
      });
    }

    // Clear active flags
    this.clearHierarchyData('card');

    // Set new group active and current
    this.form.cardManager.setActive(targetCard.id);
    this.form.cardManager.setCurrent(targetCard.id);
    this.setChildrenActive(targetCard);
    this.batchStateUpdates();

    return true;
  }

  /**
   * Clear child metadata for any element
   * Cascades down the hierarchy: card → set → group → field
   * Clears all levels below and including the given element type
   *
   * @param elementType - The element type to start clearing from
   */
  private clearHierarchyData(elementType: 'card' | 'set' | 'group' | 'field'): void {
    // Clear card and below
    if (elementType === 'card') {
      this.form.cardManager.clearActiveAndCurrent();
    }

    // Clear set and below
    if (elementType === 'card' || elementType === 'set') {
      this.form.setManager.clearActiveAndCurrent();
    }

    // Clear group and below
    if (elementType === 'card' || elementType === 'set' || elementType === 'group') {
      this.form.groupManager.clearActiveAndCurrent();
    }

    // Clear field (always cleared for all element types)
    this.form.fieldManager.clearActiveAndCurrent();
  }

  /**
   * Set children active (first is current)
   */
  private setChildrenActive(element: CardItem | SetItem | GroupItem | FieldItem): void {
    if (element.type === 'card') {
      this.form.setManager.setActiveByParent(element.id, element.type, { firstIsCurrent: true });
    }

    if (element.type === 'card' || element.type === 'set') {
      this.form.groupManager.setActiveByParent(element.id, element.type, { firstIsCurrent: true });
    }

    if (element.type === 'card' || element.type === 'set' || element.type === 'group') {
      this.form.fieldManager.setActiveByParent(element.id, element.type, { firstIsCurrent: true });
    }

    // Set inputs active for ALL active fields (not just current)
    const activeFields = this.form.fieldManager.getAllActive();
    if (activeFields.length === 0) {
      this.form.inputManager.clearActiveAndCurrent();
      return;
    }

    activeFields.forEach((field, index) => {
      this.form.inputManager.setActiveByParent(field.id, 'field', {
        firstIsCurrent: index === 0, // First active field's inputs get first current
      });
    });
  }

  /**
   * Update parent metadata for any element
   * Cascades up the hierarchy: field � group � set � card
   * Only updates parents that exist in the element's hierarchy
   *
   * @param element - Any form element (field, group, set, card)
   */
  private updateHierarchyData(element: SetItem | GroupItem | FieldItem): void {
    // Update group (only if element is a field)
    if (element.type === 'field') {
      const { groupIndex } = element.parentHierarchy;
      if (groupIndex !== null && groupIndex >= 0) {
        this.form.groupManager.clearActiveAndCurrent();
        this.form.groupManager.setActive(groupIndex);
        this.form.groupManager.setCurrent(groupIndex);
        // this.form.groupManager.updateElementData(groupIndex, { active: true, current: true });
      }
    }

    // Update set (if element is field or group)
    if (element.type === 'field' || element.type === 'group') {
      const { setIndex } = element.parentHierarchy;
      if (setIndex !== null && setIndex >= 0) {
        this.form.setManager.clearActiveAndCurrent();
        this.form.setManager.setActive(setIndex);
        this.form.setManager.setCurrent(setIndex);
        // this.form.setManager.updateElementData(setIndex, { active: true, current: true });
      }
    }

    // Update card (always, since all elements have a parent card)
    const { cardIndex } = element.parentHierarchy;
    if (cardIndex !== null && cardIndex >= 0) {
      this.form.cardManager.clearActiveAndCurrent();
      this.form.cardManager.setActive(cardIndex);
      this.form.cardManager.setCurrent(cardIndex);
    }
  }

  /**
   * Batch all manager state calculations into one setStates() call
   * Prevents multiple state:changed events and DisplayManager flicker
   */
  private batchStateUpdates(): void {
    // Collect state from all managers (doesn't write to state yet)
    const allStates = {
      ...this.form.cardManager.calculateStates(),
      ...this.form.setManager.calculateStates(),
      ...this.form.groupManager.calculateStates(),
      ...this.form.fieldManager.calculateStates(),
      ...this.form.inputManager.calculateStates(),
    };

    // Batch update all states
    this.form.setStates(allStates);
  }

  // ============================================
  // Button State Management
  // ============================================

  // private handleNavigationChanged(payload: NavigationChangedEvent): void {
  private handleNavigationChanged(): void {
    this.updateButtonStates();
  }

  /**
   * Update button states based on current navigation position
   * Called after navigation or state changes
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
   */
  public toggleNavigation(enabled?: boolean): void {
    this.navigationEnabled = enabled ?? !this.navigationEnabled;
    this.updateButtonStates();

    this.form.logDebug(`Navigation ${this.navigationEnabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Toggle buttons
   * @param buttons - The buttons to toggle
   * @param enabled - Whether to enable the buttons
   * @param hide - Whether to hide the buttons
   */
  public enableButtons(buttons: ButtonItem[], enabled: boolean, hide: boolean = false): void {
    buttons.forEach((button) => {
      button.button.disabled = !enabled;
      if (hide) {
        button.element.style.display = 'none';
      } else {
        button.element.style.removeProperty('display');
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
