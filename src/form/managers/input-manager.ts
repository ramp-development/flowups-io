/**
 * Input Manager
 *
 * Handles input discovery, event binding, and value extraction.
 * Groups radio/checkbox inputs by name attribute.
 * Only binds events to the current field's input for optimal performance.
 */

import { ATTR } from '../constants';
import type {
  FieldItem,
  FormInputState,
  InputElement,
  InputItem,
  InputParentHierarchy,
  UpdatableItemData,
} from '../types';
import { HierarchyBuilder } from '../utils/managers/hierarchy-builder';
import { ItemManager } from './item-manager';

/**
 * InputManager Implementation
 *
 * Discovers inputs within field wrappers and groups them by name.
 * Implements lazy event binding - only the active field inputs are bound to events.
 */
export class InputManager extends ItemManager<InputItem> {
  protected readonly itemType = 'input';

  /** Active event listeners for cleanup */
  private activeListeners: Array<{
    element: InputElement;
    index: number;
    name: string;
    event: string;
    handler: EventListener;
  }> = [];

  /**
   * Initialize InputManager
   */
  public init(): void {
    super.init(false);
    this.setupEventListeners();
    this.onInitialized();
  }

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
  protected discoverItems(): void {
    const fields = this.form.fieldManager.getAll();

    this.clear();

    // Track which names we've already processed to avoid duplicates
    const processedNames = new Set<string>();

    fields.forEach((field, index) => {
      // Query for inputs within this field wrapper
      const inputs = Array.from(
        field.element.querySelectorAll<InputElement>('input, select, textarea')
      );

      if (inputs.length === 0) {
        this.form.logWarn(`Field "${field.id}" has no inputs`, { field });
        return;
      }

      const parentHierarchy = this.findParentHierarchy<InputParentHierarchy>(field);

      // Process each input found
      inputs.forEach((input) => {
        const data = this.createInputData(input, index, {
          field,
          processedNames,
          parentHierarchy,
          isGroup: inputs.length > 1,
        });

        if (!data) return;
        this.update(data);
      });
    });

    this.logDebug(`Discovered ${this.length} ${this.itemType}s`, {
      elements: this.getAll(),
    });
  }

  /**
   * Not used - use createInputData instead
   */
  protected createItemData(): undefined {
    return undefined;
  }

  /**
   * Create input item data with additional context
   * Private helper used by discoverElements() to handle input-specific logic
   *
   * @param input - InputElement (input/select/textarea)
   * @param index - Index of the input within field
   * @param props - Additional context for input discovery
   * @returns InputItem | undefined
   */
  private createInputData(
    input: InputElement,
    index: number,
    props: {
      field: FieldItem;
      processedNames: Set<string>;
      parentHierarchy: InputParentHierarchy;
      isGroup: boolean;
    }
  ): InputItem | undefined {
    const { field, processedNames, parentHierarchy, isGroup } = props;

    const name = input.getAttribute('name');
    if (!name) {
      throw this.createError('Cannot discover inputs: Input missing name attribute', 'init', {
        cause: {
          input,
          field: parentHierarchy.fieldId,
          group: parentHierarchy.groupId,
          set: parentHierarchy.setId,
          card: parentHierarchy.cardId,
          form: parentHierarchy.formId,
        },
      });
    }

    // If we've already processed this name, it's part of a radio/checkbox group
    if (processedNames.has(name)) {
      // Find the existing item, add this input and recalc the data
      const existingInput = this.getById(name);
      if (existingInput) {
        existingInput.inputs.push(input);
        existingInput.isGroup = existingInput.inputs.length > 1;
        this.mergeItemData(existingInput, {});
      }
      return;
    }

    // New input - create InputItem
    processedNames.add(name);

    const inputType = this.getInputType(input);

    const isRequired = this.checkIfRequired(input);
    const isValid = this.checkIfValid(input);
    const { visited, active, current, isIncluded } = field;

    // Check for format attribute
    const format = input.getAttribute(`${ATTR}-format`) || undefined;

    // Initialize formatConfig if format exists and input is text-based
    let formatConfig: InputItem['formatConfig'];
    if (format && (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement)) {
      const { formattedLength, rawLength } = this.calculateFormatLengths(format);
      const originalMaxLength = input.maxLength > -1 ? input.maxLength : null;

      // IMPORTANT: Set maxLength BEFORE minLength to avoid constraint violation
      // (cannot set minLength > current maxLength)

      // Adjust maxLength based on original constraint
      if (originalMaxLength !== null && originalMaxLength < formattedLength) {
        // Case 1: Original maxLength is too short for format - extend it to allow format
        input.maxLength = formattedLength;
      } else if (originalMaxLength !== null && originalMaxLength > rawLength) {
        // Case 2: Original maxLength allows more than raw length
        // Allow typing beyond formatted length to reach originalMaxLength
        // Formula: originalMaxLength - rawLength + formattedLength
        // Example: 15 - 10 + 14 = 19 (allows typing past format to trigger removal)
        input.maxLength = originalMaxLength - rawLength + formattedLength;
      } else {
        // Case 3: No maxLength or originalMaxLength <= rawLength
        // Set to formatted length
        input.maxLength = formattedLength;
      }

      // Set initial minLength to formatted length (after maxLength is set)
      input.minLength = formattedLength;

      formatConfig = {
        pattern: format,
        formattedLength,
        rawLength,
        originalMaxLength,
      };
    }

    return {
      element: input,
      index,
      id: name,
      visible: true,
      active,
      type: 'input',
      parentHierarchy,
      current,
      visited,
      completed: isValid,
      inputs: [input],
      inputType,
      value: this.getInputValue(input),
      name,
      isGroup,
      isRequiredOriginal: isRequired,
      isRequired,
      isValid,
      isIncluded,
      format,
      formatConfig,
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
      formData: this.getFormData(),
    };
  }

