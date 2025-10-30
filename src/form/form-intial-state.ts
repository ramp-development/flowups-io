export const FORM_INTIAL_STATE = [
  // Navigation state
  {
    key: 'currentCardIndex',
    defaultValue: 0,
  },

  {
    key: 'currentSetIndex',
    defaultValue: 0,
  },

  {
    key: 'currentGroupIndex',
    defaultValue: -1, // -1 if no groups
  },

  {
    key: 'currentFieldIndex',
    defaultValue: 0,
  },

  {
    key: 'currentCardId',
    defaultValue: '',
  },

  {
    key: 'currentSetId',
    defaultValue: '',
  },

  {
    key: 'currentGroupId',
    defaultValue: '',
  },

  {
    key: 'previousCardIndex',
    defaultValue: null,
  },

  {
    key: 'previousSetIndex',
    defaultValue: null,
  },

  {
    key: 'previousFieldIndex',
    defaultValue: null,
  },

  // Progress tracking
  {
    key: 'completedCards',
    defaultValue: new Set<string>(),
  },

  {
    key: 'completedSets',
    defaultValue: new Set<string>(),
  },

  {
    key: 'completedGroups',
    defaultValue: new Set<string>(),
  },

  {
    key: 'completedFields',
    defaultValue: new Set<string>(),
  },

  {
    key: 'visitedCards',
    defaultValue: new Set<string>(),
  },

  {
    key: 'visitedSets',
    defaultValue: new Set<string>(),
  },

  {
    key: 'visitedGroups',
    defaultValue: new Set<string>(),
  },

  {
    key: 'visitedFields',
    defaultValue: new Set<string>(),
  },

  // Totals
  {
    key: 'totalCards',
    defaultValue: 0,
  },

  {
    key: 'totalSets',
    defaultValue: 0,
  },

  {
    key: 'totalGroups',
    defaultValue: 0,
  },

  {
    key: 'totalFields',
    defaultValue: 0,
  },

  {
    key: 'cardsComplete',
    defaultValue: 0,
  },

  {
    key: 'setsComplete',
    defaultValue: 0,
  },

  {
    key: 'groupsComplete',
    defaultValue: 0,
  },

  {
    key: 'fieldsComplete',
    defaultValue: 0,
  },

  // Progress percentages
  {
    key: 'formProgress',
    defaultValue: 0,
  },

  {
    key: 'cardProgress',
    defaultValue: 0,
  },

  {
    key: 'setProgress',
    defaultValue: 0,
  },

  // Titles
  {
    key: 'currentCardTitle',
    defaultValue: '',
  },

  {
    key: 'currentSetTitle',
    defaultValue: '',
  },

  {
    key: 'currentGroupTitle',
    defaultValue: '',
  },

  // Form data
  {
    key: 'formData',
    defaultValue: {},
  },

  {
    key: 'setValidity',
    defaultValue: {},
  },

  {
    key: 'fieldValidity',
    defaultValue: {},
  },

  {
    key: 'fieldErrors',
    defaultValue: {},
  },

  {
    key: 'isValid',
    defaultValue: true,
  },

  // Status
  {
    key: 'isSubmitting',
    defaultValue: false,
  },

  {
    key: 'isInitialized',
    defaultValue: false,
  },

  {
    key: 'isTransitioning',
    defaultValue: false,
  },

  {
    key: 'groupProgress',
    defaultValue: 0,
  },
];
