import type { BaseManager } from './base-manager';

/**
 * Animation Manager Interface
 * Handles transitions between fields
 */
export interface AnimationManager extends BaseManager {
  /** Transition from one field to another */
  transitionField(
    fromField: HTMLElement,
    toField: HTMLElement,
    direction: 'forward' | 'backward'
  ): Promise<void>;

  /** Set transition type */
  setTransitionType(type: 'fade' | 'slide' | 'none'): void;

  /** Set transition duration */
  setTransitionDuration(ms: number): void;
}
