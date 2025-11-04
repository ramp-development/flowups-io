/**
 * Navigation Events - Group
 */
export interface GroupChangingEvent {
  fromIndex: number;
  toIndex: number;
  fromId: string;
  toId: string;
  direction: 'forward' | 'backward';
}

export interface GroupChangedEvent {
  groupIndex: number;
  groupId: string;
  groupTitle: string;
}

export interface GroupCompleteEvent {
  groupId: string;
  groupIndex: number;
}
