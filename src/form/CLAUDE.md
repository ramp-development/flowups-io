# Multi-Step Form System

## Overview

A flexible, attribute-driven multi-step form system for Webflow built on the Flowups component toolkit. Forms are configured entirely through data attributes, with specialized managers handling different concerns (navigation, validation, progress tracking, conditional visibility).

## Architecture

### Component Structure

```
MultiStepForm (extends StatefulComponent)
│
├── State Management
│   ├── Navigation state
│   │   ├── currentCardIndex: number
│   │   ├── currentSetIndex: number
│   │   ├── currentGroupIndex: number
│   │   ├── currentFieldIndex: number
│   │   ├── currentCardId: string
│   │   ├── currentSetId: string
│   │   ├── currentGroupId: string
│   │   └── behavior: 'byCard' | 'bySet' | 'byGroup' | 'byField'
│   ├── Progress tracking
│   │   ├── completedCards: Set<string>
│   │   ├── completedSets: Set<string>
│   │   ├── completedGroups: Set<string>
│   │   ├── completedFields: Set<string>
│   │   ├── visitedCards: Set<string>
│   │   ├── visitedSets: Set<string>
│   │   └── formProgress: number (0-100)
│   ├── Form data
│   │   ├── formData: Record<string, unknown>
│   │   ├── setValidity: Record<string, boolean>
│   │   └── fieldErrors: Record<string, string[]>
│   └── Configuration options
│
├── Manager System
│   ├── CardManager - Card discovery, navigation
│   ├── SetManager - Set discovery, navigation, title extraction from <legend>
│   ├── GroupManager - Group discovery, navigation
│   ├── FieldManager - Field discovery, navigation
│   ├── FieldManager - Input discovery, value tracking, lazy event binding
│   ├── ValidationManager - HTML5 validation, field/set validation
│   ├── ConditionManager - Conditional visibility, expression evaluation, caching
│   ├── NavigationManager - Button states, guards, navigation flow
│   ├── RenderManager - Text/style updates, expression evaluation
│   ├── AnimationManager - Transitions (fade/slide)
│   ├── ErrorManager - Browser native error display
│   └── AccessibilityManager - ARIA attributes, announcements, focus management
│
└── Public API (Future)
    └── window.Flowups.push() - Event subscription interface
```

### Design Principles

1. **Attribute-Driven** - All configuration via `${ATTR}-*` attributes
2. **Progressive Enhancement** - Works with standard HTML forms
3. **Manager Pattern** - Focused, single-responsibility managers
4. **Hierarchical Structure** - Form → Card → Set → Group → Field
5. **Flexible Progression** - Control granularity with behavior modes (byCard/bySet/byGroup/byField)
6. **Semantic HTML** - Uses `<fieldset>` and `<legend>` for sets/groups
7. **State-First** - All data flows through component state
8. **Event-Driven** - Managers communicate via EventBus
9. **Performance-Optimized** - Lazy event binding, condition caching
10. **Type-Safe** - Full TypeScript support
11. **Accessibility-First** - ARIA attributes, focus management, screen reader support

## Data Attribute Schema

### Element Hierarchy

The system provides a flexible 5-level hierarchy for maximum control:

```
form (root)
├── card (optional - large UI sections)
│   ├── set (required within form - semantic field groupings)
│   │   ├── group (optional - logical subgroupings)
│   │   │   └── field (required - wrapper for label/input/error/hint)
```

**Element Types:**

| Element  | Required | Purpose                                  | HTML Semantic            |
| -------- | -------- | ---------------------------------------- | ------------------------ |
| `form`   | Yes      | Root container, controls global behavior | `<form>`                 |
| `card`   | Optional | Large UI panels (intro/form/success)     | `<div>`                  |
| `set`    | Yes\*    | Semantic grouping of related fields      | `<fieldset>` recommended |
| `group`  | Optional | Logical subgroup within a set            | `<fieldset>` recommended |
| `field`  | Yes\*    | Wrapper for label/input/error/hint       | `<div>`                  |
| `prev`   | Optional | Previous button                          | `<button>`               |
| `next`   | Optional | Next button                              | `<button>`               |
| `submit` | Optional | Submit button                            | `<button type="submit">` |
| `error`  | Optional | Error message container                  | `<div>`                  |

\* Required within form cards

### Form Behavior

Control form progression granularity with `${ATTR}-behavior`:

| Behavior  | Description                          | Use Case                               | Example                    |
| --------- | ------------------------------------ | -------------------------------------- | -------------------------- |
| `byCard`  | Navigate between cards               | Wizard with intro/form/success screens | Onboarding flow            |
| `bySet`   | Navigate between sets within a card  | Classic multi-step form                | Contact → Details → Review |
| `byGroup` | Navigate between groups within a set | Guided sub-sections                    | Name → Address → Phone     |
| `byField` | Navigate one field at a time         | Typeform-style experience              | Single question per screen |

**v1.0 Implementation:**

- Only `byField` behavior supported initially
- Navigation is always `byField`. Only one field is visible at a time.
- We still parse card, set, and group for:
  - progress text (e.g. “Step 1 of 5” uses sets even if we’re showing fields)
  - conditional visibility scoping
- We do NOT yet allow switching navigation mode (so behavior inheritance exists in spec, but not in runtime).
- Future versions will add `byCard`, `bySet`, `byGroup` and behavior inheritance/overrides

### Element Attribute Syntax

The system supports multiple ways to define elements:

```html
<!-- Combined syntax (element:id) -->
<div ${ATTR}-element="card:intro">
  <div ${ATTR}-element="set:contact">
    <div ${ATTR}-element="group:name">
      <div ${ATTR}-element="field">
        <!-- input -->
      </div>
    </div>
  </div>
</div>

<!-- Explicit attributes -->
<div ${ATTR}-element="card" ${ATTR}-cardtitle="Introduction">
  <fieldset ${ATTR}-element="set" ${ATTR}-settitle="Contact Details">
    <div ${ATTR}-element="group" ${ATTR}-grouptitle="Name Information">
      <div ${ATTR}-element="field">
        <!-- input -->
      </div>
    </div>
  </fieldset>
</div>

<!-- Semantic HTML with <legend> (RECOMMENDED) -->
<div ${ATTR}-element="card" ${ATTR}-cardtitle="Application">
  <fieldset ${ATTR}-element="set">
    <legend>Contact Details</legend>
    <div ${ATTR}-element="group">
      <fieldset>
        <legend>Home Address</legend>
        <div ${ATTR}-element="field">
          <!-- input -->
        </div>
      </fieldset>
    </div>
  </fieldset>
</div>
```

### Title/ID Priority

For each element type, titles and IDs are resolved in this order:

**Sets:**

1. `${ATTR}-settitle="Contact Details"` (explicit attribute)
2. `<legend>` text content (semantic HTML)
3. `${ATTR}-element="set:contact-details"` (parse from combined syntax)
4. Auto-generate ID from index (e.g., `set-0`, `set-1`)

**Groups:**

1. `${ATTR}-grouptitle="Name"` (explicit attribute)
2. `<legend>` text content (semantic HTML)
3. `${ATTR}-element="group:name"` (parse from combined syntax)
4. Auto-generate ID from index (e.g., `group-0`, `group-1`)

**Cards:**

1. `${ATTR}-cardtitle="Introduction"` (explicit attribute)
2. `${ATTR}-element="card:intro"` (parse from combined syntax)
3. Auto-generate ID from index (e.g., `card-0`, `card-1`)

**Form ID:**

- Pulled from the `name` attribute on the `<form>` element
- Used to reference form via JavaScript API: `Flowups.Forms.get('onboarding')`

```html
<form ${ATTR}-element="form" name="onboarding" ${ATTR}-behavior="byField">
  <!-- form content -->
</form>
```

### Navigation Elements

```html
<button ${ATTR}-element="prev">Back</button>
<button ${ATTR}-element="next">Continue</button>
<button ${ATTR}-element="submit">Submit</button>
```

### Dynamic Rendering

Variables are always wrapped in `{}`, with explicit naming for clarity. Users define what constitutes a "step" in their UI.

```html
<!-- Text rendering - Index variables (1-based for display) -->
<div ${ATTR}-textcontent="{current-card-index}"></div>
<div ${ATTR}-textcontent="{current-set-index}"></div>
<div ${ATTR}-textcontent="{current-group-index}"></div>
<div ${ATTR}-textcontent="{current-field-index}"></div>

<!-- Text rendering - Totals -->
<div ${ATTR}-textcontent="{total-cards}"></div>
<div ${ATTR}-textcontent="{total-sets}"></div>
<div ${ATTR}-textcontent="{total-groups}"></div>
<div ${ATTR}-textcontent="{total-fields}"></div>

<!-- Text rendering - Titles -->
<div ${ATTR}-textcontent="{current-card-title}"></div>
<div ${ATTR}-textcontent="{current-set-title}"></div>
<div ${ATTR}-textcontent="{current-group-title}"></div>

<!-- Combined text rendering -->
<div ${ATTR}-textcontent="Step {current-set-index} of {total-sets}"></div>
<div ${ATTR}-textcontent="Question {current-field-index} of {total-fields}"></div>
<div ${ATTR}-textcontent="Section {current-card-index}: {current-card-title}"></div>
<div ${ATTR}-textcontent="Set {current-set-index}/{total-sets}: {current-set-title}"></div>

<!-- Style rendering (width percentage for progress bars) -->
<div ${ATTR}-stylewidth="{form-progress}"></div>
<div ${ATTR}-stylewidth="{card-progress}"></div>
<div ${ATTR}-stylewidth="{set-progress}"></div>

<!-- Math expressions in style rendering -->
<div ${ATTR}-stylewidth="({sets-completed} / {total-sets}) * 100"></div>
<div ${ATTR}-stylewidth="({fields-completed} / {total-fields}) * 100"></div>

<!-- Future: Additional style properties -->
<!-- ${ATTR}-styleheight, ${ATTR}-styleopacity, etc. -->
```

**Available Variables:**

**Index Variables** (1-based for display):

- `{current-card-index}` - Current card number (1, 2, 3...)
- `{current-set-index}` - Current set number (1, 2, 3...)
- `{current-group-index}` - Current group number (1, 2, 3...)
- `{current-field-index}` - Current field number (1, 2, 3...)

**Total Counts:**

