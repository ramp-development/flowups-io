/**
 * Field Manager
 *
 * Handles field discovery, navigation order, and field-by-field progression.
 * Central to the byField behavior in v1.0.
 */

import type { FlowupsForm } from '..';
import { ATTR } from '../constants/attr';
import type { FieldElement, IFieldManager, NavigationGoToEvent } from '../types';
import { parseElementAttribute } from '../utils';

/**
 * FieldManager Implementation
 *
 * Discovers and manages field elements in the form hierarchy.
 * Builds navigation order for byField behavior.
 * Provides field-by-field navigation with conditional visibility support.
 */
export class FieldManager implements IFieldManager {
  // ============================================
  // Properties
  // ============================================

  /** Reference to parent form component */
  public readonly form: FlowupsForm;

  /** Array of discovered field elements with metadata */
  private fields: FieldElement[] = [];

  /** Map for O(1) lookup by field ID */
  private fieldMap: Map<string, FieldElement> = new Map();

  /** Navigation order (indexes of included fields) */
  private navigationOrder: number[] = [];

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
   * Called during form initialization
   */
  public init(): void {
    this.discoverFields();
    this.buildNavigationOrder();
    this.setupEventListeners();

    if (this.form.getFormConfig().debug) {
      this.form.logDebug('FieldManager initialized', {
        totalFields: this.fields.length,
        includedFields: this.navigationOrder.length,
        fields: this.fields.map((f) => ({
          id: f.id,
          title: f.title,
          index: f.index,
          isIncluded: f.isIncluded,
        })),
      });
    }
  }

  /**
   * Cleanup and remove references
   * Called during form destruction
   *
   * Note: Event subscriptions are automatically cleaned up by InteractiveComponent
   */
  public destroy(): void {
    this.fields = [];
    this.fieldMap.clear();
    this.navigationOrder = [];

    if (this.form.getFormConfig().debug) {
      this.form.logDebug('FieldManager destroyed');
    }
  }

  // ============================================
  // Discovery
  // ============================================

  /**
   * Discover all fields in the form
   *
   * Finds all elements with [data-form-element="field"] or [data-form-element="field:id"]
   * Associates fields with their parent group/set/card
   * Finds input element within each field wrapper
   */
  public discoverFields(): void {
    const rootElement = this.form.getRootElement();
    if (!rootElement) {
      throw this.form.createError('Cannot discover fields: root element is null', 'init', {
        cause: { manager: 'FieldManager', rootElement },
      });
    }

    // Query all field elements
    const fieldElements = this.form.queryAll(`[${ATTR}-element^="field"]`);

    this.fields = [];
    this.fieldMap.clear();

    fieldElements.forEach((element, index) => {
      if (!(element instanceof HTMLElement)) return;

      const attrValue = element.getAttribute(`${ATTR}-element`);
      if (!attrValue) return;

      const parsed = parseElementAttribute(attrValue);

      // Skip if not a field
      if (parsed.type !== 'field') return;

      // Find parent hierarchy
      const parentHierarchy = this.findParentHierarchy(element);

      // Generate field ID (use fieldId if available, otherwise index)
      const fieldId = parsed.id || `field-${index}`;

      // Generate title (use fieldId)
      const fieldTitle = fieldId;

      // Create field element object
      const field: FieldElement = {
        element,
        type: 'field',
        id: fieldId,
        title: fieldTitle,
        index,
        groupId: parentHierarchy?.groupId || null,
        setId: parentHierarchy?.setId || '',
        cardId: parentHierarchy?.cardId || '',
        isIncluded: true, // Will be updated by ConditionManager
        visited: false,
        completed: false,
        active: false,
        errors: [],
      };

      // Store in array and map
      this.fields.push(field);
      this.fieldMap.set(field.id, field);
    });

    if (this.form.getFormConfig().debug) {
      this.form.logDebug('Fields discovered', {
        count: this.fields.length,
        fields: this.fields.map((f) => ({ id: f.id, setId: f.setId })),
      });
    }
  }

  /**
   * Build navigation order
   *
   * Creates array of field indexes in display order, skipping hidden fields
   * Should be called after discovery and whenever field visibility changes
   */
  public buildNavigationOrder(): void {
    this.navigationOrder = this.fields
      .filter((field) => field.isIncluded)
      .map((field) => field.index);

    // Update form state with total included fields
    this.form.setState('totalFields', this.navigationOrder.length);

    if (this.form.getFormConfig().debug) {
      this.form.logDebug('Navigation order built', {
        total: this.navigationOrder.length,
        order: this.navigationOrder,
      });
    }
  }

  // ============================================
  // Event Listeners
  // ============================================

