import type { BaseManager } from './base-manager';

/**
 * Input Manager Interface
 * Handles input discovery, value tracking, and lazy event binding
 */
export interface InputManager extends BaseManager {
  /** Discover all inputs in the form */
  discoverInputs(): void;

  /** Bind events to current field's input */
  bindCurrentFieldInput(): void;

  /** Unbind events from field's input */
  unbindFieldInput(fieldIndex: number): void;

  /** Get input value by name */
  getInputValue(name: string): unknown;

  /** Set input value by name */
  setInputValue(name: string, value: unknown): void;

  /** Get all form data */
  getAllFormData(): Record<string, unknown>;

  /** Get input element by name */
  getInputByName(name: string): HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
}
