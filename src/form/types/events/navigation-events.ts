/**
 * Navigation Events
 */
export interface NavigationRequestEvent {
  type: 'prev' | 'next';
}

export interface NavigationChangedEvent {
  target: 'card' | 'set' | 'group' | 'field';
}
