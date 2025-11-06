/**
 * Navigation Manager
 *
 * Handles navigation buttons (prev/next) and coordinates with managers based on behavior.
 * Emits navigation commands that managers respond to based on current behavior mode.
 */

import { ATTR } from '../constants/attr';
import type {
  ButtonElement,
  CardElement,
  FieldElement,
  GroupElement,
  INavigationManager,
  SetElement,
} from '../types';
// import type { NavigationChangedEvent } from '../types/events/navigation-events';
import { BaseManager } from './base-manager';

/**
 * NavigationManager Implementation
 *
 * Discovers navigation buttons and emits navigation:next/prev events.
 * Listens for boundary events to update button states.
 */
export class NavigationManager extends BaseManager implements INavigationManager {
  private prevButtons: ButtonElement[] = [];
  private nextButtons: ButtonElement[] = [];
  private submitButtons: ButtonElement[] = [];

  /** Whether navigation is currently enabled */
  private navigationEnabled: boolean = true;

  /**
   * Initialize the manager
   */
  public init(): void {
    this.discoverButtons();
    this.setupEventListeners();
    this.updateButtonStates();

    this.form.logDebug('NavigationManager initialized', {
      prevButtons: this.prevButtons.length,
      nextButtons: this.nextButtons.length,
      submitButtons: this.submitButtons.length,
    });
  }

  /**
   * Cleanup manager resources
   */
  public destroy(): void {
    this.prevButtons = [];
    this.nextButtons = [];
    this.submitButtons = [];

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

    this.form.logDebug('Navigation buttons discovered', {
      prev: this.prevButtons.length,
      next: this.nextButtons.length,
      submit: this.submitButtons.length,
    });
  }

  private discoverButtonsForKey(rootElement: HTMLElement, key: 'prev' | 'next' | 'submit'): void {
    const elements = rootElement.querySelectorAll<HTMLElement>(`[${ATTR}-element="${key}"]`);

    elements.forEach((element) => {
      const button = element.querySelector<HTMLButtonElement>(`button`);
      if (!button) {
        throw this.form.createError('Cannot discover navigation buttons: button is null', 'init', {
          cause: element,
        });
      }
      this[`${key}Buttons`].push({
        container: element,
        button,
        type: key,
        disabled: button.disabled,
      });
    });
  }

  // ============================================
  // Event Listeners
  // ============================================

  /**
   * Setup event listeners for button clicks and boundary events
   */
  private setupEventListeners(): void {
    // Bind click handlers to buttons
    this.prevButtons.forEach((button) => {
      button.button.addEventListener('click', this.handlePrevClick);
    });

    this.nextButtons.forEach((button) => {
      button.button.addEventListener('click', this.handleNextClick);
    });

    this.submitButtons.forEach((button) => {
      button.button.addEventListener('click', this.handleSubmitClick);
    });

    // this.form.subscribe('form:navigation:changed', (payload) => {
    this.form.subscribe('form:navigation:changed', () => {
      // this.handleNavigationChanged(payload);
      this.handleNavigationChanged();
    });

    this.form.logDebug('NavigationManager event listeners setup');
  }

  // ============================================
  // Button Click Handlers
  // ============================================

  /**
   * Handle prev button click
   */
  private handlePrevClick = (): void => {
    if (!this.navigationEnabled) return;

    this.handleMove('prev');
  };

  /**
   * Handle next button click
   */
  private handleNextClick = (): void => {
    if (!this.navigationEnabled) return;

    this.handleMove('next');
  };

  /**
   * Handle submit button click
   */
  private handleSubmitClick = (event: Event): void => {
    if (!this.navigationEnabled) return;

    const button = event.currentTarget as HTMLButtonElement;
    this.handleSubmit(button);
  };

  // /**
  //  * Handle previous navigation
  //  * Emits form:navigation:prev event for managers to respond to
  //  */
  // public async handlePrev(): Promise<void> {
  //   if (!this.navigationEnabled) return;

  //   const behavior = this.form.getBehavior();

  //   // Emit navigation command
  //   this.form.emit('form:navigation:prev', { behavior });

  //   this.form.logDebug('Navigation prev triggered', { behavior });
  // }

  /**
   * Handle next navigation
   * Emits form:navigation:next event for managers to respond to
   */
  public handleMove(direction: 'prev' | 'next'): void {
    if (!this.navigationEnabled) return;

    // const canAdvance = await this.validateCurrent();
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

    // Emit navigation command
    this.form.emit(`form:navigation:changed`, { direction });

    this.logDebug('Navigation next triggered', { behavior });
  }