  protected buildItemData(item: InputItem): InputItem {
    // Get parent field to check if it's included
    const parentField = this.form.fieldManager.getById(item.parentHierarchy.fieldId);
    const isIncluded = parentField ? parentField.isIncluded : true;

    // Input is only required if parent field is included AND input was originally required
    const isRequired = isIncluded ? item.isRequiredOriginal : false;

    // Set required state if it has changed
    if (isRequired !== item.isRequired) {
      this.setInputRequired(item, isRequired);
    }

    // Check if input is valid
    const isValid = this.checkIfValid(item.element);

    return {
      ...item,
      completed: isValid,
      value: this.getValue(item.name),
      isIncluded,
      isRequired,
      isValid,
    };
  }

  public applyStates(): void {
    this.getAll().forEach((item) => {
      item.inputs.forEach((input) => {
        input.required = item.isRequired;
      });
    });
  }

  /**
   * Setup event listeners for state changes
   */
  private setupEventListeners(): void {
    this.bindActiveInputs();
    this.form.subscribe('form:navigation:changed', (payload) => {
      if (payload.target === 'field') {
        this.handleActiveFieldsChanged();
      }
    });
  }

  private handleActiveFieldsChanged(): void {
    this.bindActiveInputs();
    this.unbindInactiveInputs();
  }

  /**
   * Bind events to the current field's input
   * Automatically determines the correct event type based on input type
   */
  public bindActiveInputs(): void {
    const activeItems = this.getActive();
    if (activeItems.length === 0) return;

    activeItems.forEach((item) => {
      // If already bound, skip - check if any of this item's inputs are already bound
      const alreadyBound = item.inputs.some((input) =>
        this.activeListeners.some((listener) => listener.element === input)
      );
      if (alreadyBound) return;

      // Determine event type for value changes
      const eventType = this.getEventTypeForInput(item.element);

      // Bind events to ALL inputs in the item (for radio/checkbox groups)
      item.inputs.forEach((input) => {
        // Check if this input needs formatting
        const needsFormatting =
          item.format &&
          (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement);

        const handler: EventListener = () => {
          // Apply formatting FIRST if pattern exists
          // This ensures the value is formatted before extraction and validation
          if (needsFormatting) {
            this.handleFormatting(
              input as HTMLInputElement | HTMLTextAreaElement,
              item.format!,
              item
            );
          }

          // Then extract and handle the change
          const value = this.extractInputValue(item);
          this.handleInputChange(item.name, value);
        };

        input.addEventListener(eventType, handler);
        this.activeListeners.push({
          element: input,
          index: item.index,
          name: item.name,
          event: eventType,
          handler,
        });
      });

      this.logDebug(`Bound "${eventType}" events to input "${item.name}"`);
    });
  }

