/**
 * Multi-Step Form Component
 *
 * Main component that orchestrates the multi-step form system.
 * Extends StatefulComponent for state management, event handling, and lifecycle.
 */

import { StatefulComponent } from '$lib/core/components/stateful-component';
import type { FormState, MultiStepFormConfig, FormBehavior } from './types';
import { parseBooleanAttribute, parseNumberAttribute } from './utils';

/**
 * Multi-Step Form Component
 *
 * Manages the complete lifecycle of a multi-step form including:
 * - Element hierarchy discovery (cards, sets, groups, fields)
 * - Navigation and progression
 * - Validation and error handling
 * - Conditional visibility
 * - Progress tracking
 * - Animations and transitions
 * - Accessibility
 */
export class MultiStepForm extends StatefulComponent<FormState> {
  // ============================================
  // Properties
  // ============================================

  /** Form element */
  private formElement: HTMLFormElement;

  /** Form name (from name attribute) */
  private formName: string;

  /** Form behavior mode */
  private behavior: FormBehavior = 'byField';

  /** Configuration */
  private config: MultiStepFormConfig;

  // ============================================
  // Managers (to be initialized in Phase 1 Step 3)
  // ============================================

  // private cardManager: CardManager;
  // private setManager: SetManager;
  // private groupManager: GroupManager;
  // private fieldManager: FieldManager;
  // private inputManager: InputManager;
  // private navigationManager: NavigationManager;
  // private validationManager: ValidationManager;
  // private errorManager: ErrorManager;
  // private conditionManager: ConditionManager;
  // private renderManager: RenderManager;
  // private animationManager: AnimationManager;
  // private accessibilityManager: AccessibilityManager;

  // ============================================
  // Constructor
  // ============================================

  /**
   * Create a new MultiStepForm instance
   *
   * @param config - Form configuration
   */
  constructor(config: MultiStepFormConfig) {
    // Initialize StatefulComponent with form element
    super({
      element: config.element,
      autoInit: false, // We'll manually call init()
    });

    // Store config
    this.config = config;
    this.formElement = config.element;

    // Get form name from name attribute
    this.formName = this.formElement.getAttribute('name') || 'untitled-form';

    // Parse configuration from attributes and merge with config
    this.parseConfiguration();

    // Configure state keys
    this.configureStateKeys();
  }

  // ============================================
  // Configuration
  // ============================================

  /**
   * Parse configuration from data-form-* attributes
   * Attributes override config object
   */
  private parseConfiguration(): void {
    // Get behavior
    const behaviorAttr = this.formElement.getAttribute('data-form-behavior');
    if (behaviorAttr === 'byField') {
      this.behavior = behaviorAttr;
    }

    // Parse other configuration
    const transitionAttr = this.formElement.getAttribute('data-form-transition');
    if (transitionAttr === 'fade' || transitionAttr === 'slide' || transitionAttr === 'none') {
      this.config.transition = transitionAttr;
    }

    const transitionDurationAttr = this.formElement.getAttribute('data-form-transitionduration');
    if (transitionDurationAttr) {
      this.config.transitionDuration = parseNumberAttribute(transitionDurationAttr, 300);
    }

    const ariaAnnounceAttr = this.formElement.getAttribute('data-form-ariaannounce');
    if (ariaAnnounceAttr !== null) {
      this.config.ariaAnnounce = parseBooleanAttribute(ariaAnnounceAttr, true);
    }

    const focusOnChangeAttr = this.formElement.getAttribute('data-form-focusonchange');
    if (focusOnChangeAttr !== null) {
      this.config.focusOnChange = parseBooleanAttribute(focusOnChangeAttr, true);
    }

    // Set defaults if not provided
    this.config.transition = this.config.transition || 'fade';
    this.config.transitionDuration = this.config.transitionDuration || 300;
    this.config.ariaAnnounce = this.config.ariaAnnounce ?? true;
    this.config.focusOnChange = this.config.focusOnChange ?? true;
    this.config.debug = this.config.debug ?? false;
  }

