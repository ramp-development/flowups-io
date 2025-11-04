/**
 * Display Manager
 *
 * Handles showing/hiding form elements at all hierarchy levels (cards, sets, groups, fields).
 * Simple display toggling without animations (instant show/hide).
 * Behavior-aware: shows/hides appropriate level based on behavior mode.
 * Will be replaced/enhanced by AnimationManager in future phases.
 */

import type { FlowupsForm } from '..';
import type {
  CardChangingEvent,
  FieldChangedEvent,
  GroupChangingEvent,
  IDisplayManager,
  SetChangingEvent,
} from '../types';

/**
 * DisplayManager Implementation
 *
 * Subscribes to navigation change events and updates element visibility.
 * Uses display: none/block for instant showing/hiding.
 */
export class DisplayManager implements IDisplayManager {
  // ============================================
  // Properties
  // ============================================

  /** Reference to parent form component */
  public readonly form: FlowupsForm;

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
   */
  public init(): void {
    this.setupEventListeners();
    this.initializeVisibility();

    if (this.form.getFormConfig().debug) {
      this.form.logDebug('DisplayManager initialized');
    }
  }

  /**
   * Cleanup manager resources
   */
  public destroy(): void {
    if (this.form.getFormConfig().debug) {
      this.form.logDebug('DisplayManager destroyed');
    }
  }

  // ============================================
  // Event Listeners
  // ============================================

  /**
   * Setup event listeners for navigation events based on behavior
   */
  private setupEventListeners(): void {
    const behavior = this.form.getBehavior();

    switch (behavior) {
      case 'byField':
        this.form.subscribe('form:field:changed', this.handleFieldChanged);
        break;

      // case 'byGroup':
      //   this.form.subscribe('form:group:changed', this.handleGroupChanged);
      //   break;

      // case 'bySet':
      //   this.form.subscribe('form:set:changed', this.handleSetChanged);
      //   break;

      // case 'byCard':
      //   this.form.subscribe('form:card:changed', this.handleCardChanged);
      //   break;
    }

    if (this.form.getFormConfig().debug) {
      this.form.logDebug('DisplayManager event listeners setup', { behavior });
    }
  }

  // ============================================
  // Event Handlers
  // ============================================

  /**
   * Handle card changed event
   * Shows the new active card and hides all others
   */
  private handleCardChanged = (payload: CardChangingEvent): void => {
    const { fromId, toId } = payload;

    if (this.form.getFormConfig().debug) {
      this.form.logDebug('DisplayManager handling card change', {
        fromId,
        toId,
      });
    }

    // Hide old card
    if (fromId) {
      this.hideCard(fromId);
    }

    // Show new card
    this.showCard(toId);
  };

  /**
   * Handle set changed event
   * Shows the new active set and hides all others
   */
  private handleSetChanged = (payload: SetChangingEvent): void => {
    const { fromId, toId } = payload;

    if (this.form.getFormConfig().debug) {
      this.form.logDebug('DisplayManager handling set change', {
        fromId,
        toId,
      });
    }

    // Hide old set
    if (fromId) {
      this.hideSet(fromId);
    }

    // Show new set
    this.showSet(toId);
  };

  /**
   * Handle group changed event
   * Shows the new active group and hides all others
   */
  private handleGroupChanged = (payload: GroupChangingEvent): void => {
    const { fromId, toId } = payload;

    if (this.form.getFormConfig().debug) {
      this.form.logDebug('DisplayManager handling group change', {
        fromId,
        toId,
      });
    }

    // Hide old group
    if (fromId) {
      this.hideGroup(fromId);
    }

    // Show new group
    this.showGroup(toId);
  };

  /**
   * Handle field changed event
   * Shows the new active field and hides all others
   */
  private handleFieldChanged = (payload: FieldChangedEvent): void => {
    const { fieldIndex, previousFieldIndex } = payload;

    if (this.form.getFormConfig().debug) {
      this.form.logDebug('DisplayManager handling field change', {
        from: previousFieldIndex,
        to: fieldIndex,
      });
    }

    // Hide old field
    if (previousFieldIndex) {
      this.hideField(previousFieldIndex);
    }

    // Show new field
    this.showField(fieldIndex);
  };

  // ============================================
  // Initialization
  // ============================================

