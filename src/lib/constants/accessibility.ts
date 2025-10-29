/**
 * Accessibility constants for ARIA labels, roles, and announcements
 */

export const A11Y = {
  // ARIA labels
  ARIA_LABELS: {
    // Common actions
    CLOSE: 'Close',
    CLOSE_MODAL: 'Close dialog',
    CLOSE_ALERT: 'Dismiss alert',
    OPEN_MENU: 'Open menu',
    CLOSE_MENU: 'Close menu',
    EXPAND: 'Expand',
    COLLAPSE: 'Collapse',
    TOGGLE: 'Toggle',

    // Navigation
    NEXT: 'Next',
    PREVIOUS: 'Previous',
    FIRST: 'Go to first',
    LAST: 'Go to last',
    PAGE_NUMBER: 'Go to page {number}',
    CURRENT_PAGE: 'Current page, page {number}',

    // Forms
    REQUIRED_FIELD: 'Required field',
    OPTIONAL_FIELD: 'Optional field',
    ERROR_MESSAGE: 'Error message',
    HELP_TEXT: 'Help text',
    FORM_INSTRUCTIONS: 'Form instructions',
    SUBMIT_FORM: 'Submit form',
    RESET_FORM: 'Reset form',

    // Status
    LOADING: 'Loading',
    LOADING_CONTENT: 'Loading content',
    LOADING_MORE: 'Loading more items',
    PROCESSING: 'Processing',
    SAVING: 'Saving',
    SAVED: 'Saved',

    // Selection
    SELECT_ALL: 'Select all',
    DESELECT_ALL: 'Deselect all',
    SELECTED: 'Selected',
    NOT_SELECTED: 'Not selected',

    // Sorting
    SORT_ASCENDING: 'Sort ascending',
    SORT_DESCENDING: 'Sort descending',
    SORTABLE_COLUMN: 'Sortable column',

    // Search
    SEARCH: 'Search',
    SEARCH_RESULTS: 'Search results',
    NO_RESULTS: 'No results found',
    CLEAR_SEARCH: 'Clear search',

    // Media
    PLAY: 'Play',
    PAUSE: 'Pause',
    STOP: 'Stop',
    MUTE: 'Mute',
    UNMUTE: 'Unmute',
    FULL_SCREEN: 'Enter full screen',
    EXIT_FULL_SCREEN: 'Exit full screen',

    // File upload
    CHOOSE_FILE: 'Choose file',
    CHOSEN_FILE: 'Chosen file: {filename}',
    REMOVE_FILE: 'Remove file',
    UPLOAD_PROGRESS: 'Upload progress: {percent}%',

    // Tabs
    TAB_LIST: 'Tab list',
    TAB_PANEL: 'Tab panel',
    ACTIVE_TAB: 'Active tab',

    // Modal/Dialog
    DIALOG: 'Dialog',
    MODAL_DIALOG: 'Modal dialog',
    ALERT_DIALOG: 'Alert dialog',

    // Progress
    PROGRESS: 'Progress',
    PROGRESS_BAR: 'Progress bar',
    STEP_PROGRESS: 'Step {current} of {total}',

    // Notifications
    NOTIFICATION: 'Notification',
    SUCCESS_MESSAGE: 'Success message',
    WARNING_MESSAGE: 'Warning message',
    ERROR_NOTIFICATION: 'Error notification',
    INFO_MESSAGE: 'Information message',
  },

  // ARIA roles
  ROLES: {
    // Landmarks
    BANNER: 'banner',
    NAVIGATION: 'navigation',
    MAIN: 'main',
    COMPLEMENTARY: 'complementary',
    CONTENTINFO: 'contentinfo',
    SEARCH: 'search',

    // Structure
    ARTICLE: 'article',
    SECTION: 'section',
    REGION: 'region',
    HEADING: 'heading',
    LIST: 'list',
    LISTITEM: 'listitem',

    // Forms
    FORM: 'form',
    TEXTBOX: 'textbox',
    BUTTON: 'button',
    CHECKBOX: 'checkbox',
    RADIO: 'radio',
    COMBOBOX: 'combobox',
    LISTBOX: 'listbox',
    OPTION: 'option',

    // Live regions
    ALERT: 'alert',
    ALERTDIALOG: 'alertdialog',
    STATUS: 'status',
    LOG: 'log',
    MARQUEE: 'marquee',
    TIMER: 'timer',

    // Windows
    DIALOG: 'dialog',
    TOOLTIP: 'tooltip',

    // Navigation
    MENU: 'menu',
    MENUBAR: 'menubar',
    MENUITEM: 'menuitem',
    TAB: 'tab',
    TABLIST: 'tablist',
    TABPANEL: 'tabpanel',

    // Other
    PROGRESSBAR: 'progressbar',
    SEPARATOR: 'separator',
    TOOLBAR: 'toolbar',
    PRESENTATION: 'presentation',
    NONE: 'none',
  },

  // Screen reader announcements
  ANNOUNCEMENTS: {
    // Form states
    FORM_SUBMITTED: 'Form submitted successfully',
    FORM_ERROR: 'Form contains errors. Please review and correct.',
    FIELD_ERROR: 'Error: {message}',
    FIELD_VALID: 'Field is valid',

    // Loading states
    LOADING_STARTED: 'Loading started',
    LOADING_COMPLETE: 'Loading complete',
    CONTENT_UPDATED: 'Content updated',

    // Navigation
    PAGE_CHANGED: 'Page {number} loaded',
    TAB_SELECTED: '{label} tab selected',
    STEP_COMPLETED: 'Step {number} completed',
    NAVIGATION_OPENED: 'Navigation menu opened',
    NAVIGATION_CLOSED: 'Navigation menu closed',

    // Selections
    ITEM_SELECTED: '{item} selected',
    ITEM_DESELECTED: '{item} deselected',
    ALL_SELECTED: 'All items selected',
    ALL_DESELECTED: 'All items deselected',
    SELECTION_COUNT: '{count} items selected',

    // Actions
    COPIED: 'Copied to clipboard',
    DELETED: 'Item deleted',
    ADDED: 'Item added',
    SAVED: 'Changes saved',
    CANCELLED: 'Action cancelled',

    // Search
    SEARCH_RESULTS: '{count} results found',
    SEARCH_NO_RESULTS: 'No results found for "{query}"',
    SEARCH_CLEARED: 'Search cleared',

    // Errors
    ERROR_OCCURRED: 'An error occurred: {message}',
    CONNECTION_LOST: 'Connection lost. Please check your internet connection.',
    SESSION_EXPIRED: 'Your session has expired. Please log in again.',

    // File operations
    FILE_UPLOADED: 'File "{filename}" uploaded successfully',
    FILE_REMOVED: 'File removed',
    UPLOAD_FAILED: 'Upload failed: {error}',

    // Sorting
    SORTED_ASCENDING: 'Sorted by {column} in ascending order',
    SORTED_DESCENDING: 'Sorted by {column} in descending order',
  },

  // ARIA attributes
  ATTRIBUTES: {
    // States
    EXPANDED: 'aria-expanded',
    SELECTED: 'aria-selected',
    CHECKED: 'aria-checked',
    PRESSED: 'aria-pressed',
    DISABLED: 'aria-disabled',
    HIDDEN: 'aria-hidden',
    INVALID: 'aria-invalid',
    BUSY: 'aria-busy',
    CURRENT: 'aria-current',

    // Properties
    LABEL: 'aria-label',
    LABELLEDBY: 'aria-labelledby',
    DESCRIBEDBY: 'aria-describedby',
    CONTROLS: 'aria-controls',
    LIVE: 'aria-live',
    ATOMIC: 'aria-atomic',
    RELEVANT: 'aria-relevant',

    // Values
    VALUENOW: 'aria-valuenow',
    VALUEMIN: 'aria-valuemin',
    VALUEMAX: 'aria-valuemax',
    VALUETEXT: 'aria-valuetext',

    // Relationships
    OWNS: 'aria-owns',
    FLOWTO: 'aria-flowto',
    POSINSET: 'aria-posinset',
    SETSIZE: 'aria-setsize',
    LEVEL: 'aria-level',
  },

  // Keyboard navigation
  KEYBOARD: {
    // Navigation keys
    TAB: 'Tab',
    SHIFT_TAB: 'Shift+Tab',
    ARROW_UP: 'ArrowUp',
    ARROW_DOWN: 'ArrowDown',
    ARROW_LEFT: 'ArrowLeft',
    ARROW_RIGHT: 'ArrowRight',
    HOME: 'Home',
    END: 'End',
    PAGE_UP: 'PageUp',
    PAGE_DOWN: 'PageDown',

    // Action keys
    ENTER: 'Enter',
    SPACE: 'Space',
    ESCAPE: 'Escape',
    DELETE: 'Delete',
    BACKSPACE: 'Backspace',
  },
} as const;

// Type exports
export type AriaLabel = (typeof A11Y.ARIA_LABELS)[keyof typeof A11Y.ARIA_LABELS];
export type AriaRole = (typeof A11Y.ROLES)[keyof typeof A11Y.ROLES];
export type AriaAnnouncement = (typeof A11Y.ANNOUNCEMENTS)[keyof typeof A11Y.ANNOUNCEMENTS];
