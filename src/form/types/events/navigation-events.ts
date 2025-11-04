/**
 * Navigation Events
 */
export interface NavigationRequestEvent {
  element: 'card' | 'set' | 'group' | 'field';
  type: 'prev' | 'next' | 'goTo';
  fromIndex: number;
  toIndex: number;
  fromId: string;
  toId: string;
}

export interface CardChangedEvent {
  cardIndex: number;
  cardId: string;
  cardTitle: string;
  previousCardIndex: number;
}

export interface CardCompleteEvent {
  cardId: string;
  cardIndex: number;
}
