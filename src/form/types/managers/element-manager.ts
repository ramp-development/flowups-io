import type { FlowupsForm } from 'src/form';

import type {
  CardElement,
  FieldElement,
  GroupElement,
  InputElement,
  SetElement,
} from '../elements';
import type {
  FormCardState,
  FormFieldState,
  FormGroupState,
  FormInputState,
  FormSetState,
} from '../state';
import type { IBaseManager } from './base-manager';

/**
 * Union of all element types
 */
export type ElementData = CardElement | SetElement | GroupElement | FieldElement | InputElement;

/**
 * Updatable element data
 * Only includes properties that can be updated at runtime
 */
export type UpdatableElementData<T extends ElementData> = Partial<
  Pick<
    T,
    Extract<
      keyof T,
      | 'active'
      | 'current'
      | 'visited'
      | 'completed'
      | 'isValid'
      | 'progress'
      | 'errors'
      | 'isIncluded'
    >
  >
>;

/**
 * Map element types to their corresponding state types
 */
export type ElementStateMap = {
  card: FormCardState;
  set: FormSetState;
  group: FormGroupState;
  field: FormFieldState;
  input: FormInputState;
};

/**
 * Get the state type for a given element
 */
export type StateForElement<T extends ElementData> = T extends { type: infer TType }
  ? TType extends keyof ElementStateMap
    ? ElementStateMap[TType]
    : never
  : never;

/**
 * Element Manager Interface
 * All element managers (Card, Set, Group, Field) implement this
 */
export interface IElementManager<TElement extends ElementData> extends IBaseManager {
  /** Reference to parent form */
  form: FlowupsForm;

  /** Calculate element-specific state */
  calculateStates(): Partial<StateForElement<TElement>>;

  /**
   * Update data for an element
   * @param selector - Element ID or index
   * @param data - Partial element data to update
   */
  updateElementData(selector: string | number, data?: UpdatableElementData<TElement>): void;

  /** Clear active flags for all elements */
  clearActiveAndCurrent(): void;

  /**
   * Set the active state on parent
   * @param parentId - ID of parent element
   * @param parentType - Type of parent (group, set, or card)
   * @param options - Active (boolean, defaults to true) and firstIsCurrent (boolean, defaults to false)
   */
  setActiveByParent(
    parentId: string,
    parentType: 'group' | 'set' | 'card',
    options: { active: boolean; firstIsCurrent: boolean }
  ): void;

  /** Get the total number of elements */
  getTotal(): number;

  /** Get element by index */
  getByIndex(index: number): TElement | null;

  /** Get element by ID */
  getById(id: string): TElement | null;

  /** Get all elements */
  getAll(): TElement[];

  /** Get the current element */
  getCurrent(): TElement | null;

  /** Write states to form */
  setStates(): void;

  /**
   * Update storage with the complete element
   * Used internally after merging data
   */
  updateStorage(element: TElement): void;
}