- `{total-cards}` - Total number of cards
- `{total-sets}` - Total number of sets
- `{total-groups}` - Total number of groups
- `{total-fields}` - Total number of fields

**Identifiers** (strings):

- `{current-card-id}` - Current card ID (e.g., "intro", "form", "success")
- `{current-set-id}` - Current set ID (e.g., "contact-details", "medical-info")
- `{current-group-id}` - Current group ID (e.g., "name", "address")

**Titles** (display text):

- `{current-card-title}` - Current card title (e.g., "Introduction")
- `{current-set-title}` - Current set title (e.g., "Contact Details")
- `{current-group-title}` - Current group title (e.g., "Name Information")

**Progress** (0-100):

- `{form-progress}` - Overall form completion percentage
- `{card-progress}` - Current card completion percentage
- `{set-progress}` - Current set completion percentage

**Completion Counts:**

- `{cards-completed}` - Number of completed cards
- `{sets-completed}` - Number of completed sets
- `{groups-completed}` - Number of completed groups
- `{fields-completed}` - Number of completed fields

**Form Data Variables:**

- `{fieldName}` - Any form field value (e.g., `{email}`, `{firstName}`, `{country}`)

### Conditional Visibility

Variables wrapped in `{}`, spaces around operators, supports `&&` and `||`:

```html
<!-- Simple field equality -->
<div ${ATTR}-showif="{country} = US">Only shown when country field equals "US"</div>

<!-- Numeric comparisons -->
<div ${ATTR}-showif="{age} > 18">Adult content</div>
<div ${ATTR}-showif="{quantity} >= 10">Bulk discount</div>

<!-- Compound conditions (AND) -->
<div ${ATTR}-showif="{country} = US && {state} = CA">California specific content</div>

<!-- Compound conditions (OR) -->
<div ${ATTR}-showif="{subscribe} = true || {newsletter} = true">Marketing preferences</div>

<!-- Complex conditions -->
<div ${ATTR}-showif="({age} >= 18 && {country} = US) || {guardian-consent} = true">
  Content with age gate or consent
</div>

<!-- Form state conditions (using index/count variables) -->
<div ${ATTR}-showif="{current-set-index} > 2">Shown after set 2</div>
<div ${ATTR}-showif="{sets-completed} >= 3">Need 3 completed sets</div>
<div ${ATTR}-showif="{current-field-index} >= 5">Shown from field 5 onwards</div>

<!-- Pattern matching -->
<div ${ATTR}-showif="{email} *= @company.com">Company email</div>
<div ${ATTR}-showif="{phone} ^= +44">UK phone</div>
<div ${ATTR}-showif="{url} $= .com">Dot com domain</div>

<!-- Hide if condition met -->
<div ${ATTR}-hideif="{subscribe} = false">Hidden when unchecked</div>
```

**Operators:**

- `=` - Equals
- `!=` - Not equals
- `>` - Greater than
- `<` - Less than
- `>=` - Greater than or equal
- `<=` - Less than or equal
- `*=` - Contains
- `^=` - Starts with
- `$=` - Ends with
- `&&` - AND (both conditions must be true)
- `||` - OR (either condition must be true)

### Validation

The system auto-detects native HTML5 validation (required, type, pattern, etc.):

```html
<!-- Native HTML5 validation (auto-detected) -->
<input type="email" name="email" required />
<input type="tel" name="phone" required pattern="[0-9]{10}" />
<input type="number" name="age" min="18" max="120" />

<!-- Custom validation rules -->
<input name="username" required ${ATTR}-validate="min:3,max:20,pattern:^[a-z0-9_]+$" />

<!-- Custom format patterns (for display, not validation) -->
<input type="tel" name="phone" ${ATTR}-validateformat="(XXX) XXX-XXXX" />

<!-- Future: Email blocklist -->
<input type="email" name="email" ${ATTR}-validateblocklist="hotmail.com,yahoo.com" />
```

**Validation Timing** (cascades from form → card → set → group → input):

```html
<!-- Form level defaults -->
<form ${ATTR}-element="form" ${ATTR}-validateon="blur">
  <!-- Set level override -->
  <div ${ATTR}-element="set:payment" ${ATTR}-validateon="change">
    <!-- Input level override -->
    <input name="cardNumber" ${ATTR}-validateon="input" />
  </div>
</form>
```

**Validation Timing Options:**

- `blur` - Validate when input loses focus (default for text inputs)
- `change` - Validate on value change (default for select/radio/checkbox)
- `input` - Validate on every keystroke (for real-time feedback)
- `next` - Validate when next button clicked
- `submit` - Validate on form submission
- Multiple: `blur,change` - Validate on multiple events

**Smart Defaults by Input Type:**

- Text, email, password, textarea → `blur`
- Select, radio, checkbox → `change`
- Number, range → `input`
- All types also trigger onChange for conditional visibility updates

### Navigation Guards

Control whether validation is required to advance (cascades from form → card → set → group):

```html
<!-- Form level: Require valid fields to advance (default) -->
<form ${ATTR}-element="form" ${ATTR}-allowinvalid="false">
  <!-- Set level: Allow skipping this set even if invalid -->
  <div ${ATTR}-element="set:optional-preferences" ${ATTR}-allowinvalid="true">
    <!-- Group level: This group must be completed to advance -->
    <div ${ATTR}-element="group:required-info" ${ATTR}-allowinvalid="false"></div>
  </div>
</form>
```

### Error Handling

```html
<!-- Error message container -->
<input name="email" required type="email" />
<div ${ATTR}-element="error" data-error-for="email"></div>

<!-- Error class configuration (cascades from form → card → set → group) -->
<form
  ${ATTR}-element="form"
  ${ATTR}-errorclass="is-invalid"
  ${ATTR}-errortarget="parent"
  ${ATTR}-errordisplay="native"
></form>
```

**Error Display Modes:**

- `native` - Browser native validation messages (default)
- `inline` - Custom inline error containers via `${ATTR}-element="error"`
- `toast` - Toast notifications (future)

**Error Class Targets:**

- `parent` - Apply error class to input's parent element (default)
- `self` - Apply error class to input itself
- `{selector}` - Apply to specific element (ID, class, or data attribute)

**Example with inline errors:**

```html
<div class="input-wrapper">
  <label>Email</label>
  <input type="email" name="email" required />
  <div ${ATTR}-element="error" data-error-for="email"></div>
</div>

<!-- Error class "is-invalid" applied to .input-wrapper when validation fails -->
```

### Configuration

All configuration via attributes (no JSON objects):

```html
<form
  ${ATTR}-element="form"

  <!-- Persistence (single attribute, stores both progress and data) -->
  ${ATTR}-persist="local"

  <!-- Validation -->
  ${ATTR}-validateon="blur"
  ${ATTR}-allowinvalid="false"

  <!-- Error handling -->
  ${ATTR}-errordisplay="native"
  ${ATTR}-errorclass="is-invalid"
  ${ATTR}-errortarget="parent"

  <!-- Animation -->
  ${ATTR}-transition="fade"
  ${ATTR}-transitionduration="300"

  <!-- Accessibility -->
  ${ATTR}-ariaannounce="true"
  ${ATTR}-focusonchange="true"
>
```

**Configuration Options:**

| Attribute                    | Values                                      | Default  | Description                                 |
| ---------------------------- | ------------------------------------------- | -------- | ------------------------------------------- |
| `${ATTR}-persist`            | `local`, `session`, `cookie`, `false`       | `false`  | Storage type for form data, `false` for now |
| `${ATTR}-validateon`         | `blur`, `change`, `input`, `next`, `submit` | `blur`   | When to validate inputs                     |
| `${ATTR}-allowinvalid`       | `true`, `false`                             | `false`  | Allow advancing with errors                 |
| `${ATTR}-errordisplay`       | `native`, `inline`, `toast`                 | `native` | Error display mode, just `native` for now   |
| `${ATTR}-errorclass`         | string                                      | -        | CSS class for error state                   |
| `${ATTR}-errortarget`        | `parent`, `self`, `{selector}`              | `parent` | Where to apply error class                  |
| `${ATTR}-transition`         | `fade`, `slide`, `none`                     | `fade`   | Transition type                             |
| `${ATTR}-transitionduration` | number (ms)                                 | `300`    | Transition duration                         |
| `${ATTR}-ariaannounce`       | `true`, `false`                             | `true`   | Announce set changes                        |
| `${ATTR}-focusonchange`      | `true`, `false`                             | `true`   | Focus first input on set change             |

## State Management

### FormState Interface

```typescript
interface FormState {
  // Behavior
  behavior: 'byCard' | 'bySet' | 'byGroup' | 'byField';

  // Navigation / position
  currentFieldIndex: number; // index of visible field (0-based)
  currentFieldId: string;
  previousFieldIndex: number | null;

  // Hierarchy context (derived for rendering)
  currentCardId: string;
  currentCardTitle: string;
  currentSetIndex: number;
  currentSetId: string;
  currentSetTitle: string;

  // Tracking
  visitedFieldIndexes: Set<number>;
  completedFieldIndexes: Set<number>;

  // Totals
  totalFields: number;
  totalSets: number;
  totalCards: number;

  // Data
  formData: Record<string, unknown>;

  // Validation
  fieldErrors: Record<string, string[]>;
  fieldValidity: Record<string, boolean>; // per field name
  isCurrentFieldValid: boolean;
  isFormValid: boolean;

  // Status
  isSubmitting: boolean;
  isInitialized: boolean;

  // Progress
  formProgress: number; // 0-100 overall - (completedFieldIndexes.length / totalFields) * 100
  setProgress: number; // 0-100 for current set - ((currentFieldIndex + 1) / currentSet.length) * 100
}
```

### State Updates

All state changes trigger:

1. Component state update via `setState()`
2. Automatic persistence (if configured)
3. EventBus emission for internal manager communication
4. Window API event emission for user code
5. Manager reactions (progress updates, condition re-evaluation, etc.)

## Manager Responsibilities

### SetManager

**Purpose:** Manage set lifecycle, discovery, and transitions

**Responsibilities:**

- Discover all `[${ATTR}-element="set"]` elements
- Parse set IDs from attributes or titles
- Initialize set metadata (index, id, title)
- Show/hide sets (delegates animation to AnimationManager)
- Track visited and completed sets
- Emit set change events
- Coordinate with NavigationManager for guards

**API:**

