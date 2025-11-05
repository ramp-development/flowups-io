/**
 * Navigation Manager
 *
 * Handles navigation buttons (prev/next) and coordinates with managers based on behavior.
 * Emits navigation commands that managers respond to based on current behavior mode.
 */

import { ATTR } from '../constants/attr';
import type { BoundaryReachedEvent, ButtonElement, INavigationManager } from '../types';
import { BaseManager } from './base-manager';

/**
 * NavigationManager Implementation
 *
 * Discovers navigation buttons and emits navigation:next/prev events.
 * Listens for boundary events to update button states.
 */
export class NavigationManager extends BaseManager implements INavigationManager {
  // ============================================
  // Properties
  // ============================================

  /** Navigation buttons */
  private prevButtons: ButtonElement[] = [];
  private nextButtons: ButtonElement[] = [];
  private submitButtons: ButtonElement[] = [];

  /** Whether navigation is currently enabled */
  private navigationEnabled: boolean = true;

  // ============================================
  // Lifecycle
  // ============================================

  /**
   * Initialize the manager
   */
  public init(): void {
    this.discoverButtons();
    this.setupEventListeners();
    this.updateButtonStates();

    if (this.form.getFormConfig().debug) {
      this.form.logDebug('NavigationManager initialized', {
        prevButtons: this.prevButtons.length,
        nextButtons: this.nextButtons.length,
        submitButtons: this.submitButtons.length,
      });
    }
  }

  /**
   * Cleanup manager resources
   */
  public destroy(): void {
    this.prevButtons = [];
    this.nextButtons = [];
    this.submitButtons = [];

    if (this.form.getFormConfig().debug) {
      this.form.logDebug('NavigationManager destroyed');
    }
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

    if (this.form.getFormConfig().debug) {
      this.form.logDebug('Navigation buttons discovered', {
        prev: this.prevButtons.length,
        next: this.nextButtons.length,
        submit: this.submitButtons.length,
      });
    }
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

    // Subscribe to boundary events
    this.form.subscribe('form:navigation:boundary', this.handleBoundaryReached);

    if (this.form.getFormConfig().debug) {
      this.form.logDebug('NavigationManager event listeners setup');
    }
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

    if (this.form.getFormConfig().debug) {
      this.form.logDebug('Navigation prev triggered', { behavior });
    }
  }

