/**
 * Input Manager
 *
 * Handles input event binding, value extraction, and lazy event management.
 * Only binds events to the current field's input for optimal performance.
 */

import type { FlowupsForm } from '..';
import type { IInputManager } from '../types';

/**
 * InputManager Implementation
 *
 * Manages input discovery, value tracking, and smart event binding.
 * Implements lazy loading - only the current field's input has active listeners.
 */
export class InputManager implements IInputManager {
  // ============================================
  // Properties
  // ============================================

  /** Reference to parent form component */
  public readonly form: FlowupsForm;

  /** Map of input name to input element for fast lookup */
  private inputMap: Map<string, HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement> =
    new Map();

  /** Currently bound field index (for cleanup) */
  private boundFieldIndex: number | null = null;

  /** Active event listeners for cleanup */
  private activeListeners: Array<{
    element: HTMLElement;
    event: string;
    handler: EventListener;
  }> = [];

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
    this.discoverInputs();
  }

  /**
   * Cleanup manager resources
   */
  public destroy(): void {
    this.unbindAllInputs();
    this.inputMap.clear();
  }

  // ============================================
  // Discovery
  // ============================================

  /**
   * Discover all inputs in the form
   * Stores them in a map by name for fast lookup
   */
  public discoverInputs(): void {
    this.inputMap.clear();

    const fields = this.form.fieldManager.getFields();

    fields.forEach((field) => {
      const { element } = field;
      if (!element) return;

      // Get the input name attribute
      const name = element.getAttribute('name');
      if (!name) {
        this.form.logWarn(`Input in field "${field.id}" missing name attribute`);
        return;
      }

      this.inputMap.set(name, element);
    });

    this.form.logDebug(`Discovered ${this.inputMap.size} inputs`);
  }

  // ============================================
  // Event Binding
  // ============================================

  /**
   * Bind events to the current field's input
   * Automatically determines the correct event type based on input type
   */
  public bindCurrentFieldInput(): void {
    // Get current field from FieldManager
    const currentField = this.form.fieldManager.getCurrentFieldMetadata();
    if (!currentField) return;

    // Unbind previous field if any
    if (this.boundFieldIndex !== null && this.boundFieldIndex !== currentField.index) {
      this.unbindFieldInput(this.boundFieldIndex);
    }

    const { input } = currentField;
    if (!input) return;

    const name = input.getAttribute('name');
    if (!name) return;

    // Determine event type based on input type
    const eventType = this.getEventTypeForInput(input);

    // Create handler
    const handler: EventListener = () => {
      const value = this.extractInputValue(input);
      this.handleInputChange(name, value);
    };

    // Bind event
    input.addEventListener(eventType, handler);
    this.activeListeners.push({ element: input, event: eventType, handler });

    this.boundFieldIndex = currentField.index;

    this.form.logDebug(`Bound ${eventType} event to input "${name}"`);
  }

  /**
   * Unbind events from a specific field's input
   * @param fieldIndex - Index of field to unbind
   */
  public unbindFieldInput(fieldIndex: number): void {
    const field = this.form.fieldManager.getFieldByIndex(fieldIndex);
    if (!field?.input) return;

    const { input } = field;

    // Remove all listeners associated with this input
    this.activeListeners = this.activeListeners.filter((listener) => {
      if (listener.element === input) {
        listener.element.removeEventListener(listener.event, listener.handler);
        return false;
      }
      return true;
    });

    if (this.boundFieldIndex === fieldIndex) {
      this.boundFieldIndex = null;
    }

    this.form.debug(`Unbound events from field ${fieldIndex}`);
  }

  /**
   * Unbind all active input listeners
   * @internal Used during cleanup
   */
  private unbindAllInputs(): void {
    this.activeListeners.forEach((listener) => {
      listener.element.removeEventListener(listener.event, listener.handler);
    });
    this.activeListeners = [];
    this.boundFieldIndex = null;
  }

  // ============================================
  // Event Type Selection
  // ============================================

  /**
   * Determine the correct event type for an input element
   * @param input - Input element to check
   * @returns Event type to bind to
   */
  private getEventTypeForInput(
    input: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
  ): 'blur' | 'change' | 'input' {
    // Handle select elements
    if (input instanceof HTMLSelectElement) {
      return 'change';
    }

    // Handle textarea
    if (input instanceof HTMLTextAreaElement) {
      return 'blur';
    }

    // Handle input elements by type
    const type = input.type.toLowerCase();

    // Selection inputs use change
    if (['radio', 'checkbox'].includes(type)) {
      return 'change';
    }

    // Numeric inputs use input for real-time feedback
    if (['number', 'range'].includes(type)) {
      return 'input';
    }

    // Text-based inputs use blur
    // (text, email, password, tel, url, search, etc.)
    return 'blur';
  }

  // ============================================
  // Value Extraction
  // ============================================

  /**
   * Extract value from any input type
   * @param input - Input element to extract value from
   * @returns Extracted value (string, boolean, or array)
   */
  private extractInputValue(
    input: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
  ): unknown {
    // Handle select elements
    if (input instanceof HTMLSelectElement) {
      return input.value;
    }

    // Handle textarea
    if (input instanceof HTMLTextAreaElement) {
      return input.value;
    }

    // Handle input elements by type
    const type = input.type.toLowerCase();

    // Checkbox - return boolean for single, or handle as part of group
    if (type === 'checkbox') {
      const name = input.getAttribute('name');
      if (!name) return input.checked;

      // Check if this is part of a checkbox group (multiple checkboxes with same name)
      const checkboxes = Array.from(
        this.form.getRootElement().querySelectorAll(`input[type="checkbox"][name="${name}"]`)
      ) as HTMLInputElement[];

      if (checkboxes.length > 1) {
        // Checkbox group - return array of checked values
        return checkboxes.filter((cb) => cb.checked).map((cb) => cb.value);
      }

      // Single checkbox - return boolean
      return input.checked;
    }

    // Radio - return selected value from group
    if (type === 'radio') {
      const name = input.getAttribute('name');
      if (!name) return input.value;

      const radios = Array.from(
        this.form.getRootElement().querySelectorAll(`input[type="radio"][name="${name}"]`)
      ) as HTMLInputElement[];

      const checked = radios.find((r) => r.checked);
      return checked ? checked.value : null;
    }

    // Default - return value as string
    return input.value;
  }

  /**
   * Get input value by name
   * @param name - Input name attribute
   * @returns Current value or undefined if not found
   */
  public getInputValue(name: string): unknown {
    const input = this.inputMap.get(name);
    if (!input) return undefined;

    return this.extractInputValue(input);
  }

  // ============================================
  // Value Setting
  // ============================================

  /**
   * Set input value by name
   * @param name - Input name attribute
   * @param value - Value to set
   */
  public setInputValue(name: string, value: unknown): void {
    const input = this.inputMap.get(name);
    if (!input) {
      this.form.warn(`Cannot set value for input "${name}" - not found`);
      return;
    }

    // Handle select elements
    if (input instanceof HTMLSelectElement) {
      input.value = String(value);
      return;
    }

    // Handle textarea
    if (input instanceof HTMLTextAreaElement) {
      input.value = String(value);
      return;
    }

    // Handle input elements by type
    const type = input.type.toLowerCase();

    // Checkbox
    if (type === 'checkbox') {
      if (Array.isArray(value)) {
        // Checkbox group - check all inputs with matching values
        const checkboxes = Array.from(
          this.form.getRootElement().querySelectorAll(`input[type="checkbox"][name="${name}"]`)
        ) as HTMLInputElement[];

        checkboxes.forEach((cb) => {
          cb.checked = value.includes(cb.value);
        });
      } else {
        // Single checkbox - treat as boolean
        input.checked = Boolean(value);
      }
      return;
    }

    // Radio - check the radio with matching value
    if (type === 'radio') {
      const radios = Array.from(
        this.form.getRootElement().querySelectorAll(`input[type="radio"][name="${name}"]`)
      ) as HTMLInputElement[];

      radios.forEach((r) => {
        r.checked = r.value === String(value);
      });
      return;
    }

    // Default - set value as string
    input.value = String(value);
  }

  // ============================================
  // Form Data
  // ============================================

  /**
   * Get all form data as key-value pairs
   * @returns Object with all input names and values
   */
  public getAllFormData(): Record<string, unknown> {
    const formData: Record<string, unknown> = {};

    this.inputMap.forEach((input, name) => {
      formData[name] = this.extractInputValue(input);
    });

    return formData;
  }

  /**
   * Get input element by name
   * @param name - Input name attribute
   * @returns Input element or null if not found
   */
  public getInputByName(
    name: string
  ): HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null {
    return this.inputMap.get(name) || null;
  }

  // ============================================
  // Input Change Handling
  // ============================================

  /**
   * Handle input value change
   * Updates formData state and emits event for ConditionManager
   * @param name - Input name
   * @param value - New value
   * @internal Called by event handlers
   */
  private handleInputChange(name: string, value: unknown): void {
    // Update formData state
    const currentFormData = this.form.getState('formData');
    const updatedFormData = {
      ...currentFormData,
      [name]: value,
    };
    this.form.setState('formData', updatedFormData);

    // Emit event for ConditionManager (future)
    this.form.emit('input:changed', { name, value });

    this.form.debug(`Input "${name}" changed to:`, value);
  }
}
