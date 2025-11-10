/**
 * Navigation Events
 */
export interface NavigationRequestEvent {
  type: 'prev' | 'next';
}

export interface NavigationChangedEvent {
  to: 'card' | 'set' | 'group' | 'field';
}

export interface ElementCompleteEvent {
  element: 'card' | 'set' | 'group' | 'field';
  index: number;
}
