/**
 * Error Events
 */

export interface ErrorTriggeredEvent {
  message: string;
  timeout?: number;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ErrorClearedEvent {}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ErrorDisplayedEvent {}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ErrorHiddenEvent {}