  /**
   * Unbind events from inputs not associated with active field indices
   * @param activeIndices - Array of active field indices to keep bound
   */
  public unbindInactiveInputs(): void {
    const activeItems = this.getActive();
    if (activeItems.length === 0) return;

    this.activeListeners = this.activeListeners.filter((listener) => {
      const shouldRemove = !activeItems.find((item) => item.index === listener.index);

      if (shouldRemove) {
        listener.element.removeEventListener(listener.event, listener.handler);
        this.logDebug(`Unbound "${listener.event}" events from input "${listener.name}"`);
      }

      return !shouldRemove; // Keep listeners that should NOT be removed
    });
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
  }

  // ============================================
  // Event Type Selection
  // ============================================

  /**
   * Determine the correct event type for an input
   * @param input - Input element to check
   * @returns Event type to bind to
   */
  private getEventTypeForInput(input: InputElement): 'blur' | 'change' | 'input' {
    // Handle select and textarea elements
    if (input instanceof HTMLSelectElement) return 'change';
    if (input instanceof HTMLTextAreaElement) return 'input';

    // Handle input elements by type
    const type = input.type.toLowerCase();

    // Selection inputs use change
    if (['radio', 'checkbox'].includes(type)) return 'change';

    // Numeric and text-based inputs use input for real-time feedback
    return 'input';
  }

  // ============================================
  // Value Extraction
  // ============================================

  /**
   * Extract value from an input item
   * Handles all input types including radio/checkbox groups
   * @param item - InputItem to extract value from
   * @returns Extracted value (string, boolean, or array)
   */
  private extractInputValue(item: InputItem): unknown {
    const { element } = item;

    // Handle select elements
    if (element instanceof HTMLSelectElement) {
      return element.value;
    }

    // Handle textarea elements
    if (element instanceof HTMLTextAreaElement) {
      // Strip formatting if format pattern exists
      if (item.format) {
        return this.stripFormatting(element.value);
      }
      return element.value;
    }

    // Handle inputs by type
    const type = item.inputType;

    // Checkbox
    if (type === 'checkbox') {
      if (item.isGroup) {
        // Checkbox group - return array of checked values
        return (item.inputs as HTMLInputElement[]).filter((cb) => cb.checked).map((cb) => cb.value);
      }

      // Single checkbox - return boolean
      return element.checked;
    }

    // Radio - return selected value from group
    if (type === 'radio') {
      const checked = (item.inputs as HTMLInputElement[]).find((r) => r.checked);
      return checked ? checked.value : null;
    }

    return element.value;
  }

  /**
   * Get input value
   * @param selector - ID or Index
   * @returns Current value or undefined
   */
  private getValue(selector: string | number): unknown {
    const item = this.getBySelector(selector);
    if (!item) return undefined;

    return item.value;
  }

  private getInputValue(input: InputElement): unknown {
    if (input instanceof HTMLSelectElement || input instanceof HTMLTextAreaElement) {
      return input.value;
    }

    // Handle HTMLInputElements by type
    const type = input.type.toLowerCase();

    // Checkbox or radio
    if (type === 'checkbox' || type === 'radio') {
      return input.checked;
    }

    // Default - return value as string
    return input.value;
  }

  // ============================================
  // Value Setting
  // ============================================

  /**
   * Set input value
   * @param name - Input name attribute
   * @param value - Value to set
   */
  public setValue(selector: number | string, value: unknown): void {
    const item = this.getBySelector(selector);
    if (!item) {
      this.form.logWarn(`Cannot set value for input "${selector}" - not found`);
      return;
    }

    const { element } = item;

    // Handle select and textarea elements
    if (element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement) {
      element.value = String(value);
      return;
    }

    // Handle input elements by type
    const type = item.inputType;

    // Checkbox
    if (type === 'checkbox') {
      if (Array.isArray(value)) {
        // Checkbox group - check all inputs with matching values
        (item.inputs as HTMLInputElement[]).forEach((cb) => {
          cb.checked = value.includes(cb.value);
        });
      } else {
        // Single checkbox - treat as boolean
        (element as HTMLInputElement).checked = Boolean(value);
      }
      return;
    }

    // Radio - check the radio with matching value
    if (type === 'radio') {
      (item.inputs as HTMLInputElement[]).forEach((r) => {
        r.checked = r.value === String(value);
      });
      return;
    }

    // Default - set value as string
    element.value = String(value);
  }

