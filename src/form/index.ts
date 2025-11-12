/**
 * Multi-Step Form Component
 *
 * Main component that orchestrates the multi-step form system.
 * Extends StatefulComponent for state management, event handling, and lifecycle.
 */

import { StatefulComponent } from '$lib/core/components/stateful-component';

import {
  ButtonManager,
  CardManager,
  ConditionManager,
  DisplayManager,
  FieldManager,
  FocusManager,
  GroupManager,
  InputManager,
  NavigationManager,
  ProgressManager,
  SetManager,
} from './managers';
import type {
  FlowupsFormConfig,
  FlowupsFormProps,
  FormAttributeConfig,
  FormBehavior,
  FormEventMap,
  FormState,
  StorageType,
} from './types';
import {
  getConfigAttributes,
  isValidBehaviorType,
  isValidErrorModeType,
  isValidStorageType,
  isValidTransitionType,
  parseBooleanAttribute,
  parseNumberAttribute,
} from './utils';

/**
 * Flowups Form Component
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
export class FlowupsForm extends StatefulComponent<FormState, FormEventMap> {
  protected readonly config: FlowupsFormConfig;
  public cardManager: CardManager;
  public setManager: SetManager;
  public groupManager: GroupManager;
  public fieldManager: FieldManager;
  public inputManager: InputManager;
  public buttonManager: ButtonManager;
  public navigationManager: NavigationManager;
  public displayManager: DisplayManager;
  public progressManager: ProgressManager;
  public focusManager: FocusManager;
  public conditionManager: ConditionManager;
  // private accessibilityManager: AccessibilityManager;
  // private animationManager: AnimationManager;
  // private errorManager: ErrorManager;
  // private renderManager: RenderManager;
  // private validationManager: ValidationManager;

  /**
   * Create a new MultiStepForm instance
   * @param props - Props for the MultiStepForm component
   */
  constructor(props: FlowupsFormProps) {
    // Initialize StatefulComponent
    super(props);

    // Set the form element as the root element and parse configuration
    this.setRootElement(props.selector);
    this.config = this.parseConfiguration();

    // Initialize managers
    this.cardManager = new CardManager(this);
    this.setManager = new SetManager(this);
    this.groupManager = new GroupManager(this);
    this.fieldManager = new FieldManager(this);
    this.inputManager = new InputManager(this);
    this.buttonManager = new ButtonManager(this);
    this.navigationManager = new NavigationManager(this);
    this.displayManager = new DisplayManager(this);
    this.progressManager = new ProgressManager(this);
    this.focusManager = new FocusManager(this);
    this.conditionManager = new ConditionManager(this);

    if (this.config.autoInit && !this.isInitialized()) this.init();
  }

  /**
   * Parse configuration from ${ATTR}* attributes
   * Attributes override config object
   */
  private parseConfiguration(): FlowupsFormConfig {
    // Get all ${ATTR}* attributes (type-safe with FormAttributeConfig)
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
      throw this.createError(
        `Invalid configuration: Behavior must be 'byField', 'bySet', 'byGroup', or 'byCard'`,
        'init',
        {
          cause: {
            behavior: attrs.behavior,
          },
        }
      );
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
    // Set up form submit listener
  }

  /**
   * Initialize the form
   * Called by StatefulComponent lifecycle
   */
  protected async onInit(): Promise<void> {
    await super.onInit();

    this.groupStart(`[FLOWUPS-DEBUG] Form: Initializing "${this.getId()}"`, false);
    this.logDebug(`Started at ${new Date().toISOString()}`);
    this.timeDebug('form:init');

    this.cardManager.init();
    this.setManager.init();
    this.groupManager.init();
    this.fieldManager.init();
    this.inputManager.init();
    this.buttonManager.init();
    this.displayManager.init();
    this.navigationManager.init();
    this.progressManager.init();
    this.focusManager.init();
    this.conditionManager.init();

    this.logDebug(`Form initialized`, {
      state: this.getAllState(),
      timestamp: new Date().toISOString(),
    });

    this.timeDebug('form:init', true);

    this.groupEnd();
  }

  /**
   * Cleanup on destroy
   * Called by StatefulComponent lifecycle
   */
  protected async onDestroy(): Promise<void> {
    this.logDebug(`Destroying form`);

    // TODO Phase 1 Step 3:
    // - Destroy all managers
    // - Emit form:destroyed event

    this.cardManager.destroy();
    this.setManager.destroy();
    this.groupManager.destroy();
    this.fieldManager.destroy();
    this.inputManager.destroy();
    this.navigationManager.destroy();
    this.displayManager.destroy();
    this.buttonManager.destroy();
    this.progressManager.destroy();
    this.focusManager.destroy();
    this.conditionManager.destroy();

    await super.onDestroy();
  }

  /**
   * Handle state changes
   * Called by StatefulComponent when state changes
   */
  protected handleStateChange<K extends keyof FormState>(
    key: K,
    from: FormState[K],
    to: FormState[K]
  ): void {
    this.logDebug(`State changed`, {
      key,
      from,
      to,
    });
  }

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
  public getFormConfig(): Readonly<FlowupsFormConfig> {
    return Object.freeze({ ...this.config });
  }

  /**
   * Get state value
   */
  public getState<K extends keyof FormState>(key: K): FormState[K] {
    return super.getState(key);
  }
}
