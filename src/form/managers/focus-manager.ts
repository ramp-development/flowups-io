import { BaseManager } from './base-manager';

export class FocusManager extends BaseManager {
  /** Initialize the manager */
  public init(): void {
    this.setupEventListeners();
  }

  /** Cleanup manager resources */
  public destroy(): void {
    // No cleanup needed currently
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
  }

  // ============================================
  // Focus Utilities
  // ============================================

  /**
   * Check if element can receive focus
   */
  private isFocusable(element: HTMLElement): boolean {
    return (
      !element.hasAttribute('disabled') &&
      element.offsetParent !== null && // Not hidden
      element.tabIndex >= 0
    );
  }

  /**
   * Safely focus an element with error handling and scroll behavior
   * @param element - Element to focus
   * @param scrollIntoView - Whether to ensure element is visible (default: true)
   * @returns true if focus succeeded, false otherwise
   */
  private focusElement(element: HTMLElement, scrollIntoView = true): boolean {
    if (!this.isFocusable(element)) {
      return false;
    }

    try {
      element.focus();

      if (scrollIntoView) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest',
        });
      }

      return true;
    } catch (error) {
      this.logError('Failed to focus element', error);
      return false;
    }
  }

  // ============================================
  // Handle State Changes
  // ============================================

  /**
   * Handle navigation changes and focus current field
   */
  private handleNavigationChanged = (): void => {
    const currentFieldIndex = this.form.getState('currentFieldIndex');
    if (currentFieldIndex < 0) return;

    const currentInput = this.form.inputManager.getByIndex(currentFieldIndex);
    if (!currentInput || !currentInput.active) return;

    this.focusElement(currentInput.element);
  };
}