  /**
   * Handle next navigation
   * Emits form:navigation:next event for managers to respond to
   */
  public async handleNext(): Promise<void> {
    if (!this.navigationEnabled) return;

    // const nextFieldIndex = this.form.getState('nextFieldIndex');
    // if (nextFieldIndex === null) return; // No more fields to navigate to @todo
    // const nextField = this.form.fieldManager.getFieldByIndex(nextFieldIndex);
    // if (!nextField) return;

    const behavior = this.form.getBehavior();

    switch (behavior) {
      case 'byField':
        this.handleByField(
          this.form.getState('currentFieldIndex'),
          this.form.getState('nextFieldIndex') ?? 9999 // @todo: remove this once we have a real next field index
        );
        break;
      // case 'byGroup':
      //   this.handleByGroup(fromIndex, toIndex);
      //   break;
      // case 'bySet':
      //   this.handleBySet(fromIndex, toIndex);
      //   break;
      // case 'byCard':
      //   this.handleByCard(fromIndex, toIndex);
      //   break;
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

    if (this.form.getFormConfig().debug) {
      this.form.logDebug('Form submit requested', {
        behavior,
        skipValidation,
        action,
      });
    }
  }

  // ============================================
  // Navigation Handling
  // ============================================

  /**
   * Plan
   * 1. Check form behavior
   * - if byField, handle next field
   * - if byGroup, handle next group
   * - if bySet, handle next set
   * - if byCard, handle next card
   *
   * byField:
   * - get next field index
   * - check if in same context as current field
   * - if in same context, get next field index
   * - update hierarchy context with next field
   *
   * byGroup:
   * - check group is complete
   * - check if next group is in same context as current group
   * - if in same context, get next group index
   * - update hierarchy context with next group
   *
   * bySet:
   * - check set is complete
   * - if context exists, check if next set is in same context as current set
   * - if in same context, get next set index
   * - update hierarchy context with next set
   *
   * byCard:
   * - check card is complete
   * - update hierarchy context with next card
   *
   * for all:
   * - check if at end of current context
   *     - check card is complete (if exists)
   *     - check set is complete (if exists)
   *     - check group is complete (if exists)
   *     - check field is complete (if exists)
   * - update meta for from and to index
   * - cascade the context down to the lower levels
   */

  /**
   * Move from one field to another
   * Plan:
   * - get next field index
   * - check if in same context as current field
   * - if in same context, get next field index
   * - update hierarchy context with next field
   * @param fromIndex - The index of the current field
   * @param toIndex - The index of the next field
   */
  private handleByField(fromIndex: number, toIndex: number): void {
    // get the to field
    const fromField = this.form.fieldManager.getByIndex(fromIndex);
    const toField = this.form.fieldManager.getByIndex(toIndex);

    if (!toField) {
      throw this.form.createError('Cannot handle navigation: to field is null', 'runtime', {
        cause: { toField },
      });
    }

    console.log('handleByField', { fromIndex, toIndex, toField });

    // update the field metadata for from and to
    this.form.fieldManager.updateElementData(fromIndex, { active: false });
    this.form.fieldManager.updateElementData(toIndex, { active: true });
    this.form.fieldManager.setStates();

    // update parent metadata based on the to field
    if (fromField && fromField.parentHierarchy.groupIndex !== null) {
      this.form.groupManager.updateElementData(fromField.parentHierarchy.groupIndex, {
        active: false,
      });
    }
    if (toField.parentHierarchy.groupIndex !== null) {
      this.form.groupManager.updateElementData(toField.parentHierarchy.groupIndex, {
        active: true,
      });
      this.form.groupManager.setStates();
    }

    if (fromField) {
      this.form.setManager.updateElementData(fromField.parentHierarchy.setIndex, { active: false });
    }
    this.form.setManager.updateElementData(toField.parentHierarchy.setIndex, { active: true });
    this.form.setManager.setStates();

    if (fromField && fromField.parentHierarchy.cardIndex !== null) {
      this.form.cardManager.updateElementData(fromField.parentHierarchy.cardIndex, {
        active: false,
      });
    }
    if (toField.parentHierarchy.cardIndex !== null) {
      this.form.cardManager.updateElementData(toField.parentHierarchy.cardIndex, { active: true });
      this.form.cardManager.setStates();
    }
  }

  private handleByGroup(fromIndex: number, toIndex: number): void {
    // get the to group
    const toGroup = this.form.groupManager.getByIndex(toIndex);

    if (!toGroup) {
      throw this.form.createError('Cannot handle navigation: to group is null', 'runtime', {
        cause: { toGroup },
      });
    }

    // update the group metadata for from and to
    this.form.groupManager.updateElementData(fromIndex, { active: false });
    this.form.groupManager.updateElementData(toIndex, { active: true });

    // update parent metadata based on the to group
    this.form.setManager.updateElementData(toGroup.parentHierarchy.setIndex, { active: true });

    if (toGroup.parentHierarchy.cardIndex)
      this.form.cardManager.updateElementData(toGroup.parentHierarchy.cardIndex, { active: true });
  }

  private handleBySet(fromIndex: number, toIndex: number): void {
    // get the to group
    const toSet = this.form.setManager.getByIndex(toIndex);

    if (!toSet) {
      throw this.form.createError('Cannot handle navigation: to set is null', 'runtime', {
        cause: { toSet },
      });
    }

    // update the group metadata for from and to
    this.form.setManager.updateElementData(fromIndex, { active: false });
    this.form.setManager.updateElementData(toIndex, { active: true });

    // update parent metadata based on the to group
    if (toSet.parentHierarchy.cardIndex)
      this.form.cardManager.updateElementData(toSet.parentHierarchy.cardIndex, { active: true });
  }

  private handleByCard(fromIndex: number, toIndex: number): void {
    // get the to group
    const toCard = this.form.cardManager.getByIndex(toIndex);

    if (!toCard) {
      throw this.form.createError('Cannot handle navigation: to card is null', 'runtime', {
        cause: { toCard },
      });
    }

    // update the group metadata for from and to
    this.form.cardManager.updateElementData(fromIndex, { active: false });
    this.form.cardManager.updateElementData(toIndex, { active: true });
  }

  // ============================================
  // Boundary Event Handling
  // ============================================

  /**
   * Handle boundary reached event
   * Updates button states when navigation reaches start/end
   */
  private handleBoundaryReached = (payload: BoundaryReachedEvent): void => {
    const { boundary, direction } = payload;

    if (this.form.getFormConfig().debug) {
      this.form.logDebug('Navigation boundary reached', payload);
    }

    // Disable prev buttons if at start
    if (boundary === 'start' && direction === 'backward') {
      this.disableButtons(this.prevButtons);
    } else {
      this.enableButtons(this.prevButtons);
    }

    // Disable next buttons if at end
    if (boundary === 'end' && direction === 'forward') {
      this.disableButtons(this.nextButtons);
    } else {
      this.enableButtons(this.nextButtons);
    }
  };

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

    if (this.form.getFormConfig().debug) {
      this.form.logDebug('Navigation enabled');
    }
  }

  /**
   * Disable navigation (prevents button clicks)
   * Used during transitions or async operations
   */
  public disableNavigation(): void {
    this.navigationEnabled = false;
    this.disableButtons([...this.prevButtons, ...this.nextButtons]);

    if (this.form.getFormConfig().debug) {
      this.form.logDebug('Navigation disabled');
    }
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
