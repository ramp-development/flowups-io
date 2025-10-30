/**
 * Form State Interface
 *
 * Manages the complete state of the multi-step form including navigation,
 * progress tracking, and form data.
 */
export interface FormState {
  // ============================================
  // Navigation State
  // ============================================

  /** Current card index (0-based for internal use) */
  currentCardIndex: number;

  /** Current set index (0-based for internal use) */
  currentSetIndex: number;

  /** Current group index (0-based for internal use, -1 if no groups) */
  currentGroupIndex: number;

  /** Current field index (0-based for internal use) */
  currentFieldIndex: number;

  /** Current card ID (string identifier) */
  currentCardId: string;

  /** Current set ID (string identifier) */
  currentSetId: string;

  /** Current group ID (string identifier, empty if no group) */
  currentGroupId: string;

  /** Previous card index (for navigation history, null if first) */
  previousCardIndex: number | null;

  /** Previous set index (for navigation history, null if first) */
  previousSetIndex: number | null;

  /** Previous field index (for navigation history, null if first) */
  previousFieldIndex: number | null;

  /** Current navigation behavior mode (v1.0: byField only) */
  behavior: 'byField'; // Future: 'byCard' | 'bySet' | 'byGroup' | 'byField'

  // ============================================
  // Progress Tracking - Completion
  // ============================================

  /** Set of completed card IDs */
  completedCards: Set<string>;

  /** Set of completed set IDs */
  completedSets: Set<string>;

  /** Set of completed group IDs */
  completedGroups: Set<string>;

  /** Set of completed field IDs */
  completedFields: Set<string>;

  /** Set of visited card IDs (includes current) */
  visitedCards: Set<string>;

  /** Set of visited set IDs (includes current) */
  visitedSets: Set<string>;

  /** Set of visited group IDs (includes current) */
  visitedGroups: Set<string>;

  /** Set of visited field IDs (includes current) */
  visitedFields: Set<string>;

  // ============================================
  // Progress Tracking - Counts & Totals
  // ============================================

  /** Total number of cards in form */
  totalCards: number;

  /** Total number of sets in form */
  totalSets: number;

  /** Total number of groups in form */
  totalGroups: number;

  /** Total number of fields in form */
  totalFields: number;

  /** Number of cards completed */
  cardsComplete: number;

  /** Number of sets completed */
  setsComplete: number;

  /** Number of groups completed */
  groupsComplete: number;

  /** Number of fields completed */
  fieldsComplete: number;

  // ============================================
  // Progress Tracking - Percentages
  // ============================================

  /** Overall form completion (0-100) */
  formProgress: number;

  /** Current card completion (0-100) */
  cardProgress: number;

  /** Current set completion (0-100) */
  setProgress: number;

  /** Current group completion (0-100) */
  groupProgress: number;

  // ============================================
  // Titles (for display)
  // ============================================

  /** Current card title */
  currentCardTitle: string;

  /** Current set title */
  currentSetTitle: string;

  /** Current group title */
  currentGroupTitle: string;

  // ============================================
  // Form Data & Validation
  // ============================================

  /** All form field values (key = input name, value = input value) */
  formData: Record<string, unknown>;

  /** Validity state per set (key = set ID, value = is valid) */
  setValidity: Record<string, boolean>;

  /** Validity state per field (key = field ID, value = is valid) */
  fieldValidity: Record<string, boolean>;

  /** Field errors (key = field name, value = error messages array) */
  fieldErrors: Record<string, string[]>;

  /** Overall form validity */
  isValid: boolean;

  // ============================================
  // Form Status
  // ============================================

  /** Is form currently submitting */
  isSubmitting: boolean;

  /** Has form been initialized */
  isInitialized: boolean;

  /** Is form currently transitioning between fields */
  isTransitioning: boolean;
}
