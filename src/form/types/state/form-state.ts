import type { StateValue } from '$lib/types';

export interface FormCardState {
  /** Current card index (0-based for internal use) */
  currentCardIndex: number;
  /** Current card ID (string identifier) */
  currentCardId: string;
  /** Current card title */
  currentCardTitle: string;
  /** Previous card index (for navigation history, null if first) */
  previousCardIndex: number | null;
  /** Next card index (for navigation history, null if last) */
  nextCardIndex: number | null;
  /** Set of completed card IDs */
  completedCards: Set<string>;
  /** Set of visited card IDs (includes current) */
  visitedCards: Set<string>;
  /** Total number of cards in form */
  totalCards: number;
  /** Number of cards completed */
  cardsComplete: number;
  /** Current card progress (0-100) */
  cardProgress: number;
}

export interface FormSetState {
  /** Current set index (0-based for internal use) */
  currentSetIndex: number;
  /** Current set ID (string identifier) */
  currentSetId: string;
  /** Current set title */
  currentSetTitle: string;
  /** Previous set index (for navigation history, null if first) */
  previousSetIndex: number | null;
  /** Next set index (for navigation history, null if last) */
  nextSetIndex: number | null;
  /** Set of completed set IDs */
  completedSets: Set<string>;
  /** Set of visited set IDs (includes current) */
  visitedSets: Set<string>;
  /** Total number of sets in form */
  totalSets: number;
  /** Number of sets completed */
  setsComplete: number;
  /** Current set progress (0-100) */
  setProgress: number;
  /** Validity state per set (key = set ID, value = is valid) */
  setValidity: Record<string, boolean>;
}

export interface FormGroupState {
  /** Current group index (0-based for internal use, -1 if no groups) */
  currentGroupIndex: number;
  /** Current group ID (string identifier, empty if no group) */
  currentGroupId: string;
  /** Current group title */
  currentGroupTitle: string;
  /** Previous group index (for navigation history, null if first) */
  previousGroupIndex: number | null;
  /** Next group index (for navigation history, null if last) */
  nextGroupIndex: number | null;
  /** Set of completed group IDs */
  completedGroups: Set<string>;
  /** Set of visited group IDs (includes current) */
  visitedGroups: Set<string>;
  /** Total number of groups in form */
  totalGroups: number;
  /** Number of groups completed */
  groupsComplete: number;
  /** Current group completion (0-100) */
  groupProgress: number;
  /** Validity state per group (key = group ID, value = is valid) */
  groupValidity: Record<string, boolean>;
}

export interface FormFieldState {
  /** Current field index (0-based for internal use) */
  currentFieldIndex: number;
  /** Previous field index (for navigation history, null if first) */
  previousFieldIndex: number | null;
  /** Set of completed field IDs */
  completedFields: Set<string>;
  /** Set of visited field IDs (includes current) */
  visitedFields: Set<string>;
  /** Total number of fields in form */
  totalFields: number;
  /** Number of fields completed */
  fieldsComplete: number;
  /** Current field progress (0-100) */
  fieldProgress: number;
  /** All form field values (key = input name, value = input value) */
  formData: Record<string, unknown>;
  /** Validity state per field (key = field ID, value = is valid) */
  fieldValidity: Record<string, boolean>;
  /** Field errors (key = field name, value = error messages array) */
  fieldErrors: Record<string, string[]>;
}

/**
 * Form State Interface
 *
 * Manages the complete state of the multi-step form including navigation,
 * progress tracking, and form data.
 */
export interface FormState extends FormCardState, FormSetState, FormGroupState, FormFieldState {
  // Index signature required by ComponentState
  [key: string]: StateValue;

  /** Overall form validity */
  isValid: boolean;
  /** Is form currently submitting */
  isSubmitting: boolean;
  /** Has form been initialized */
  isInitialized: boolean;
  /** Is form currently transitioning between fields */
  isTransitioning: boolean;
}
