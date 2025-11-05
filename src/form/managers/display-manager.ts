/**
 * Display Manager
 *
 * Handles showing/hiding form elements at all hierarchy levels (cards, sets, groups, fields).
 * Simple display toggling without animations (instant show/hide).
 * Behavior-aware: shows/hides appropriate level based on behavior mode.
 * Will be replaced/enhanced by AnimationManager in future phases.
 */

import type { StateChangePayload } from '$lib/types';

import type { IDisplayManager } from '../types';
import { BaseManager } from './base-manager';

/**
 * DisplayManager Implementation
 *
 * Subscribes to navigation change events and updates element visibility.
 * Uses display: none/block for instant showing/hiding.
 */
export class DisplayManager extends BaseManager implements IDisplayManager {
  // ============================================
  // Lifecycle
  // ============================================

  /**
   * Initialize the manager
   */
  public init(): void {
    this.setupEventListeners();
    this.updateDisplay();

    this.logDebug('DisplayManager initialized');
  }

  /**
   * Cleanup manager resources
   */
  public destroy(): void {
    this.logDebug('DisplayManager destroyed');
  }

  // ============================================
  // Event Listeners
  // ============================================

  /**
   * Setup event listeners for navigation events based on behavior
   */
  private setupEventListeners(): void {
    this.form.subscribe('state:changed', (payload) => {
      this.handleStateChange(payload);
    });

    this.logDebug('DisplayManager event listeners setup');
  }

  // ============================================
  // Handle State Changes
  // ============================================
  /**
   *
   */
  private handleStateChange = (payload: StateChangePayload): void => {
    // Only update display if relevant state changed
    const relevantKeys = [
      'currentCardIndex',
      'currentSetIndex',
      'currentGroupIndex',
      'currentFieldIndex',
    ];

    if (relevantKeys.includes(payload.key)) {
      this.updateDisplay();
    }
  };

  // ============================================
  // Event Handlers
  // ============================================

  // /**
  //  * Handle card changed event
  //  * Shows the new active card and hides all others
  //  */
  // private handleCardChanged = (payload: CardChangingEvent): void => {
  //   const { fromId, toId } = payload;

  //   if (this.form.getFormConfig().debug) {
  //     this.form.logDebug('DisplayManager handling card change', {
  //       fromId,
  //       toId,
  //     });
  //   }

  //   // Hide old card
  //   if (fromId) {
  //     this.hideCard(fromId);
  //   }

  //   // Show new card
  //   this.showCard(toId);
  // };

  // /**
  //  * Handle set changed event
  //  * Shows the new active set and hides all others
  //  */
  // private handleSetChanged = (payload: SetChangingEvent): void => {
  //   const { fromId, toId } = payload;

  //   if (this.form.getFormConfig().debug) {
  //     this.form.logDebug('DisplayManager handling set change', {
  //       fromId,
  //       toId,
  //     });
  //   }

  //   // Hide old set
  //   if (fromId) {
  //     this.hideSet(fromId);
  //   }

  //   // Show new set
  //   this.showSet(toId);
  // };

  // /**
  //  * Handle group changed event
  //  * Shows the new active group and hides all others
  //  */
  // private handleGroupChanged = (payload: GroupChangingEvent): void => {
  //   const { fromId, toId } = payload;

  //   if (this.form.getFormConfig().debug) {
  //     this.form.logDebug('DisplayManager handling group change', {
  //       fromId,
  //       toId,
  //     });
  //   }

  //   // Hide old group
  //   if (fromId) {
  //     this.hideGroup(fromId);
  //   }

  //   // Show new group
  //   this.showGroup(toId);
  // };

  // /**
  //  * Handle field changed event
  //  * Shows the new active field and hides all others
  //  */
  // private handleFieldChanged = (payload: FieldChangedEvent): void => {
  //   const { fieldIndex, previousFieldIndex } = payload;

  //   this.logDebug('DisplayManager handling field change', {
  //     from: previousFieldIndex,
  //     to: fieldIndex,
  //   });

  //   // Hide old field
  //   if (previousFieldIndex) {
  //     this.hideField(previousFieldIndex);
  //   }

  //   // Show new field
  //   this.showField(fieldIndex);
  // };

  // ============================================
  // Initialization
  // ============================================

  /**
   * Initialize visibility based on behavior mode
   * Shows first item of appropriate level, hides all others
   */
  private updateDisplay(): void {
    const behavior = this.form.getState('behavior');

    switch (behavior) {
      case 'byCard':
        this.handleCardVisibility();
        break;
      case 'bySet':
        this.handleSetVisibility();
        break;
      case 'byGroup':
        this.handleGroupVisibility();
        break;
      case 'byField':
        this.displayByField();
        break;
      default:
        throw this.form.createError('Invalid behavior', 'runtime', {
          cause: { behavior },
        });
    }
  }

  /**
   * Handle card visibility based on form state
   */
  private handleCardVisibility(): void {
    const cards = this.form.cardManager.getCards();
    cards.forEach((card) => this.showElement(card.element, card.active));

    // this.logDebug('Updated card visibility', { totalCards: cards.length });
  }

  /**
   * Handle set visibility based on form state
   */
  private handleSetVisibility(): void {
    const sets = this.form.setManager.getSets();
    sets.forEach((set) => this.showElement(set.element, set.active));

    // this.logDebug('Updated set visibility', { totalSets: sets.length });
  }

  /**
   * Handle group visibility based on form state
   */
  private handleGroupVisibility(): void {
    const groups = this.form.groupManager.getGroups();
    groups.forEach((group) => this.showElement(group.element, group.active));

    // this.logDebug('Updated group visibility', { totalGroups: groups.length });
  }

  /**
   * Handle field visibility based on form state
   */
  private handleFieldVisibility(): void {
    const fields = this.form.fieldManager.getFields();
    fields.forEach((field) => this.showElement(field.element, field.active));

    // this.logDebug('Updated field visibility', { totalFields: fields.length });
  }

  private displayByField(): void {
    const currentFieldIndex = this.form.getState('currentFieldIndex');
    const fields = this.form.fieldManager.getFields();

    fields.forEach((field) => {
      this.showElement(field.element, field.index === currentFieldIndex);
    });
  }

  // ============================================
  // Base Show Methods
  // ============================================

  /**
   * Show/Hide an element
   * Sets display: sets or removes display: none based on visibility
   */
  public showElement(element: HTMLElement, visible: boolean): void {
    if (visible) element.style.removeProperty('display');
    else element.style.setProperty('display', 'none');
  }
}
