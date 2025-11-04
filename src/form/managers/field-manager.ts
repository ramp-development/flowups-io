/**
 * Field Manager
 *
 * Handles field discovery, navigation order, and field-by-field progression.
 * Central to the byField behavior in v1.0.
 */

import { ATTR } from '../constants/attr';
import type {
  FieldElement,
  FieldInclusionChangedEvent,
  FieldParentHierarchy,
  IFieldManager,
  NavigationGoToEvent,
} from '../types';
import { parseElementAttribute } from '../utils';
import { BaseManager } from './base-manager';

/**
 * FieldManager Implementation
 *
 * Discovers and manages field elements in the form hierarchy.
 * Builds navigation order for byField behavior.
 * Provides field-by-field navigation with conditional visibility support.
 */
export class FieldManager extends BaseManager implements IFieldManager {
  // ============================================
  // Properties
  // ============================================

  /** Array of discovered field elements with metadata */
  private fields: FieldElement[] = [];

  /** Map for O(1) lookup by field ID */
  private fieldMap: Map<string, FieldElement> = new Map();

  /** Navigation order (indexes of included fields) */
  private navigationOrder: number[] = [];

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

    this.logDebug('FieldManager initialized', {
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

    this.logDebug('FieldManager destroyed');
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
      throw this.createError('Cannot discover fields: root element is null', 'init', {
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
        parentHierarchy,
        isIncluded: true,
        visited: false,
        completed: false,
        active: false,
        errors: [],
      };

      // Store in array and map
      this.fields.push(field);
      this.fieldMap.set(field.id, field);
    });

    this.logDebug('Fields discovered', {
      count: this.fields.length,
      fields: this.fields.map((field) => ({ id: field.id, setId: field.parentHierarchy.setId })),
    });
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

    this.logDebug('Navigation order built', {
      total: this.navigationOrder.length,
      order: this.navigationOrder,
    });
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
      this.form.subscribe('form:navigation:next', this.handleNavigationNext);
      this.form.subscribe('form:navigation:prev', this.handleNavigationPrev);
      this.form.subscribe('form:navigation:goTo', this.handleNavigationGoTo);
      this.form.subscribe('form:field:inclusion-changed', this.handleFieldInclusion);

      this.logDebug('FieldManager subscribed to navigation events');
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
      throw this.createError(
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
      this.logDebug('Cannot navigate to next field: already on last field');
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
      this.logDebug('Cannot navigate to previous field: already on first field');
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
      throw this.createError(`Cannot navigate to field: invalid index ${index}`, 'runtime', {
        cause: { index, totalFields: this.fields.length },
      });
    }

    if (!field.isIncluded) {
      throw this.createError(
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

    this.logDebug('Navigated to field', {
      index,
      fieldId: field.id,
    });

    // Emit navigation event
    this.form.emit('form:navigation:request', {
      element: 'field',
      type: 'goTo',
      fromIndex: previousFieldIndex,
      toIndex: index,
    });
  }

  // ============================================
  // Access Methods
  // ============================================

  /**
   * Get navigation order
   * @returns Array of field indexes in display order
   */
  public getNavigationOrder(): number[] {
    return this.navigationOrder;
  }

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
    if (!currentFieldIndex) return null;
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
    if (!currentIndex) return null;
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
    if (!currentIndex) return null;
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
    return this.fields.filter((field) => field.parentHierarchy.setId === setId);
  }

  /**
   * Get all fields within a specific group
   *
   * @param groupId - Group ID
   * @returns Array of fields in the group
   */
  public getFieldsByGroupId(groupId: string): FieldElement[] {
    return this.fields.filter((field) => field.parentHierarchy.groupId === groupId);
  }

  /**
   * Update field inclusion and rebuild navigation order
   * Also syncs with InputManager to update input required state
   *
   * @param fieldId - Field ID
   * @param isIncluded - Whether to include the field in the navigation order
   */
  public handleFieldInclusion(payload: FieldInclusionChangedEvent): void {
    const { fieldId, isIncluded } = payload;
    const field = this.fieldMap.get(fieldId);
    if (!field) return;

    // Update field inclusion state
    field.isIncluded = isIncluded;

    // Sync with InputManager to update required attributes
    this.form.inputManager.syncInputInclusionWithField(fieldId, isIncluded);

    // Rebuild navigation order (excludes fields with isIncluded: false)
    this.buildNavigationOrder();

    this.logDebug(`Field "${fieldId}" inclusion updated: ${isIncluded}`);
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
  private findParentHierarchy(fieldElement: HTMLElement): FieldParentHierarchy {
    const parentGroupElement = fieldElement.closest(`[${ATTR}-element^="group"]`);
    if (parentGroupElement) {
      const { groupManager } = this.form;
      if (!groupManager) {
        throw this.createError('Cannot discover fields: group manager is null', 'init', {
          cause: { manager: 'FieldManager', fieldElement },
        });
      }

      const parentGroup = groupManager
        .getGroups()
        .find((group) => group.element === parentGroupElement);

      if (!parentGroup) {
        throw this.createError('Cannot discover fields: no parent group found', 'init', {
          cause: { manager: 'FieldManager', fieldElement },
        });
      }

      return {
        groupId: parentGroup.id,
        groupIndex: parentGroup.index,
        ...parentGroup.parentHierarchy,
      };
    }

    const parentSetElement = fieldElement.closest(`[${ATTR}-element^="set"]`);
    if (!parentSetElement) {
      throw this.createError('Cannot discover fields: no parent set element found', 'init', {
        cause: { manager: 'FieldManager', fieldElement },
      });
    }

    const { setManager } = this.form;
    if (!setManager) {
      throw this.createError('Cannot discover fields: set manager is null', 'init', {
        cause: { manager: 'FieldManager', fieldElement },
      });
    }

    const parentSet = setManager.getSets().find((set) => set.element === parentSetElement);
    if (!parentSet) {
      throw this.createError('Cannot discover fields: no parent set found', 'init', {
        cause: { manager: 'FieldManager', fieldElement },
      });
    }

    return {
      groupId: null,
      groupIndex: null,
      setId: parentSet.id,
      setIndex: parentSet.index,
      ...parentSet.parentHierarchy,
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
    if (field.parentHierarchy.cardId) {
      const { cardManager } = this.form;
      if (cardManager) {
        const card = cardManager.getCardMetadataById(field.parentHierarchy.cardId);
        if (card) {
          this.form.setState('currentCardId', card.id);
          this.form.setState('currentCardTitle', card.title);
          this.form.setState('currentCardIndex', card.index);
        }
      }
    }

    // Update set context
    if (field.parentHierarchy.setId) {
      const { setManager } = this.form;
      if (setManager) {
        const set = setManager.getSetMetadataById(field.parentHierarchy.setId);
        if (set) {
          this.form.setState('currentSetId', set.id);
          this.form.setState('currentSetTitle', set.title);
          this.form.setState('currentSetIndex', set.index);
        }
      }
    }

    // Update group context (if field is in a group)
    if (field.parentHierarchy.groupId) {
      const { groupManager } = this.form;
      if (groupManager) {
        const group = groupManager.getGroupMetadataById(field.parentHierarchy.groupId);
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
  public getCurrentFieldMetadata(): FieldElement | null {
    const currentIndex = this.form.getState('currentFieldIndex');
    if (!currentIndex) return null;
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
    if (field.parentHierarchy.groupId) {
      const groupFields = this.getFieldsByGroupId(field.parentHierarchy.groupId).filter(
        (field) => field.isIncluded
      );
      const isLastInGroup = groupFields[groupFields.length - 1]?.id === field.id;
      if (isLastInGroup) {
        return 'group';
      }
    }

    // Check if last field in set
    const setFields = this.getFieldsBySetId(field.parentHierarchy.setId).filter(
      (field) => field.isIncluded
    );
    const isLastInSet = setFields[setFields.length - 1]?.id === field.id;
    if (isLastInSet) {
      return 'set';
    }

    // Check if last field in card (if cards exist)
    if (field.parentHierarchy.cardId) {
      const cardFields = this.fields.filter(
        (field) => field.parentHierarchy.cardId === field.parentHierarchy.cardId && field.isIncluded
      );
      const isLastInCard = cardFields[cardFields.length - 1]?.id === field.id;
      if (isLastInCard) {
        return 'card';
      }
    }

    // Default to field context
    return 'field';
  }
}
