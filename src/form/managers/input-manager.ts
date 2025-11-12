/**
 * Input Manager
 *
 * Handles input discovery, event binding, and value extraction.
 * Groups radio/checkbox inputs by name attribute.
 * Only binds events to the current field's input for optimal performance.
 */

import type { StateChangePayload } from '$lib/types';

import type {
  FieldItem,
  FormInputState,
  FormStateKeys,
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
    const isValid = this.checkIfValid(item.element);

    // Get parent field to check if it's included
    const parentField = this.form.fieldManager.getById(item.parentHierarchy.fieldId);
    const isIncluded = parentField ? parentField.isIncluded : true;

    // Input is only required if parent field is included AND input was originally required
    const isRequired = isIncluded ? item.isRequiredOriginal : false;

    return {
      ...item,
      completed: isValid,
      value: this.getValue(item.name),
      isIncluded,
      isRequired,
      isValid,
    };
  }

  /**
   * Setup event listeners for state changes
   */
  private setupEventListeners(): void {
    this.bindActiveInputs();
    this.form.subscribe('state:changed', (payload: StateChangePayload) => {
      // Only update display if relevant state changed
      const relevantKeys: readonly FormStateKeys[] = ['activeFieldIndices'];

      // payload.key follows pattern `${formName}.${key}`
      const key = payload.key.includes('.')
        ? (payload.key.split('.').pop() as FormStateKeys)
        : (payload.key as FormStateKeys);

      if (!key || !relevantKeys.includes(key)) return;

      if (key === 'activeFieldIndices') {
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
    let boundCount = 0;

    const activeItems = this.getActive();
    activeItems.forEach((item) => {
      // If already bound, skip - check if any of this item's inputs are already bound
      const alreadyBound = item.inputs.some((input) =>
        this.activeListeners.some((listener) => listener.element === input)
      );
      if (alreadyBound) return;

      // Determine event type
      const eventType = this.getEventTypeForInput(item.element);

      // Bind events to ALL inputs in the item (for radio/checkbox groups)
      item.inputs.forEach((input) => {
        const handler: EventListener = () => {
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
      boundCount += 1;
    });

    this.logDebug(`Bound listeners to ${boundCount} input${boundCount !== 1 ? 's' : ''}`);
  }

  /**
   * Unbind events from inputs not associated with active field indices
   * @param activeIndices - Array of active field indices to keep bound
   */
  public unbindInactiveInputs(): void {
    let removedCount = 0;
    const activeItems = this.getActive();

    this.activeListeners = this.activeListeners.filter((listener) => {
      const shouldRemove = !activeItems.find((item) => item.index === listener.index);

      if (shouldRemove) {
        listener.element.removeEventListener(listener.event, listener.handler);
        this.logDebug(`Unbound "${listener.event}" events from input "${listener.name}"`);
        removedCount += 1;
      }

      return !shouldRemove; // Keep listeners that should NOT be removed
    });

    this.logDebug(`Unbound listeners from ${removedCount} input${removedCount !== 1 ? 's' : ''}`);
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

    // Handle select and textarea elements
    if (element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement) {
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
      console.log('Radio', item, checked);
      return checked ? checked.value : null;
    }

    // Default - return value as string
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
    this.updateItemData(name, { value } as UpdatableItemData<InputItem>);
    // Update formData state
    const payload = { name, value };
    const formData = this.form.getState('formData');
    this.form.setState('formData', { ...formData, [payload.name]: payload.value });
    this.form.emit('form:input:changed', payload);

    this.logDebug(`Input "${name}" changed to:`, value);
  }

  // ============================================
  // Field Inclusion Sync
  // ============================================

  // /**
  //  * Update input required state based on parent field inclusion
  //  * Called by FieldManager when field.isIncluded changes
  //  *
  //  * @param fieldId - ID of the field whose inclusion changed
  //  * @param isIncluded - New inclusion state
  //  */
  // public syncInputInclusionWithField(fieldId: string, isIncluded: boolean): void {
  //   const input = this.getAllByParentId(fieldId, 'field')[0];

  //   input.isIncluded = isIncluded;
  //   this.setInputRequired(input, isIncluded && input.isRequiredOriginal);

  //   this.form.logDebug(`Synced input with field "${fieldId}"`, {
  //     input: input.name,
  //     inclusion: isIncluded,
  //     required: input.isRequired,
  //   });
  // }

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
    return element.checkValidity();
  }
}
