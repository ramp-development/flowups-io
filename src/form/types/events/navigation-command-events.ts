/**
 * Navigation Command Events
 *
 * Events emitted by NavigationManager to trigger navigation actions.
 * Managers subscribe to these events based on current form behavior.
 */

import type { FormBehavior } from '../config';

/**
 * Navigate to next item
 * Manager interprets based on behavior (field/group/set/card)
 */
export interface NavigationNextEvent {
  behavior: FormBehavior;
}

/**
 * Navigate to previous item
 * Manager interprets based on behavior (field/group/set/card)
 */
export interface NavigationPrevEvent {
  behavior: FormBehavior;
}

/**
 * Navigate to specific item by ID or index
 * Manager interprets target based on behavior
 */
export interface NavigationGoToEvent {
  behavior: FormBehavior;
  target: string | number;
}

/**
 * Boundary reached events
 * Emitted when a manager reaches the end/start of its navigable items
 */
export interface BoundaryReachedEvent {
  /** What context reached the boundary (field/group/set/card) */
  context: 'field' | 'group' | 'set' | 'card';

  /** ID of current item at boundary */
  currentId: string;

  /** Which boundary was reached */
  boundary: 'start' | 'end';

  /** Direction of navigation attempt */
  direction: 'forward' | 'backward';
}
