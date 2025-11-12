import { BaseManager } from './base-manager';

export class FocusManager extends BaseManager {
  /** Initialize the manager */
  public init(): void {
    this.groupStart(`Initializing Focus`);
    this.setupEventListeners();

    this.logDebug('Initialized');
    this.groupEnd();
  }

  /** Cleanup manager resources */
  public destroy(): void {
    this.logDebug('FocusManager destroyed');
  }

  // ============================================
  // Event Listeners
  // ============================================

  /**
   * Setup event listeners for navigation events based on behavior
   */
  private setupEventListeners(): void {
    this.form.subscribe('form:navigation:changed', () => {
      this.handleNavigationChanged();
    });

    this.logDebug('FocusManager event listeners setup');
  }

  // ============================================
  // Handle State Changes
  // ============================================
  /**
   * Handle state changes and update display if relevant
   */
  private handleNavigationChanged = (): void => {
    const currentFieldIndex = this.form.getState('currentFieldIndex');
    if (currentFieldIndex < 0) return;

    const currentInput = this.form.inputManager.getByIndex(currentFieldIndex);
    if (!currentInput || !currentInput.active) return;

    currentInput.element.focus();
  };
}