  /**
   * Setup event listeners
   * Only subscribes if behavior is byField
   */
  private setupEventListeners(): void {
    // Only subscribe to navigation events if in byField mode
    if (this.form.getBehavior() === 'byField') {
      this.form.subscribe('navigation:next', this.handleNavigationNext);
      this.form.subscribe('navigation:prev', this.handleNavigationPrev);
      this.form.subscribe('navigation:goTo', this.handleNavigationGoTo);

      if (this.form.getFormConfig().debug) {
        this.form.logDebug('FieldManager subscribed to navigation events');
      }
    }
  }

  /**
   * Handle navigation:next event
   * Attempts to move to next field, emits boundary event if at end
   */
  private handleNavigationNext = async (): Promise<void> => {
    const nextIndex = this.getNextIncludedFieldIndex();

    if (nextIndex === null) {
      // At boundary - emit event for NavigationManager to handle
      const currentField = this.getCurrentFieldMetadata();
      if (currentField) {
        const context = this.getFieldContext(currentField);
        this.form.emit('navigation:boundary', {
          context,
          currentId: currentField.id,
          boundary: 'end',
          direction: 'forward',
        });
      }
      return;
    }

    await this.goToField(nextIndex);
  };

  /**
   * Handle navigation:prev event
   * Attempts to move to previous field, emits boundary event if at start
   */
  private handleNavigationPrev = async (): Promise<void> => {
    const prevIndex = this.getPrevIncludedFieldIndex();

    if (prevIndex === null) {
      // At boundary - emit event for NavigationManager to handle
      const currentField = this.getCurrentFieldMetadata();
      if (currentField) {
        const context = this.getFieldContext(currentField);
        this.form.emit('navigation:boundary', {
          context,
          currentId: currentField.id,
          boundary: 'start',
          direction: 'backward',
        });
      }
      return;
    }

    await this.goToField(prevIndex);
  };

  /**
   * Handle navigation:goTo event
   * Navigate to specific field by ID or index
   */
  private handleNavigationGoTo = async (payload: NavigationGoToEvent): Promise<void> => {
    const { target } = payload;

    // If target is a number, treat as index
    if (typeof target === 'number') {
      await this.goToField(target);
      return;
    }

    // If target is a string, treat as field ID
    const field = this.fieldMap.get(target);
    if (field) {
      await this.goToField(field.index);
    } else {
      throw this.form.createError(
        `Cannot navigate to field: field ID "${target}" not found`,
        'runtime',
        {
          cause: { target },
        }
      );
    }
  };

  // ============================================
  // Navigation Methods (Internal API for NavigationManager)
  // ============================================
  //
  // These methods should be called by NavigationManager only.
  // NavigationManager provides the unified navigation interface
  // that routes to the appropriate manager based on behavior.
  // ============================================

  /**
   * Navigate to next field
   * Updates form state and triggers managers
   *
   * @internal Called by NavigationManager - use navigationManager.next() instead
   */
  public async nextField(): Promise<void> {
    const nextIndex = this.getNextIncludedFieldIndex();

    if (nextIndex === null) {
      if (this.form.getFormConfig().debug) {
        this.form.logDebug('Cannot navigate to next field: already on last field');
      }
      return;
    }

    await this.goToField(nextIndex);
  }

  /**
   * Navigate to previous field
   * Updates form state and triggers managers
   *
   * @internal Called by NavigationManager - use navigationManager.prev() instead
   */
  public async prevField(): Promise<void> {
    const prevIndex = this.getPrevIncludedFieldIndex();

    if (prevIndex === null) {
      if (this.form.getFormConfig().debug) {
        this.form.logDebug('Cannot navigate to previous field: already on first field');
      }
      return;
    }

    await this.goToField(prevIndex);
  }

  /**
   * Navigate to specific field by index
   *
   * @param index - Field index (global, not navigation order index)
   * @internal Called by NavigationManager - use navigationManager.goTo() instead
   */
  public async goToField(index: number): Promise<void> {
    const field = this.fields[index];

    if (!field) {
      throw this.form.createError(`Cannot navigate to field: invalid index ${index}`, 'runtime', {
        cause: { index, totalFields: this.fields.length },
      });
    }

    if (!field.isIncluded) {
      throw this.form.createError(
        `Cannot navigate to field: field at index ${index} is not included in the navigation order`,
        'runtime',
        {
          cause: { index, fieldId: field.id },
        }
      );
    }

    // Store previous field index
    const previousFieldIndex = this.form.getState('currentFieldIndex');

    // Update form state
    this.form.setState('previousFieldIndex', previousFieldIndex);
    this.form.setState('currentFieldIndex', index);
    this.form.setState('currentFieldId', field.id);

    // Update hierarchy context
    this.updateHierarchyContext(field);

    // Mark field as visited
    const visitedFields = this.form.getState('visitedFields');
    const updatedVisitedFields = new Set(visitedFields);
    updatedVisitedFields.add(field.id);
    this.form.setState('visitedFields', updatedVisitedFields);

    // Update field metadata
    field.visited = true;
    field.active = true;

    // Deactivate previous field
    if (previousFieldIndex !== null && previousFieldIndex !== index) {
      const prevField = this.fields[previousFieldIndex];
      if (prevField) {
        prevField.active = false;
      }
    }

    if (this.form.getFormConfig().debug) {
      this.form.logDebug('Navigated to field', {
        index,
        fieldId: field.id,
      });
    }

    // Emit navigation event
    this.form.emit('form:field:changed', {
      fieldIndex: index,
      fieldId: field.id,
      previousFieldIndex,
    });
  }