```typescript
goToSet(index: number): Promise<void>
nextSet(): Promise<void>
prevSet(): Promise<void>
getCurrentSet(): SetElement
getSetById(id: string): SetElement | null
getSetByIndex(index: number): SetElement | null
getTotalSets(): number
isFirstSet(): boolean
isLastSet(): boolean
markSetComplete(SetId: string): void
```

**Performance Notes:**

- Only activates event listeners for current set
- Deactivates listeners when leaving set

### FieldManager

**Purpose:** Track and manage all form fields (input wrapper with label, error, hint, etc...) with smart event binding

**Responsibilities:**

- Auto-discover all fields in form
- Group fields by `[${ATTR}-element="group"]`
- Lazy event binding (only active set input)
- Listen to input/change/blur events based on field input type
- Update formData state on changes
- Handle field focus management
- Support all HTML input types (text, select, radio, checkbox, etc.)
- Trigger condition re-evaluation on change

**API:**

```typescript
registerField(field: HTMLElement): void
unregisterField(field: HTMLElement): void
bindField(field: HTMLElement): void
unbindField(field: HTMLElement): void
getFieldValue(name: string): unknown
setFieldValue(name: string, value: unknown): void
getGroupFields(groupId: string): HTMLElement[]
getSetFields(setId: string): HTMLElement[]
getAllFields(): HTMLElement[]
getActiveFields(): HTMLElement[]
nextField(): Promise<void>
prevField(): Promise<void>
getCurrentField(): HTMLElement
getFieldById(id: string): HTMLElement | null
getFieldByIndex(index: number): HTMLElement | null
getTotalFields(): number
markFieldComplete(id: string): void
```

**Performance Notes:**

- Only binds events to inputs in active set
- Unbinds events when set becomes inactive
- Smart event selection based on input type

### ValidationManager

**Purpose:** Validate inputs, groups, sets and cards

**Responsibilities:**

- Auto-detect native HTML5 validation (required, type, pattern, min, max)
- Parse custom `[${ATTR}-validate]` rules
- Execute validation on demand or based on timing config
- Update `[${ATTR}-element="error"]` containers
- Apply error classes to configured targets
- Provide validation error messages
- Support custom validators (future)
- Integrate with ErrorManager for display

**API:**

```typescript
validateInput(name: string, showErrors?: boolean): ValidationResult
validateGroup(groupId: string, showErrors?: boolean): ValidationResult
validateSet(setId: string, showErrors?: boolean): ValidationResult
validateForm(showErrors?: boolean): ValidationResult
clearErrors(target?: string): void
getFieldErrors(name: string): string[]
isFieldValid(name: string): boolean
```

**Validation Result:**

```typescript
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

interface ValidationError {
  field: string;
  rule: string;
  message: string;
}
```

### ConditionManager

**Purpose:** Handle conditional visibility with performance optimization

**Responsibilities:**

- Discover all `[${ATTR}-showif]` / `[${ATTR}-hideif]` elements
- Parse condition expressions (handle `{}`, operators, `&&`, `||`)
- Build dependency graph (which elements depend on which fields)
- Watch formData state changes
- Evaluate conditions only for affected elements (performance)
- Apply show/hide with smooth transitions
- Cache condition results for performance
- Handle form state conditions (`{form.*}`)

**API:**

```typescript
evaluateConditions(): void
evaluateCondition(element: HTMLElement): boolean
registerCondition(element: HTMLElement): void
getAffectedElements(fieldName: string): Set<HTMLElement>
clearCache(): void
```

**Performance Implementation:**

```typescript
class ConditionManager {
  // Map: fieldName -> Set of elements with conditions depending on that field
  private affectedFields: Map<string, Set<HTMLElement>> = new Map();

  // Map: element -> last evaluation result (for caching)
  private conditionCache: Map<HTMLElement, boolean> = new Map();

  // Only re-evaluate elements affected by the changed field
  onFieldChange(fieldName: string, value: unknown) {
    const affectedElements = this.affectedFields.get(fieldName);
    if (!affectedElements) return;

    affectedElements.forEach((element) => {
      const isVisible = this.evaluateCondition(element);
      const wasVisible = this.conditionCache.get(element);

      if (isVisible !== wasVisible) {
        this.toggleElement(element, isVisible);
        this.conditionCache.set(element, isVisible);
      }
    });
  }
}
```

### NavigationManager

**Purpose:** Manage navigation buttons and enforce guards

**Responsibilities:**

- Discover all prev/next/submit buttons
- Handle button click events
- Update button states (enabled/disabled/loading)
- Enforce validation guards (check with ValidationManager)
- Show/hide buttons based on current set
- Coordinate with SetManager for navigation
- Handle loading states during async operations

**API:**

```typescript
updateButtonStates(): void
disableNavigation(): void
enableNavigation(): void
setLoadingState(button: HTMLElement, loading: boolean): void
canNavigateNext(): Promise<boolean>
canNavigatePrev(): boolean
```

### RenderManager

**Purpose:** Handle all dynamic text and style updates

**Responsibilities:**

- Discover all `[${ATTR}-textcontent]` elements
- Discover all `[${ATTR}-style*]` elements
- Evaluate expressions with variables
- Update text content dynamically
- Update style properties dynamically
- React to state changes for real-time updates
- Handle expression parsing (variables, operators, math)

**API:**

```typescript
updateAllRenders(): void
updateTextRenders(): void
updateStyleRenders(): void
evaluateExpression(expression: string, context: Record<string, unknown>): unknown
registerTextElement(element: HTMLElement): void
registerStyleElement(element: HTMLElement, property: string): void
```

**Expression Evaluation:**

Variable names are kebab-case in markup (e.g., {current-set-title}) and camelCase in code (e.g., state.currentSetTitle).

```typescript
// Context includes all available variables
const context = {
  'current-set-id': this.state.currentSetId,
  'current-set-index': this.state.currentSetIndex + 1,
  'current-set-title': this.state.currentSetTitle,
  'total-sets': this.state.totalSets,
  'sets-completed': this.state.SetsCompleted,
  'form-progress': this.state.formProgress,
  'set-progress': this.state.SetProgress,
  // ... plus all formData fields
};

// Parse and evaluate expression
// "{current-set} / {total-sets}" -> "2 / 5"
// "({sets-completed} / {total-sets}) * 100" -> "(3 / 5) * 100" -> "60"
```

### AnimationManager

**Purpose:** Handle set transition animations

**Responsibilities:**

- Manage transition types (fade, slide, typeform, none)
- Handle transition timing and duration
- Coordinate with SetManager for set changes
- Apply CSS classes for transitions
- Wait for transitions to complete before cleanup
- Future: Support for custom transition types

**API:**

```typescript
transitionSet(fromSet: HTMLElement, toSet: HTMLElement, direction: 'forward' | 'backward'): Promise<void>
setTransitionType(type: 'fade' | 'slide' | 'none'): void
setTransitionDuration(ms: number): void
```

**Current Implementation (v1):**

- `fade` - Simple opacity fade in/out
- `none` - Instant switch (no animation)

**Future Transitions:**

- `slide` - Horizontal slide left/right
- `typeform` - Typeform-style single question
- Custom transitions via CSS classes

### ErrorManager

**Purpose:** Handle error display in multiple modes

**Responsibilities:**

- Display errors in configured mode (native/inline/toast)
- Manage error message containers `[${ATTR}-element="error"]`
- Apply error classes to configured targets
- Clear errors when field becomes valid
- Provide default error messages
- Support custom error messages (future)
- Only native mode implemented in v1. Inline and toast are planned for future versions.

**API:**

```typescript
displayError(field: string, message: string): void
displayErrors(errors: ValidationError[]): void
clearError(field: string): void
clearAllErrors(): void
setErrorMode(mode: 'native' | 'inline' | 'toast'): void
```

**Error Display Modes:**

```typescript
// Native: Browser validation UI
private showNativeError(field: string, message: string): void {
  const input = document.querySelector(`[name="${field}"]`) as HTMLInputElement;
  input?.setCustomValidity(message);
  input?.reportValidity();
}

// Inline: Custom error containers
private showInlineError(field: string, message: string): void {
  const errorElement = document.querySelector(
    `[${ATTR}-element="error"][data-error-for="${field}"]`
  );
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.classList.add('visible');
  }

  // Apply error class to target
  this.applyErrorClass(field, true);
}

// Toast: Notification system (future)
private showToastError(message: string): void {
  // Toast implementation
}
```

### AccessibilityManager

**Purpose:** Ensure form is accessible to all users

**Responsibilities:**

- Add ARIA attributes to set (role, aria-hidden, aria-current)
- Add ARIA attributes to progress indicators
- Add ARIA live regions for announcements
- Announce set changes to screen readers
- Manage focus on set transitions
- Ensure keyboard navigation support (future)
- Provide clear error announcements

**API:**

```typescript
setupSetAria(sets: HTMLElement[]): void
setupProgressAria(progressElements: HTMLElement[]): void
announceSetChange(setTitle: string, setIndex: number): void
setFocusOnSetChange(set: HTMLElement): void
announceError(message: string): void
```

**ARIA Implementation:**

```typescript
// Sets setup
setupSetAria(sets: HTMLElement[]): void {
  sets.forEach((set, index) => {
    set.setAttribute('role', 'tabpanel');
    set.setAttribute('aria-labelledby', `set-${index}-title`);
    if (index !== this.currentSetIndex) {
      set.setAttribute('aria-hidden', 'true');
    }
  });
}

// Announcements
announceSetChange(setTitle: string, setIndex: number): void {
  const liveRegion = this.getLiveRegion();
  liveRegion.textContent = `Now on set ${setIndex + 1}: ${setTitle}`;
}

// Focus management
setFocusOnSetChange(set: HTMLElement): void {
  const firstFocusable = set.querySelector('input, select, textarea, button');
  if (firstFocusable instanceof HTMLElement) {
    firstFocusable.focus();
  }
}
```

## Event System

### Internal Events (EventBus)

Used for manager-to-manager communication within the form component:

