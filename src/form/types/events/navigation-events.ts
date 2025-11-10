/**
 * Navigation Events
 */
export interface NavigationRequestEvent {
  type: 'prev' | 'next';
}

export interface NavigationChangedEvent {
  to: 'card' | 'set' | 'group' | 'field';
}
