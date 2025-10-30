/**
 * Multi-Step Form Component
 *
 * Main component that orchestrates the multi-step form system.
 * Extends StatefulComponent for state management, event handling, and lifecycle.
 */

import { StatefulComponent } from '$lib/core/components/stateful-component';

import { FORM_INTIAL_STATE } from './form-intial-state';
import type {
  FormAttributeConfig,
  FormBehavior,
  FormState,
  MultiStepFormConfig,
  StorageType,
} from './types';
import type { MultiStepFormProps } from './types/config/multi-step-form-props';
import {
  getConfigAttributes,
  isValidBehaviorType,
  isValidTransitionType,
  parseBooleanAttribute,
  parseNumberAttribute,
} from './utils';
import { isValidErrorModeType } from './utils/validation/error-mode-type-validators';
import { isValidStorageType } from './utils/validation/storage-type-validators';

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

  /** Configuration */
  protected config: MultiStepFormConfig;

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
   * @param props - Props for the MultiStepForm component
   */
  constructor(props: MultiStepFormProps) {
    // Initialize StatefulComponent
    super({
      autoInit: false, // We'll manually call init()
      debug: props.debug,
      state: FORM_INTIAL_STATE,
    });

    // Set the form element as the root element
    this.setRootElement(props.element);

    // Parse configuration from attributes
    this.config = this.parseConfiguration();
  }

  // ============================================
  // Configuration
  // ============================================

  /**
   * Parse configuration from data-form-* attributes
   * Attributes override config object
   */
  private parseConfiguration(): MultiStepFormConfig {
    // Get all data-form-* attributes (type-safe with FormAttributeConfig)
    const attrs = getConfigAttributes<FormAttributeConfig>(this.rootElement as HTMLElement);

    // Parse name
    if (!attrs.name) {
      throw this.createError(`Invalid configuration: No name is provided for form`, 'init', {
        cause: {
          element: this.rootElement as HTMLElement,
          name: attrs.name,
        },
      });
    }

    // Parse behavior
    if (attrs.behavior && !isValidBehaviorType(attrs.behavior)) {
      throw this.createError(`Invalid configuration: Behavior must be "byField" for v1.0`, 'init', {
        cause: {
          behavior: attrs.behavior,
        },
      });
    }

    // Parse transition type
    if (attrs.transition && !isValidTransitionType(attrs.transition)) {
      throw this.createError(
        `Invalid configuration: Transition must be "fade", "slide", or "none"`,
        'init',
        {
          cause: {
            transition: attrs.transition,
          },
        }
      );
    }

    // Parse transition duration
    if (attrs.transitionduration && isNaN(parseFloat(attrs.transitionduration))) {
      throw this.createError(
        `Invalid configuration: Transition duration must be a number`,
        'init',
        {
          cause: {
            transitionDuration: attrs.transitionduration,
          },
        }
      );
    }

    // Parse allow invalid
    if (attrs.allowinvalid && !['true', 'false', ''].includes(attrs.allowinvalid)) {
      throw this.createError(
        `Invalid configuration: Allow invalid must be 'true' or 'false'`,
        'init',
        {
          cause: {
            allowInvalid: attrs.allowinvalid,
          },
        }
      );
    }

    // Parse error display mode
    if (attrs.errordisplay && !isValidErrorModeType(attrs.errordisplay)) {
      throw this.createError(`Invalid configuration: Error display mode must be 'native'`, 'init', {
        cause: { errordisplay: attrs.errordisplay },
      });
    }

    // Parse aria announce
    if (attrs.ariaannounce && !['true', 'false', ''].includes(attrs.ariaannounce)) {
      throw this.createError(
        `Invalid configuration: Aria announce must be 'true' or 'false'`,
        'init',
        {
          cause: {
            ariaAnnounce: attrs.ariaannounce,
          },
        }
      );
    }

    // Parse focus on change
    if (attrs.focusonchange && !['true', 'false', ''].includes(attrs.focusonchange)) {
      throw this.createError(
        `Invalid configuration: Focus on change must be 'true' or 'false'`,
        'init',
        {
          cause: {
            focusOnChange: attrs.focusonchange,
          },
        }
      );
    }

    // Parse auto init
    if (attrs.autoinit && !['true', 'false', ''].includes(attrs.autoinit)) {
      throw this.createError(`Invalid configuration: Auto init must be 'true' or 'false'`, 'init', {
        cause: { autoInit: attrs.autoinit },
      });
    }

    // Parse storage type
    if (attrs.persist && !isValidStorageType(attrs.persist)) {
      throw this.createError(`Invalid configuration: Persist must be 'memory'`, 'init', {
        cause: { persist: attrs.persist },
      });
    }

    // Set defaults if not provided
    return {
      name: attrs.name || 'untitled-form',
      behavior: attrs.behavior || 'byField',
      transition: attrs.transition || 'none',
      transitionDuration: parseNumberAttribute(attrs.transitionduration, 300),
      validateOn: attrs.validateon || 'blur',
      allowInvalid: parseBooleanAttribute(attrs.allowinvalid, false),
      errorDisplay: attrs.errordisplay || 'native',
      ariaAnnounce: parseBooleanAttribute(attrs.ariaannounce, true),
      focusOnChange: parseBooleanAttribute(attrs.focusonchange, true),
      autoInit: parseBooleanAttribute(attrs.autoinit, false),
      persist: (attrs.persist as StorageType) || 'memory',
      debug: parseBooleanAttribute(attrs.debug, false),
    };
  }

  // ============================================
  // Event Listeners
  // ============================================

  /**
   * Set up event listeners
   * Required by InteractiveComponent
   */
  protected async setupEventListeners(): Promise<void> {
    // TODO Phase 1 Step 3:
    // - Set up form submit listener
    // - Delegate button clicks to NavigationManager
    // - Set up conditional visibility triggers
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
      console.log(`[MultiStepForm] Initializing form: ${this.config.name}`);
    }

    // TODO Phase 1 Step 3:
    // - Initialize all managers
    // - Discover hierarchy
    // - Set initial state
    // - Emit form:initialized event

    this.setState('isInitialized', true);

    if (this.config.debug) {
      console.log(`[MultiStepForm] Form initialized: ${this.config.name}`);
    }
  }

  /**
   * Cleanup on destroy
   * Called by StatefulComponent lifecycle
   */
  protected async onDestroy(): Promise<void> {
    if (this.config.debug) {
      console.log(`[MultiStepForm] Destroying form: ${this.config.name}`);
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
    return this.config.name;
  }

  /**
   * Get current behavior
   */
  public getBehavior(): FormBehavior {
    return this.config.behavior;
  }

  /**
   * Get configuration
   */
  public getConfig(): Readonly<MultiStepFormConfig> {
    return Object.freeze({ ...this.config });
  }
}
