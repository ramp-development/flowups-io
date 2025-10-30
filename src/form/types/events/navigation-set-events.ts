/**
 * Navigation Events - Set
 */
export interface SetChangingEvent {
  fromIndex: number;
  toIndex: number;
  fromId: string;
  toId: string;
}

export interface SetChangedEvent {
  setIndex: number;
  setId: string;
  setTitle: string;
  cardIndex: number;
  cardId: string;
}

export interface SetCompleteEvent {
  setId: string;
  setIndex: number;
}
