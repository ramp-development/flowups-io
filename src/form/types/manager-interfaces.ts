/**
 * Manager Interface Definitions
 *
 * Base interfaces for all manager classes in the form system.
 * Each manager handles a specific concern (navigation, validation, etc.).
 */

import type { MultiStepForm } from '../multi-step-form';

/**
 * Base Manager Interface
 * All managers extend this base interface
 */
export interface BaseManager {
  /** Initialize the manager */
  init(): void;

  /** Cleanup and remove event listeners */
  destroy(): void;

  /** Reference to parent form component */
  form: MultiStepForm;
}

/**
 * Card Manager Interface
 * Handles card discovery and navigation
 */
export interface ICardManager extends BaseManager {
  /** Discover all cards in the form */
  discoverCards(): void;

  /** Get total number of cards */
  getTotalCards(): number;

  /** Get card by index */
  getCardByIndex(index: number): HTMLElement | null;

  /** Get card by ID */
  getCardById(id: string): HTMLElement | null;

  /** Get current card */
  getCurrentCard(): HTMLElement | null;
}

/**
 * Set Manager Interface
 * Handles set discovery, title extraction, and navigation
 */
export interface ISetManager extends BaseManager {
  /** Discover all sets in the form */
  discoverSets(): void;

  /** Extract title from <legend> or attribute */
  extractSetTitle(setElement: HTMLElement): string;

  /** Get total number of sets */
  getTotalSets(): number;

  /** Get set by index */
  getSetByIndex(index: number): HTMLElement | null;

  /** Get set by ID */
  getSetById(id: string): HTMLElement | null;

  /** Get current set */
  getCurrentSet(): HTMLElement | null;
}

/**
 * Group Manager Interface
 * Handles group discovery and navigation (optional elements)
 */
export interface IGroupManager extends BaseManager {
  /** Discover all groups in the form */
  discoverGroups(): void;

  /** Extract title from <legend> or attribute */
  extractGroupTitle(groupElement: HTMLElement): string;

  /** Get total number of groups */
  getTotalGroups(): number;

  /** Get group by index */
  getGroupByIndex(index: number): HTMLElement | null;

  /** Get group by ID */
  getGroupById(id: string): HTMLElement | null;

  /** Get current group */
  getCurrentGroup(): HTMLElement | null;
}

/**
 * Field Manager Interface
 * Handles field discovery and field-by-field navigation
 */
export interface IFieldManager extends BaseManager {
  /** Discover all fields in the form */
  discoverFields(): void;

  /** Build field navigation order */
  buildNavigationOrder(): void;

  /** Navigate to next field */
  nextField(): Promise<void>;

  /** Navigate to previous field */
  prevField(): Promise<void>;

  /** Navigate to specific field by index */
  goToField(index: number): Promise<void>;

  /** Get total number of fields */
  getTotalFields(): number;

  /** Get field by index */
  getFieldByIndex(index: number): HTMLElement | null;

  /** Get current field */
  getCurrentField(): HTMLElement | null;

  /** Get next visible field index (skips hidden fields) */
  getNextVisibleFieldIndex(): number | null;

  /** Get previous visible field index (skips hidden fields) */
  getPrevVisibleFieldIndex(): number | null;

  /** Check if on first field */
  isFirstField(): boolean;

  /** Check if on last field */
  isLastField(): boolean;
}

/**
 * Input Manager Interface
 * Handles input discovery, value tracking, and lazy event binding
 */
export interface IInputManager extends BaseManager {
  /** Discover all inputs in the form */
  discoverInputs(): void;

  /** Bind events to current field's input */
  bindCurrentFieldInput(): void;

  /** Unbind events from field's input */
  unbindFieldInput(fieldIndex: number): void;

  /** Get input value by name */
  getInputValue(name: string): unknown;

  /** Set input value by name */
  setInputValue(name: string, value: unknown): void;

  /** Get all form data */
  getAllFormData(): Record<string, unknown>;

  /** Get input element by name */
  getInputByName(name: string): HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
}

/**
 * Navigation Manager Interface
 * Handles navigation buttons and coordination with FieldManager
 */
export interface INavigationManager extends BaseManager {
  /** Discover all navigation buttons */
  discoverButtons(): void;

  /** Handle next button click */
  handleNext(): Promise<void>;

  /** Handle previous button click */
  handlePrev(): Promise<void>;

  /** Update button states (enabled/disabled) */
  updateButtonStates(): void;

  /** Enable navigation */
  enableNavigation(): void;

  /** Disable navigation (during transitions) */
  disableNavigation(): void;
}

/**
 * Validation Manager Interface
 * Handles HTML5 validation and field/set validation
 */
export interface IValidationManager extends BaseManager {
  /** Validate current field */
  validateCurrentField(): Promise<boolean>;

  /** Validate specific field by name */
  validateField(fieldName: string): Promise<boolean>;

  /** Validate entire set */
  validateSet(setId: string): Promise<boolean>;

  /** Check if field is valid */
  isFieldValid(fieldName: string): boolean;

  /** Get field errors */
  getFieldErrors(fieldName: string): string[];

  /** Clear field errors */
  clearFieldErrors(fieldName: string): void;
}

/**
 * Error Manager Interface
 * Handles browser native error display
 */
export interface IErrorManager extends BaseManager {
  /** Display native browser error */
  showNativeError(fieldName: string, message: string): void;

  /** Clear native browser error */
  clearNativeError(fieldName: string): void;

  /** Clear all errors */
  clearAllErrors(): void;
}

/**
 * Condition Manager Interface
 * Handles conditional visibility (show-if/hide-if)
 */
export interface IConditionManager extends BaseManager {
  /** Discover all conditional elements */
  discoverConditionalElements(): void;

  /** Build dependency graph */
  buildDependencyGraph(): void;

  /** Evaluate all conditions */
  evaluateAllConditions(): void;

  /** Evaluate conditions for specific field */
  evaluateFieldConditions(fieldName: string): void;

  /** Check if element should be visible */
  isElementVisible(element: HTMLElement): boolean;
}

/**
 * Render Manager Interface
 * Handles dynamic text and style updates
 */
export interface IRenderManager extends BaseManager {
  /** Discover all render elements */
  discoverRenderElements(): void;

  /** Update all text content elements */
  updateTextContent(): void;

  /** Update all style elements */
  updateStyles(): void;

  /** Update all renders (text + styles) */
  updateAll(): void;
}

/**
 * Animation Manager Interface
 * Handles transitions between fields
 */
export interface IAnimationManager extends BaseManager {
  /** Transition from one field to another */
  transitionField(
    fromField: HTMLElement,
    toField: HTMLElement,
    direction: 'forward' | 'backward'
  ): Promise<void>;

  /** Set transition type */
  setTransitionType(type: 'fade' | 'slide' | 'none'): void;

  /** Set transition duration */
  setTransitionDuration(ms: number): void;
}

/**
 * Accessibility Manager Interface
 * Handles ARIA attributes, announcements, and focus management
 */
export interface IAccessibilityManager extends BaseManager {
  /** Setup ARIA attributes for all elements */
  setupAriaAttributes(): void;

  /** Announce field change to screen readers */
  announceFieldChange(fieldTitle: string, fieldIndex: number): void;

  /** Focus on current field's first input */
  focusCurrentField(): void;

  /** Update tabindex for all fields (only current field tabbable) */
  updateTabindex(): void;

  /** Announce error to screen readers */
  announceError(message: string): void;
}