  /**
   * Initialize visibility based on behavior mode
   * Shows first item of appropriate level, hides all others
   */
  private initializeVisibility(): void {
    const behavior = this.form.getBehavior();

    switch (behavior) {
      case 'byField':
        this.initializeFieldVisibility();
        this.initializeGroupVisibility();
        this.initializeSetVisibility();
        this.initializeCardVisibility();
        break;

      // case 'byGroup':
      //   this.initializeGroupVisibility();
      //   break;

      // case 'bySet':
      //   this.initializeSetVisibility();
      //   break;

      // case 'byCard':
      //   this.initializeCardVisibility();
      //   break;
    }
  }

  /**
   * Initialize card visibility (show first, hide others)
   */
  private initializeCardVisibility(): void {
    const cards = this.form.cardManager.getCards();
    const currentCardIndex = 0; // TODO: get from state when implemented

    cards.forEach((card, index) => {
      if (index === currentCardIndex) {
        this.showElement(card.element);
      } else {
        this.hideElement(card.element);
      }
    });

    if (this.form.getFormConfig().debug) {
      this.form.logDebug('Initialized card visibility', {
        totalCards: cards.length,
        currentCardIndex,
      });
    }
  }

  /**
   * Initialize set visibility (show first, hide others)
   */
  private initializeSetVisibility(): void {
    const sets = this.form.setManager.getSets();
    const currentSetIndex = 0; // TODO: get from state when implemented

    sets.forEach((set, index) => {
      if (index === currentSetIndex) {
        this.showElement(set.element);
      } else {
        this.hideElement(set.element);
      }
    });

    if (this.form.getFormConfig().debug) {
      this.form.logDebug('Initialized set visibility', {
        totalSets: sets.length,
        currentSetIndex,
      });
    }
  }

  /**
   * Initialize group visibility (show first, hide others)
   */
  private initializeGroupVisibility(): void {
    const groups = this.form.groupManager.getGroups();
    const currentGroupIndex = 0; // TODO: get from state when implemented

    groups.forEach((group, index) => {
      if (index === currentGroupIndex) {
        this.showElement(group.element);
      } else {
        this.hideElement(group.element);
      }
    });

    if (this.form.getFormConfig().debug) {
      this.form.logDebug('Initialized group visibility', {
        totalGroups: groups.length,
        currentGroupIndex,
      });
    }
  }

  /**
   * Initialize field visibility (show first, hide others)
   */
  private initializeFieldVisibility(): void {
    const fields = this.form.fieldManager.getFields();
    const currentFieldIndex = this.form.getState('currentFieldIndex');

    fields.forEach((field, index) => {
      if (index === currentFieldIndex) {
        this.showElement(field.element);
      } else {
        this.hideElement(field.element);
      }
    });

    if (this.form.getFormConfig().debug) {
      this.form.logDebug('Initialized field visibility', {
        totalFields: fields.length,
        currentFieldIndex,
      });
    }
  }

  // ============================================
  // Base Show/Hide Methods
  // ============================================

  /**
   * Show an element
   * Removes hidden class and display: none
   */
  public showElement(element: HTMLElement): void {
    element.style.removeProperty('display');
  }

  /**
   * Hide an element
   * Adds hidden class and sets display: none
   */
  public hideElement(element: HTMLElement): void {
    element.style.setProperty('display', 'none');
  }

  // ============================================
  // Card Methods
  // ============================================

  /**
   * Show card by ID
   */
  public showCard(cardId: string): void {
    const card = this.form.cardManager.getCardById(cardId);
    if (!card) {
      this.form.logWarn(`Cannot show card: card "${cardId}" not found`);
      return;
    }

    this.showElement(card.element);
  }

  /**
   * Hide card by ID
   */
  public hideCard(cardId: string): void {
    const card = this.form.cardManager.getCardById(cardId);
    if (!card) {
      this.form.logWarn(`Cannot hide card: card "${cardId}" not found`);
      return;
    }

    this.hideElement(card.element);
  }

  /**
   * Show all cards
   */
  public showAllCards(): void {
    const cards = this.form.cardManager.getCards();
    cards.forEach((card) => this.showElement(card.element));

    if (this.form.getFormConfig().debug) {
      this.form.logDebug('Showing all cards', { count: cards.length });
    }
  }