  /**
   * Handle submit request
   * Emits form:submit:requested event with button metadata
   * @param button - Button element that triggered the submit
   */
  public async handleSubmit(button: HTMLButtonElement): Promise<void> {
    const behavior = this.form.getBehavior();

    // Check for optional attributes on the button
    const skipValidation = button.hasAttribute(`${ATTR}-skipvalidation`);
    const action = button.getAttribute(`${ATTR}-action`) || undefined;

    // Emit submit requested event
    this.form.emit('form:submit:requested', {
      behavior,
      button,
      skipValidation,
      action,
    });

    this.form.logDebug('Form submit requested', {
      behavior,
      skipValidation,
      action,
    });
  }

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
  private setChildrenActive(element: CardElement | SetElement | GroupElement | FieldElement): void {
    if (element.type === 'card') {
      this.form.setManager.setActiveByParent(element.id, element.type, { firstIsCurrent: true });
    }

    if (element.type === 'card' || element.type === 'set') {
      this.form.groupManager.setActiveByParent(element.id, element.type, { firstIsCurrent: true });
    }

    if (element.type === 'card' || element.type === 'set' || element.type === 'group') {
      this.form.fieldManager.setActiveByParent(element.id, element.type, { firstIsCurrent: true });
    }

    const currentFieldId = this.form.fieldManager.getCurrentId();
    if (!currentFieldId) {
      this.form.inputManager.clearActiveAndCurrent();
      return;
    }

    this.form.inputManager.setActiveByParent(currentFieldId, 'field', {
      firstIsCurrent: true,
    });
  }

