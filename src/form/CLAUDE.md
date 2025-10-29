# Multi-Step Form System

## Overview

A flexible, attribute-driven multi-step form system for Webflow built on the Motif component toolkit. Forms are configured entirely through data attributes, with specialized managers handling different concerns (navigation, validation, progress tracking, conditional visibility).

## Architecture

### Component Structure

```
MultiStepForm (extends StatefulComponent)
│
├── State Management
│   ├── currentStepIndex: number
│   ├── currentStepId: string
│   ├── completedSteps: Set<string>
│   ├── visitedSteps: Set<string>
│   ├── formData: Record<string, unknown>
│   ├── stepValidity: Record<string, boolean>
│   └── Configuration options
│
├── Manager System
│   ├── StepManager - Step discovery, navigation, transitions
│   ├── InputManager - Input discovery, value tracking, smart event binding
│   ├── ValidationManager - Field/group/step validation, custom rules
│   ├── ConditionManager - Conditional visibility, expression evaluation, caching
│   ├── NavigationManager - Button states, guards, navigation flow
│   ├── RenderManager - Text/style updates, expression evaluation
│   ├── AnimationManager - Step transitions, animation types
│   ├── ErrorManager - Error display modes (native/inline/toast)
│   └── AccessibilityManager - ARIA attributes, announcements, focus management
│
└── Public API
    └── window.form - Event subscription interface
```

### Design Principles

1. **Attribute-Driven** - All configuration via `data-form-*` attributes
2. **Progressive Enhancement** - Works with standard HTML forms
3. **Manager Pattern** - Focused, single-responsibility managers
4. **State-First** - All data flows through component state
5. **Event-Driven** - Managers communicate via EventBus
6. **Performance-Optimized** - Lazy event binding, condition caching
7. **Type-Safe** - Full TypeScript support
8. **Persistence-Ready** - Optional state persistence via toolkit

## Data Attribute Schema

### Core Elements

The system supports both combined and separate attribute syntax:

```html
<!-- Combined syntax (element:id) -->
<form data-form-element="form">
  <div data-form-element="step:contact-info">
    <div data-form-element="group:address">
      <!-- inputs -->
    </div>
  </div>
</form>

<!-- Separate syntax with explicit IDs -->
<form data-form-element="form">
  <div data-form-element="step" data-form-step-title="Contact Information">
    <div data-form-element="group" data-form-group-id="address">
      <!-- inputs -->
    </div>
  </div>
</form>

<!-- Auto-detect from title attribute -->
<div data-form-element="step" data-form-step-title="Personal Info">
  <h2>Personal Information</h2>
  <!-- step ID generated from title: "personal-info" -->
</div>
```

**Element Types:**
- `form` - Form wrapper (required)
- `step` - Step container
- `group` - Input group
- `prev` - Previous button
- `next` - Next button
- `submit` - Submit button
- `error` - Error message container

**Form ID:**
Add `data-form-id` to your form element to reference it via the JavaScript API:
```html
<form data-form-element="form" data-form-id="onboarding">
```
Then access it: `api.getForm('onboarding')`

**Step ID Priority:**
1. Explicit ID in combined syntax: `data-form-element="step:my-step"`
2. Explicit title attribute: `data-form-step-title="My Step"`
3. If no title provided, step has no name/title data

### Navigation Elements

```html
<button data-form-element="prev">Back</button>
<button data-form-element="next">Continue</button>
<button data-form-element="submit">Submit</button>
```

### Dynamic Rendering

Variables are always wrapped in `{}`, spaces around operators for readability:

```html
<!-- Text rendering -->
<div data-form-text="{current-step}"></div>
<div data-form-text="{total-steps}"></div>
<div data-form-text="{steps-complete}"></div>
<div data-form-text="{current-step} / {total-steps}"></div>
<div data-form-text="Step {current-step} of {total-steps}"></div>

<!-- Style rendering (width percentage) -->
<div data-form-style-width="{form-progress}"></div>
<div data-form-style-width="{step-progress}"></div>
<div data-form-style-width="({steps-complete} / {total-steps}) * 100"></div>

<!-- Future: Additional style properties -->
<!-- data-form-style-height, data-form-style-opacity, etc. -->
```