  // ============================================
  // Access Methods
  // ============================================

  /**
   * Get total number of fields (included only)
   */
  public getTotalFields(): number {
    return this.navigationOrder.length;
  }

  /**
   * Get field by index
   *
   * @param index - Zero-based field index
   * @returns Field element or null if not found
   */
  public getFieldByIndex(index: number): FieldElement | null {
    const field = this.fields[index];
    return field;
  }

  /**
   * Get current field based on form state
   *
   * @returns Current field element or null
   */
  public getCurrentField(): FieldElement | null {
    const currentFieldIndex = this.form.getState('currentFieldIndex');
    return this.getFieldByIndex(currentFieldIndex);
  }

  /**
   * Get next included field index
   * Skips hidden fields in navigation order
   *
   * @returns Next field index or null if on last field
   */
  public getNextIncludedFieldIndex(): number | null {
    const currentIndex = this.form.getState('currentFieldIndex');
    const currentNavPosition = this.navigationOrder.indexOf(currentIndex);

    if (currentNavPosition === -1 || currentNavPosition === this.navigationOrder.length - 1) {
      return null;
    }

    return this.navigationOrder[currentNavPosition + 1];
  }

  /**
   * Get previous included field index
   * Skips hidden fields in navigation order
   *
   * @returns Previous field index or null if on first field
   */
  public getPrevIncludedFieldIndex(): number | null {
    const currentIndex = this.form.getState('currentFieldIndex');
    const currentNavPosition = this.navigationOrder.indexOf(currentIndex);

    if (currentNavPosition <= 0) {
      return null;
    }

    return this.navigationOrder[currentNavPosition - 1];
  }

  /**
   * Check if on first field
   */
  public isFirstField(): boolean {
    const currentIndex = this.form.getState('currentFieldIndex');
    return this.navigationOrder[0] === currentIndex;
  }

  /**
   * Check if on last field
   */
  public isLastField(): boolean {
    const currentIndex = this.form.getState('currentFieldIndex');
    return this.navigationOrder[this.navigationOrder.length - 1] === currentIndex;
  }

  // ============================================
  // Internal Access (for other managers)
  // ============================================

  /**
   * Get all field metadata
   * Used by other managers for hierarchy traversal
   *
   * @returns Array of field elements
   */
  public getFields(): FieldElement[] {
    return [...this.fields];
  }

  /**
   * Get field metadata by ID
   * Used by other managers for hierarchy traversal
   *
   * @param id - Field ID
   * @returns Field element or undefined
   */
  public getFieldMetadataById(id: string): FieldElement | undefined {
    return this.fieldMap.get(id);
  }

  /**
   * Get field metadata by index
   * Used by other managers for hierarchy traversal
   *
   * @param index - Field index
   * @returns Field element or undefined
   */
  public getFieldMetadataByIndex(index: number): FieldElement | undefined {
    return this.fields[index];
  }

  /**
   * Get all fields within a specific set
   *
   * @param setId - Set ID
   * @returns Array of fields in the set
   */
  public getFieldsBySetId(setId: string): FieldElement[] {
    return this.fields.filter((field) => field.setId === setId);
  }

  /**
   * Get all fields within a specific group
   *
   * @param groupId - Group ID
   * @returns Array of fields in the group
   */
  public getFieldsByGroupId(groupId: string): FieldElement[] {
    return this.fields.filter((field) => field.groupId === groupId);
  }

  /**
   * Update field inclusion and rebuild navigation order
   *
   * @param fieldId - Field ID
   * @param isIncluded - Whether to include the field in the navigation order
   */
  public updateFieldInclusion(fieldId: string, isIncluded: boolean): void {
    const field = this.fieldMap.get(fieldId);
    if (field) {
      field.isIncluded = isIncluded;
      this.buildNavigationOrder();
    }
  }

  // ============================================
  // Private Helpers
  // ============================================

