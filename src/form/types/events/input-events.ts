/**
 * Input Events
 * Emitted by InputManager when input values change
 */

/**
 * Input Changed Event
 * Emitted when an input value changes
 */
export interface InputChangedEvent {
  name: string;
  value: unknown;
}
