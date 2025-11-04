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
  element: 'card' | 'set' | 'group' | 'field';
  index: number;
}

export interface ElementCompleteEvent {
  element: 'card' | 'set' | 'group' | 'field';
  index: number;
}