  // ============================================
  // Form Data
  // ============================================

  /**
   * Get form data as key-value pairs
   * @returns Object with input names and values
   */
  public getFormData(): Record<string, unknown> {
    const formData: Record<string, unknown> = {};

    this.getAll().forEach((item) => {
      formData[item.name] = this.extractInputValue(item);
    });

    return formData;
  }

  // ============================================
  // Input Formatting
  // ============================================

  /**
   * Calculate format lengths from pattern string
   * @param pattern - Format pattern (e.g., "(xxx) xxx-xxxx")
   * @returns Object with formattedLength and rawLength
   */
  private calculateFormatLengths(pattern: string): { formattedLength: number; rawLength: number } {
    const rawLength = (pattern.match(/[Xx]/g) || []).length;
    const formattedLength = pattern.length;
    return { formattedLength, rawLength };
  }

  /**
   * Update minLength and maxLength attributes based on current raw value length
   * Dynamically adjusts constraints when user exceeds or returns within format capacity
   *
   * IMPORTANT: Attribute order matters to avoid browser constraint violations:
   * - When increasing (raw → formatted): Set maxLength first, then minLength
   * - When decreasing (formatted → raw): Set minLength first, then maxLength
   *
   * @param input - Input element to update
   * @param item - InputItem containing formatConfig
   * @param rawLength - Current length of raw (digits only) value
   */
  private updateLengthConstraints(
    input: HTMLInputElement | HTMLTextAreaElement,
    item: InputItem,
    rawLength: number
  ): void {
    if (!item.formatConfig) return;

    const { formattedLength, rawLength: maxRawLength, originalMaxLength } = item.formatConfig;

    // Determine if we're within format capacity
    const withinFormatCapacity = rawLength <= maxRawLength;

    if (withinFormatCapacity) {
      // Within capacity - use formatted constraints
      // Set maxLength FIRST to avoid minLength > maxLength error

      // Determine correct maxLength for format mode
      let targetMaxLength: number;
      if (originalMaxLength !== null && originalMaxLength > maxRawLength) {
        // Allow typing beyond formatted length to reach originalMaxLength
        // Formula: originalMaxLength - rawLength + formattedLength
        targetMaxLength = originalMaxLength - maxRawLength + formattedLength;
      } else {
        // Standard case: maxLength = formatted length
        targetMaxLength = formattedLength;
      }

      if (input.maxLength !== targetMaxLength) {
        input.maxLength = targetMaxLength;
      }
      if (input.minLength !== formattedLength) {
        input.minLength = formattedLength;
      }
    } else {
      // Exceeds capacity - use raw constraints
      // Set minLength FIRST to avoid minLength > maxLength error
      if (input.minLength !== maxRawLength) {
        input.minLength = maxRawLength;
      }
      // Restore original maxLength or remove constraint
      const newMaxLength = originalMaxLength !== null ? originalMaxLength : -1;
      if (input.maxLength !== newMaxLength) {
        input.maxLength = newMaxLength;
      }
    }
  }

  /**
   * Apply format pattern to input value
   * Formats the value according to pattern (e.g., "(XXX) XXX-XXXX")
   * Maintains cursor position after formatting
   * Updates minLength and maxLength constraints dynamically
   *
   * @param input - Input element to format
   * @param pattern - Format pattern (X = digit placeholder)
   * @param item - InputItem containing formatConfig
   */
  private handleFormatting(
    input: HTMLInputElement | HTMLTextAreaElement,
    pattern: string,
    item: InputItem
  ): void {
    const cursorPosition = input.selectionStart || 0;
    const oldValue = input.value;
    const rawValue = this.stripFormatting(oldValue);

    // Update length constraints based on current raw value length
    this.updateLengthConstraints(input, item, rawValue.length);

    // Apply formatting
    const formattedValue = this.applyFormat(rawValue, pattern);

    // Only update if value changed
    if (formattedValue !== oldValue) {
      input.value = formattedValue;

      // Calculate new cursor position
      const newCursorPosition = this.calculateCursorPosition(
        oldValue,
        formattedValue,
        cursorPosition
      );

      // Restore cursor position
      input.setSelectionRange(newCursorPosition, newCursorPosition);
    }
  }

