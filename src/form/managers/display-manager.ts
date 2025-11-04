/**
 * Display Manager
 *
 * Handles showing/hiding form elements at all hierarchy levels (cards, sets, groups, fields).
 * Simple display toggling without animations (instant show/hide).
 * Behavior-aware: shows/hides appropriate level based on behavior mode.
 * Will be replaced/enhanced by AnimationManager in future phases.
 */

import type {
  CardChangingEvent,
  FieldChangedEvent,
  GroupChangingEvent,
  IDisplayManager,
  SetChangingEvent,
} from '../types';
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
    this.initializeVisibility();

    if (this.form.getFormConfig().debug) {
      this.form.logDebug('DisplayManager initialized');
    }
  }

  /**
   * Cleanup manager resources
   */
  public destroy(): void {
    if (this.form.getFormConfig().debug) {
      this.form.logDebug('DisplayManager destroyed');
    }
  }

  // ============================================
  // Event Listeners
  // ============================================

  /**
   * Setup event listeners for navigation events based on behavior
   */
  private setupEventListeners(): void {
    this.form.subscribe('state:changed', (payload) => {
      console.log('state changed', payload);
    });

    const behavior = this.form.getBehavior();

    switch (behavior) {
      case 'byField':
        this.form.subscribe('form:field:changed', this.handleFieldChanged);
        break;

      // case 'byGroup':
      //   this.form.subscribe('form:group:changed', this.handleGroupChanged);
      //   break;

      // case 'bySet':
      //   this.form.subscribe('form:set:changed', this.handleSetChanged);
      //   break;

      // case 'byCard':
      //   this.form.subscribe('form:card:changed', this.handleCardChanged);
      //   break;
    }

    if (this.form.getFormConfig().debug) {
      this.form.logDebug('DisplayManager event listeners setup', { behavior });
    }
  }

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
  private initializeVisibility(): void {
    this.handleFieldVisibility();
    this.handleGroupVisibility();
    this.handleSetVisibility();
    this.handleCardVisibility();
  }

  /**
   * Initialize card visibility (show first, hide others)
   */
  private handleCardVisibility(): void {
    const cards = this.form.cardManager.getCards();

    cards.forEach((card) => this.showElement(card.element, card.active));

    this.logDebug('Initialized card visibility', { totalCards: cards.length });
  }

  /**
   * Handle set visibility (show first, hide others)
   */
  private handleSetVisibility(): void {
    const sets = this.form.setManager.getSets();

    sets.forEach((set) => this.showElement(set.element, set.active));

    this.logDebug('Initialized set visibility', { totalSets: sets.length });
  }

  /**
   * Handle group visibility (show first, hide others)
   */
  private handleGroupVisibility(): void {
    const groups = this.form.groupManager.getGroups();

    groups.forEach((group) => this.showElement(group.element, group.active));

    this.logDebug('Initialized group visibility', { totalGroups: groups.length });
  }

  /**
   * Handle field visibility (show first, hide others)
   */
  private handleFieldVisibility(): void {
    const fields = this.form.fieldManager.getFields();

    fields.forEach((field) => this.showElement(field.element, field.active));

    this.logDebug('Initialized field visibility', { totalFields: fields.length });
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