**Available Variables:**
- `{current-step}` - Current step index (1-based)
- `{total-steps}` - Total number of steps
- `{steps-complete}` - Number of completed steps
- `{form-progress}` - Overall form completion (0-100)
- `{step-progress}` - Current step completion (0-100)
- `{form.currentStepId}` - Current step ID string
- `{form.currentStepTitle}` - Current step title

### Conditional Visibility

Variables wrapped in `{}`, spaces around operators, supports `&&` and `||`:

```html
<!-- Simple field equality -->
<div data-form-show-if="{country} = US">
  Only shown when country field equals "US"
</div>

<!-- Numeric comparisons -->
<div data-form-show-if="{age} > 18">Adult content</div>
<div data-form-show-if="{quantity} >= 10">Bulk discount</div>

<!-- Compound conditions (AND) -->
<div data-form-show-if="{country} = US && {state} = CA">
  California specific content
</div>

<!-- Compound conditions (OR) -->
<div data-form-show-if="{subscribe} = true || {newsletter} = true">
  Marketing preferences
</div>

<!-- Complex conditions -->
<div data-form-show-if="({age} >= 18 && {country} = US) || {guardian-consent} = true">
  Content with age gate or consent
</div>

<!-- Form state conditions (namespaced with form.) -->
<div data-form-show-if="{form.currentStep} > 2">
  Shown after step 2
</div>
<div data-form-show-if="{form.stepsComplete} >= 3">
  Need 3 completed steps
</div>

<!-- Pattern matching -->
<div data-form-show-if="{email} *= @company.com">Company email</div>
<div data-form-show-if="{phone} ^= +44">UK phone</div>
<div data-form-show-if="{url} $= .com">Dot com domain</div>

<!-- Hide if condition met -->
<div data-form-hide-if="{subscribe} = false">
  Hidden when unchecked
</div>
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
<input
  name="username"
  required
  data-form-validate="min:3,max:20,pattern:^[a-z0-9_]+$"
/>

<!-- Custom format patterns (for display, not validation) -->
<input
  type="tel"
  name="phone"
  data-form-validate-format="(XXX) XXX-XXXX"
/>

<!-- Future: Email blocklist -->
<input
  type="email"
  name="email"
  data-form-validate-blocklist="hotmail.com,yahoo.com"
/>
```

**Validation Timing** (cascades from form → step → group → input):

```html
<!-- Form level defaults -->
<form
  data-form-element="form"
  data-form-validate-on="blur"
>

<!-- Step level override -->
<div
  data-form-element="step:payment"
  data-form-validate-on="change"
>

<!-- Input level override -->
<input
  name="cardNumber"
  data-form-validate-on="input"
/>
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

Control whether validation is required to advance (cascades from form → step → group):

```html
<!-- Form level: Require valid fields to advance (default) -->
<form
  data-form-element="form"
  data-form-allow-invalid="false"
>

<!-- Step level: Allow skipping this step even if invalid -->
<div
  data-form-element="step:optional-preferences"
  data-form-allow-invalid="true"
>

<!-- Group level: This group must be complete to advance -->
<div
  data-form-element="group:required-info"
  data-form-allow-invalid="false"
>
```

### Error Handling

```html
<!-- Error message container -->
<input name="email" required type="email" />
<div data-form-element="error" data-error-for="email"></div>

<!-- Error class configuration (cascades from form → step → group) -->
<form
  data-form-element="form"
  data-form-error-class="is-invalid"
  data-form-error-class-target="parent"
  data-form-error-display="native"
>
```

**Error Display Modes:**
- `native` - Browser native validation messages (default)
- `inline` - Custom inline error containers via `data-form-element="error"`
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
  <div
    data-form-element="error"
    data-error-for="email"
  ></div>
</div>

<!-- Error class "is-invalid" applied to .input-wrapper when validation fails -->
```

### Configuration

All configuration via attributes (no JSON objects):

```html
<form
  data-form-element="form"

  <!-- Persistence (single attribute, stores both progress and data) -->
  data-form-persist="local"

  <!-- Validation -->
  data-form-validate-on="blur"
  data-form-allow-invalid="false"

  <!-- Error handling -->
  data-form-error-display="native"
  data-form-error-class="is-invalid"
  data-form-error-class-target="parent"

  <!-- Animation -->
  data-form-transition="fade"
  data-form-transition-duration="300"

  <!-- Accessibility -->
  data-form-aria-announce="true"
  data-form-focus-on-change="true"
>
```

