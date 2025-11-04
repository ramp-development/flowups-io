/**
 * Navigation Events - Set
 */
export interface SetChangingEvent {
  fromIndex: number;
  toIndex: number;
  fromId: string;
  toId: string;
  direction: 'forward' | 'backward';
}

export interface SetChangedEvent {
  setIndex: number;
  setId: string;
  setTitle: string;
}

export interface SetCompleteEvent {
  setId: string;
  setIndex: number;
}
