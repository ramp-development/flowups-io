import type { IBaseManager } from './base-manager';

/**
 * Input Manager Interface
 * Handles input discovery, value tracking, and lazy event binding
 */
export interface IInputManager extends IBaseManager {
  /** Bind events to current field's input */
  bindInputs(): void;

  /** Unbind events from input by name */
  unbindInputs(activeIndices: number[]): void;

  /** Get input value by name */
  getInputValue(name: string): unknown;

  /** Set input value by name */
  setInputValue(name: string, value: unknown): void;

  /** Get all form data */
  getAllFormData(): Record<string, unknown>;
}
