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
  inputName: string;
  setIndex: number;
  setId: string;
  cardIndex: number;
  cardId: string;
}

export interface FieldCompleteEvent {
  fieldId: string;
  fieldIndex: number;
  inputName: string;
}
