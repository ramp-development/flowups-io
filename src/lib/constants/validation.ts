/**
 * Validation constants including messages, patterns, and limits
 */

export const VALIDATION = {
  // Error messages
  MESSAGES: {
    // Required fields
    REQUIRED: 'This field is required',
    REQUIRED_SELECT: 'Please select an option',
    REQUIRED_CHECKBOX: 'This must be checked',

    // Type validation
    INVALID_TYPE: 'Invalid input type',
    INVALID_NUMBER: 'Please enter a valid number',
    INVALID_INTEGER: 'Please enter a whole number',
    INVALID_DECIMAL: 'Please enter a valid decimal number',

    // String validation
    MIN_LENGTH: 'Must be at least {min} characters',
    MAX_LENGTH: 'Must be no more than {max} characters',
    EXACT_LENGTH: 'Must be exactly {length} characters',
    PATTERN_MISMATCH: 'Please match the required format',

    // Number validation
    MIN_VALUE: 'Must be at least {min}',
    MAX_VALUE: 'Must be no more than {max}',
    RANGE: 'Must be between {min} and {max}',
    STEP: 'Must be a multiple of {step}',

    // Email
    EMAIL_INVALID: 'Please enter a valid email address',
    EMAIL_DOMAIN: 'Email domain is not allowed',

    // Phone
    PHONE_INVALID: 'Please enter a valid phone number',
    PHONE_COUNTRY: 'Phone number must include country code',

    // URL
    URL_INVALID: 'Please enter a valid URL',
    URL_PROTOCOL: 'URL must start with http:// or https://',

    // Date
    DATE_INVALID: 'Please enter a valid date',
    DATE_MIN: 'Date must be after {min}',
    DATE_MAX: 'Date must be before {max}',
    DATE_RANGE: 'Date must be between {min} and {max}',
    DATE_WEEKDAY: 'Please select a weekday',
    DATE_WEEKEND: 'Please select a weekend day',

    // File
    FILE_REQUIRED: 'Please select a file',
    FILE_SIZE: 'File size must not exceed {size}',
    FILE_TYPE: 'File type must be one of: {types}',
    FILE_DIMENSIONS: 'Image dimensions must be {width}x{height}',

    // Password
    PASSWORD_WEAK: 'Password is too weak',
    PASSWORD_COMMON: 'This password is too common',
    PASSWORD_MATCH: 'Passwords do not match',
    PASSWORD_REQUIREMENTS: 'Password must contain at least {requirements}',

    // Credit card
    CARD_INVALID: 'Invalid card number',
    CARD_EXPIRED: 'Card has expired',
    CVV_INVALID: 'Invalid security code',

    // Custom
    CUSTOM_ERROR: 'Validation failed',
    ASYNC_ERROR: 'Unable to validate at this time',
  },

  // Regex patterns
  PATTERNS: {
    // Email - RFC 5322 simplified
    EMAIL:
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,

    // Phone - International format
    PHONE: /^\+?[1-9]\d{1,14}$/,
    PHONE_US: /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/,

    // URL
    URL: /^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)$/,

    // Numbers
    NUMERIC: /^-?\d+(\.\d+)?$/,
    INTEGER: /^-?\d+$/,
    POSITIVE_INTEGER: /^\d+$/,
    DECIMAL: /^-?\d+\.\d+$/,

    // Alphanumeric
    ALPHANUMERIC: /^[a-zA-Z0-9]+$/,
    ALPHA: /^[a-zA-Z]+$/,

    // Username
    USERNAME: /^[a-zA-Z0-9_-]{3,16}$/,

    // Password strength
    PASSWORD_LOWERCASE: /[a-z]/,
    PASSWORD_UPPERCASE: /[A-Z]/,
    PASSWORD_NUMBER: /\d/,
    PASSWORD_SPECIAL: /[!@#$%^&*(),.?":{}|<>]/,

    // Credit card
    CARD_NUMBER: /^\d{13,19}$/,
    CARD_CVV: /^\d{3,4}$/,
    CARD_EXPIRY: /^(0[1-9]|1[0-2])\/\d{2}$/,

    // Date formats
    DATE_ISO: /^\d{4}-\d{2}-\d{2}$/,
    DATE_US: /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/,
    DATE_EU: /^(0[1-9]|[12]\d|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/,

    // Time
    TIME_24H: /^([01]\d|2[0-3]):([0-5]\d)$/,
    TIME_12H: /^(0?[1-9]|1[0-2]):([0-5]\d)\s?(AM|PM|am|pm)$/,

    // Postal codes
    POSTAL_US: /^\d{5}(-\d{4})?$/,
    POSTAL_CA: /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/,
    POSTAL_UK: /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i,

    // Other
    HEX_COLOR: /^#?([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$/,
    IPV4: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
    UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  },

  // Validation limits
  LIMITS: {
    // String lengths
    MIN_PASSWORD_LENGTH: 8,
    MAX_PASSWORD_LENGTH: 128,
    MIN_USERNAME_LENGTH: 3,
    MAX_USERNAME_LENGTH: 32,
    MAX_INPUT_LENGTH: 255,
    MAX_TEXTAREA_LENGTH: 5000,
    MAX_URL_LENGTH: 2048,

    // Numbers
    MIN_AGE: 13,
    MAX_AGE: 120,
    MIN_YEAR: 1900,
    MAX_YEAR: 2100,

    // Files
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
    MAX_FILE_COUNT: 10,

    // Arrays
    MIN_SELECTION: 1,
    MAX_SELECTION: 10,

    // Attempts
    MAX_VALIDATION_ATTEMPTS: 3,
    VALIDATION_TIMEOUT: 5000, // 5 seconds
  },

  // Allowed values
  ALLOWED: {
    // File types
    IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    DOCUMENT_TYPES: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    VIDEO_TYPES: ['video/mp4', 'video/webm', 'video/ogg'],

    // Image dimensions
    IMAGE_DIMENSIONS: {
      THUMBNAIL: { width: 150, height: 150 },
      SMALL: { width: 300, height: 300 },
      MEDIUM: { width: 800, height: 600 },
      LARGE: { width: 1920, height: 1080 },
    },

    // Country codes
    COUNTRY_CODES: ['US', 'CA', 'UK', 'AU', 'NZ', 'DE', 'FR', 'ES', 'IT', 'JP'],

    // Currency codes
    CURRENCY_CODES: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY'],
  },
} as const;

// Type exports
export type ValidationMessage = (typeof VALIDATION.MESSAGES)[keyof typeof VALIDATION.MESSAGES];
export type ValidationPattern = (typeof VALIDATION.PATTERNS)[keyof typeof VALIDATION.PATTERNS];
export type ValidationLimit = (typeof VALIDATION.LIMITS)[keyof typeof VALIDATION.LIMITS];