  /**
   * Strip all non-digit characters from value
   * @param value - Value to strip
   * @returns Raw digits only
   */
  private stripFormatting(value: string): string {
    return value.replace(/\D/g, '');
  }

  /**
   * Apply format pattern to raw digits
   * If value exceeds pattern length, returns unformatted digits
   * @param rawValue - Raw digit string
   * @param pattern - Format pattern (X = digit)
   * @returns Formatted value or raw digits if overflow
   */
  private applyFormat(rawValue: string, pattern: string): string {
    // Count how many digit placeholders are in the pattern
    const maxDigits = (pattern.match(/[Xx]/g) || []).length;

    // If raw value exceeds pattern capacity, return raw digits (no formatting)
    if (rawValue.length > maxDigits) {
      return rawValue;
    }

    let formatted = '';
    let rawIndex = 0;

    for (let i = 0; i < pattern.length && rawIndex < rawValue.length; i++) {
      const patternChar = pattern[i];

      if (patternChar === 'X' || patternChar === 'x') {
        // Insert digit
        formatted += rawValue[rawIndex];
        rawIndex += 1;
      } else {
        // Insert literal character
        formatted += patternChar;
      }
    }

    return formatted;
  }

  /**
   * Calculate new cursor position after formatting
   * Accounts for added/removed formatting characters
   *
   * @param oldValue - Value before formatting
   * @param newValue - Value after formatting
   * @param oldCursor - Cursor position before formatting
   * @param pattern - Format pattern
   * @returns New cursor position
   */
  private calculateCursorPosition(oldValue: string, newValue: string, oldCursor: number): number {
    // Count how many digits are before cursor in old value
    const digitsBeforeCursor = oldValue.slice(0, oldCursor).replace(/\D/g, '').length;

    // Find position in new value where we've seen that many digits
    let digitCount = 0;
    let newCursor = 0;

    for (let i = 0; i < newValue.length; i++) {
      if (/\d/.test(newValue[i])) {
        digitCount += 1;
        if (digitCount === digitsBeforeCursor) {
          newCursor = i + 1;
          break;
        }
      }
    }

    // If we didn't find enough digits, put cursor at end
    if (digitCount < digitsBeforeCursor) {
      newCursor = newValue.length;
    }

    return newCursor;
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
    this.logDebug(`Input "${name}" changed to "${value}"`);

    this.updateItemData(name, { value } as UpdatableItemData<InputItem>);
    const formData = this.form.getState('formData');
    this.form.setState('formData', { ...formData, [name]: value });
    this.form.emit('form:input:changed', { name, value });
  }

  /**
   * Set required state for an input
   * Updates both the InputItem and DOM attributes
   *
   * @param item - InputItem to update
   * @param isRequired - New required state
   * @internal
   */
  private setInputRequired(item: InputItem, isRequired: boolean): void {
    item.isRequired = isRequired;

    // Update DOM required attribute on all elements
    item.inputs.forEach((input) => {
      input.required = isRequired;
    });
  }

  // ============================================
  // Private Helpers
  // ============================================

  /**
   * Find the parent field item for a field
   *
   * @param element - The input element
   * @returns Parent field item
   */
  protected findParentItem(element: HTMLElement): FieldItem {
    const parentField = HierarchyBuilder.findParentByElement(element, 'field', () =>
      this.form.fieldManager.getAll()
    );

    if (!parentField) {
      throw this.createError('Cannot discover inputs: no parent field found', 'init', {
        cause: { manager: 'InputManager', element },
      });
    }

    return parentField;
  }

  /**
   * Get the input type from an element
   */
  private getInputType(element: InputElement): string {
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
  private checkIfRequired(element: InputElement): boolean {
    return element.required;
  }

  /**
   * Check if an input is valid
   */
  private checkIfValid(element: InputElement): boolean {
    if (element instanceof HTMLInputElement) {
      const { minLength, maxLength, value } = element;
      if (
        (minLength > -1 && value.length < minLength) ||
        (maxLength > -1 && value.length > maxLength)
      ) {
        return false;
      }
    }
    return element.checkValidity();
  }
}