```typescript
// Lifecycle
'form:initialized' - { formId: string }
'form:destroyed' - { formId: string }

// Navigation
'form:set:changing' - { fromIndex: number, toIndex: number }
'form:set:changed' - { setIndex: number, setId: string, setTitle: string }
'form:set:completed' - { setId: string, setIndex: number }

// Validation
'form:validation:started' - { target: string }
'form:validation:completed' - { target: string, valid: boolean, errors: ValidationError[] }

// Data
'form:data:changed' - { field: string, value: unknown, oldValue: unknown }

// Conditions
'form:condition:evaluated' - { element: HTMLElement, visible: boolean, condition: string }

// Submission
'form:submit:started' - { formData: Record<string, unknown> }
'form:submit:success' - { response: unknown }
'form:submit:error' - { error: Error }
```

### Public Events (window.Flowups.push() API)

User-friendly event names for external code:

```typescript
// Available events
'set:changed' - { from: number, to: number, setId: string, setTitle: string }
'set:completed' - { setId: string, setIndex: number }
'input:changed' - { field: string, value: unknown, formData: Record<string, unknown> }
'input:blurred' - { field: string, value: unknown }
'validation:error' - { field: string, errors: string[] }
'validation:success' - { field: string }
'progress:updated' - { formProgress: number, setProgress: number, setsCompleted: number }
'submit:started' - { formData: Record<string, unknown> }
'submit:success' - { response: unknown }
'submit:error' - { error: Error }
```

## Usage Example

### Clinical Trial Application Form (Client v1.0)

This example demonstrates the full hierarchy with `byField` behavior, matching the client's clinical trial form.

#### 1. Add Script to Site Settings

In Webflow Project Settings → Custom Code → Head Code:

```html
<!-- Add to <head> -->
<script src="https://cdn.jsdelivr.net/npm/@flowups/forms@latest/dist/index.js"></script>
```

#### 2. Build Form in Webflow Designer

Create your form structure using Webflow's visual editor and add the required data attributes:

```html
<form
  ${ATTR}-element="form"
  name="clinical-trial"
  ${ATTR}-behavior="byField"
  ${ATTR}-transition="fade"
  ${ATTR}-transitionduration="300"
>
  <!-- CARD 1: Introduction -->
  <div ${ATTR}-element="card" ${ATTR}-cardtitle="Introduction">
    <h1>Join Our Clinical Trial</h1>
    <p>
      Thank you for your interest in Motif Neurotech's clinical trial for treatment-resistant
      depression...
    </p>

    <ul>
      <li>Takes 6 minutes to complete</li>
      <li>Your information is confidential & secure</li>
      <li>You must live in the US to apply</li>
    </ul>

    <button type="button" ${ATTR}-element="next">Next</button>
  </div>

  <!-- CARD 2: Contact Details Form -->
  <div ${ATTR}-element="card" ${ATTR}-cardtitle="Contact Details">
    <!-- Set 1: Contact Details -->
    <fieldset ${ATTR}-element="set">
      <legend>Contact Details</legend>

      <!-- Field 1: Full Name -->
      <div ${ATTR}-element="field">
        <label for="fullName">What is your full name?</label>
        <input
          type="text"
          id="fullName"
          name="fullName"
          required
          placeholder="Type your answer here"
        />
        <div ${ATTR}-element="error" data-error-for="fullName"></div>
      </div>

      <!-- Field 2: Date of Birth -->
      <div ${ATTR}-element="field">
        <label for="dob">What is your date of birth?</label>
        <input type="date" id="dob" name="dob" required placeholder="MM/DD/YYYY" />
        <div ${ATTR}-element="error" data-error-for="dob"></div>
      </div>

      <!-- Field 3: Email -->
      <div ${ATTR}-element="field">
        <label for="email">What is your email?</label>
        <input type="email" id="email" name="email" required placeholder="name@email.com" />
        <div ${ATTR}-element="error" data-error-for="email"></div>
      </div>

      <!-- Field 4: Phone -->
      <div ${ATTR}-element="field">
        <label for="phone">What is your phone number?</label>
        <input type="tel" id="phone" name="phone" required placeholder="(123) 456-7890" />
        <div ${ATTR}-element="error" data-error-for="phone"></div>
      </div>

      <!-- Field 5: Address -->
      <div ${ATTR}-element="field">
        <label for="address">What is your address?</label>
        <textarea
          id="address"
          name="address"
          required
          placeholder="Type your address here..."
        ></textarea>
        <div ${ATTR}-element="error" data-error-for="address"></div>
      </div>
    </fieldset>
  </div>

  <!-- CARD 3: Medical Information Form -->
  <div ${ATTR}-element="card" ${ATTR}-cardtitle="Medical Information">
    <!-- Set 2: Medical Information -->
    <fieldset ${ATTR}-element="set">
      <legend>Medical Information</legend>

      <!-- Field 6: MDD Diagnosis -->
      <div ${ATTR}-element="field">
        <label>Have you been diagnosed with Major Depressive Disorder?</label>
        <div class="button-group">
          <input type="radio" id="mdd-yes" name="mdd" value="yes" required />
          <label for="mdd-yes">Yes</label>

          <input type="radio" id="mdd-no" name="mdd" value="no" required />
          <label for="mdd-no">No</label>
        </div>
        <div ${ATTR}-element="error" data-error-for="mdd"></div>
      </div>

      <!-- Field 7: When diagnosed (conditional) -->
      <div ${ATTR}-element="field" ${ATTR}-showif="{mdd} = yes">
        <label for="mddWhen">When</label>
        <input type="text" id="mddWhen" name="mddWhen" placeholder="e.g. May 2024" />
      </div>

      <!-- Field 8: Duration of MDD (conditional) -->
      <div ${ATTR}-element="field" ${ATTR}-showif="{mdd} = yes">
        <label for="mddDuration">How long have you had MDD?</label>
        <input
          type="text"
          id="mddDuration"
          name="mddDuration"
          placeholder="Type your answer here..."
        />
      </div>

      <!-- Field 9: Antidepressant Treatment -->
      <div ${ATTR}-element="field">
        <label
          >Have you tried two or more antidepressant medications without sustained
          improvement?</label
        >
        <div class="button-group">
          <input type="radio" id="treatment-yes" name="treatment" value="yes" required />
          <label for="treatment-yes">Yes</label>

          <input type="radio" id="treatment-no" name="treatment" value="no" required />
          <label for="treatment-no">No</label>
        </div>
        <div ${ATTR}-element="error" data-error-for="treatment"></div>
      </div>

      <!-- Field 10: Medicines tried (conditional) -->
      <div ${ATTR}-element="field" ${ATTR}-showif="{treatment} = yes">
        <label for="medicinesTried">Which medicines have you tried?</label>
        <input type="text" id="medicinesTried" name="medicinesTried" placeholder="e.g. May 2024" />
      </div>

      <!-- Field 11: Other Psychiatric Conditions -->
      <div ${ATTR}-element="field">
        <label
          >Have you been diagnosed with a psychiatric condition other than MDD (e.g., generalized
          anxiety disorder, PTSD, etc.)?</label
        >
        <div class="button-group">
          <input type="radio" id="other-yes" name="otherConditions" value="yes" required />
          <label for="other-yes">Yes</label>

          <input type="radio" id="other-no" name="otherConditions" value="no" required />
          <label for="other-no">No</label>
        </div>
        <div ${ATTR}-element="error" data-error-for="otherConditions"></div>
      </div>
    </fieldset>
  </div>

  <!-- Progress Indicators (visible on all cards except intro) -->
  <div class="progress-wrapper" ${ATTR}-hideif="{current-card-index} = 1">
    <!-- Progress bar -->
    <div class="progress-bar-container">
      <div class="progress-bar-fill" ${ATTR}-stylewidth="{set-progress}"></div>
    </div>

    <!-- Set counter -->
    <div class="step-counter">
      <span
        ${ATTR}-textcontent="Step: {current-set-index} of {total-sets}: {current-set-title}"
      ></span>
    </div>
  </div>

  <!-- Navigation buttons (visible on form cards only) -->
  <div class="nav-buttons" ${ATTR}-showif="{current-card-index} > 1">
    <button type="button" ${ATTR}-element="prev">Back</button>
    <button type="button" ${ATTR}-element="next">Next</button>
  </div>
</form>
```

**Key Features Demonstrated:**

- **Full hierarchy**: Form → Card → Set → Field
- **Semantic HTML**: Using `<fieldset>` and `<legend>` for sets
- **Conditional visibility**: Fields shown/hidden based on form data
- **Progress indicators**: Using explicit variable names
- **Field-by-field progression**: `byField` behavior with fade transitions
- **HTML5 validation**: Required attributes on inputs

#### 3. Add Custom JavaScript (Optional - Future Feature)

Custom JavaScript API is planned for future versions:

```html
<!-- Add before </body> -->
<script>
  // Future API (not available in v1.0)
  window.Flowups ||= [];
  window.Flowups.push((Flowups) => {
    // Get reference to specific form by name
    const clinicalTrial = Flowups.Forms.get('clinical-trial');

    // Subscribe to form events
    clinicalTrial.on('set:changed', ({ setIndex, setTitle }) => {
      console.log(`Navigated to set ${setIndex}: ${setTitle}`);

      // Track analytics
      if (window.gtag) {
        window.gtag('event', 'form_set_completed', {
          set_number: to,
          set_name: setTitle,
        });
      }
    });

    onboardingForm.on('input:changed', ({ field, value }) => {
      console.log(`${field} changed to:`, value);

      // Custom logic based on field changes
      if (field === 'country') {
        console.log('Country selected:', value);
      }
    });

    onboardingForm.on('submit:started', ({ formData }) => {
      console.log('Submitting form data:', formData);
    });

    onboardingForm.on('submit:success', (response) => {
      // Redirect to thank you page
      window.location.href = '/thank-you';
    });

    onboardingForm.on('submit:error', ({ error }) => {
      console.error('Form submission failed:', error);
      alert('Something went wrong. Please try again.');
    });
  });
</script>
```

### API Reference

#### How the Flowups API Works

The Flowups API uses a queue-based initialization pattern to ensure your code runs after the library has fully loaded, similar to how Google Analytics and other third-party libraries work.

**The Pattern:**

```javascript
// 1. Initialize the queue (before library loads)
window.Flowups ||= [];

// 2. Queue callbacks (these will execute after library loads)
window.Flowups.push((Flowups) => {
  // Your code here has access to the Flowups API
  const form = Flowups.Forms.get('onboarding');
});
```

**How It Works:**

