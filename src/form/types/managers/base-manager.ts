import type { FlowupsForm } from 'src/form';

/**
 * Base Manager Interface
 * All managers extend this base interface
 */
export interface IBaseManager {
  /** Initialize the manager */
  init(): void;

  /** Cleanup and remove event listeners */
  destroy(): void;

  /** Reference to parent form component */
  form: FlowupsForm;
}
