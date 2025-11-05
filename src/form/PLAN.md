# Multi-Step Form Implementation Plan

## Objective

Implement a clean, maintainable navigation and display system for the multi-step form that:

1. Supports all four behavior modes (`byField`, `byGroup`, `bySet`, `byCard`)
2. Provides clear separation of concerns between managers
3. Prevents circular dependencies and race conditions
4. Handles edge cases (cards without fields, multi-element visibility, etc.)
5. Uses a unidirectional data flow: User Action � Navigation � State Update � Display � DOM

---

## Architecture Overview

### Data Flow

```
User clicks Next/Back
    �
NavigationManager validates and determines next element
    �
Update metadata (active flags) for current and next elements
    �
Update parent metadata (cascade up hierarchy)
    �
Batch all state calculations from managers
    �
Single state write (emits state:changed event)
    �
DisplayManager reacts to state change
    �
DOM updated (elements shown/hidden based on active flags)
```

### Manager Responsibilities

| Manager               | Discovery     | Metadata                      | State Calculation            | Display             | Navigation              |
| --------------------- | ------------- | ----------------------------- | ---------------------------- | ------------------- | ----------------------- |
| **CardManager**       |  Find cards   |  Track active/completed/valid |  Calculate card-level state  | L                   | L                       |
| **SetManager**        |  Find sets    |  Track active/completed/valid |  Calculate set-level state   | L                   | L                       |
| **GroupManager**      |  Find groups  |  Track active/completed/valid |  Calculate group-level state | L                   | L                       |
| **FieldManager**      |  Find fields  |  Track active/completed/valid |  Calculate field-level state | L                   | L                       |
| **InputManager**      |  Find inputs  |  Track values/validity        |  Write to formData           | L                   | L                       |
| **NavigationManager** |  Find buttons | L                             | L                            | L                   |  Orchestrate navigation |
| **DisplayManager**    | L             | L                             | L                            |  Show/hide elements | L                       |

### Key Principles

1. **Managers expose data methods, not navigation methods**

   -  Good: `setMetadata(index, updates)`, `calculateStates()`, `clearActive()`
   - L Avoid: `updateCurrentFieldIndex()`, `goToNextField()`

2. **Parent � Child reads are OK, but not sibling or child � parent**

   -  CardManager reads SetManager (parent reads children)
   -  FieldManager reads InputManager (parent reads child)
   - L FieldManager calls CardManager directly

3. **Metadata updates are pure (no state reads during updates)**

   - Metadata updates only modify internal Maps
   - State calculation happens separately via `calculateStates()`

4. **State updates are batched**

   - NavigationManager updates all metadata first
   - Then calls `calculateStates()` on all managers
   - Single `setStates()` call with merged results
   - DisplayManager updates once via `state:changed` event

5. **Active flags determine visibility**
   - DisplayManager reads `active` flags from manager metadata
   - One source of truth for what should be visible

---

## Implementation Phases

### Phase 1: Add Core Manager Methods

**Current Status:** Managers already have `setMetadata()` and `setStates()`. Need to add `clearActive()`, `setActiveByParent()`, and refactor `setStates()` → `calculateStates()`.

All managers (Card, Set, Group, Field) need these methods:

#### 1.1 `clearActive()`: Clear all active flags (NEW - Add to all managers)

**Status:** ❌ Does not exist - needs to be added

**Implementation:**

```typescript
class FieldManager extends BaseManager {
  /**
   * Clear all active flags for fields
   * Called before setting new active elements
   */
  public clearActive(): void {
    this.fields.forEach((field, index) => {
      this.fields[index] = { ...field, active: false };
      this.fieldMap.set(field.id, { ...field, active: false });
    });
  }
}
```

**Pattern for other managers:**

- CardManager: Clear `this.cards` and `this.cardMap`
- SetManager: Clear `this.sets` and `this.setMap`
- GroupManager: Clear `this.groups` and `this.groupMap`

**Why:** Ensures only intended elements are active. Prevents stale active flags.

**Edge cases:**

- If no fields exist, method should safely do nothing
- Should not emit state changes (metadata-only operation)

**Clean up:** Remove `console.log()` statements from:

