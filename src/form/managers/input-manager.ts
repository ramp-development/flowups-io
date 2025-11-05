/**
 * Input Manager
 *
 * Handles input discovery, event binding, and value extraction.
 * Groups radio/checkbox inputs by name attribute.
 * Only binds events to the current field's input for optimal performance.
 */

import type {
  FieldElement,
  FormInputState,
  IInputManager,
  InputElement,
  InputParentHierarchy,
} from '../types';
import { ElementManager } from './element-manager';

/**
 * InputManager Implementation
 *
 * Discovers inputs within field wrappers and groups them by name.
 * Implements lazy event binding - only the active field inputs are bound to events.
 */
export class InputManager extends ElementManager<InputElement> implements IInputManager {
  protected elements: InputElement[] = [];
  protected elementMap: Map<string, InputElement> = new Map();
  protected readonly elementType = 'input';

  /** Currently bound input name (for cleanup) */
  private boundInputName: string | null = null;

  /** Active event listeners for cleanup */
  private activeListeners: Array<{
    element: HTMLElement;
    event: string;
    handler: EventListener;
  }> = [];

  /**
   * Destroy InputManager
   */
  public destroy(): void {
    this.unbindAllInputs();
    super.destroy();
  }

  /**
   * Discover all inputs in the form
   * Queries within each field wrapper and groups by name attribute
   */
  protected discoverElements(): void {
    const fields = this.form.fieldManager.getAll();

    this.elements = [];
    this.elementMap.clear();

    // Track which names we've already processed to avoid duplicates
    const processedNames = new Set<string>();

    fields.forEach((field, index) => {
      // Query for inputs within this field wrapper
      const inputs = Array.from(
        field.element.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
          'input, select, textarea'
        )
      );

      if (inputs.length === 0) {
        this.form.logWarn(`Field "${field.id}" has no input elements`, { field });
        return;
      }

      const parentHierarchy = this.findParentHierarchy<InputParentHierarchy>(field);

      // Process each input found
      inputs.forEach((inputElement) => {
        const elementData = this.createInputElementData(inputElement, index, {
          field,
          processedNames,
          parentHierarchy,
          isGroup: inputs.length > 1,
        });

        if (!elementData) return;
        this.updateStorage(elementData);
      });
    });
  }

  /**
   * Create element data object
   * Required by abstract class but not directly used
   * InputManager uses createInputElementData() instead due to unique discovery needs
   *
   * @param element - HTMLElement
   * @param index - Index of the element
   * @returns InputElement | undefined
   */
  protected createElementData(): undefined {
    // Not used - InputManager has custom discovery logic in discoverElements()
    return undefined;
  }

  /**
   * Create input element data with additional context
   * Private helper used by discoverElements() to handle input-specific logic
   *
   * @param element - HTMLElement (input/select/textarea)
   * @param index - Index of the element
   * @param props - Additional context for input discovery
   * @returns InputElement | undefined
   */
  private createInputElementData(
    element: HTMLElement,
    index: number,
    props: {
      field: FieldElement;
      processedNames: Set<string>;
      parentHierarchy: InputParentHierarchy;
      isGroup: boolean;
    }
  ): InputElement | undefined {
    if (
      !(
        element instanceof HTMLInputElement ||
        element instanceof HTMLSelectElement ||
        element instanceof HTMLTextAreaElement
      )
    )
      return;
    const { field, processedNames, parentHierarchy, isGroup } = props;

    const name = element.getAttribute('name');
    if (!name) {
      throw this.createError(`Input in field "${field.id}" missing name attribute`, 'init', {
        cause: {
          field: field.element,
          input: element,
        },
      });
    }

    // If we've already processed this name, it's part of a radio/checkbox group
    if (processedNames.has(name)) {
      // Find the existing element and add this element to it
      const existingInput = this.elementMap.get(name);
      if (existingInput) {
        existingInput.inputs.push(element);
        existingInput.isGroup = existingInput.inputs.length > 1;
      }
      return;
    }

    // New input - create InputElement
    processedNames.add(name);

    const inputType = this.getInputType(element);

    const isRequiredOriginal = this.checkIfRequired(element);

    return {
      element: element,
      type: 'input',
      id: name,
      title: name,
      index,
      visited: false,
      completed: false,
      active: false,
      current: false,
      inputs: [element],
      inputType,
      value: this.getInputValue(name),
      parentHierarchy,
      name,
      isGroup,
      isRequiredOriginal,
      isRequired: isRequiredOriginal,
      isValid: false,
      isIncluded: field.isIncluded,
      errors: [],
    };
  }

  /**
   * Calculate input-specific states
   * Returns formData object with all input values
   *
   * @returns FormInputState - Complete input state object
   */
  public calculateStates(): FormInputState {
    return {
      formData: this.getAllFormData(),
    };
  }

  /**
   * Bind events to the current field's input
   * Automatically determines the correct event type based on input type
   */
  public bindCurrentFieldInput(): void {
    // Get current field from FieldManager
    const currentField = this.form.fieldManager.getCurrent();
    if (!currentField) return;

    // Get the input for this field
    const input = this.getAllByParentId(currentField.id, 'field')[0];

    // Unbind previous input
    if (this.boundInputName !== null && this.boundInputName !== input.name) {
      this.unbindInput(this.boundInputName);
    }

    // Determine event type
    const eventType = this.getEventTypeForInput(input.element);

    // Bind events to ALL elements in the input (for radio/checkbox groups)
    input.inputs.forEach((element) => {
      const handler: EventListener = () => {
        const value = this.extractInputValue(input);
        this.handleInputChange(input.name, value);
      };

      element.addEventListener(eventType, handler);
      this.activeListeners.push({ element, event: eventType, handler });
    });

    this.boundInputName = input.name;

    this.form.logDebug(
      `Bound ${eventType} events to input "${input.name}" (${input.inputs.length} elements)`
    );
  }

  /**
   * Unbind events from a specific input by name
   * @param name - Input name
   */
  public unbindInput(name: string): void {
    const input = this.elementMap.get(name);
    if (!input) return;

    // Remove all listeners associated with this input's elements
    this.activeListeners = this.activeListeners.filter((listener) => {
      const shouldRemove = input.inputs.includes(
        listener.element as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      );

      if (shouldRemove) {
        listener.element.removeEventListener(listener.event, listener.handler);
      }

      return !shouldRemove;
    });

    if (this.boundInputName === name) {
      this.boundInputName = null;
    }

    this.form.logDebug(`Unbound events from input "${name}"`);
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
    this.boundInputName = null;
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
   * Extract value from an InputElement
   * Handles all input types including radio/checkbox groups
   * @param input - InputElement to extract value from
   * @returns Extracted value (string, boolean, or array)
   */
  private extractInputValue(input: InputElement): unknown {
    const firstElement = input.element;

    // Handle select elements
    if (firstElement instanceof HTMLSelectElement) {
      return firstElement.value;
    }

    // Handle textarea
    if (firstElement instanceof HTMLTextAreaElement) {
      return firstElement.value;
    }

    // Handle input elements by type
    const type = firstElement.type.toLowerCase();

    // Checkbox
    if (type === 'checkbox') {
      if (input.isGroup) {
        // Checkbox group - return array of checked values
        return (input.inputs as HTMLInputElement[])
          .filter((cb) => cb.checked)
          .map((cb) => cb.value);
      }

      // Single checkbox - return boolean
      return (firstElement as HTMLInputElement).checked;
    }

    // Radio - return selected value from group
    if (type === 'radio') {
      const checked = (input.inputs as HTMLInputElement[]).find((r) => r.checked);
      return checked ? checked.value : null;
    }

    // Default - return value as string
    return firstElement.value;
  }

  /**
   * Get input value by name
   * @param name - Input name attribute
   * @returns Current value or undefined if not found
   */
  public getInputValue(name: string): unknown {
    const input = this.elementMap.get(name);
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
    const input = this.elementMap.get(name);
    if (!input) {
      this.form.logWarn(`Cannot set value for input "${name}" - not found`);
      return;
    }

    const firstElement = input.element;

    // Handle select elements
    if (firstElement instanceof HTMLSelectElement) {
      firstElement.value = String(value);
      return;
    }

    // Handle textarea
    if (firstElement instanceof HTMLTextAreaElement) {
      firstElement.value = String(value);
      return;
    }

    // Handle input elements by type
    const type = firstElement.type.toLowerCase();

    // Checkbox
    if (type === 'checkbox') {
      if (Array.isArray(value)) {
        // Checkbox group - check all inputs with matching values
        (input.inputs as HTMLInputElement[]).forEach((cb) => {
          cb.checked = value.includes(cb.value);
        });
      } else {
        // Single checkbox - treat as boolean
        (firstElement as HTMLInputElement).checked = Boolean(value);
      }
      return;
    }

    // Radio - check the radio with matching value
    if (type === 'radio') {
      (input.inputs as HTMLInputElement[]).forEach((r) => {
        r.checked = r.value === String(value);
      });
      return;
    }

    // Default - set value as string
    firstElement.value = String(value);
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

    this.elements.forEach((input) => {
      formData[input.name] = this.extractInputValue(input);
    });

    return formData;
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
    const formData = this.form.getState('formData');
    this.form.setState('formData', { ...formData, [name]: value });

    this.logDebug(`Input "${name}" changed to:`, value);
  }

  // ============================================
  // Field Inclusion Sync
  // ============================================

  /**
   * Update input required state based on parent field inclusion
   * Called by FieldManager when field.isIncluded changes
   *
   * @param fieldId - ID of the field whose inclusion changed
   * @param isIncluded - New inclusion state
   */
  public syncInputInclusionWithField(fieldId: string, isIncluded: boolean): void {
    const input = this.getAllByParentId(fieldId, 'field')[0];

    input.isIncluded = isIncluded;
    this.setInputRequired(input, isIncluded && input.isRequiredOriginal);

    this.form.logDebug(`Synced input with field "${fieldId}"`, {
      input: input.name,
      inclusion: isIncluded,
      required: input.isRequired,
    });
  }

  /**
   * Set required state for an input
   * Updates both the InputElement and DOM attributes
   *
   * @param input - InputElement to update
   * @param isRequired - New required state
   * @internal
   */
  private setInputRequired(input: InputElement, isRequired: boolean): void {
    input.isRequired = isRequired;

    // Update DOM required attribute on all elements
    input.inputs.forEach((element) => {
      element.required = isRequired;
    });
  }

  // ============================================
  // Private Helpers
  // ============================================

  /**
   * Find the parent set element for a field
   *
   * @param element - The input element
   * @returns Parent field metadata
   */
  protected findParentElement(element: HTMLElement): FieldElement {
    const parentField = this.findParentBySelector(element, 'field', () =>
      this.form.fieldManager.getAll()
    );

    if (!parentField) {
      throw this.createError('Cannot discover inputs: no parent field found', 'init', {
        cause: { manager: 'InputManager', input: element },
      });
    }

    return parentField;
  }

  /**
   * Get the input type from an element
   */
  private getInputType(
    element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
  ): string {
    if (element instanceof HTMLSelectElement) {
      return 'select';
    }

    if (element instanceof HTMLTextAreaElement) {
      return 'textarea';
    }

    return element.type.toLowerCase();
  }

  /**
   * Check if an input is required
   */
  private checkIfRequired(
    element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
  ): boolean {
    return element.hasAttribute('required');
  }
}
