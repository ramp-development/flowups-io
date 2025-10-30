/**
 * Progress Events
 */
export interface ProgressUpdatedEvent {
  formProgress: number;
  cardProgress: number;
  setProgress: number;
  groupProgress: number;
  cardsComplete: number;
  setsComplete: number;
  groupsComplete: number;
  fieldsComplete: number;
}
