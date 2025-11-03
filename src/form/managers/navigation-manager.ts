/**
 * Navigation Manager
 *
 * Handles navigation buttons (prev/next) and coordinates with managers based on behavior.
 * Emits navigation commands that managers respond to based on current behavior mode.
 */

import type { FlowupsForm } from '..';
import { ATTR } from '../constants/attr';
import type { BoundaryReachedEvent, ButtonElement, INavigationManager } from '../types';

/**
 * NavigationManager Implementation
 *
 * Discovers navigation buttons and emits navigation:next/prev events.
 * Listens for boundary events to update button states.
 */
export class NavigationManager implements INavigationManager {
  // ============================================
  // Properties
  // ============================================

  /** Reference to parent form component */
  public readonly form: FlowupsForm;

  /** Navigation buttons */
  private prevButtons: ButtonElement[] = [];
  private nextButtons: ButtonElement[] = [];
  private submitButtons: ButtonElement[] = [];

  /** Whether navigation is currently enabled */
  private navigationEnabled: boolean = true;

  // ============================================
  // Constructor
  // ============================================

  constructor(form: FlowupsForm) {
    this.form = form;
  }

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
   * Finds buttons with [data-form-element="prev"] and [data-form-element="next"]
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
      return;
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

    // Subscribe to boundary events to update button states
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
   * Emits navigation:prev event for managers to respond to
   */
  public async handlePrev(): Promise<void> {
    if (!this.navigationEnabled) return;

    const behavior = this.form.getBehavior();

    // Emit navigation command
    this.form.emit('navigation:prev', { behavior });

    if (this.form.getFormConfig().debug) {
      this.form.logDebug('Navigation prev triggered', { behavior });
    }
  }

  /**
   * Handle next navigation
   * Emits navigation:next event for managers to respond to
   */
  public async handleNext(): Promise<void> {
    if (!this.navigationEnabled) return;

    const behavior = this.form.getBehavior();

    // Emit navigation command
    this.form.emit('navigation:next', { behavior });

    if (this.form.getFormConfig().debug) {
      this.form.logDebug('Navigation next triggered', { behavior });
    }
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
    console.log('currentFieldIndex', currentFieldIndex);
    const navigationOrder = this.form.fieldManager.getNavigationOrder();
    console.log('navigationOrder', navigationOrder);

    if (navigationOrder.length === 0) {
      this.disableButtons([...this.prevButtons, ...this.nextButtons]);
      return;
    }

    const currentPositionInOrder = navigationOrder.indexOf(currentFieldIndex);
    console.log('currentPositionInOrder', currentPositionInOrder);

    // Update prev buttons (disabled if at first field)
    if (currentPositionInOrder === 0) {
      console.log('disable prev buttons');
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