  /**
   * Configure state keys with default values
   */
  private configureStateKeys(): void {
    // Navigation state
    this.configureState({
      key: 'currentCardIndex',
      defaultValue: 0,
    });

    this.configureState({
      key: 'currentSetIndex',
      defaultValue: 0,
    });

    this.configureState({
      key: 'currentGroupIndex',
      defaultValue: -1, // -1 if no groups
    });

    this.configureState({
      key: 'currentFieldIndex',
      defaultValue: 0,
    });

    this.configureState({
      key: 'currentCardId',
      defaultValue: '',
    });

    this.configureState({
      key: 'currentSetId',
      defaultValue: '',
    });

    this.configureState({
      key: 'currentGroupId',
      defaultValue: '',
    });

    this.configureState({
      key: 'previousCardIndex',
      defaultValue: null,
    });

    this.configureState({
      key: 'previousSetIndex',
      defaultValue: null,
    });

    this.configureState({
      key: 'previousFieldIndex',
      defaultValue: null,
    });

    this.configureState({
      key: 'behavior',
      defaultValue: this.behavior,
    });

    // Progress tracking
    this.configureState({
      key: 'completedCards',
      defaultValue: new Set<string>(),
    });

    this.configureState({
      key: 'completedSets',
      defaultValue: new Set<string>(),
    });

    this.configureState({
      key: 'completedGroups',
      defaultValue: new Set<string>(),
    });

    this.configureState({
      key: 'completedFields',
      defaultValue: new Set<string>(),
    });

    this.configureState({
      key: 'visitedCards',
      defaultValue: new Set<string>(),
    });

    this.configureState({
      key: 'visitedSets',
      defaultValue: new Set<string>(),
    });

    this.configureState({
      key: 'visitedGroups',
      defaultValue: new Set<string>(),
    });

    this.configureState({
      key: 'visitedFields',
      defaultValue: new Set<string>(),
    });

    // Totals
    this.configureState({
      key: 'totalCards',
      defaultValue: 0,
    });

    this.configureState({
      key: 'totalSets',
      defaultValue: 0,
    });

    this.configureState({
      key: 'totalGroups',
      defaultValue: 0,
    });

    this.configureState({
      key: 'totalFields',
      defaultValue: 0,
    });

    this.configureState({
      key: 'cardsComplete',
      defaultValue: 0,
    });

    this.configureState({
      key: 'setsComplete',
      defaultValue: 0,
    });

    this.configureState({
      key: 'groupsComplete',
      defaultValue: 0,
    });

    this.configureState({
      key: 'fieldsComplete',
      defaultValue: 0,
    });

    // Progress percentages
    this.configureState({
      key: 'formProgress',
      defaultValue: 0,
    });

    this.configureState({
      key: 'cardProgress',
      defaultValue: 0,
    });

    this.configureState({
      key: 'setProgress',
      defaultValue: 0,
    });

    // Titles
    this.configureState({
      key: 'currentCardTitle',
      defaultValue: '',
    });

    this.configureState({
      key: 'currentSetTitle',
      defaultValue: '',
    });

    this.configureState({
      key: 'currentGroupTitle',
      defaultValue: '',
    });

    // Form data
    this.configureState({
      key: 'formData',
      defaultValue: {},
    });

    this.configureState({
      key: 'setValidity',
      defaultValue: {},
    });

    this.configureState({
      key: 'fieldValidity',
      defaultValue: {},
    });

    this.configureState({
      key: 'fieldErrors',
      defaultValue: {},
    });

    this.configureState({
      key: 'isValid',
      defaultValue: true,
    });

    // Status
    this.configureState({
      key: 'isSubmitting',
      defaultValue: false,
    });

    this.configureState({
      key: 'isInitialized',
      defaultValue: false,
    });

    this.configureState({
      key: 'isTransitioning',
      defaultValue: false,
    });
  }

  // ============================================
  // Lifecycle Hooks
  // ============================================

  /**
   * Initialize the form
   * Called by StatefulComponent lifecycle
   */
  protected async onInit(): Promise<void> {
    await super.onInit();

    if (this.config.debug) {
      console.log(`[MultiStepForm] Initializing form: ${this.formName}`);
    }

    // TODO Phase 1 Step 3:
    // - Initialize all managers
    // - Discover hierarchy
    // - Set initial state
    // - Emit form:initialized event

    this.setState('isInitialized', true);

    if (this.config.debug) {
      console.log(`[MultiStepForm] Form initialized: ${this.formName}`);
    }
  }

  /**
   * Cleanup on destroy
   * Called by StatefulComponent lifecycle
   */
  protected async onDestroy(): Promise<void> {
    if (this.config.debug) {
      console.log(`[MultiStepForm] Destroying form: ${this.formName}`);
    }

    // TODO Phase 1 Step 3:
    // - Destroy all managers
    // - Emit form:destroyed event

    await super.onDestroy();
  }

  /**
   * Handle state changes
   * Called by StatefulComponent when state changes
   */
  protected handleStateChange<K extends keyof FormState>(
    key: K,
    oldValue: FormState[K],
    newValue: FormState[K]
  ): void {
    if (this.config.debug) {
      console.log(`[MultiStepForm] State changed: ${String(key)}`, {
        oldValue,
        newValue,
      });
    }

    // TODO: Trigger manager updates based on state changes
    // E.g., when currentFieldIndex changes, update RenderManager, AccessibilityManager, etc.
  }

  // ============================================
  // Public API (Future)
  // ============================================

  /**
   * Get form name
   */
  public getFormName(): string {
    return this.formName;
  }

  /**
   * Get current behavior
   */
  public getBehavior(): FormBehavior {
    return this.behavior;
  }

  /**
   * Get configuration
   */
  public getConfig(): Readonly<MultiStepFormConfig> {
    return Object.freeze({ ...this.config });
  }
}
