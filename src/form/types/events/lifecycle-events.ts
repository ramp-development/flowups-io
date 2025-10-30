/**
 * Form Lifecycle Events
 */
export interface FormInitializedEvent {
  formName: string;
  totalCards: number;
  totalSets: number;
  totalGroups: number;
  totalFields: number;
}

export interface FormDestroyedEvent {
  formName: string;
}