- [group-manager.ts:229-231](src/form/managers/group-manager.ts#L229-L231)
- [field-manager.ts:241-243](src/form/managers/field-manager.ts#L241-L243)

---

#### 1.2 `setActiveByParent()`: Set multiple children active (NEW - Add to Set, Group, Field managers)

**Status:** ❌ Does not exist - needs to be added

**Note:** FieldManager already has `getFieldsByGroupId()` and `getFieldsBySetId()` - leverage these.

**Implementation:**

```typescript
class FieldManager extends BaseManager {
  /**
   * Set all fields in a parent container active
   * Used when behavior is byGroup/bySet/byCard
   *
   * @param parentId - ID of parent element
   * @param parentType - Type of parent (group, set, or card)
   */
  public setActiveByParent(parentId: string, parentType: 'group' | 'set' | 'card'): void {
    const fields = this.getFieldsByParentId(parentId, parentType);

    fields.forEach((field) => {
      this.setMetadata(field.index, { active: true });
    });
  }

  /**
   * Get fields by parent ID and type
   */
  private getFieldsByParentId(
    parentId: string,
    parentType: 'group' | 'set' | 'card'
  ): FieldMetadata[] {
    return Array.from(this.fieldMap.values()).filter((field) => {
      switch (parentType) {
        case 'group':
          return field.parentHierarchy.groupId === parentId;
        case 'set':
          return field.parentHierarchy.setId === parentId;
        case 'card':
          return field.parentHierarchy.cardId === parentId;
      }
    });
  }
}
```

**Why:** When showing a group/set/card, all children must be active.

**Edge cases:**

- Parent might have no children (e.g., card with no fields) - safely return empty array
- Parent might have conditionally hidden children - respect `isIncluded` flag
- Should only set active for included fields: `field.isIncluded === true`

---

#### 1.3 `calculateStates()`: Return state object (doesn't write) (REFACTOR - Split from existing `setStates()`)

**Status:** ⚠️ Partially exists - `setStates()` exists but writes directly. Need to split into `calculateStates()` (returns) and `setStates()` (calls calculateStates then writes).

**Current implementation (field-manager.ts:172-209):**

```typescript
public setStates(): void {
  // Calculates values and writes directly to form.setStates()
  const currentFieldIndex = this.fields.findIndex((field) => field.active);
  // ... more calculations
  this.form.setStates({ ...fieldState }); // ❌ Writes immediately
}
```

**New pattern:**

```typescript
class FieldManager extends BaseManager {
  /**
   * Calculate all field-related state
   * Returns state object but does NOT write to form state
   * This allows NavigationManager to batch all manager states
   *
   * @returns Partial state object for field-related keys
   */
  public calculateStates(): Partial<FormState> {
    const behavior = this.form.getBehavior();
    const activeFields = this.getActiveFields();

    // Single-element mode (byField)
    if (behavior === 'byField') {
      const activeField = activeFields[0] ?? null;

      return {
        currentFieldIndex: activeField?.index ?? null,
        currentFieldId: activeField?.id ?? null,
        previousFieldIndex: this.previousFieldIndex,
        activeFieldIndices: activeField ? [activeField.index] : [],

        // Computed values
        allFieldsCompleted: this.areAllFieldsCompleted(),
        allFieldsValid: this.areAllFieldsValid(),
      };
    }

    // Multi-element mode (byGroup, bySet, byCard)
    return {
      currentFieldIndex: null, // Not applicable in multi-element mode
      currentFieldId: null,
      previousFieldIndex: this.previousFieldIndex,
      activeFieldIndices: activeFields.map((f) => f.index),

      // Computed values
      allFieldsCompleted: this.areAllFieldsCompleted(),
      allFieldsValid: this.areAllFieldsValid(),
    };
  }

  /**
   * Get all currently active fields
   */
  private getActiveFields(): FieldMetadata[] {
    return Array.from(this.fieldMap.values()).filter((f) => f.active);
  }

  /**
   * Check if all included fields are completed
   */
  private areAllFieldsCompleted(): boolean {
    const includedFields = Array.from(this.fieldMap.values()).filter((f) => f.isIncluded);
    return includedFields.every((f) => f.completed);
  }

  /**
   * Check if all included fields are valid
   */
  private areAllFieldsValid(): boolean {
    const includedFields = Array.from(this.fieldMap.values()).filter((f) => f.isIncluded);
    return includedFields.every((f) => f.isValid);
  }
}
```

**Why:** Allows batching. NavigationManager collects all manager states and writes once.

**Edge cases:**

- If no fields are active, return `null` for single-element keys and `[]` for arrays
- Always calculate computed values (allFieldsCompleted, etc.) even if no fields active
- Must handle behavior transitions (byField � byGroup) gracefully

---

#### 1.4 `setStates()`: Convenience method (calculate + write) (REFACTOR - Update existing)

**Status:** ✅ Already exists - just needs to be refactored to call `calculateStates()`

**Refactor existing `setStates()` to:**

```typescript
class FieldManager extends BaseManager {
  /**
   * Calculate and write field-related state
   * Convenience method that calls calculateStates() and writes to form
   * Use this when you don't need batching (e.g., on init)
   */
  public setStates(): void {
    const states = this.calculateStates();
    this.form.setStates(states);
  }
}
```

**Why:** Sometimes managers need to update state independently (e.g., on init).

**Apply to all managers:** Card, Set, Group, Field

---

#### 1.5 Helper methods for navigation (CHECK/ADD - Some exist, some need adding)

**Status:**

- ✅ FieldManager has: `getNextIncludedFieldIndex()`, `getPrevIncludedFieldIndex()`, `getCurrentField()`
- ⚠️ Returns `number | null` (index) not `FieldMetadata | null`
- ❌ Other managers need similar methods: `getNextIncludedGroup()`, `getNextIncludedSet()`, `getNextIncludedCard()`

**Existing FieldManager methods (field-manager.ts:525-553):**

```typescript
// ✅ Already exists - returns index
public getNextIncludedFieldIndex(): number | null { ... }
public getPrevIncludedFieldIndex(): number | null { ... }
public getCurrentField(): FieldElement | null { ... } // Uses getCurrentFieldMetadata()
```

**Need to add wrapper methods that return elements:**

```typescript
class FieldManager extends BaseManager {
  /**
   * Get next included field (respects isIncluded flag)
   * Used by NavigationManager to determine next field
   *
   * @returns Next field element or null if at end
   */
  public getNextIncludedField(): FieldElement | null {
    const nextIndex = this.getNextIncludedFieldIndex();
    return nextIndex !== null ? this.getFieldByIndex(nextIndex) : null;
  }

  /**
   * Get previous included field
   */
  public getPreviousIncludedField(): FieldElement | null {
    const prevIndex = this.getPrevIncludedFieldIndex();
    return prevIndex !== null ? this.getFieldByIndex(prevIndex) : null;
  }
}
```

**Add to other managers:**

- GroupManager: `getNextIncludedGroup()`, `getPreviousIncludedGroup()`, `getCurrentGroup()`
- SetManager: `getNextIncludedSet()`, `getPreviousIncludedSet()`, `getCurrentSet()` (getCurrentSet exists)
- CardManager: `getNextIncludedCard()`, `getPreviousIncludedCard()`, `getCurrentCard()` (getCurrentCard exists)

**Edge cases:**

- If all fields are excluded (`isIncluded = false`), return `null`
- If at end of fields, return `null` (NavigationManager handles boundary)
- If currentFieldIndex doesn't exist (stale state), return first field

---

### Phase 2: Update State Shape

Add new state keys to handle multi-element behaviors.

#### 2.1 Add to `FormState` interface

```typescript
// src/form/types/state/form-state.ts

export interface FormState {
  // Existing single-element tracking
  currentFieldIndex: number | null;
  currentFieldId: string | null;
  previousFieldIndex: number | null;

  currentGroupIndex: number | null;
  currentGroupId: string | null;
  previousGroupIndex: number | null;

  currentSetIndex: number | null;
  currentSetId: string | null;
  previousSetIndex: number | null;

  currentCardIndex: number | null;
  currentCardId: string | null;
  previousCardIndex: number | null;

  // NEW: Multi-element tracking (arrays)
  activeFieldIndices: number[];
  activeGroupIndices: number[];
  activeSetIndices: number[];
  activeCardIndices: number[];

  // Computed values
  allFieldsCompleted: boolean;
  allFieldsValid: boolean;
  // ... other computed values
}
```

**Usage by behavior:**

| Behavior  | Single Keys                                                 | Array Keys                                                                                | Example             |
| --------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------- |
| `byField` | `currentFieldIndex: 5`                                      | `activeFieldIndices: [5]`                                                                 | One field           |
| `byGroup` | `currentFieldIndex: null`<br>`currentGroupIndex: 2`         | `activeFieldIndices: [3,4,5]`<br>`activeGroupIndices: [2]`                                | All fields in group |
| `bySet`   | All field/group single keys `null`<br>`currentSetIndex: 1`  | `activeFieldIndices: [3,4,5,6]`<br>`activeGroupIndices: [2,3]`<br>`activeSetIndices: [1]` | All in set          |
| `byCard`  | All single keys `null` except card<br>`currentCardIndex: 0` | All arrays populated                                                                      | All in card         |

**Why both single and array keys?**

- Single keys (`current*`) provide semantic clarity for byField mode
- Array keys (`active*Indices`) provide flexibility for multi-element modes
- Consumers can easily check: `if (currentFieldIndex !== null)` vs `if (activeFieldIndices.length > 0)`

---

### Phase 3: Refactor NavigationManager

**Current Status:** NavigationManager has `handleByField()` (navigation-manager.ts:315-355) but needs refactoring:

- ❌ Calls `setStates()` on each manager individually (should batch)
- ❌ Missing `handleByGroup()`, `handleBySet()`, `handleByCard()` implementations
- ❌ No `batchStateUpdates()` method
- ❌ No `updateParentMetadata()` generic helper
- ❌ No boundary handling (`handleBoundary()`, `goToSet()`, `goToCard()`)

NavigationManager orchestrates navigation but doesn't contain navigation logic itself. It delegates to managers.

#### 3.1 Main navigation handler (REFACTOR - Update existing)

**Status:** ✅ `handleNext()` exists (navigation-manager.ts:194-230) but needs refactoring

**Current implementation:**

```typescript
public async handleNext(): Promise<void> {
  const behavior = this.form.getBehavior();

  switch (behavior) {
    case 'byField':
      this.handleByField(fromIndex, toIndex); // ✅ Exists
      break;
    // case 'byGroup': // ❌ Commented out
    // case 'bySet':   // ❌ Commented out
    // case 'byCard':  // ❌ Commented out
  }
}
```

**Refactor to:**

```typescript
class NavigationManager extends BaseManager {
  private async handleNext(): Promise<void> {
    const behavior = this.form.getBehavior();

    // ❌ TODO: Add validation before advancing
    const canAdvance = await this.validateCurrent();
    if (!canAdvance) {
      this.showValidationErrors();
      return;
    }

    // Route to appropriate behavior handler
    switch (behavior) {
      case 'byField':
        await this.nextField();
        break;
      case 'byGroup':
        await this.nextGroup();
        break;
      case 'bySet':
        await this.nextSet();
        break;
      case 'byCard':
        await this.nextCard();
        break;
    }
  }
}
```

---

#### 3.2 Behavior-specific handlers (REFACTOR - Update existing `handleByField`, add others)

**Status:**

- ⚠️ `handleByField()` exists (navigation-manager.ts:315-355) - needs refactoring
- ❌ `handleByGroup()`, `handleBySet()`, `handleByCard()` stubbed but incomplete (357-410)

**Current `handleByField` implementation:**

```typescript
private handleByField(fromIndex: number, toIndex: number): void {
  const toField = this.form.fieldManager.getFieldByIndex(toIndex);

  // ⚠️ Updates metadata correctly
  this.form.fieldManager.setMetadata(fromIndex, { active: false });
  this.form.fieldManager.setMetadata(toIndex, { active: true });
  this.form.fieldManager.setStates(); // ❌ Writes state immediately

  // ⚠️ Updates parents but calls setStates() on each
  this.form.groupManager.setMetadata(...);
  this.form.groupManager.setStates(); // ❌ Should batch
  this.form.setManager.setMetadata(...);
  this.form.setManager.setStates(); // ❌ Should batch
  this.form.cardManager.setMetadata(...);
  this.form.cardManager.setStates(); // ❌ Should batch
}
```

**Refactor to:**

```typescript
/**
 * Navigate to next field (byField behavior)
 * Process:
 * 1. Get next field from FieldManager
 * 2. Clear all active flags at field level
 * 3. Set new field active
 * 4. Update parent metadata (group, set, card)
 * 5. Batch all state updates
 */
private async nextField(): Promise<void> {
  const next = this.form.fieldManager.getNextIncludedField();

  // At end of fields - check if we can advance to next group/set/card
  if (!next) {
    await this.handleBoundary('end', 'forward');
    return;
  }

  // 1. Clear active flags at field level
  this.form.fieldManager.clearActive();

  // 2. Set new field active
  this.form.fieldManager.setMetadata(next.index, { active: true });

  // 3. Update parent metadata (cascade up hierarchy)
  this.updateParentMetadata(next);

  // 4. Batch all state updates from all managers
  await this.batchStateUpdates();

  // 5. Emit navigation event (for logging/debugging)
  this.form.emit('form:field:changed', {
    fieldIndex: next.index,
    fieldId: next.id,
    previousFieldIndex: this.form.getState('previousFieldIndex'),
  });
}

/**
 * Navigate to next group (byGroup behavior)
 * Shows all fields in the group
 */
private async nextGroup(): Promise<void> {
  const next = this.form.groupManager.getNextIncludedGroup();

  if (!next) {
    await this.handleBoundary('end', 'forward');
    return;
  }

  // 1. Clear active flags at group and field levels
  this.form.groupManager.clearActive();
  this.form.fieldManager.clearActive();

  // 2. Set new group active
  this.form.groupManager.setMetadata(next.index, { active: true });

  // 3. Set all fields in group active
  this.form.fieldManager.setActiveByParent(next.id, 'group');

  // 4. Update parent metadata (set, card)
  this.updateParentMetadata(next);

  // 5. Batch all state updates
  await this.batchStateUpdates();

  // 6. Emit event
  this.form.emit('form:group:changed', {
    groupIndex: next.index,
    groupId: next.id,
    previousGroupIndex: this.form.getState('previousGroupIndex'),
  });
}

/**
 * Navigate to next set (bySet behavior)
 * Shows all groups and fields in the set
 */
private async nextSet(): Promise<void> {
  const next = this.form.setManager.getNextIncludedSet();

  if (!next) {
    await this.handleBoundary('end', 'forward');
    return;
  }

  // 1. Clear active flags at set, group, and field levels
  this.form.setManager.clearActive();
  this.form.groupManager.clearActive();
  this.form.fieldManager.clearActive();

  // 2. Set new set active
  this.form.setManager.setMetadata(next.index, { active: true });

  // 3. Set all groups in set active
  this.form.groupManager.setActiveByParent(next.id, 'set');

  // 4. Set all fields in set active
  this.form.fieldManager.setActiveByParent(next.id, 'set');

  // 5. Update parent metadata (card)
  this.updateParentMetadata(next);

  // 6. Batch all state updates
  await this.batchStateUpdates();

  // 7. Emit event
  this.form.emit('form:set:changed', {
    setIndex: next.index,
    setId: next.id,
    previousSetIndex: this.form.getState('previousSetIndex'),
  });
}

/**
 * Navigate to next card (byCard behavior)
 * Shows all sets, groups, and fields in the card
 */
private async nextCard(): Promise<void> {
  const next = this.form.cardManager.getNextIncludedCard();

  if (!next) {
    // At end of form
    this.handleFormComplete();
    return;
  }

  // 1. Clear active flags at all levels
  this.form.cardManager.clearActive();
  this.form.setManager.clearActive();
  this.form.groupManager.clearActive();
  this.form.fieldManager.clearActive();

  // 2. Set new card active
  this.form.cardManager.setMetadata(next.index, { active: true });

  // 3. Set all sets in card active
  this.form.setManager.setActiveByParent(next.id, 'card');

  // 4. Set all groups in card active
  this.form.groupManager.setActiveByParent(next.id, 'card');

  // 5. Set all fields in card active
  this.form.fieldManager.setActiveByParent(next.id, 'card');

  // 6. Batch all state updates (no parent to update)
  await this.batchStateUpdates();

  // 7. Emit event
  this.form.emit('form:card:changed', {
    cardIndex: next.index,
    cardId: next.id,
    previousCardIndex: this.form.getState('previousCardIndex'),
  });
}
```

**Edge cases:**

- **Empty containers**: Card with no sets � `setActiveByParent` safely does nothing
- **Conditional visibility**: Only included elements are navigable (`getNextIncluded*`)
- **Boundary conditions**: At end of fields but more groups exist � `handleBoundary` navigates up

---

#### 3.3 Generic helper methods

```typescript
/**
 * Update parent metadata for any element
 * Cascades up the hierarchy: field � group � set � card
 * Only updates parents that exist in the element's hierarchy
 *
 * @param element - Any form element (field, group, set, card)
 */
private updateParentMetadata(
  element: FieldMetadata | GroupMetadata | SetMetadata | CardMetadata
): void {
  const { cardId, setId, groupId } = element.parentHierarchy;

  // Update group (only if element is a field)
  if (groupId && 'inputId' in element) {
    this.form.groupManager.clearActive();
    const group = this.form.groupManager.getGroupById(groupId);
    if (group) {
      this.form.groupManager.setMetadata(group.index, { active: true });
    }
  }

  // Update set (if element is field or group)
  if (setId) {
    this.form.setManager.clearActive();
    const set = this.form.setManager.getSetById(setId);
    if (set) {
      this.form.setManager.setMetadata(set.index, { active: true });
    }
  }

  // Update card (always, since all elements have a parent card)
  if (cardId) {
    this.form.cardManager.clearActive();
    const card = this.form.cardManager.getCardById(cardId);
    if (card) {
      this.form.cardManager.setMetadata(card.index, { active: true });
    }
  }
}

/**
 * Batch all manager state calculations into one setStates() call
 * Prevents multiple state:changed events and DisplayManager flicker
 *
 * Process:
 * 1. Call calculateStates() on all managers
 * 2. Merge all state objects
 * 3. Single setStates() call
 * 4. DisplayManager updates once via state:changed event
 */
private async batchStateUpdates(): Promise<void> {
  // Collect state from all managers (doesn't write to state yet)
  const allStates = {
    ...this.form.cardManager.calculateStates(),
    ...this.form.setManager.calculateStates(),
    ...this.form.groupManager.calculateStates(),
    ...this.form.fieldManager.calculateStates(),
  };

  // Single state write (emits one state:changed event)
  this.form.setStates(allStates);

  // DisplayManager reacts once to state change
}

/**
 * Handle boundary conditions (end of fields/groups/sets)
 * Determines if we can advance to next container level
 *
 * @param boundary - 'start' or 'end' of current level
 * @param direction - 'forward' or 'backward'
 */
private async handleBoundary(
  boundary: 'start' | 'end',
  direction: 'forward' | 'backward'
): Promise<void> {
  const behavior = this.form.getBehavior();

  if (behavior === 'byField') {
    // At end of fields - check if we can move to next group
    const currentField = this.form.fieldManager.getCurrentField();
    if (!currentField) return;

    const { groupId, setId, cardId } = currentField.parentHierarchy;

    // Try next group in current set
    if (groupId) {
      const currentGroup = this.form.groupManager.getGroupById(groupId);
      const nextGroup = this.form.groupManager.getNextIncludedGroup();

      if (nextGroup && nextGroup.parentHierarchy.setId === setId) {
        // Move to first field in next group
        this.form.groupManager.setMetadata(nextGroup.index, { active: true });
        const firstField = this.form.fieldManager.getFieldsByGroupId(nextGroup.id)[0];
        if (firstField) {
          this.form.fieldManager.setMetadata(firstField.index, { active: true });
          await this.batchStateUpdates();
          return;
        }
      }
    }

    // Try next set in current card
    if (setId) {
      const nextSet = this.form.setManager.getNextIncludedSet();

      if (nextSet && nextSet.parentHierarchy.cardId === cardId) {
        // Move to first group/field in next set
        await this.goToSet(nextSet);
        return;
      }
    }

    // Try next card
    const nextCard = this.form.cardManager.getNextIncludedCard();
    if (nextCard) {
      await this.goToCard(nextCard);
      return;
    }

    // At end of form
    this.handleFormComplete();
  }

  // Similar logic for byGroup, bySet behaviors
  // ...
}

/**
 * Navigate to a specific set (used for boundary handling)
 */
private async goToSet(set: SetMetadata): Promise<void> {
  this.form.setManager.clearActive();
  this.form.setManager.setMetadata(set.index, { active: true });

  // Find first group in set
  const firstGroup = this.form.groupManager.getGroupsBySetId(set.id)[0];
  if (firstGroup) {
    this.form.groupManager.clearActive();
    this.form.groupManager.setMetadata(firstGroup.index, { active: true });

    // Find first field in group
    const firstField = this.form.fieldManager.getFieldsByGroupId(firstGroup.id)[0];
    if (firstField) {
      this.form.fieldManager.clearActive();
      this.form.fieldManager.setMetadata(firstField.index, { active: true });
    }
  }

  this.updateParentMetadata(set);
  await this.batchStateUpdates();
}

/**
 * Navigate to a specific card (used for boundary handling and cards without fields)
 */
private async goToCard(card: CardMetadata): Promise<void> {
  this.form.cardManager.clearActive();
  this.form.cardManager.setMetadata(card.index, { active: true });

  // Check if card has children
  const firstSet = this.form.setManager.getSetsByCardId(card.id)[0];

  if (firstSet) {
    // Card has sets - navigate to first set
    await this.goToSet(firstSet);
  } else {
    // Card has no children - show entire card
    // DisplayManager will show card content
    await this.batchStateUpdates();
  }
}

/**
 * Handle form completion
 */
private handleFormComplete(): void {
  this.form.emit('form:complete', {
    formData: this.form.getState('formData'),
    timestamp: Date.now(),
  });
}

/**
 * Validate current element before advancing
 */
private async validateCurrent(): Promise<boolean> {
  const behavior = this.form.getBehavior();

  switch (behavior) {
    case 'byField':
      return this.validateCurrentField();
    case 'byGroup':
      return this.validateCurrentGroup();
    case 'bySet':
      return this.validateCurrentSet();
    case 'byCard':
      return this.validateCurrentCard();
  }
}

private async validateCurrentField(): Promise<boolean> {
  const current = this.form.fieldManager.getCurrentField();
  if (!current) return true;

  // Check if field is valid
  return current.isValid && current.completed;
}

// Similar validation methods for group, set, card...
```

**Edge cases:**

- **Cards without children**: `goToCard` handles gracefully, DisplayManager shows card
- **Skipped containers**: If set has no groups, navigate directly to next set
- **Conditional visibility**: Only navigate to included (`isIncluded = true`) elements
- **Validation failures**: Stay on current element, show errors

---

### Phase 4: Refactor DisplayManager

**Current Status:** DisplayManager exists with partial implementation:

- ✅ Has: `showElement()` (display-manager.ts:260-263), `state:changed` subscription (51-56), `displayByField()` (243-250)
- ❌ Missing: `displayByGroup()`, `displayBySet()`, `displayByCard()`, `ensureParentVisibility()`
- ⚠️ No RAF debouncing for state changes

DisplayManager reacts to state changes and updates DOM visibility.

#### 4.1 Core display logic (UPDATE - Add RAF, update switch)

**Status:** ✅ Partial - Has subscription and `updateDisplay()`, missing RAF

**Current implementation (display-manager.ts:50-76, 180-201):**

```typescript
private setupEventListeners(): void {
  this.form.subscribe('state:changed', (payload) => {
    this.handleStateChange(payload);
  });
}

private handleStateChange = (payload: StateChangePayload): void => {
  const relevantKeys = [
    'currentCardIndex',
    'currentSetIndex',
    'currentGroupIndex',
    'currentFieldIndex',
  ];

  if (relevantKeys.includes(payload.key)) {
    this.updateDisplay(); // ❌ No RAF debouncing
  }
};
```

**Update to:**

```typescript
class DisplayManager extends BaseManager {
  private rafId: number | null = null; // ❌ Add this property

  public init(): void {
    this.setupStateSubscriptions();
    this.updateDisplay(); // Initial render
  }

  /**
   * Subscribe to state changes that affect visibility
   */
  private setupStateSubscriptions(): void {
    this.form.subscribe('state:changed', this.handleStateChange);
  }

  /**
   * Handle state changes (debounced with RAF)
   * Only updates display if relevant state changed
   */
  private handleStateChange = (payload: StateChangedEvent): void => {
    const relevantKeys = [
      'currentCardIndex',
      'currentSetIndex',
      'currentGroupIndex',
      'currentFieldIndex',
      'activeCardIndices', // ❌ Add new keys
      'activeSetIndices',
      'activeGroupIndices',
      'activeFieldIndices',
    ];

    if (!relevantKeys.includes(payload.key)) return;

    // ❌ Add RAF to batch visual updates (prevents flicker)
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
    }

    this.rafId = requestAnimationFrame(() => {
      this.updateDisplay();
      this.rafId = null;
    });
  };

  /**
   * Main display update logic
   * Reads behavior and shows appropriate elements
   */
  private updateDisplay(): void {
    const behavior = this.form.getBehavior();

    switch (behavior) {
      case 'byField':
        this.displayByField(); // ✅ Already exists
        break;
      case 'byGroup':
        this.displayByGroup(); // ❌ Add
        break;
      case 'bySet':
        this.displayBySet(); // ❌ Add
        break;
      case 'byCard':
        this.displayByCard(); // ❌ Add
        break;
    }
  }
}
```

---

#### 4.2 Behavior-specific display methods (UPDATE/ADD)

**Status:**

- ✅ `displayByField()` exists (display-manager.ts:243-250) - needs update to add `ensureParentVisibility()`
- ❌ `displayByGroup()`, `displayBySet()`, `displayByCard()` need to be added

**Current `displayByField()` implementation:**

```typescript
private displayByField(): void {
  const currentFieldIndex = this.form.getState('currentFieldIndex');
  const fields = this.form.fieldManager.getFields();

  fields.forEach((field) => {
    this.showElement(field.element, field.index === currentFieldIndex);
  });
  // ❌ Missing: ensureParentVisibility()
}
```

**Update to:**

```typescript
/**
 * Display by field (show only current field)
 * Shows: One field at a time
 * Ensures: Parent containers (group, set, card) are visible
 */
private displayByField(): void {
  const fields = this.form.fieldManager.getFields();

  // Show/hide fields based on active flag
  fields.forEach(field => {
    const shouldShow = field.active && field.isIncluded;
    this.showElement(field.element, shouldShow);
  });

  // ❌ Add: Ensure parent containers are visible for active field
  const activeField = fields.find(f => f.active);
  if (activeField) {
    this.ensureParentVisibility(activeField);
  }
}

/**
 * Display by group (show all fields in current group)
 * Shows: All fields in active group
 * Ensures: Parent containers (set, card) are visible
 */
private displayByGroup(): void {
  const groups = this.form.groupManager.getGroups();
  const fields = this.form.fieldManager.getFields();

  // Show/hide groups based on active flag
  groups.forEach(group => {
    const shouldShow = group.active && group.isIncluded;
    this.showElement(group.element, shouldShow);
  });

  // Show/hide fields based on active flag
  fields.forEach(field => {
    const shouldShow = field.active && field.isIncluded;
    this.showElement(field.element, shouldShow);
  });

  // Ensure parent containers visible
  const activeGroup = groups.find(g => g.active);
  if (activeGroup) {
    this.ensureParentVisibility(activeGroup);
  }
}

/**
 * Display by set (show all groups and fields in current set)
 * Shows: All groups and fields in active set
 * Ensures: Parent card is visible
 */
private displayBySet(): void {
  const sets = this.form.setManager.getSets();
  const groups = this.form.groupManager.getGroups();
  const fields = this.form.fieldManager.getFields();

  // Show/hide sets
  sets.forEach(set => {
    const shouldShow = set.active && set.isIncluded;
    this.showElement(set.element, shouldShow);
  });

  // Show/hide groups
  groups.forEach(group => {
    const shouldShow = group.active && group.isIncluded;
    this.showElement(group.element, shouldShow);
  });

  // Show/hide fields
  fields.forEach(field => {
    const shouldShow = field.active && field.isIncluded;
    this.showElement(field.element, shouldShow);
  });

  // Ensure parent card visible
  const activeSet = sets.find(s => s.active);
  if (activeSet) {
    this.ensureParentVisibility(activeSet);
  }
}

/**
 * Display by card (show all sets, groups, fields in current card)
 * Shows: Entire card and all children
 */
private displayByCard(): void {
  const cards = this.form.cardManager.getCards();
  const sets = this.form.setManager.getSets();
  const groups = this.form.groupManager.getGroups();
  const fields = this.form.fieldManager.getFields();

  // Show/hide cards
  cards.forEach(card => {
    const shouldShow = card.active && card.isIncluded;
    this.showElement(card.element, shouldShow);
  });

  // Show/hide sets
  sets.forEach(set => {
    const shouldShow = set.active && set.isIncluded;
    this.showElement(set.element, shouldShow);
  });

  // Show/hide groups
  groups.forEach(group => {
    const shouldShow = group.active && group.isIncluded;
    this.showElement(group.element, shouldShow);
  });

  // Show/hide fields
  fields.forEach(field => {
    const shouldShow = field.active && field.isIncluded;
    this.showElement(field.element, shouldShow);
  });
}
```

**Edge cases:**

- **Empty containers**: If card has no sets, only card is shown (fields/groups/sets safely hidden)
- **Conditional visibility**: Respect `isIncluded` flag (don't show excluded elements even if active)
- **Multiple active elements**: All active elements shown (expected for byGroup/bySet/byCard)

---

#### 4.3 Helper methods (UPDATE/ADD)

**Status:**

- ✅ `showElement()` exists (display-manager.ts:260-263) - needs update to add `data-active` attribute
- ❌ `ensureParentVisibility()` needs to be added

**Current `showElement()` implementation:**

```typescript
public showElement(element: HTMLElement, visible: boolean): void {
  if (visible) element.style.removeProperty('display');
  else element.style.setProperty('display', 'none');
  // ❌ Missing: data-active attribute for debugging
}
```

**Update to:**

```typescript
/**
 * Show or hide an element
 * Updates both display style and data attribute for debugging
 *
 * @param element - DOM element to show/hide
 * @param shouldShow - True to show, false to hide
 */
private showElement(element: HTMLElement, shouldShow: boolean): void {
  if (shouldShow) {
    element.style.display = ''; // Reset to default display
    element.setAttribute('data-active', 'true'); // ❌ Add for debugging
  } else {
    element.style.display = 'none';
    element.removeAttribute('data-active'); // ❌ Add for debugging
  }
}

/**
 * Ensure all parent containers are visible for a given element
 * Works for any hierarchy level (field, group, set)
 * Bubbles up the hierarchy and shows all parents
 *
 * @param element - Element whose parents should be visible
 */
private ensureParentVisibility(
  element: FieldMetadata | GroupMetadata | SetMetadata | CardMetadata
): void {
  const { cardId, setId, groupId } = element.parentHierarchy;

  // Show parent group (if exists)
  if (groupId) {
    const group = this.form.groupManager.getGroupById(groupId);
    if (group) {
      this.showElement(group.element, true);
    }
  }

  // Show parent set (if exists)
  if (setId) {
    const set = this.form.setManager.getSetById(setId);
    if (set) {
      this.showElement(set.element, true);
    }
  }

  // Show parent card
  if (cardId) {
    const card = this.form.cardManager.getCardById(cardId);
    if (card) {
      this.showElement(card.element, true);
    }
  }
}
```

**Edge cases:**

- **Missing parents**: If parent doesn't exist (malformed hierarchy), safely do nothing
- **Display value**: Use empty string to reset to CSS default (not 'block' - might be 'flex' or 'grid')
- **Transitions**: Future enhancement - add CSS transitions for smooth show/hide

---

### Phase 5: Add Events

Add new events to support all behaviors.

#### 5.1 Update event map

```typescript
// src/form/types/events/form-event-map.ts

export interface FormEventMap {
  // Navigation events
  'form:navigation:next': FormNavigationEventPayload;
  'form:navigation:back': FormNavigationEventPayload;

  // Element change events
  'form:field:changed': FormFieldChangedEventPayload;
  'form:group:changed': FormGroupChangedEventPayload;
  'form:set:changed': FormSetChangedEventPayload;
  'form:card:changed': FormCardChangedEventPayload;

  // Validation events
  'form:validation:complete': FormValidationEventPayload;
  'form:validation:failed': FormValidationFailedEventPayload;

  // Form lifecycle
  'form:complete': FormCompleteEventPayload;
  'form:init': FormInitEventPayload;
}

interface FormGroupChangedEventPayload {
  groupIndex: number;
  groupId: string;
  previousGroupIndex: number | null;
}

interface FormSetChangedEventPayload {
  setIndex: number;
  setId: string;
  previousSetIndex: number | null;
}

// ... other payload interfaces
```

---

## Edge Cases Summary

### 1. Cards Without Fields

**Scenario:** Intro card or success card has no sets/groups/fields.

**Solution:**

- `setActiveByParent` safely returns empty array
- DisplayManager shows card element
- NavigationManager's `goToCard` handles this gracefully
- When user clicks next, boundary handler moves to next card

### 2. Conditional Visibility (isIncluded = false)

**Scenario:** Field is conditionally hidden based on form logic.

**Solution:**

- Managers only return included elements: `getNextIncludedField()`
- DisplayManager checks: `shouldShow = field.active && field.isIncluded`
- Navigation skips excluded elements automatically

### 3. Boundary Conditions

**Scenario:** User is on last field of a group, clicks next.

**Solution:**

- `getNextIncludedField()` returns `null`
- `handleBoundary` checks for next group in set
- If next group exists, navigate to first field in that group
- If no next group, check for next set, then next card
- If at end of form, emit `form:complete` event

### 4. Empty Containers

**Scenario:** Set has no groups, only fields. Or group has no fields.

**Solution:**

- Navigation skips empty levels naturally
- DisplayManager shows what exists, doesn't fail on missing levels
- Parent-child relationships remain valid (field can point to set, skip group)

### 5. Multiple Active Elements

**Scenario:** byGroup mode shows 3 fields in one group.

**Solution:**

- All 3 fields have `active: true`
- `activeFieldIndices: [2, 3, 4]`
- `currentFieldIndex: null` (not applicable)
- DisplayManager shows all active fields

### 6. Behavior Transitions

**Scenario:** Form switches from byField to byGroup mid-session.

**Solution:**

- NavigationManager clears appropriate active flags
- Sets new active elements based on new behavior
- DisplayManager reads new state and updates display
- State keys adapt (current* becomes null, active*Indices populates)

### 7. Stale State

**Scenario:** currentFieldIndex points to field that no longer exists.

**Solution:**

- `getFieldByIndex()` returns `null`
- Navigation helpers handle gracefully (return first field)
- State reset on next navigation action

### 8. Validation Failures

**Scenario:** User tries to advance but current field is invalid.

**Solution:**

- `validateCurrent()` returns `false`
- Navigation doesn't proceed
- Validation errors shown via UI
- User remains on current element

### 9. Rapid Clicks (State Race Condition)

**Scenario:** User clicks next button rapidly.

**Solution:**

- NavigationManager debounces or disables during navigation
- RAF batches display updates
- Single state write per navigation action
- Async validation awaited before advancing

### 10. No Fields in Form

**Scenario:** Form has only intro and success cards.

**Solution:**

- FieldManager returns empty arrays
- Navigation moves by card only
- DisplayManager shows cards
- No field-level state written (all null/empty arrays)

---

## Implementation Checklist

### Phase 1: Manager Methods

- [ ] **Add** `clearActive()` to all managers (Card, Set, Group, Field) - does not exist
- [ ] **Add** `setActiveByParent()` to Set, Group, Field managers - does not exist
- [ ] **Add** `calculateStates()` to all managers - refactor from existing `setStates()`
- [ ] **Refactor** `setStates()` to call `calculateStates()` - update existing method
- [ ] **Add** helper methods: `getNextIncluded*()`, `getPreviousIncluded*()` - some exist as `*Index()`, need element wrappers
- [ ] **Clean up** `console.log()` in GroupManager:229-231 and FieldManager:241-243

### Phase 2: State Shape

- [ ] Add `activeFieldIndices`, `activeGroupIndices`, `activeSetIndices`, `activeCardIndices` to FormState
- [ ] Update initial state to include new keys (empty arrays)

### Phase 3: NavigationManager

- [ ] **Refactor** `handleByField()` to use batching (currently calls `setStates()` on each manager)
- [ ] **Rename/refactor** `handleByField(fromIndex, toIndex)` → `nextField()` (remove parameters, get from state)
- [ ] **Implement** `nextGroup()`, `nextSet()`, `nextCard()` (stubs exist, need full implementation)
- [ ] **Add** `updateParentMetadata()` (generic helper) - does not exist
- [ ] **Add** `batchStateUpdates()` - does not exist
- [ ] **Add** `handleBoundary()` for cross-level navigation - does not exist
- [ ] **Add** `goToSet()` and `goToCard()` helpers - does not exist
- [ ] **Add** `validateCurrent()` and validation methods - does not exist
- [ ] No navigation-specific methods exist in other managers (all navigation code is commented out)

### Phase 4: DisplayManager

- [ ] **Add** RAF debouncing to `handleStateChange()` - currently no debouncing
- [ ] **Update** `displayByField()` to add `ensureParentVisibility()` - partially exists
- [ ] **Add** `displayByGroup()`, `displayBySet()`, `displayByCard()` - do not exist
- [ ] **Add** `ensureParentVisibility()` (generic helper) - does not exist
- [ ] **Update** `showElement()` to add `data-active` attribute - helper exists, needs update
- [ ] ✅ Already subscribed to `state:changed` event

### Phase 5: Events

- [ ] Add `form:group:changed` event and payload
- [ ] Add `form:set:changed` event and payload
- [ ] Update NavigationManager to emit new events
- [ ] Test event emission for all behaviors

### Phase 6: Testing

- [ ] Test byField behavior (single field navigation)
- [ ] Test byGroup behavior (multi-field display)
- [ ] Test bySet behavior (multi-group/field display)
- [ ] Test byCard behavior (entire card display)
- [ ] Test boundary conditions (end of fields, groups, sets)
- [ ] Test cards without children
- [ ] Test conditional visibility (isIncluded flag)
- [ ] Test validation (prevent advancement on invalid fields)
- [ ] Test rapid navigation (debouncing)
- [ ] Test behavior transitions (byField � byGroup)

---

## Success Criteria

 All four behaviors work correctly (byField, byGroup, bySet, byCard)
 No circular dependencies between managers
 No display flicker (batched state updates, RAF)
 Edge cases handled gracefully (empty cards, conditional visibility, boundaries)
 Clear separation of concerns (navigation vs display vs state)
 Code is maintainable and extensible (add new behaviors easily)
 State accurately reflects current position in form
 Events emit for all navigation actions
 Validation prevents invalid navigation
 Parent containers always visible when showing children

---

## Notes

- **Priority:** Start with Phase 1 (manager methods) as it's foundational for everything else
- **Testing:** Test each phase incrementally before moving to next
- **Debugging:** Use `data-active` attributes to debug visibility issues
- **Performance:** RAF prevents layout thrashing, batching prevents state races
- **Future:** Add CSS transitions for smooth show/hide animations
