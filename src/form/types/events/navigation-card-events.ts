/**
 * Navigation Events - Card
 */
export interface CardChangingEvent {
  fromIndex: number;
  toIndex: number;
  fromId: string;
  toId: string;
  direction: 'forward' | 'backward';
}

export interface CardChangedEvent {
  cardIndex: number;
  cardId: string;
  cardTitle: string;
}

export interface CardCompleteEvent {
  cardId: string;
  cardIndex: number;
}
