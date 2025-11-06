/**
 * Navigation Events
 */
export interface NavigationRequestEvent {
  element: 'card' | 'set' | 'group' | 'field';
  type: 'prev' | 'next' | 'goTo';
  fromIndex: number | null;
  toIndex: number;
}

export interface NavigationChangedEvent {
  direction: 'prev' | 'next';
}

export interface ElementCompleteEvent {
  element: 'card' | 'set' | 'group' | 'field';
  index: number;
}