**Configuration Options:**

| Attribute | Values | Default | Description |
|-----------|--------|---------|-------------|
| `data-form-persist` | `local`, `session`, `cookie`, `false` | `false` | Storage type for form data |
| `data-form-validate-on` | `blur`, `change`, `input`, `next`, `submit` | `blur` | When to validate inputs |
| `data-form-allow-invalid` | `true`, `false` | `false` | Allow advancing with errors |
| `data-form-error-display` | `native`, `inline`, `toast` | `native` | Error display mode |
| `data-form-error-class` | string | - | CSS class for error state |
| `data-form-error-class-target` | `parent`, `self`, `{selector}` | `parent` | Where to apply error class |
| `data-form-transition` | `fade`, `slide`, `none` | `fade` | Step transition type |
| `data-form-transition-duration` | number (ms) | `300` | Transition duration |
| `data-form-aria-announce` | `true`, `false` | `true` | Announce step changes |
| `data-form-focus-on-change` | `true`, `false` | `true` | Focus first input on step change |

## State Management

### FormState Interface

```typescript
interface FormState {
  // Navigation
  currentStepIndex: number;
  currentStepId: string;
  currentStepTitle: string;
  previousStepIndex: number | null;

  // Tracking
  completedSteps: Set<string>;
  visitedSteps: Set<string>;
  totalSteps: number;

  // Data
  formData: Record<string, unknown>;

  // Validation
  stepValidity: Record<string, boolean>;
  fieldErrors: Record<string, string[]>;
  isValid: boolean;

  // Status
  isSubmitting: boolean;
  isInitialized: boolean;

  // Progress
  formProgress: number;      // 0-100
  stepProgress: number;      // 0-100
  stepsComplete: number;     // Count of completed steps
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

### StepManager

**Purpose:** Manage step lifecycle, discovery, and transitions

**Responsibilities:**
- Discover all `[data-form-element="step"]` elements
- Parse step IDs from attributes or titles
- Initialize step metadata (index, id, title)
- Show/hide steps (delegates animation to AnimationManager)
- Track visited and completed steps
- Emit step change events
- Coordinate with NavigationManager for guards

**API:**
```typescript
goToStep(index: number): Promise<void>
nextStep(): Promise<void>
prevStep(): Promise<void>
getCurrentStep(): StepElement
getStepById(id: string): StepElement | null
getStepByIndex(index: number): StepElement | null
getTotalSteps(): number
isFirstStep(): boolean
isLastStep(): boolean
markStepComplete(stepId: string): void
```

**Performance Notes:**
- Only activates event listeners for current step
- Deactivates listeners when leaving step

### InputManager

**Purpose:** Track and manage all form inputs with smart event binding

**Responsibilities:**
- Auto-discover all inputs in form
- Group inputs by `[data-form-element="group"]`
- Lazy event binding (only active step inputs)
- Listen to input/change/blur events based on input type
- Update formData state on changes
- Handle input focus management
- Support all HTML input types (text, select, radio, checkbox, etc.)
- Trigger condition re-evaluation on change

**API:**
```typescript
registerInput(input: HTMLInputElement): void
unregisterInput(input: HTMLInputElement): void
bindInput(input: HTMLInputElement): void
unbindInput(input: HTMLInputElement): void
getInputValue(name: string): unknown
setInputValue(name: string, value: unknown): void
getGroupInputs(groupId: string): HTMLInputElement[]
getStepInputs(stepId: string): HTMLInputElement[]
getAllInputs(): HTMLInputElement[]
getActiveInputs(): HTMLInputElement[]
```

**Performance Notes:**
- Only binds events to inputs in active step
- Unbinds events when step becomes inactive
- Smart event selection based on input type

### ValidationManager

**Purpose:** Validate inputs, groups, and steps

**Responsibilities:**
- Auto-detect native HTML5 validation (required, type, pattern, min, max)
- Parse custom `[data-form-validate]` rules
- Execute validation on demand or based on timing config
- Update `[data-form-element="error"]` containers
- Apply error classes to configured targets
- Provide validation error messages
- Support custom validators (future)
- Integrate with ErrorManager for display

**API:**
```typescript
validateInput(name: string, showErrors?: boolean): ValidationResult
validateGroup(groupId: string, showErrors?: boolean): ValidationResult
validateStep(stepId: string, showErrors?: boolean): ValidationResult
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
- Discover all `[data-form-show-if]` / `[data-form-hide-if]` elements
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

    affectedElements.forEach(element => {
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
- Show/hide buttons based on current step
- Coordinate with StepManager for navigation
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
- Discover all `[data-form-text]` elements
- Discover all `[data-form-style-*]` elements
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
```typescript
// Context includes all available variables
const context = {
  'current-step': this.state.currentStepIndex + 1,
  'total-steps': this.state.totalSteps,
  'steps-complete': this.state.stepsComplete,
  'form-progress': this.state.formProgress,
  'step-progress': this.state.stepProgress,
  'form.currentStepId': this.state.currentStepId,
  'form.currentStepTitle': this.state.currentStepTitle,
  // ... plus all formData fields
};

// Parse and evaluate expression
// "{current-step} / {total-steps}" -> "2 / 5"
// "({steps-complete} / {total-steps}) * 100" -> "(3 / 5) * 100" -> "60"
```

### AnimationManager

**Purpose:** Handle step transition animations

**Responsibilities:**
- Manage transition types (fade, slide, typeform, none)
- Handle transition timing and duration
- Coordinate with StepManager for step changes
- Apply CSS classes for transitions
- Wait for transitions to complete before cleanup
- Future: Support for custom transition types

**API:**
```typescript
transitionStep(fromStep: HTMLElement, toStep: HTMLElement, direction: 'forward' | 'backward'): Promise<void>
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
- Manage error message containers `[data-form-element="error"]`
- Apply error classes to configured targets
- Clear errors when field becomes valid
- Provide default error messages
- Support custom error messages (future)

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
    `[data-form-element="error"][data-error-for="${field}"]`
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
- Add ARIA attributes to steps (role, aria-hidden, aria-current)
- Add ARIA attributes to progress indicators
- Add ARIA live regions for announcements
- Announce step changes to screen readers
- Manage focus on step transitions
- Ensure keyboard navigation support (future)
- Provide clear error announcements

**API:**
```typescript
setupStepAria(steps: HTMLElement[]): void
setupProgressAria(progressElements: HTMLElement[]): void
announceStepChange(stepTitle: string, stepIndex: number): void
setFocusOnStepChange(step: HTMLElement): void
announceError(message: string): void
```

**ARIA Implementation:**
```typescript
// Steps setup
setupStepAria(steps: HTMLElement[]): void {
  steps.forEach((step, index) => {
    step.setAttribute('role', 'tabpanel');
    step.setAttribute('aria-labelledby', `step-${index}-title`);
    if (index !== this.currentStepIndex) {
      step.setAttribute('aria-hidden', 'true');
    }
  });
}

// Announcements
announceStepChange(stepTitle: string, stepIndex: number): void {
  const liveRegion = this.getLiveRegion();
  liveRegion.textContent = `Now on step ${stepIndex + 1}: ${stepTitle}`;
}

// Focus management
setFocusOnStepChange(step: HTMLElement): void {
  const firstFocusable = step.querySelector('input, select, textarea, button');
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
'form:step:changing' - { fromIndex: number, toIndex: number }
'form:step:changed' - { stepIndex: number, stepId: string, stepTitle: string }
'form:step:complete' - { stepId: string, stepIndex: number }

// Validation
'form:validation:started' - { target: string }
'form:validation:complete' - { target: string, valid: boolean, errors: ValidationError[] }

// Data
'form:data:changed' - { field: string, value: unknown, oldValue: unknown }

// Conditions
'form:condition:evaluated' - { element: HTMLElement, visible: boolean, condition: string }

// Submission
'form:submit:started' - { formData: Record<string, unknown> }
'form:submit:success' - { response: unknown }
'form:submit:error' - { error: Error }
```

### Public Events (window.form API)

User-friendly event names for external code:

```typescript
// Available events
'step:changed' - { from: number, to: number, stepId: string, stepTitle: string }
'step:completed' - { stepId: string, stepIndex: number }
'input:changed' - { field: string, value: unknown, formData: Record<string, unknown> }
'input:blurred' - { field: string, value: unknown }
'validation:error' - { field: string, errors: string[] }
'validation:success' - { field: string }
'progress:updated' - { formProgress: number, stepProgress: number, stepsComplete: number }
'submit:started' - { formData: Record<string, unknown> }
'submit:success' - { response: unknown }
'submit:error' - { error: Error }
```

### Window API Usage

```typescript
// Subscribe to events
window.form.on('step:changed', (data) => {
  console.log(`Moved to step ${data.to}: ${data.stepTitle}`);
});

window.form.on('input:changed', ({ field, value, formData }) => {
  console.log(`${field} changed to:`, value);
  // Update external UI, trigger analytics, etc.
});

window.form.on('validation:error', ({ field, errors }) => {
  // Custom error handling
  console.error(`Validation failed for ${field}:`, errors);
});

window.form.on('submit:started', ({ formData }) => {
  // Show loading spinner
  console.log('Submitting:', formData);
});

window.form.on('submit:success', ({ response }) => {
  // Show success message, redirect, etc.
  console.log('Form submitted successfully:', response);
});

// One-time subscription
window.form.once('submit:success', (data) => {
  window.location.href = '/thank-you';
});

// Unsubscribe
const handler = (data) => console.log(data);
window.form.on('step:changed', handler);
window.form.off('step:changed', handler);
```

## Usage Example

### Webflow Setup

#### 1. Add Script to Site Settings

In Webflow Project Settings → Custom Code → Head Code:

```html
<!-- Add to <head> -->
<script src="https://cdn.jsdelivr.net/npm/@your-org/motif-forms@latest/dist/index.js"></script>
```

#### 2. Build Form in Webflow Designer

Create your form structure using Webflow's visual editor and add the required data attributes:

```html
<form
  data-form-element="form"
  data-form-id="onboarding"
  data-form-persist="local"
  data-form-validate-on="blur"
  data-form-error-display="inline"
  data-form-error-class="is-invalid"
  data-form-transition="fade"
>

  <!-- Step 1: Personal Information -->
  <div data-form-element="step" data-form-step-title="Personal Information">
    <h2>Tell us about yourself</h2>

    <div class="input-wrapper">
      <label for="firstName">First Name</label>
      <input
        type="text"
        id="firstName"
        name="firstName"
        required
        data-form-validate="min:2"
      />
      <div data-form-element="error" data-error-for="firstName"></div>
    </div>

    <div class="input-wrapper">
      <label for="email">Email</label>
      <input
        type="email"
        id="email"
        name="email"
        required
      />
      <div data-form-element="error" data-error-for="email"></div>
    </div>

    <div class="input-wrapper">
      <label for="age">Age</label>
      <input
        type="number"
        id="age"
        name="age"
        min="18"
        max="120"
        required
      />
      <div data-form-element="error" data-error-for="age"></div>
    </div>

    <button type="button" data-form-element="next">Continue</button>
  </div>

  <!-- Step 2: Location -->
  <div data-form-element="step" data-form-step-title="Location">
    <h2>Where are you located?</h2>

    <div class="input-wrapper">
      <label for="country">Country</label>
      <select id="country" name="country" required>
        <option value="">Select...</option>
        <option value="US">United States</option>
        <option value="CA">Canada</option>
        <option value="UK">United Kingdom</option>
      </select>
      <div data-form-element="error" data-error-for="country"></div>
    </div>

    <!-- Conditional field - only shown for US -->
    <div
      class="input-wrapper"
      data-form-show-if="{country} = US"
    >
      <label for="state">State</label>
      <input type="text" id="state" name="state" />
    </div>

    <!-- Conditional field - only shown if age > 65 -->
    <div
      class="input-wrapper"
      data-form-show-if="{age} > 65"
    >
      <label for="retirement">Retirement Status</label>
      <select id="retirement" name="retirement">
        <option value="working">Still Working</option>
        <option value="retired">Retired</option>
      </select>
    </div>

    <button type="button" data-form-element="prev">Back</button>
    <button type="button" data-form-element="next">Continue</button>
  </div>

  <!-- Step 3: Preferences -->
  <div data-form-element="step" data-form-step-title="Preferences">
    <h2>Your preferences</h2>

    <div class="checkbox-wrapper">
      <input
        type="checkbox"
        id="newsletter"
        name="newsletter"
        value="true"
      />
      <label for="newsletter">Subscribe to newsletter</label>
    </div>

    <div class="checkbox-wrapper">
      <input
        type="checkbox"
        id="terms"
        name="terms"
        required
      />
      <label for="terms">I agree to the terms and conditions</label>
      <div data-form-element="error" data-error-for="terms"></div>
    </div>

    <button type="button" data-form-element="prev">Back</button>
    <button type="button" data-form-element="next">Continue</button>
  </div>

  <!-- Step 4: Review & Submit -->
  <div data-form-element="step" data-form-step-title="Review & Submit">
    <h2>Review your information</h2>

    <div class="review-section">
      <h3>Personal Information</h3>
      <p>Name: <span data-form-text="{firstName}"></span></p>
      <p>Email: <span data-form-text="{email}"></span></p>
      <p>Age: <span data-form-text="{age}"></span></p>
    </div>

    <div class="review-section">
      <h3>Location</h3>
      <p>Country: <span data-form-text="{country}"></span></p>
      <p data-form-show-if="{country} = US">
        State: <span data-form-text="{state}"></span>
      </p>
    </div>

    <button type="button" data-form-element="prev">Back</button>
    <button type="submit" data-form-element="submit">Submit</button>
  </div>

  <!-- Progress Indicators -->
  <div class="progress-bar-container">
    <div
      class="progress-bar"
      data-form-style-width="{form-progress}"
    ></div>
  </div>

  <div class="step-counter">
    <span data-form-text="Step {current-step} of {total-steps}"></span>
  </div>

  <div class="step-title">
    <span data-form-text="{form.currentStepTitle}"></span>
  </div>

  <!-- Alternative progress displays -->
  <div class="steps-complete">
    <span data-form-text="{steps-complete} completed"></span>
  </div>

</form>
```

**Important:** Add `data-form-id` to your form element for easy reference in JavaScript.

#### 3. Add Custom JavaScript (Optional)

If you need to customize form behavior, add to Project Settings → Custom Code → Footer Code:

```html
<!-- Add before </body> -->
<script>
// Initialize Motif Forms API
window.MotifForms ||= [];
window.MotifForms.push(function(api) {
  // Get reference to specific form by ID
  const onboardingForm = api.getForm('onboarding');

  // Subscribe to form events
  onboardingForm.on('step:changed', ({ to, stepTitle }) => {
    console.log(`Navigated to step ${to}: ${stepTitle}`);

    // Track analytics
    if (window.gtag) {
      window.gtag('event', 'form_step_completed', {
        step_number: to,
        step_name: stepTitle,
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

#### Accessing Forms

The library automatically initializes all forms with `data-form-element="form"` on page load. Access forms via the global API:

```javascript
window.MotifForms ||= [];
window.MotifForms.push(function(api) {
  // Get form by data-form-id
  const form = api.getForm('onboarding');

  // Get form by element
  const formElement = document.querySelector('[data-form-id="onboarding"]');
  const form2 = api.getFormByElement(formElement);

  // Get all initialized forms
  const allForms = api.getAllForms();
});
```

#### Event Subscription

```javascript
// Subscribe to event
const unsubscribe = form.on('step:changed', (data) => {
  console.log(data);
});

// One-time subscription
form.once('submit:success', (data) => {
  console.log('Form submitted once');
});

// Unsubscribe
unsubscribe();
// or
form.off('step:changed', handler);
```

#### Programmatic Control

```javascript
window.MotifForms.push(function(api) {
  const form = api.getForm('onboarding');

  // Navigate to specific step
  form.goToStep(2); // Go to step index 2 (3rd step)

  // Navigate by step ID
  form.goToStepById('preferences');

  // Navigate forward/backward
  form.nextStep();
  form.prevStep();

  // Get form data
  const data = form.getFormData();
  console.log('Current form data:', data);

  // Set field value programmatically
  form.setFieldValue('email', 'user@example.com');

  // Get current step info
  const currentStep = form.getCurrentStep();
  console.log('Current step:', currentStep);

  // Validate current step
  const isValid = await form.validateCurrentStep();

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
window.MotifForms ||= [];
window.MotifForms.push(function(api) {
  const form = api.getForm('onboarding');

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

## Implementation Checklist

### Phase 1: Core Foundation
- [ ] MultiStepForm component extending StatefulComponent
- [ ] FormState interface and type definitions
- [ ] Basic attribute parsing utilities
- [ ] StepManager - discovery and navigation (no animations)
- [ ] InputManager - discovery and value tracking
- [ ] NavigationManager - button states and basic guards
- [ ] RenderManager - text and style updates
- [ ] Window API setup (window.form.on/off/once)
- [ ] Basic event emission (step:changed, input:changed)

### Phase 2: Validation & Errors
- [ ] ValidationManager - HTML5 validation detection
- [ ] ValidationManager - custom validation rules
- [ ] ValidationManager - validation timing (blur/change/input)
- [ ] ErrorManager - native error display
- [ ] ErrorManager - inline error display
- [ ] ErrorManager - error class application
- [ ] Navigation guards with validation checks

### Phase 3: Advanced Features
- [ ] ConditionManager - expression parsing
- [ ] ConditionManager - condition evaluation
- [ ] ConditionManager - performance optimization (caching)
- [ ] ConditionManager - show-if/hide-if logic
- [ ] AnimationManager - fade transition
- [ ] State persistence via StorageManager

### Phase 4: Accessibility & Polish
- [ ] AccessibilityManager - ARIA attributes
- [ ] AccessibilityManager - step announcements
- [ ] AccessibilityManager - focus management
- [ ] AnimationManager - additional transition types (slide)
- [ ] Custom error messages support
- [ ] Format validation patterns
- [ ] Email blocklist validation (future)

### Phase 5: Testing & Documentation
- [ ] Unit tests for each manager
- [ ] Integration tests with Playwright
- [ ] Performance testing (large forms)
- [ ] Accessibility audit
- [ ] Documentation with examples
- [ ] Webflow cloneable demo

## Performance Considerations

### Lazy Event Binding

Only bind input listeners for the current step:

```typescript
class StepManager {
  async goToStep(index: number): Promise<void> {
    const currentStep = this.steps[this.currentIndex];
    const nextStep = this.steps[index];

    // Unbind events from current step
    this.inputManager.unbindStepInputs(currentStep);

    // Transition
    await this.animationManager.transitionStep(currentStep, nextStep);

    // Bind events to new step
    this.inputManager.bindStepInputs(nextStep);

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
    const conditionalElements = this.queryAll('[data-form-show-if], [data-form-hide-if]');

    conditionalElements.forEach(element => {
      const condition = element.getAttribute('data-form-show-if') ||
                       element.getAttribute('data-form-hide-if');

      // Parse condition to find field dependencies
      const fields = this.extractFieldNames(condition);

      fields.forEach(field => {
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

    elements.forEach(element => this.evaluateCondition(element));
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

### Phase 2+
- [ ] Custom validation rules via window API
- [ ] Toast notification error display
- [ ] Email blocklist validation
- [ ] Keyboard navigation (Enter to advance, Escape to cancel)
- [ ] Multi-page forms (actual page navigation)
- [ ] Form branching (skip steps based on answers)
- [ ] File upload support
- [ ] Auto-save drafts (periodic)
- [ ] Form analytics integration
- [ ] A/B testing support
- [ ] Custom transition types (typeform, multi-step styles)
- [ ] Custom expression functions (e.g., `{format(phone, "xxx-xxx-xxxx")}`)
- [ ] Conditional validation rules
- [ ] Step-level callbacks via attributes

## Design Decisions Summary

### Validation Timing
- **Default:** Blur for text inputs, change for select/radio/checkbox
- **On Next:** Always validate before advancing
- **On Submit:** Always validate before submission
- **Configurable:** Per form, step, group, or input

### State Persistence
- **Default:** Disabled
- **When Enabled:** Stores both progress and data to configured storage
- **Storage Types:** localStorage, sessionStorage, cookies

### Navigation Freedom
- **Default:** Sequential with validation guards
- **Backward:** Always allowed without validation
- **Forward:** Requires validation unless `data-form-allow-invalid="true"`

### Animation Handling
- **Built-in:** Fade transition (CSS-based)
- **Extensible:** AnimationManager for future transition types
- **CSS-First:** JavaScript triggers classes, CSS handles animation

### Error Display
- **Default:** Native browser validation
- **Inline:** Custom error containers when configured
- **Class Application:** Configurable target (parent/self/selector)

### Accessibility
- **Auto-managed:** ARIA attributes for steps, progress, errors
- **Announcements:** Screen reader announcements for step changes
- **Focus:** Auto-focus first input on step change
- **Keyboard:** Future support for Enter/Escape navigation

### Variable Syntax
- **Consistency:** Always wrap variables in `{}`
- **Readability:** Spaces around operators
- **Namespace:** `form.*` for form state to avoid field name clashes