  /**
   * Update parent metadata for any element
   * Cascades up the hierarchy: field � group � set � card
   * Only updates parents that exist in the element's hierarchy
   *
   * @param element - Any form element (field, group, set, card)
   */
  private updateHierarchyData(element: SetElement | GroupElement | FieldElement): void {
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

  // /**
  //  * Handle boundary conditions (end of fields/groups/sets)
  //  * Determines if we can advance to next container level
  //  *
  //  * @param boundary - 'start' or 'end' of current level
  //  * @param direction - 'forward' or 'backward'
  //  */
  // private async handleBoundary(
  //   boundary: 'start' | 'end',
  //   direction: 'forward' | 'backward'
  // ): Promise<void> {
  //   const behavior = this.form.getBehavior();

  //   if (boundary === 'end' && direction === 'forward') {
  //     // End of the current level - try to advance forward

  //     if (behavior === 'byField') {
  //       const nextGroupPosition = this.form.groupManager.getNextPosition();
  //       if (nextGroupPosition !== null) {
  //         await this.nextGroup();
  //         return;
  //       }
  //     }

  //     if (behavior === 'byField' || behavior === 'byGroup') {
  //       // Try next set
  //       const nextSetPosition = this.form.setManager.getNextPosition();
  //       if (nextSetPosition !== null) {
  //         await this.nextSet();
  //         return;
  //       }
  //     }

  //     if (behavior === 'byField' || behavior === 'byGroup' || behavior === 'bySet') {
  //       // Try next card
  //       const nextCardPosition = this.form.cardManager.getNextPosition();
  //       if (nextCardPosition !== null) {
  //         await this.nextCard();
  //         return;
  //       }
  //     }

  //     // At end of form
  //     this.handleFormComplete();
  //     return;
  //   }

  //   if (behavior === 'byField') {
  //     // At end of fields - check if we can move to next group
  //     const currentField = this.form.fieldManager.getCurrent();
  //     if (!currentField) return;

  //     const { groupId, setId, cardId } = currentField.parentHierarchy;

  //     // Try next group in current set
  //     if (groupId) {
  //       const currentGroup = this.form.groupManager.getById(groupId);
  //       const nextGroupPosition = this.form.groupManager.getNextPosition();
  //       if (!nextGroupPosition) return;
  //       const nextGroup = this.form.groupManager.getByIndex(nextGroupPosition);

  //       if (nextGroup && nextGroup.parentHierarchy.setId === setId) {
  //         // Move to first field in next group
  //         this.form.groupManager.setMetadata(nextGroup.index, { active: true });
  //         const firstField = this.form.fieldManager.getFieldsByGroupId(nextGroup.id)[0];
  //         if (firstField) {
  //           this.form.fieldManager.setMetadata(firstField.index, { active: true });
  //           await this.batchStateUpdates();
  //           return;
  //         }
  //       }
  //     }

  //     // Try next set in current card
  //     if (setId) {
  //       const nextSet = this.form.setManager.getNextIncludedSet();

  //       if (nextSet && nextSet.parentHierarchy.cardId === cardId) {
  //         // Move to first group/field in next set
  //         await this.goToSet(nextSet);
  //         return;
  //       }
  //     }

  //     // Try next card
  //     const nextCard = this.form.cardManager.getNextIncludedCard();
  //     if (nextCard) {
  //       await this.goToCard(nextCard);
  //       return;
  //     }

  //     // At end of form
  //     this.handleFormComplete();
  //   }

  //   // Similar logic for byGroup, bySet behaviors
  //   // ...
  // }

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
  public updateButtonStates(): void {
    // this.handleNavigationButtonStates();
    this.handlePrevButtonStates();
    this.handleNextButtonStates();
    this.handleSubmitButtonStates();

    // const currentFieldIndex = this.form.getState('currentFieldIndex');
    // const navigationOrder = this.form.fieldManager.getNavigationOrder();

    // if (navigationOrder.length === 0) {
    //   this.disableButtons([...this.prevButtons, ...this.nextButtons]);
    //   return;
    // }

    // const currentPositionInOrder = navigationOrder.indexOf(currentFieldIndex);

    // // Update prev buttons (disabled if at first field)
    // if (currentPositionInOrder === 0) {
    //   this.disableButtons(this.prevButtons);
    // } else {
    //   this.enableButtons(this.prevButtons);
    // }

    // // Update next buttons (disabled if at last field)
    // if (currentPositionInOrder === navigationOrder.length - 1) {
    //   this.disableButtons(this.nextButtons);
    // } else {
    //   this.enableButtons(this.nextButtons);
    // }
  }

  private handleNavigationButtonStates(): void {
    const inputs = this.form.inputManager.getAllActive();
    const valid = inputs.every((input) => input.isValid);

    this.enableButtons(this.nextButtons, valid);
  }

  private handlePrevButtonStates(): void {
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

    if (totalCards > 0) {
      this.enableButtons(this.prevButtons, currentCardIndex > 0, currentCardIndex === 0);
    } else if (totalSets > 0) {
      this.enableButtons(this.prevButtons, currentSetIndex > 0, currentSetIndex === 0);
    } else if (totalGroups > 0) {
      this.enableButtons(this.prevButtons, currentGroupIndex > 0, currentGroupIndex === 0);
    } else if (totalFields > 0) {
      this.enableButtons(this.prevButtons, currentFieldIndex > 0, currentFieldIndex === 0);
    } else {
      this.enableButtons(this.prevButtons, true);
    }
  }

  private handleNextButtonStates(): void {
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

    const behavior = this.form.getBehavior();

    switch (behavior) {
      case 'byField':
        this.enableButtons(
          this.nextButtons,
          currentFieldIndex < totalFields - 1,
          currentFieldIndex === totalFields - 1
        );
        break;
      case 'byGroup':
        this.enableButtons(
          this.nextButtons,
          currentGroupIndex < totalGroups - 1,
          currentGroupIndex === totalGroups - 1
        );
        break;
      case 'bySet':
        this.enableButtons(
          this.nextButtons,
          currentSetIndex < totalSets - 1,
          currentSetIndex === totalSets - 1
        );
        break;
      case 'byCard':
        this.enableButtons(
          this.nextButtons,
          currentCardIndex < totalCards - 1,
          currentCardIndex === totalCards - 1
        );
        break;
      default:
        throw this.form.createError('Invalid behavior', 'runtime', { cause: { behavior } });
    }
  }

  private handleSubmitButtonStates(): void {
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

    const behavior = this.form.getBehavior();

    switch (behavior) {
      case 'byField':
        this.enableButtons(
          this.submitButtons,
          currentFieldIndex === totalFields - 1,
          currentFieldIndex !== totalFields - 1
        );
        break;
      case 'byGroup':
        this.enableButtons(
          this.submitButtons,
          currentGroupIndex === totalGroups - 1,
          currentGroupIndex !== totalGroups - 1
        );
        break;
      case 'bySet':
        this.enableButtons(
          this.submitButtons,
          currentSetIndex === totalSets - 1,
          currentSetIndex !== totalSets - 1
        );
        break;
      case 'byCard':
        this.enableButtons(
          this.submitButtons,
          currentCardIndex === totalCards - 1,
          currentCardIndex !== totalCards - 1
        );
        break;
      default:
        throw this.form.createError('Invalid behavior', 'runtime', { cause: { behavior } });
    }
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
  public enableButtons(buttons: ButtonElement[], enabled: boolean, hide: boolean = false): void {
    buttons.forEach((button) => {
      button.button.disabled = !enabled;
      if (hide) {
        button.container.style.display = 'none';
      } else {
        button.container.style.removeProperty('display');
      }
    });
  }
}
