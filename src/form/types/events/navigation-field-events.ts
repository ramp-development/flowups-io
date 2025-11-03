/**
 * Navigation Events - Field
 */
export interface FieldChangingEvent {
  fromIndex: number;
  toIndex: number;
  fromId: string;
  toId: string;
  direction: 'forward' | 'backward';
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