  /**
   * Find parent hierarchy for a field
   * Walks up DOM tree to find parent group, set, and card
   *
   * @param fieldElement - The field element
   * @returns Parent hierarchy metadata or null
   */
  private findParentHierarchy(
    fieldElement: HTMLElement
  ): { groupId: string | null; setId: string; cardId: string } | null {
    let current = fieldElement.parentElement;
    let parentGroup: { id: string } | null = null;
    let parentSet: { id: string } | null = null;
    let parentCard: { id: string } | null = null;

    while (current && current !== this.form.getRootElement()) {
      const elementAttr = current.getAttribute(`${ATTR}-element`);

      if (elementAttr?.startsWith('group') && !parentGroup) {
        const { groupManager } = this.form;
        if (groupManager) {
          const groups = groupManager.getGroups();
          const group = groups.find((g) => g.element === current);
          if (group) {
            parentGroup = { id: group.id };
            // Inherit parent set/card from group
            if (group.setId) parentSet = { id: group.setId };
            if (group.cardId) parentCard = { id: group.cardId };
          }
        }
      }

      if (elementAttr?.startsWith('set') && !parentSet) {
        const { setManager } = this.form;
        if (setManager) {
          const sets = setManager.getSets();
          const set = sets.find((s) => s.element === current);
          if (set) {
            parentSet = { id: set.id };
            // Inherit parent card from set
            if (set.cardId) parentCard = { id: set.cardId };
          }
        }
      }

      if (elementAttr?.startsWith('card') && !parentCard) {
        const { cardManager } = this.form;
        if (cardManager) {
          const cards = cardManager.getCards();
          const card = cards.find((c) => c.element === current);
          if (card) {
            parentCard = { id: card.id };
          }
        }
      }

      // Stop if we've found all
      if (parentGroup && parentSet && parentCard) break;

      current = current.parentElement;
    }

    return {
      groupId: parentGroup?.id || null,
      setId: parentSet?.id || '',
      cardId: parentCard?.id || '',
    };
  }

  /**
   * Update hierarchy context in form state
   * Sets current card/set titles and IDs based on field location
   *
   * @param field - The field element
   */
  private updateHierarchyContext(field: FieldElement): void {
    // Update card context
    if (field.cardId) {
      const { cardManager } = this.form;
      if (cardManager) {
        const card = cardManager.getCardMetadataById(field.cardId);
        if (card) {
          this.form.setState('currentCardId', card.id);
          this.form.setState('currentCardTitle', card.title);
          this.form.setState('currentCardIndex', card.index);
        }
      }
    }

    // Update set context
    if (field.setId) {
      const { setManager } = this.form;
      if (setManager) {
        const set = setManager.getSetMetadataById(field.setId);
        if (set) {
          this.form.setState('currentSetId', set.id);
          this.form.setState('currentSetTitle', set.title);
          this.form.setState('currentSetIndex', set.index);
        }
      }
    }

    // Update group context (if field is in a group)
    if (field.groupId) {
      const { groupManager } = this.form;
      if (groupManager) {
        const group = groupManager.getGroupMetadataById(field.groupId);
        if (group) {
          this.form.setState('currentGroupId', group.id);
          this.form.setState('currentGroupIndex', group.index);
        }
      }
    }
  }

  /**
   * Get current field metadata
   *
   * @returns Current field element or undefined
   */
  public getCurrentFieldMetadata(): FieldElement | undefined {
    const currentIndex = this.form.getState('currentFieldIndex');
    return this.fields[currentIndex];
  }

  /**
   * Get field context (determines boundary type)
   * Returns the appropriate context for boundary events
   *
   * @param field - The field element
   * @returns Context type ('field', 'group', 'set', or 'card')
   */
  private getFieldContext(field: FieldElement): 'field' | 'group' | 'set' | 'card' {
    // If in a group, check if this is the last field in the group
    if (field.groupId) {
      const groupFields = this.getFieldsByGroupId(field.groupId).filter((f) => f.isIncluded);
      const isLastInGroup = groupFields[groupFields.length - 1]?.id === field.id;
      if (isLastInGroup) {
        return 'group';
      }
    }

    // Check if last field in set
    const setFields = this.getFieldsBySetId(field.setId).filter((f) => f.isIncluded);
    const isLastInSet = setFields[setFields.length - 1]?.id === field.id;
    if (isLastInSet) {
      return 'set';
    }

    // Check if last field in card (if cards exist)
    if (field.cardId) {
      const cardFields = this.fields.filter((f) => f.cardId === field.cardId && f.isIncluded);
      const isLastInCard = cardFields[cardFields.length - 1]?.id === field.id;
      if (isLastInCard) {
        return 'card';
      }
    }

    // Default to field context
    return 'field';
  }
}
