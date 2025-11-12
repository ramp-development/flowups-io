# ConditionManager Implementation

## Overview

ConditionManager handles conditional visibility for form elements based on input values. It parses complex expressions, builds a dependency graph, and efficiently evaluates conditions with caching.

## Features

### 1. Expression Parsing

Supports complex conditional expressions with:
- **Field references**: `{fieldName}` (uses input name attribute)
- **Comparison operators**: `=`, `!=`, `>`, `<`, `>=`, `<=`
- **String operators**: `*=` (contains), `^=` (starts with), `$=` (ends with)
- **Logical operators**: `&&` (AND), `||` (OR)
- **Form state**: `{form.currentCardIndex}` (accesses form state variables)

Example expressions:
```html
<!-- Show if input equals value -->
<div data-form-showif="{answer} = yes">...</div>

<!-- Hide if input doesn't equal value -->
<div data-form-hideif="{age} < 18">...</div>

<!-- Complex logical expression -->
<div data-form-showif="{type} = premium && {verified} = true">...</div>

<!-- String contains -->
<div data-form-showif="{email} *= @company.com">...</div>

<!-- Form state -->
<div data-form-showif="{form.currentCardIndex} > 0">...</div>
```

### 2. Dependency Graph

Builds an efficient lookup map:
- Tracks which elements depend on which fields
- Only re-evaluates affected elements when a field changes
- O(1) lookup for field changes

Example:
```
Field "answer" -> Set { element1, element2, element3 }
Field "age" -> Set { element4 }
```

When "answer" changes, only elements 1-3 are re-evaluated.

### 3. Condition Evaluation

**showif logic**: Element is shown if expression evaluates to `true`
**hideif logic**: Element is hidden if expression evaluates to `true`
**Combined**: Element is visible if `showif === true AND hideif === false`

### 4. Performance Optimizations

- **Caching**: Stores last evaluation result per element
- **Targeted updates**: Only evaluates affected elements
- **Early returns**: Skips evaluation if no dependencies changed
- **Lazy evaluation**: Only evaluates when input changes

### 5. Input Required State Management

When an element becomes hidden:
- Sets `isIncluded = false` for all inputs within
- Sets `isRequired = false` for all inputs within

When an element becomes visible:
- Sets `isIncluded = true` for all inputs within
- Restores `isRequired` to original `isRequiredOriginal` value

This ensures hidden inputs don't block navigation.

### 6. Navigation Rebuild Trigger

When visibility changes affect inputs, triggers navigation rebuild via:
```typescript
this.form.emit('form:navigation:request', { type: 'next' });
```

This ensures navigation order accounts for newly visible/hidden fields.

## API

### Public Methods

```typescript
// Initialize manager
init(): void

// Cleanup
destroy(): void

// Register a conditional element
registerCondition(element: HTMLElement): void

// Evaluate condition for specific element
evaluateCondition(element: HTMLElement): boolean

// Get all elements affected by a field
getAffectedElements(fieldName: string): Set<HTMLElement>

// Clear cached results
clearCache(): void

// Re-evaluate all conditions
evaluateConditions(): void
```

## Integration

### In FlowupsForm

```typescript
public conditionManager: ConditionManager;

constructor(props: FlowupsFormProps) {
  // ...
  this.conditionManager = new ConditionManager(this);
}

protected async onInit(): Promise<void> {
  // ...
  this.conditionManager.init(); // After input manager
}

protected async onDestroy(): Promise<void> {
  // ...
  this.conditionManager.destroy();
}
```

### Event Flow

```
User changes input
  ↓
InputManager emits 'form:input:changed'
  ↓
ConditionManager receives event
  ↓
Look up affected elements via dependency graph
  ↓
Re-evaluate only affected conditions
  ↓
Toggle visibility if result changed
  ↓
Update input required states
  ↓
Trigger navigation rebuild
```

## Architecture Pattern

Follows established manager patterns:
- Extends `BaseManager`
- Discovery pattern for finding elements
- Event-driven updates via EventBus
- Single responsibility (conditional visibility)
- Performance-first design (caching, targeted updates)

## Future Enhancements

1. **Complex expressions**: Support parentheses for grouping
2. **Negation**: Support `!{field}` for boolean negation
3. **Multiple values**: Support `{field} = value1,value2,value3`
4. **Regex support**: `{field} ~= /pattern/`
5. **Date comparisons**: `{date} > 2024-01-01`
6. **Array operations**: `{tags} includes "premium"`

## Testing Notes

Test cases should cover:
- Simple equality/inequality
- Numeric comparisons
- String operations (contains, starts, ends)
- Logical operators (AND, OR)
- Mixed showif/hideif on same element
- Chained dependencies (A affects B, B affects C)
- Form state conditions
- Input required state updates
- Navigation rebuild after visibility changes
