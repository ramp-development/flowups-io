import type { InputElement } from '../elements';
import type { IBaseManager } from './base-manager';

/**
 * Input Manager Interface
 * Handles input discovery, value tracking, and lazy event binding
 */
export interface IInputManager extends IBaseManager {
  /** Discover all inputs in the form */
  discoverInputs(): void;

  /** Bind events to current field's input */
  bindCurrentFieldInput(): void;

  /** Unbind events from input by name */
  unbindInput(name: string): void;

  /** Get input value by name */
  getInputValue(name: string): unknown;

  /** Set input value by name */
  setInputValue(name: string, value: unknown): void;

  /** Get all form data */
  getAllFormData(): Record<string, unknown>;

  /** Get input element by name */
  getInputByName(name: string): InputElement | null;
}
