/**
 * Display Manager
 *
 * Handles showing/hiding form elements at all hierarchy levels (cards, sets, groups, fields).
 * Simple display toggling without animations (instant show/hide).
 * Behavior-aware: shows/hides appropriate level based on behavior mode.
 * Will be replaced/enhanced by AnimationManager in future phases.
 */

import { ATTR } from '../constants';
import type { ItemData, UpdatableItemData } from '../types';
import { BaseManager } from './base-manager';
import type { ItemManager } from './item-manager';

/**
 * DisplayManager Implementation
 *
 * Subscribes to navigation change events and updates element visibility.
 * Uses display: none/block for instant showing/hiding.
 */
export class DisplayManager extends BaseManager {
  // ============================================
  // Lifecycle
  // ============================================

  /**
   * Initialize the manager
   */
  public init(): void {
    this.groupStart(`Initializing Display`);
    this.setupEventListeners();
    this.initializeDisplay();

    this.logDebug('Initialized');
    this.groupEnd();
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
    this.form.subscribe('form:navigation:changed', (payload) => {
      this.updateDisplay(payload.target);
    });

    // Listen for condition evaluation events to immediately update visibility
    // When a conditional element's visibility changes, we need to update the display
    // without waiting for navigation state changes
    this.form.subscribe('form:condition:evaluated', (payload) => {
      let manager: ItemManager<ItemData> | undefined;
      switch (payload.type) {
        case 'card':
          manager = this.form.cardManager;
          break;
        case 'set':
          manager = this.form.setManager;
          break;
        case 'group':
          manager = this.form.groupManager;
          break;
        case 'field':
          manager = this.form.fieldManager;
          break;
        default:
          return;
      }

      this.handleVisibility(manager);
    });

    this.logDebug('DisplayManager event listeners setup');
  }

  // ============================================
  // Handle Navigation Changes
  // ============================================

  /**
   * Initialize the display
   */
  private initializeDisplay(): void {
    this.handleVisibility(this.form.cardManager);
    this.handleVisibility(this.form.setManager);
    this.handleVisibility(this.form.groupManager);
    this.handleVisibility(this.form.fieldManager);
    this.removeInitialStyles();
  }

  /**
   * Remove initial styles from all elements
   */
  private removeInitialStyles(): void {
    const elements = this.form.queryAll(`[${ATTR}-initialdisplay]`);
    elements.forEach((element) => {
      element.removeAttribute(`${ATTR}-initialdisplay`);
    });
  }

  /**
   * Update display depending on the state changed, no need for behavior
   */
  private updateDisplay(key: 'card' | 'set' | 'group' | 'field'): void {
    switch (key) {
      case 'card':
        this.handleVisibility(this.form.cardManager);
        break;
      case 'set':
        this.handleVisibility(this.form.setManager);
        break;
      case 'group':
        this.handleVisibility(this.form.groupManager);
        break;
      case 'field':
        this.handleVisibility(this.form.fieldManager);
        break;
      default:
        return;
    }
  }

  /**
   * Handle item visibility based on data
   */
  private handleVisibility<TItem extends ItemData>(manager: ItemManager<TItem>): void {
    const items = manager.getAll();
    items.forEach((item) => {
      this.showElement(item, (visible) =>
        manager.updateItemData(item.index, { visible } as UpdatableItemData<TItem>)
      );
    });
  }

  /**
   * Show/Hide an element
   * Sets "display: none" or removes display property based on active state AND isIncluded
   * Updates the "active" data-attribute to be inline with the display property
   * Updates the visible flag to be inline with the active state
   */
  public showElement(item: ItemData, updateVisible: (visible: boolean) => void): void {
    const { element, active, type, isIncluded } = item;

    // Element should only be visible if active AND included
    const shouldBeVisible = active && isIncluded;

    if (shouldBeVisible) element.style.removeProperty('display');
    else element.style.setProperty('display', 'none');

    element.setAttribute(`${ATTR}-${type}-active`, active.toString());
    element.setAttribute(`${ATTR}-${type}-included`, isIncluded.toString());

    // Update visible flag
    updateVisible(shouldBeVisible);
  }
}
