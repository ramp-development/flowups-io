import type { CardItem, FieldItem, GroupItem, InputItem, SetItem } from '../items';
import type {
  FormCardState,
  FormFieldState,
  FormGroupState,
  FormInputState,
  FormSetState,
} from '../state';

/**
 * Union of all item types
 */
export type ItemData = CardItem | SetItem | GroupItem | FieldItem | InputItem;

/**
 * Updatable item data
 * Only includes properties that can be updated at runtime
 */
export type UpdatableItemData<T extends ItemData> = Partial<
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
 * Map items types to their corresponding state types
 */
export type ItemStateMap = {
  card: FormCardState;
  set: FormSetState;
  group: FormGroupState;
  field: FormFieldState;
  input: FormInputState;
};

/**
 * Get the state type for a given item
 */
export type StateForItem<T extends ItemData> = T extends { type: infer TType }
  ? TType extends keyof ItemStateMap
    ? ItemStateMap[TType]
    : never
  : never;