  /**
   * Hide all cards
   */
  public hideAllCards(): void {
    const cards = this.form.cardManager.getCards();
    cards.forEach((card) => this.hideElement(card.element));

    if (this.form.getFormConfig().debug) {
      this.form.logDebug('Hiding all cards', { count: cards.length });
    }
  }

  // ============================================
  // Set Methods
  // ============================================

  /**
   * Show set by ID
   */
  public showSet(setId: string): void {
    const set = this.form.setManager.getSetById(setId);
    if (!set) {
      this.form.logWarn(`Cannot show set: set "${setId}" not found`);
      return;
    }

    this.showElement(set.element);
  }

  /**
   * Hide set by ID
   */
  public hideSet(setId: string): void {
    const set = this.form.setManager.getSetById(setId);
    if (!set) {
      this.form.logWarn(`Cannot hide set: set "${setId}" not found`);
      return;
    }

    this.hideElement(set.element);
  }

  /**
   * Show all sets
   */
  public showAllSets(): void {
    const sets = this.form.setManager.getSets();
    sets.forEach((set) => this.showElement(set.element));

    if (this.form.getFormConfig().debug) {
      this.form.logDebug('Showing all sets', { count: sets.length });
    }
  }

  /**
   * Hide all sets
   */
  public hideAllSets(): void {
    const sets = this.form.setManager.getSets();
    sets.forEach((set) => this.hideElement(set.element));

    if (this.form.getFormConfig().debug) {
      this.form.logDebug('Hiding all sets', { count: sets.length });
    }
  }

  // ============================================
  // Group Methods
  // ============================================

  /**
   * Show group by ID
   */
  public showGroup(groupId: string): void {
    const group = this.form.groupManager.getGroupById(groupId);
    if (!group) {
      this.form.logWarn(`Cannot show group: group "${groupId}" not found`);
      return;
    }

    this.showElement(group.element);
  }

  /**
   * Hide group by ID
   */
  public hideGroup(groupId: string): void {
    const group = this.form.groupManager.getGroupById(groupId);
    if (!group) {
      this.form.logWarn(`Cannot hide group: group "${groupId}" not found`);
      return;
    }

    this.hideElement(group.element);
  }

  /**
   * Show all groups
   */
  public showAllGroups(): void {
    const groups = this.form.groupManager.getGroups();
    groups.forEach((group) => this.showElement(group.element));

    if (this.form.getFormConfig().debug) {
      this.form.logDebug('Showing all groups', { count: groups.length });
    }
  }

  /**
   * Hide all groups
   */
  public hideAllGroups(): void {
    const groups = this.form.groupManager.getGroups();
    groups.forEach((group) => this.hideElement(group.element));

    if (this.form.getFormConfig().debug) {
      this.form.logDebug('Hiding all groups', { count: groups.length });
    }
  }

  // ============================================
  // Field Methods
  // ============================================

  /**
   * Show field by ID
   */
  private showField(fieldIndex: number): void {
    const field = this.form.fieldManager.getFieldByIndex(fieldIndex);
    if (!field) {
      this.form.logWarn(`Cannot show field: field at index "${fieldIndex}" not found`);
      return;
    }

    this.showElement(field.element);
  }

  /**
   * Hide field by ID
   */
  private hideField(fieldIndex: number): void {
    const field = this.form.fieldManager.getFieldByIndex(fieldIndex);
    if (!field) {
      this.form.logWarn(`Cannot hide field: field at index "${fieldIndex}" not found`);
      return;
    }

    this.hideElement(field.element);
  }

  /**
   * Show all fields
   */
  private showAllFields(): void {
    const fields = this.form.fieldManager.getFields();
    fields.forEach((field) => this.showElement(field.element));

    if (this.form.getFormConfig().debug) {
      this.form.logDebug('Showing all fields', { count: fields.length });
    }
  }

  /**
   * Hide all fields
   */
  public hideAllFields(): void {
    const fields = this.form.fieldManager.getFields();
    fields.forEach((field) => this.hideElement(field.element));

    if (this.form.getFormConfig().debug) {
      this.form.logDebug('Hiding all fields', { count: fields.length });
    }
  }
}
