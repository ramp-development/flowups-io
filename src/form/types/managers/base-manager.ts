import type { MultiStepForm } from 'src/form/multi-step-form';

/**
 * Base Manager Interface
 * All managers extend this base interface
 */
export interface BaseManager {
  /** Initialize the manager */
  init(): void;

  /** Cleanup and remove event listeners */
  destroy(): void;

  /** Reference to parent form component */
  form: MultiStepForm;
}
