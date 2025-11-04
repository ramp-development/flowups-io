/**
 * Navigation Events - Field
 */
export interface FieldChangingEvent {
  direction: 'forward' | 'backward';
  fromIndex: number;
  toIndex: number;
  fromId: string;
  toId: string;
}

export interface FieldChangedEvent {
  fieldIndex: number;
  fieldId: string;
  previousFieldIndex: number;
}

export interface FieldCompleteEvent {
  fieldId: string;
  fieldIndex: number;
  inputName: string;
}