1. **Before library loads**: `window.Flowups ||= []` creates an empty array if it doesn't exist
2. **Queue callbacks**: `window.Flowups.push(callback)` adds your callback to the queue
3. **Library loads**: The Flowups library script loads asynchronously
4. **Auto-initialization**: Library finds all forms with `${ATTR}-element="form"` and initializes them (unless `${ATTR}-autoinit="false"`)
5. **Process queue**: Library replaces the array with the API object and executes all queued callbacks
6. **Future calls**: Any subsequent `push()` calls execute immediately

**Benefits:**

- ✅ No race conditions - callbacks always execute after initialization
- ✅ Works with async script loading (`<script defer>` or `<script async>`)
- ✅ Multiple scripts can queue callbacks independently
- ✅ Simple, predictable API

**Preventing Auto-Initialization:**

To prevent a form from initializing automatically (useful for forms in modals or conditional UI):

```html
<form ${ATTR}-element="form" name="modal-form" ${ATTR}-autoinit="false">
  <!-- Form will not auto-initialize -->
</form>
```

Then manually initialize when needed:

```javascript
window.Flowups.push((Flowups) => {
  // Initialize form manually when modal opens
  const form = Flowups.Forms.initialize('modal-form');
});
```

#### Accessing Forms

Access initialized forms via the namespaced API:

```javascript
window.Flowups ||= [];
window.Flowups.push((Flowups) => {
  // Get form by name
  const form = Flowups.Forms.get('onboarding');

  // Get form by element
  const formElement = document.querySelector('form[name="onboarding"]');
  const form2 = Flowups.Forms.getByElement(formElement);

  // Get all initialized forms
  const allForms = Flowups.Forms.getAll();
});
```

#### Accessing Form Data & Metadata

Forms expose two read-only properties for accessing state:

```javascript
window.Flowups.push((Flowups) => {
  const form = Flowups.Forms.get('onboarding');

  // form.data - Field values only
  form.data.email; // 'user@example.com'
  form.data.firstName; // 'John'
  form.data.country; // 'US'

  // form.meta - Form state and metadata
  form.meta.totalSets; // 5
  form.meta.currentSet; // 2 (1-based, for display)
  form.meta.setIndex; // 1 (0-based, for code)
  form.meta.setTitle; // "Personal Information"
  form.meta.setId; // "personal-information"
  form.meta.setsCompleted; // 1
  form.meta.progress; // 40 (0-100)
  form.meta.isValid; // true
  form.meta.isDirty; // false
  form.meta.isSubmitting; // false
});
```

**Note:** `form.data` and `form.meta` are read-only. Use methods like `setFieldValue()` to modify data.

#### Event Subscription

```javascript
// Subscribe to event
const unsubscribe = form.on('set:changed', (data) => {
  console.log(data);
});

// One-time subscription
form.once('submit:success', (data) => {
  console.log('Form submitted once');
});

// Unsubscribe
unsubscribe();
// or
form.off('set:changed', handler);
```

#### Programmatic Control

```javascript
window.Flowups.push((Flowups) => {
  const form = Flowups.Forms.get('onboarding');

  // Navigate to specific set
  form.goToSet(2); // Go to set index 2 (3rd set)

  // Navigate by set ID
  form.goToSetById('preferences');

  // Navigate forward/backward
  form.nextSet();
  form.prevSet();

  // Access form data (field values only)
  console.log('Email:', form.data.email);
  console.log('All form data:', form.data);

  // Access form metadata
  console.log('Current set:', form.meta.currentSet);
  console.log('Total sets:', form.meta.totalSets);
  console.log('Progress:', form.meta.progress);
  console.log('Is valid:', form.meta.isValid);

  // Set field value programmatically
  form.setFieldValue('email', 'user@example.com');

  // Get field value
  const email = form.getFieldValue('email');

  // Get current set info
  const currentSet = form.getCurrentSet();
  console.log('Current set:', currentSet);

  // Validate current set
  const isValid = await form.validateCurrentSet();

  // Reset form
  form.reset();

  // Destroy form (cleanup)
  form.destroy();
});
```

### Custom Form Submission

You can override the default form submission behavior to integrate with your own API:

```html
<script>
  window.Flowups ||= [];
  window.Flowups.push((Flowups) => {
    const form = Flowups.Forms.get('onboarding');

    // Intercept submit event and handle manually
    form.on('submit:started', async ({ formData }) => {
      try {
        // Custom API call
        const response = await fetch('/api/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });

        if (!response.ok) {
          throw new Error('Submission failed');
        }

        const result = await response.json();

        // Success! Form will emit 'submit:success' automatically
        console.log('Submission successful:', result);
      } catch (error) {
        // Error! Form will emit 'submit:error' automatically
        console.error('Submission failed:', error);
      }
    });
  });
</script>
```

## Implementation Roadmap

### Current Client Project (v1.0)

**Goal:** Build a production-ready multi-step form for current client needs with the full product vision as context.

**Requirements:**

- Full hierarchy: Form → Card → Set → Group → Field
- Field-by-field navigation (`byField` behavior only)
- Conditional visibility (show-if/hide-if)
- Progress indicators (bar width + text/counters with explicit variable names)
- HTML5 validation with browser errors
- Default validation timing (blur/change based on input type)
- Fade and slide transitions
- Focus management (first tabbable element + focusable input control)
- Performance optimization (lazy event binding)
- No state persistence
- No public API (internal only)

#### Phase 1: Foundation & Hierarchy Discovery

**Goal:** Build the core structure with full hierarchy support and basic field-by-field navigation

- [x] Project setup and TypeScript types
  - [x] FormState interface (with card/set/group/field state) - `/src/form/types/state/form-state.ts`
  - [x] Manager interfaces - `/src/form/types/managers.ts`
  - [x] Event type definitions - `/src/form/types/events.ts`
  - [x] Configuration types - `/src/form/types/config/`
  - [x] Element hierarchy types - `/src/form/types/elements.ts`
- [x] MultiStepForm component (extends StatefulComponent) - **Partially Complete**
  - [x] Attribute parsing utilities (support combined syntax: `element:id`)
    - `/src/form/utils/parsing/parse-element-attribute.ts` - Parse `${ATTR}-element`
    - `/src/form/utils/parsing/get-form-attributes.ts` - Extract all ${ATTR}-\* attributes
    - `/src/form/utils/parsing/parse-boolean-attribute.ts` - Parse boolean values
    - `/src/form/utils/parsing/parse-number-attribute.ts` - Parse number values
    - `/src/form/utils/parsing/extract-title.ts` - Extract titles with priority
    - `/src/form/utils/parsing/generate-id-from-title.ts` - Generate IDs from titles
    - `/src/form/utils/element/get-input-in-field.ts` - Find inputs in field wrappers
    - `/src/form/utils/element/is-element-hidden.ts` - Check element visibility
    - `/src/form/utils/validation/element-type-validator.ts` - Validate FormElementType
    - `/src/form/constants/valid-element-types.ts` - Type constants
    - `/src/form/constants/valid-config-keys.ts` - Config key constants
  - [x] Form initialization and lifecycle - `/src/form/multi-step-form.ts`
  - [x] State management setup (hierarchical state) - All 30+ state keys configured
  - [x] Behavior configuration (`byField` only for v1)
- [x] CardManager
  - [x] Discover cards via `[${ATTR}-element="card"]`
  - [x] Parse card IDs and titles
  - [x] Track card order and relationships
- [x] SetManager
  - [x] Discover sets via `[${ATTR}-element="set"]`
  - [x] Extract titles from `<legend>` or attributes
  - [x] Parse set IDs (explicit, from legend, or auto-generate)
  - [x] Associate sets with parent cards
- [x] GroupManager (optional elements)
  - [x] Discover groups via `[${ATTR}-element="group"]`
  - [x] Extract titles from `<legend>` or attributes
  - [x] Parse group IDs
  - [x] Associate groups with parent sets
