/**
 * Navigation Events - Card
 */
export interface CardChangingEvent {
  direction: 'forward' | 'backward';
  fromIndex: number;
  toIndex: number;
  fromId: string;
  toId: string;
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
