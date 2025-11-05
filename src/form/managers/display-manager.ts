/**
 * Display Manager
 *
 * Handles showing/hiding form elements at all hierarchy levels (cards, sets, groups, fields).
 * Simple display toggling without animations (instant show/hide).
 * Behavior-aware: shows/hides appropriate level based on behavior mode.
 * Will be replaced/enhanced by AnimationManager in future phases.
 */

import type { StateChangePayload } from '$lib/types';

import type {
  FormCardState,
  FormFieldState,
  FormGroupState,
  FormSetState,
  IDisplayManager,
} from '../types';
import { BaseManager } from './base-manager';

type RelevantKeys =
  | keyof FormCardState
  | keyof FormSetState
  | keyof FormGroupState
  | keyof FormFieldState;

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
   * Handle state changes and update display if relevant
   */
  private handleStateChange = (payload: StateChangePayload): void => {
    // Only update display if relevant state changed
    const relevantKeys: readonly RelevantKeys[] = [
      'currentCardIndex',
      'currentSetIndex',
      'currentGroupIndex',
      'currentFieldIndex',
      // 'activeCardIndices',
      // 'activeSetIndices',
      // 'activeGroupIndices',
      // 'activeFieldIndices',
    ];

    // payload.key follows pattern `${formName}.${key}`
    const key = payload.key.includes('.')
      ? (payload.key.split('.').pop() as RelevantKeys)
      : (payload.key as RelevantKeys);

    if (key && relevantKeys.includes(key)) {
      this.updateDisplay(key);
    }
  };

  /**
   * Update display depending on the state changed, no need for behavior
   */
  private updateDisplay(key?: RelevantKeys): void {
    if (!key) {
      this.handleCardVisibility();
      this.handleSetVisibility();
      this.handleGroupVisibility();
      this.handleFieldVisibility();
      return;
    }

    const lowercaseKey = key.toLowerCase();
    if (lowercaseKey.includes('card')) this.handleCardVisibility();
    if (lowercaseKey.includes('set')) this.handleSetVisibility();
    if (lowercaseKey.includes('group')) this.handleGroupVisibility();
    if (lowercaseKey.includes('field')) this.handleFieldVisibility();
  }

  /**
   * Handle card visibility based on form state
   */
  private handleCardVisibility(): void {
    const cards = this.form.cardManager.getAll();
    cards.forEach((card) => {
      this.showElement(card.element, card.active);
    });
  }

  /**
   * Handle set visibility based on form state
   */
  private handleSetVisibility(): void {
    const sets = this.form.setManager.getAll();
    sets.forEach((set) => {
      this.showElement(set.element, set.active);
    });
  }

  /**
   * Handle group visibility based on form state
   */
  private handleGroupVisibility(): void {
    const groups = this.form.groupManager.getAll();
    groups.forEach((group) => {
      this.showElement(group.element, group.active);
    });
  }

  /**
   * Handle field visibility based on form state
   */
  private handleFieldVisibility(): void {
    const fields = this.form.fieldManager.getAll();
    fields.forEach((field) => {
      this.showElement(field.element, field.active);
    });
  }

  /**
   * Show/Hide an element
   * Sets display: sets or removes display: none based on visibility
   */
  public showElement(element: HTMLElement, visible: boolean): void {
    if (visible) element.style.removeProperty('display');
    else element.style.setProperty('display', 'none');
  }
}