- [ ] FieldManager
  - [ ] Discover fields via `[${ATTR}-element="field"]`
  - [ ] Find input within field wrapper
  - [ ] Associate fields with parent groups/sets
  - [ ] Build field navigation order
  - [ ] Implement `byField` navigation (show one field at a time)
  - [ ] Track input values in formData state
  - [ ] Track current/visited/completed fields
  - [ ] Lazy event binding (only current field's input)
  - [ ] Smart event binding by input type (text=blur, select=change, etc.)
  - [ ] Unbind events when leaving field
- [ ] NavigationManager
  - [ ] Discover prev/next buttons
  - [ ] Handle button clicks
  - [ ] Coordinate with FieldManager for navigation
  - [ ] Update button states (disabled on first/last field)
  - [ ] No animations yet (instant switching)

**Deliverable:** Working field-by-field form with full hierarchy, no validation or animations yet

**Current Status:** Foundation complete (types, parsing utilities, component scaffold). Manager implementation in progress.

#### Phase 2: Progress & Dynamic Rendering

**Goal:** Add progress indicators and dynamic text/style updates

- [ ] RenderManager
  - [ ] Discover `[${ATTR}-textcontent]` elements
  - [ ] Discover `[${ATTR}-stylewidth]` elements
  - [ ] Variable parsing and context building
  - [ ] Expression evaluation (simple and math)
  - [ ] Update on state changes
  - [ ] Batch DOM updates with RAF
- [ ] Progress state calculation
  - [ ] Calculate form-progress (0-100)
  - [ ] Calculate sets-d count
  - [ ] Update on set changes

**Variables Available:**

- **Index**: `{current-card-index}`, `{current-set-index}`, `{current-group-index}`, `{current-field-index}`
- **Totals**: `{total-cards}`, `{total-sets}`, `{total-groups}`, `{total-fields}`
- **Titles**: `{current-card-title}`, `{current-set-title}`, `{current-group-title}`
- **IDs**: `{current-card-id}`, `{current-set-id}`, `{current-group-id}`
- **Progress**: `{form-progress}`, `{card-progress}`, `{set-progress}`
- **Completion**: `{cards-completed}`, `{sets-completed}`, `{groups-completed}`, `{fields-completed}`
- **Form data**: `{fieldName}` for any form field value

**Deliverable:** Progress bars and dynamic counters update on every field/set/card transition

#### Phase 3: Validation & Error Handling

**Goal:** Add HTML5 validation with browser error messages

- [ ] ValidationManager
  - [ ] Auto-detect HTML5 validation (required, type, pattern, min, max)
  - [ ] Validate on blur/change based on input type
  - [ ] Validate current field before advancing
  - [ ] Validate set before completing
  - [ ] Return validation results
- [ ] ErrorManager
  - [ ] Display browser native errors (setCustomValidity + reportValidity)
  - [ ] Clear errors when field becomes valid
  - [ ] Handle error announcements for accessibility
- [ ] Navigation guards
  - [ ] Prevent advancing if current field invalid
  - [ ] Allow backward navigation always
  - [ ] Coordinate with NavigationManager and FieldManager

**Deliverable:** Form validates fields and prevents invalid progression

#### Phase 4: Conditional Visibility

**Goal:** Show/hide fields and sections based on form data

- [ ] ConditionManager
  - [ ] Discover `[${ATTR}-showif]` and `[${ATTR}-hideif]` elements
  - [ ] Parse condition expressions (operators, &&, ||)
  - [ ] Build dependency graph (field → affected elements)
  - [ ] Evaluate conditions on init
  - [ ] Re-evaluate on field changes (only affected elements)
  - [ ] Cache evaluation results
  - [ ] Apply show/hide with smooth transitions
  - [ ] Handle form state conditions (using index/count variables)
  - [ ] Handle field visibility in navigation order (skip hidden fields)

**Operators:**

- `=`, `!=`, `>`, `<`, `>=`, `<=`
- `*=` (contains), `^=` (starts with), `$=` (ends with)
- `&&`, `||` for compound conditions

**Deliverable:** Fields/sets show/hide based on user input with performance optimization

#### Phase 5: Animations & Transitions

**Goal:** Add fade and slide transitions between fields

- [ ] AnimationManager
  - [ ] Fade transition (CSS-based, opacity)
  - [ ] Slide transition (horizontal with direction detection: forward/backward)
  - [ ] Configurable duration via `${ATTR}-transitionduration`
  - [ ] Wait for transitions before cleanup
  - [ ] CSS class-based approach (add/remove classes, CSS handles animation)
  - [ ] Support transitions between fields, sets, and cards
- [ ] Integrate with FieldManager
  - [ ] Call AnimationManager during field changes
  - [ ] Disable navigation during transitions
  - [ ] Handle edge cases (first field, last field)

**Deliverable:** Smooth field transitions with fade and slide options

#### Phase 6: Focus Management & Accessibility

**Goal:** Ensure keyboard users and screen readers can use the form

- [ ] AccessibilityManager
  - [ ] Add ARIA attributes to fields (role="group", aria-hidden for hidden fields)
  - [ ] Add ARIA attributes to sets and cards
  - [ ] Add ARIA live region for announcements
  - [ ] Announce field changes to screen readers (field question + progress)
  - [ ] Focus first tabbable element on field change
  - [ ] Ensure only visible field inputs are focusable (tabindex management)
  - [ ] Handle conditional fields (remove from tab order when hidden)
  - [ ] Add ARIA attributes to progress indicators
  - [ ] Handle error announcements with proper roles

**Deliverable:** Fully accessible field-by-field form with focus management

#### Phase 7: Testing & Polish

**Goal:** Ensure production-ready quality

- [ ] Manual testing with real form data
- [ ] Test all validation scenarios
- [ ] Test all conditional visibility cases
- [ ] Test focus management with keyboard only
- [ ] Test with screen reader (VoiceOver/NVDA)
- [ ] Performance testing (large forms)
- [ ] Cross-browser testing
- [ ] Fix any bugs discovered

**Deliverable:** Production-ready v1.0 for client project

---

### Future Product Features (Post-v1.0)

These features are documented for the full product vision but not required for the current client project:

#### Future Phase: Multiple Behavior Modes

**Goal:** Support `byCard`, `bySet`, and `byGroup` navigation modes with behavior inheritance/overrides

- [ ] Extend existing managers to support multiple behaviors
- [ ] Implement `byCard` behavior (navigate between cards)
- [ ] Implement `bySet` behavior (navigate between sets within a card)
- [ ] Implement `byGroup` behavior (navigate between groups within a set)
- [ ] Behavior inheritance system (form → card → set → group → field)
- [ ] Behavior override support at each level
- [ ] Update NavigationManager to handle different progression modes
- [ ] Update AnimationManager to handle different transition contexts
- [ ] Update AccessibilityManager for different navigation granularities

**Examples:**

```html
<!-- Classic multi-step: navigate between sets -->
<form ${ATTR}-behavior="bySet">...</form>

<!-- Typeform-style: navigate one field at a time -->
<form ${ATTR}-behavior="byField">...</form>

<!-- Wizard: navigate between major sections -->
<form ${ATTR}-behavior="byCard">...</form>

<!-- Mixed: cards with set navigation inside -->
<form ${ATTR}-behavior="byCard">
  <div ${ATTR}-element="card" ${ATTR}-behavior="bySet">
    <!-- This card uses set navigation -->
  </div>
</form>
```

#### Future Phase: Custom Validation & Inline Errors

- [ ] ValidationManager - custom validation rules
- [ ] ValidationManager - configurable validation timing overrides
- [ ] ErrorManager - inline error containers
- [ ] ErrorManager - error class application to custom targets
- [ ] ErrorManager - custom error messages
- [ ] Format validation patterns
- [ ] Email blocklist validation

#### Future Phase: State Persistence

- [ ] Integration with StorageManager
- [ ] Persist form data (localStorage/sessionStorage/cookies)
- [ ] Persist form progress (current set, completed sets)
- [ ] Restore state on init
- [ ] Version management for data migrations
- [ ] Clear storage on submit

#### Future Phase: Public API & Events

- [ ] Window API setup (`window.Flowups.push()`)
- [ ] Event subscription interface (`form.on()`, `form.once()`, `form.off()`)
- [ ] Public events (set:changed, input:changed, etc.)
- [ ] Programmatic control (goToSet, setFieldValue, etc.)
- [ ] Form instance management (get, getAll, getByElement)
- [ ] Auto-initialization with opt-out

#### Future Phase: CalculationManager

See detailed specification in "Future Features" section below for:

- Dynamic computed values
- Dependency detection and circular dependency prevention
- Topological sorting for execution order
- Token namespacing (meta/data/calc)
- Dev mode testing helpers

#### Future Phase: Advanced Features

- [ ] Toast notification error display
- [ ] Keyboard navigation (Enter to advance, Escape to cancel)
- [ ] Multi-page forms (actual page navigation)
- [ ] Form branching (skip sets conditionally)
- [ ] File upload support
- [ ] Auto-save drafts (periodic)
- [ ] Form analytics integration
- [ ] A/B testing support
- [ ] Custom transition types (typeform-style)
- [ ] Custom expression functions
- [ ] Conditional validation rules
- [ ] Set-level callbacks via attributes

#### Future Phase: Testing & Documentation

- [ ] Unit tests for each manager
- [ ] Integration tests with Playwright
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Documentation with examples
- [ ] Webflow cloneable demo
- [ ] Interactive documentation site

## Performance Considerations

### Lazy Event Binding

Only bind input listeners for the current set:

```typescript
class SetManager {
  async goToSet(index: number): Promise<void> {
    const currentSet = this.sets[this.currentIndex];
    const nextSet = this.sets[index];

    // Unbind events from current set
    this.FieldManager.unbindSetInputs(currentSet);

    // Transition
    await this.animationManager.transitionSet(currentSet, nextSet);

    // Bind events to new set
    this.FieldManager.bindSetInputs(nextSet);

    this.currentIndex = index;
  }
}
```

### Condition Evaluation Optimization

Only re-evaluate conditions for affected elements:

```typescript
class ConditionManager {
  private affectedFields: Map<string, Set<HTMLElement>> = new Map();

  // Build dependency graph on init
  init(): void {
    const conditionalElements = this.queryAll('[${ATTR}-showif], [${ATTR}-hideif]');

    conditionalElements.forEach((element) => {
      const condition =
        element.getAttribute('${ATTR}-showif') || element.getAttribute('${ATTR}-hideif');

      // Parse condition to find field dependencies
      const fields = this.extractFieldNames(condition);

      fields.forEach((field) => {
        if (!this.affectedFields.has(field)) {
          this.affectedFields.set(field, new Set());
        }
        this.affectedFields.get(field)!.add(element);
      });
    });
  }

  // Only evaluate affected elements on field change
  onFieldChange(field: string): void {
    const elements = this.affectedFields.get(field);
    if (!elements) return;

    elements.forEach((element) => this.evaluateCondition(element));
  }
}
```

### Render Updates Batching

Batch multiple render updates into single DOM write:

```typescript
class RenderManager {
  private pendingUpdates: Map<HTMLElement, string> = new Map();
  private rafId: number | null = null;

  scheduleUpdate(element: HTMLElement, value: string): void {
    this.pendingUpdates.set(element, value);

    if (this.rafId === null) {
      this.rafId = requestAnimationFrame(() => this.flushUpdates());
    }
  }

  private flushUpdates(): void {
    this.pendingUpdates.forEach((value, element) => {
      element.textContent = value;
    });
    this.pendingUpdates.clear();
    this.rafId = null;
  }
}
```

## Future Features

### Phase 2: CalculationManager

**Goal:** Enable dynamic computed values that can be displayed and optionally submitted with form data.

#### Use Cases

- Calculate totals, subtotals, taxes, discounts
- Display derived values (e.g., monthly payment from total)
- Submit calculated values to backend
- Real-time price calculations in checkout flows

#### Token Namespacing

All tokens will be namespaced to clarify their source and prevent naming collisions:

```html
<!-- Form metadata (library-managed, read-only) -->
<div ${ATTR}-textcontent="{meta.totalSets}"></div>
<div ${ATTR}-textcontent="{meta.currentSet}"></div>
<div ${ATTR}-textcontent="{meta.progress}%"></div>

<!-- Form field data (user input values) -->
<div ${ATTR}-textcontent="{data.email}"></div>
<div ${ATTR}-textcontent="{data.firstName}"></div>

<!-- Calculated values (user-defined computed values) -->
<div ${ATTR}-textcontent="{calc.subtotal}"></div>
<div ${ATTR}-textcontent="{calc.tax}"></div>
<div ${ATTR}-textcontent="{calc.total}"></div>
```

**Token Replacement Rules:**

1. **Single token** `{data.field}` → Replace with value (`2`)
2. **Multiple tokens** `{data.quantity} × {data.cost}` → Replace each token (`2 × 100`)
3. **Expression** `{data.quantity * data.cost}` → Evaluate and render result (`200`)
4. **Inline expressions are display-only** (not submitted)

#### API Design

**Defining Calculations:**

```javascript
window.Flowups.push((Flowups) => {
  const form = Flowups.Forms.get('checkout');

  // Simple calculation
  form.calculations.define('subtotal', {
    // Compute function receives { data, meta, calc }
    compute: ({ data }) => {
      const quantity = parseFloat(data.quantity) || 0;
      const price = parseFloat(data.price) || 0;
      return quantity * price;
    },

    // Format for display (affects UI and submit if submit: 'formatted')
    format: (value) => value.toFixed(2),

    // Submit options: false | 'raw' | 'formatted' | custom function
    submit: 'formatted', // Submit "150.00" as string

    // Optional: debounce recalculation (ms)
    debounce: 300,
  });

  // Calculation with custom submit format
  form.calculations.define('total', {
    compute: ({ data, calc }) => {
      const subtotal = parseFloat(calc.subtotal?.raw) || 0;
      const taxRate = parseFloat(data.taxRate) || 0;
      const shipping = parseFloat(data.shipping) || 0;
      return subtotal + subtotal * taxRate + shipping;
    },

    // Display format (UI only)
    format: (value) => `$${value.toFixed(2)}`, // "$165.00"

    // Custom submit format (different from display)
    submit: (value) => Math.round(value * 100), // Convert to cents: 16500
  });

  // Display-only calculation (not submitted)
  form.calculations.define('savingsPercent', {
    compute: ({ data }) => {
      const original = parseFloat(data.originalPrice) || 0;
      const current = parseFloat(data.currentPrice) || 0;
      if (original === 0) return 0;
      return ((original - current) / original) * 100;
    },

    format: (value) => `${Math.round(value)}% OFF`,
    submit: false, // Not included in form submission
  });
});
```

**Configuration Options:**

```typescript
interface CalculationContext {
  data: Record<string, any>; // Form field values
  meta: FormMeta; // Form metadata (totalSets, currentSet, etc.)
  calc: Record<string, CalculationResult>; // Other calculation results
}

interface CalculationConfig {
  compute: (context: CalculationContext) => any;
  submit?: false | 'raw' | 'formatted' | ((value: any) => any);
  format?: (value: any) => string;
  dependencies?: string[] | false; // Auto-detect if undefined, false for manual only
  debounce?: number; // Debounce recalculation (ms)
  validate?: (value: any) => boolean;
}

interface CalculationResult {
  raw: any; // Unformatted computed value
  formatted: string; // Formatted value (if format function provided)
  submit: any; // Value that will be submitted (based on submit option)
  isValid: boolean; // Result of validate function
}
```

**Accessing Calculated Values:**

```javascript
// In JavaScript
const subtotal = form.calc.subtotal.raw;        // 150
const subtotalFormatted = form.calc.subtotal.formatted;  // "150.00"
const subtotalSubmit = form.calc.subtotal.submit;        // "150.00"

// In HTML (automatically updates via RenderManager)
<div ${ATTR}-textcontent="{calc.subtotal}">150.00</div>
<div ${ATTR}-textcontent="{calc.subtotal.raw}">150</div>
<div ${ATTR}-textcontent="Total: {calc.total}">Total: $165.00</div>
```

**Form Submission Behavior:**

When a form is submitted, calculations with `submit` not set to `false` are included:

```javascript
form.on('submit:started', ({ formData }) => {
  console.log(formData);
  // {
  //   quantity: 10,
  //   price: 15,
  //   subtotal: "150.00",     // submit: 'formatted'
  //   total: 16500,           // submit: custom function (cents)
  //   // savingsPercent not included (submit: false)
  // }
});
```

#### Dependency Management

**Auto-Detection (Default):**

The library automatically detects dependencies by parsing the compute function:

```javascript
form.calculations.define('total', {
  compute: ({ data, calc }) => {
    return calc.subtotal.raw + data.shipping;
  },
  // Dependencies auto-detected: ['calc.subtotal', 'data.shipping']
});
```

**How Auto-Detection Works:**

```typescript
private detectDependencies(computeFn: Function): string[] {
  // 1. Convert function to string representation
  const fnString = computeFn.toString();

  const dependencies = new Set<string>();

  // 2. Define regex patterns for each namespace
  const patterns = [
    /\bdata\.(\w+)/g,      // Matches: data.quantity, data.price, data.email
    /\bcalc\.(\w+)/g,      // Matches: calc.subtotal, calc.tax, calc.total
    /\bmeta\.(\w+)/g,      // Matches: meta.currentSet, meta.totalSets
  ];

  // 3. Extract property accesses from function string
  patterns.forEach((pattern, index) => {
    const namespace = ['data', 'calc', 'meta'][index];
    let match;

    // Use regex.exec() in a loop to find all matches
    while ((match = pattern.exec(fnString)) !== null) {
      // match[0] = full match (e.g., "data.quantity")
      // match[1] = captured property name (e.g., "quantity")
      dependencies.add(`${namespace}.${match[1]}`);
    }
  });

  // 4. Return as array for consistency
  return Array.from(dependencies);
}

// Example usage:
const fn = ({ data, calc }) => calc.subtotal.raw + data.shipping + data.tax;
detectDependencies(fn);
// Returns: ['calc.subtotal', 'data.shipping', 'data.tax']
```

**Limitations of Auto-Detection:**

Auto-detection works well for direct property access but cannot detect:

1. **Dynamic property access:**

   ```javascript
   compute: ({ data }) => data[fieldName]; // Can't detect which field
   ```

2. **Computed property names:**

   ```javascript
   compute: ({ data }) => data['field' + index]; // Can't detect
   ```

3. **Properties accessed in nested functions:**
   ```javascript
   compute: ({ data }) => {
     const helper = () => data.quantity; // Might miss nested access
     return helper();
   };
   ```

For these cases, manually specify dependencies.

**Manual Override:**

```javascript
form.calculations.define('total', {
  compute: ({ data }) => {
    // Complex logic with dynamic property access
    const field = data.useAlternate ? 'altPrice' : 'price';
    return data[field];
  },
  // Manually specify dependencies (can't be auto-detected)
  dependencies: ['data.useAlternate', 'data.price', 'data.altPrice'],
});

// Or disable dependency tracking (manual recalculation only)
form.calculations.define('manual', {
  compute: ({ data }) => data.value * 2,
  dependencies: false, // Only recalculates when form.calculations.recalculate('manual') is called
});
```

**Circular Dependency Detection:**

The library automatically detects circular dependencies on initialization:

```javascript
// ❌ This will throw an error
form.calculations.define('a', {
  compute: ({ calc }) => calc.b.raw + 1,
});

form.calculations.define('b', {
  compute: ({ calc }) => calc.a.raw + 1,
});

// Console: ⚠️ Circular dependency detected: calc.a → calc.b → calc.a
// Throws: Error: Circular dependency detected in calculations involving: a
```

**How Circular Dependency Detection Works:**

Uses **Depth-First Search (DFS)** with a recursion stack to detect cycles in the dependency graph:

```typescript
private detectCircularDependencies(): void {
  // 1. Build dependency graph (only track calc dependencies, not data/meta)
  const graph = new Map<string, Set<string>>();

  this.calculations.forEach((config, name) => {
    const deps = this.detectDependencies(config.compute);

    // Filter to only calc dependencies (data/meta can't create cycles)
    const calcDeps = deps
      .filter(d => d.startsWith('calc.'))
      .map(d => d.replace('calc.', ''));  // Remove 'calc.' prefix

    graph.set(name, new Set(calcDeps));
  });

  // 2. Use DFS to detect cycles
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  const hasCycle = (node: string, path: string[] = []): boolean => {
    // Mark node as visited and add to recursion stack
    visited.add(node);
    recursionStack.add(node);
    path.push(node);

    // Check all neighbors (dependencies)
    const neighbors = graph.get(node) || new Set();
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        // Recurse on unvisited neighbors
        if (hasCycle(neighbor, [...path])) return true;
      } else if (recursionStack.has(neighbor)) {
        // Found a cycle! Neighbor is in current recursion path
        const cyclePath = [...path, neighbor].join(' → ');
        console.error(`⚠️ Circular dependency detected: calc.${cyclePath}`);
        return true;
      }
    }

    // Remove from recursion stack (backtrack)
    recursionStack.delete(node);
    return false;
  };

  // 3. Check all calculations (start DFS from each unvisited node)
  for (const name of this.calculations.keys()) {
    if (!visited.has(name)) {
      if (hasCycle(name)) {
        throw new Error(
          `Circular dependency detected in calculations involving: ${name}`
        );
      }
    }
  }
}

// Example cycle detection:
// calc.a depends on calc.b
// calc.b depends on calc.c
// calc.c depends on calc.a
//
// DFS path: a → b → c → a (found in recursion stack!)
// Error: Circular dependency detected: calc.a → calc.b → calc.c → calc.a
```

**Why Only Track `calc.*` Dependencies:**

- `data.*` and `meta.*` are external inputs (user fields and form state)
- They can't create circular dependencies since they don't depend on calculations
- Only `calc.*` dependencies can create cycles (calculations depending on other calculations)

**Graph Visualization Example:**

```javascript
// Given these calculations:
form.calculations.define('subtotal', {
  compute: ({ data }) => data.quantity * data.price, // No calc deps
});

form.calculations.define('tax', {
  compute: ({ calc }) => calc.subtotal.raw * 0.1, // Depends on: calc.subtotal
});

form.calculations.define('total', {
  compute: ({ calc }) => calc.subtotal.raw + calc.tax.raw, // Depends on: calc.subtotal, calc.tax
});

// Dependency graph (calc dependencies only):
// subtotal: []
// tax: [subtotal]
// total: [subtotal, tax]
//
// DFS traversal finds no cycles ✓
```

**Execution Order:**

Calculations are executed in topological order (dependencies first):

```javascript
// Defined in any order:
form.calculations.define('total', {
  /* depends on: calc.subtotal, calc.tax */
});
form.calculations.define('subtotal', {
  /* depends on: data.quantity, data.price */
});
form.calculations.define('tax', {
  /* depends on: calc.subtotal */
});

// Executed in correct order: subtotal → tax → total
```

**How Execution Order is Determined:**

Uses **Kahn's Algorithm** for topological sorting to determine the correct execution order:

```typescript
private getCalculationOrder(): string[] {
  // 1. Build graph and calculate in-degree (number of dependencies)
  const graph = new Map<string, Set<string>>();
  const inDegree = new Map<string, number>();

  // Build adjacency list and count calc dependencies for each node
  this.calculations.forEach((config, name) => {
    const deps = this.detectDependencies(config.compute);
    const calcDeps = deps
      .filter(d => d.startsWith('calc.'))
      .map(d => d.replace('calc.', ''));

    graph.set(name, new Set(calcDeps));
    inDegree.set(name, calcDeps.length);
  });

  // 2. Start with calculations that have no calc dependencies (in-degree = 0)
  const queue: string[] = [];
  const result: string[] = [];

  inDegree.forEach((degree, name) => {
    if (degree === 0) {
      queue.push(name);  // Can execute immediately (no dependencies)
    }
  });

  // 3. Process queue using BFS
  while (queue.length > 0) {
    const current = queue.shift()!;
    result.push(current);  // Add to execution order

    // 4. Reduce in-degree for all nodes that depend on current
    this.calculations.forEach((config, name) => {
      const dependencies = graph.get(name) || new Set();

      if (dependencies.has(current)) {
        // This calculation depends on current, so reduce its in-degree
        const newDegree = (inDegree.get(name) || 0) - 1;
        inDegree.set(name, newDegree);

        // If all dependencies satisfied, add to queue
        if (newDegree === 0) {
          queue.push(name);
        }
      }
    });
  }

  // 5. If result doesn't contain all calculations, there's a cycle
  // (This shouldn't happen if detectCircularDependencies() ran first)
  if (result.length !== this.calculations.size) {
    throw new Error('Unable to determine calculation order (possible circular dependency)');
  }

  return result;
}

// Example execution:
// Given: subtotal (no calc deps), tax (depends on subtotal), total (depends on subtotal + tax)
//
// Initial state:
//   inDegree = { subtotal: 0, tax: 1, total: 2 }
//   queue = [subtotal]
//
// Step 1: Process 'subtotal'
//   result = [subtotal]
//   Reduce in-degree for: tax (1→0), total (2→1)
//   queue = [tax]
//
// Step 2: Process 'tax'
//   result = [subtotal, tax]
//   Reduce in-degree for: total (1→0)
//   queue = [total]
//
// Step 3: Process 'total'
//   result = [subtotal, tax, total]
//   queue = []
//
// Final execution order: subtotal → tax → total ✓
```

**When Calculations Are Recalculated:**

1. **On dependency change**: When `data.*` or `meta.*` changes, recalculate dependent calculations in topological order
2. **On calc dependency change**: When a calculation updates, recalculate calculations that depend on it
3. **On manual trigger**: `form.calculations.recalculate('name')` or `form.calculations.recalculate()` (all)

**Optimization - Only Recalculate Affected Calculations:**

```typescript
private recalculateDependents(changedKey: string): void {
  const order = this.getCalculationOrder();

  // Only recalculate calculations that depend on changedKey
  order.forEach(name => {
    const config = this.calculations.get(name)!;
    const deps = this.detectDependencies(config.compute);

    if (deps.includes(changedKey)) {
      this.recalculate(name);
    }
  });
}

// Example: If data.quantity changes
// - Recalculate: subtotal (depends on data.quantity)
// - Recalculate: tax (depends on calc.subtotal, which just changed)
// - Recalculate: total (depends on calc.subtotal and calc.tax, which just changed)
// - Skip: savingsPercent (doesn't depend on data.quantity)
```

#### Dev Mode Testing

Enable dev mode by adding `?flowups-forms=dev` to the URL.

**Features:**

- Detailed console logging for all calculations
- Test helpers for validating calculation logic
- Dependency visualization
- Performance metrics
- Error details

**Testing Individual Calculations:**

```javascript
window.Flowups.push((Flowups) => {
  const form = Flowups.Forms.get('checkout');

  form.calculations.define('total', {
    compute: ({ data, calc }) => {
      const subtotal = parseFloat(calc.subtotal?.raw) || 0;
      const tax = parseFloat(data.tax) || 0;
      return subtotal + tax;
    },
    format: (value) => `$${value.toFixed(2)}`,
    submit: (value) => Math.round(value * 100),
  });

  // Test with mock data (only runs with ?flowups-forms=dev)
  form.calculations.test('total', {
    data: { tax: 10 },
    calc: { subtotal: { raw: 100, formatted: '$100.00' } },
  });
});
```

**Console Output:**

```
✓ Calculation: total
  Raw: 110
  Formatted: "$110.00"
  Submit: 11000
  Dependencies (auto-detected): data.tax, calc.subtotal
  Valid: true
```

**Testing All Calculations:**

```javascript
form.calculations.testAll({
  data: { quantity: 10, price: 15, tax: 15 },
  calc: {},
});
```

**Console Output:**

```
🧪 Testing All Calculations
  Execution Order: subtotal → tax → total
  ---
  ✓ Calculation: subtotal
    Raw: 150
    Formatted: "150.00"
    Submit: "150.00"
    Dependencies: data.quantity, data.price
    Debounce: 300ms
  ✓ Calculation: tax
    Raw: 15
    Formatted: "15.00"
    Submit: "15.00"
    Dependencies: calc.subtotal
  ✓ Calculation: total
    Raw: 165
    Formatted: "$165.00"
    Submit: 16500
    Dependencies: calc.subtotal, data.tax
    Valid: true
```

**Auto-Logging in Dev Mode:**

When `?flowups-forms=dev` is present, the library logs:

```
📋 Form Initialized: checkout
  Form ID: checkout
  Total Sets: 3
  Calculations: subtotal, tax, total
  Auto-init: true

🔄 Recalculated: total → $165.00 (took 2ms)

📊 data.quantity changed: 5 → 10
  ↳ Triggering: calc.subtotal, calc.total

⚠️ Circular dependency detected: calc.a → calc.b → calc.a

⚡ Calculation "total" took 150ms (threshold: 100ms)
```

**Query Param Variants:**

- `?flowups-forms=dev` - Enable all dev features
- `?flowups-forms=debug` - Same as dev
- `?flowups-forms=test` - Enable test helpers only
- `?flowups-forms=performance` - Enable performance metrics only

#### Implementation Architecture

**CalculationManager Class:**

```typescript
class CalculationManager {
  private calculations: Map<string, CalculationConfig>;
  private cache: Map<string, CalculationResult>;
  private debounceTimers: Map<string, NodeJS.Timeout>;

  // Public API
  define(name: string, config: CalculationConfig): void;
  get(name: string): CalculationResult | undefined;
  recalculate(name?: string): void;
  remove(name: string): void;
  getSubmittableValues(): Record<string, any>;

  // Dev mode helpers
  test(name: string, mockContext: Partial<CalculationContext>): void;
  testAll(mockContext: Partial<CalculationContext>): void;

  // Internal methods
  private detectDependencies(computeFn: Function): string[];
  private detectCircularDependencies(): void;
  private getCalculationOrder(): string[];
  private buildContext(form: FormInstance): CalculationContext;
  private getSubmitValue(raw: any, formatted: string, submit: any): any;
  private isDevMode(): boolean;
}
```

**Integration with RenderManager:**

The RenderManager will handle token replacement for `{calc.*}` tokens and automatically update the UI when calculations change.

**Integration with Form Submission:**

When a form is submitted, the library includes all calculation values where `submit` is not `false`:

```typescript
class FormInstance {
  async submit(): Promise<void> {
    const formData = {
      ...this.data, // Field values
      ...this.calculations.getSubmittableValues(), // Calculated values
    };

    this.emit('submit:started', { formData });
    // ... submission logic
  }
}
```

#### Checklist

- [ ] Implement CalculationManager core class
- [ ] Auto-detect dependencies from compute functions
- [ ] Detect circular dependencies on init
- [ ] Topological sort for execution order
- [ ] Debounce support for recalculation
- [ ] Integrate with RenderManager for token updates
- [ ] Add `form.calc.*` API for accessing results
- [ ] Include calculated values in form submission
- [ ] Dev mode testing helpers
- [ ] Dev mode auto-logging
- [ ] Documentation and examples
- [ ] TypeScript type definitions

### Phase 3+

- [ ] Custom validation rules via window API
- [ ] Toast notification error display
- [ ] Email blocklist validation
- [ ] Keyboard navigation (Enter to advance, Escape to cancel)
- [ ] Multi-page forms (actual page navigation)
- [ ] Form branching (skip sets based on answers)
- [ ] File upload support
- [ ] Auto-save drafts (periodic)
- [ ] Form analytics integration
- [ ] A/B testing support
- [ ] Custom transition types (typeform, multi-step styles)
- [ ] Custom expression functions (e.g., `{format(phone, "xxx-xxx-xxxx")}`)
- [ ] Conditional validation rules
- [ ] Set-level callbacks via attributes

## Design Decisions Summary

### Validation Timing

- **Default:** Blur for text inputs, change for select/radio/checkbox
- **On Next:** Always validate before advancing
- **On Submit:** Always validate before submission
- **Configurable:** Per form, card, step, group, or field

### State Persistence

- **Default:** Disabled
- **When Enabled:** Stores both progress and data to configured storage
- **Storage Types:** localStorage, sessionStorage, cookies

### Navigation Freedom

- **Default:** Sequential with validation guards
- **Backward:** Always allowed without validation
- **Forward:** Requires validation unless `${ATTR}-allowinvalid="true"`

### Animation Handling

- **Built-in:** Fade transition (CSS-based)
- **Extensible:** AnimationManager for future transition types
- **CSS-First:** JavaScript triggers classes, CSS handles animation

### Error Display

- **Default:** Native browser validation
- **Inline:** Custom error containers when configured
- **Class Application:** Configurable target (parent/self/selector)

### Accessibility

- **Auto-managed:** ARIA attributes for sets, progress, errors
- **Announcements:** Screen reader announcements for set changes
- **Focus:** Auto-focus first input on set change
- **Keyboard:** Future support for Enter/Escape navigation

### Variable Syntax

- **Consistency:** Always wrap variables in `{}`
- **Readability:** Spaces around operators
- **Namespace:** `form.*` for form state to avoid field name clashes
