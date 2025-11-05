/**
 * Navigation Manager
 *
 * Handles navigation buttons (prev/next) and coordinates with managers based on behavior.
 * Emits navigation commands that managers respond to based on current behavior mode.
 */

import { ATTR } from '../constants/attr';
import type {
  ButtonElement,
  FieldElement,
  GroupElement,
  INavigationManager,
  SetElement,
} from '../types';
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
    const elements = rootElement.querySelectorAll<HTMLButtonElement>(
      `button[${ATTR}-element="${key}"], [${ATTR}-element="${key}"] button`
    );

    elements.forEach((element) => {
      this[`${key}Buttons`].push({
        element,
        type: key,
        disabled: element.disabled,
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
      button.element.addEventListener('click', this.handlePrevClick);
    });

    this.nextButtons.forEach((button) => {
      button.element.addEventListener('click', this.handleNextClick);
    });

    this.submitButtons.forEach((button) => {
      button.element.addEventListener('click', this.handleSubmitClick);
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

    this.handlePrev();
  };

  /**
   * Handle next button click
   */
  private handleNextClick = (): void => {
    if (!this.navigationEnabled) return;

    this.handleNext();
  };

  /**
   * Handle submit button click
   */
  private handleSubmitClick = (event: Event): void => {
    if (!this.navigationEnabled) return;

    const button = event.currentTarget as HTMLButtonElement;
    this.handleSubmit(button);
  };

  /**
   * Handle previous navigation
   * Emits form:navigation:prev event for managers to respond to
   */
  public async handlePrev(): Promise<void> {
    if (!this.navigationEnabled) return;

    const behavior = this.form.getBehavior();

    // Emit navigation command
    this.form.emit('form:navigation:prev', { behavior });

    this.form.logDebug('Navigation prev triggered', { behavior });
  }

  /**
   * Handle next navigation
   * Emits form:navigation:next event for managers to respond to
   */
  public async handleNext(): Promise<void> {
    if (!this.navigationEnabled) return;

    // const canAdvance = await this.validateCurrent();
    // if (!canAdvance) {
    //   this.showValidationErrors();
    //   return;
    // }

    const behavior = this.form.getBehavior();

    switch (behavior) {
      case 'byField':
        await this.nextField();
        break;
      case 'byGroup':
        await this.nextGroup();
        break;
      case 'bySet':
        await this.nextSet();
        break;
      case 'byCard':
        await this.nextCard();
        break;
      default:
        throw this.form.createError('Invalid behavior', 'runtime', {
          cause: { behavior },
        });
    }

    // // Emit navigation command
    // this.form.emit('form:navigation:next', { behavior });

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
  private nextField(): void {
    const next = this.form.fieldManager.getNextPosition();

    // At end of fields - check if we can advance to next group/set/card
    if (next === null) {
      this.nextGroup();
      return;
    }

    const nextField = this.form.fieldManager.getByIndex(next);
    if (!nextField) {
      throw this.form.createError('Cannot handle navigation: next field is null', 'runtime', {
        cause: { nextField },
      });
    }

    this.clearHierarchyData('field');
    this.form.fieldManager.updateElementData(nextField.id, { active: true, current: true });
    this.updateHierarchyData(nextField);
    this.batchStateUpdates();
  }

  /**
   * Navigate to next group (byGroup behavior)
   */
  private nextGroup(): void {
    const next = this.form.groupManager.getNextPosition();

    // At end of groups - check if we can advance to next group/set/card
    if (next === null) {
      this.nextSet();
      return;
    }

    const nextGroup = this.form.groupManager.getByIndex(next);
    if (!nextGroup) {
      throw this.form.createError('Cannot handle navigation: next group is null', 'runtime', {
        cause: { nextGroup },
      });
    }

    // Clear active flags
    this.clearHierarchyData('group');

    // Set new group active and current
    this.form.groupManager.setActive(nextGroup.id);
    this.form.groupManager.setCurrent(nextGroup.id);

    this.form.fieldManager.setActiveByParent(nextGroup.id, 'group');
    this.updateHierarchyData(nextGroup);
    this.batchStateUpdates();
  }

  /**
   * Navigate to next group (byGroup behavior)
   */
  private nextSet(): void {
    const next = this.form.setManager.getNextPosition();

    // At end of sets - check if we can advance to next group/set/card
    if (next === null) {
      this.nextCard();
      return;
    }

    const nextSet = this.form.setManager.getByIndex(next);
    if (!nextSet) {
      throw this.form.createError('Cannot handle navigation: next set is null', 'runtime', {
        cause: { nextSet },
      });
    }

    // Clear active flags
    this.clearHierarchyData('set');

    // Set new group active and current
    this.form.setManager.setActive(nextSet.id);
    this.form.setManager.setCurrent(nextSet.id);

    this.form.groupManager.setActiveByParent(nextSet.id, 'set');
    this.updateHierarchyData(nextSet);
    this.batchStateUpdates();
  }

  /**
   * Navigate to next group (byGroup behavior)
   */
  private nextCard(): void {
    const next = this.form.cardManager.getNextPosition();

    // At end of cards - check if we can advance to next group/set/card
    if (next === null) {
      // this.handleFormComplete();
      return;
    }

    const nextCard = this.form.cardManager.getByIndex(next);
    if (!nextCard) {
      throw this.form.createError('Cannot handle navigation: next card is null', 'runtime', {
        cause: { nextCard },
      });
    }

    // Clear active flags
    this.clearHierarchyData('card');

    // Set new group active and current
    this.form.cardManager.setActive(nextCard.id);
    this.form.cardManager.setCurrent(nextCard.id);

    this.form.setManager.setActiveByParent(nextCard.id, 'card');
    this.batchStateUpdates();
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

  /**
   * Update button states based on current navigation position
   * Called after navigation or state changes
   */
  public updateButtonStates(): void {
    const behavior = this.form.getBehavior();

    if (behavior === 'byField') {
      this.updateButtonStatesForByField();
    }
    // Add other behavior modes here when implemented
  }

  /**
   * Update button states for byField behavior
   */
  private updateButtonStatesForByField(): void {
    const currentFieldIndex = this.form.getState('currentFieldIndex');
    const navigationOrder = this.form.fieldManager.getNavigationOrder();

    if (navigationOrder.length === 0) {
      this.disableButtons([...this.prevButtons, ...this.nextButtons]);
      return;
    }

    const currentPositionInOrder = navigationOrder.indexOf(currentFieldIndex);

    // Update prev buttons (disabled if at first field)
    if (currentPositionInOrder === 0) {
      this.disableButtons(this.prevButtons);
    } else {
      this.enableButtons(this.prevButtons);
    }

    // Update next buttons (disabled if at last field)
    if (currentPositionInOrder === navigationOrder.length - 1) {
      this.disableButtons(this.nextButtons);
    } else {
      this.enableButtons(this.nextButtons);
    }
  }

  /**
   * Enable navigation (allows button clicks)
   */
  public enableNavigation(): void {
    this.navigationEnabled = true;
    this.updateButtonStates();

    this.form.logDebug('Navigation enabled');
  }

  /**
   * Disable navigation (prevents button clicks)
   * Used during transitions or async operations
   */
  public disableNavigation(): void {
    this.navigationEnabled = false;
    this.disableButtons([...this.prevButtons, ...this.nextButtons]);

    this.form.logDebug('Navigation disabled');
  }

  // ============================================
  // Private Helpers
  // ============================================

  /**
   * Disable a set of buttons
   */
  private disableButtons(buttons: ButtonElement[]): void {
    buttons.forEach((button) => {
      button.element.disabled = true;
    });
  }

  /**
   * Enable a set of buttons (respects original disabled state)
   */
  private enableButtons(buttons: ButtonElement[]): void {
    buttons.forEach((button) => {
      button.element.disabled = false;
    });
  }
}
