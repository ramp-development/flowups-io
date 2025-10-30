/**
 * Navigation Events - Group
 */
export interface GroupChangingEvent {
  fromIndex: number;
  toIndex: number;
  fromId: string;
  toId: string;
}

export interface GroupChangedEvent {
  groupIndex: number;
  groupId: string;
  groupTitle: string;
  setIndex: number;
  setId: string;
}

export interface GroupCompleteEvent {
  groupId: string;
  groupIndex: number;
}
