// Validation Messages
// Centralized validation error messages for forms

export const VALIDATION_MESSAGES = {
  // Name Validation
  FIRST_NAME_REQUIRED: 'First name is required',
  FIRST_NAME_MIN: 'First name must be at least 2 characters',
  LAST_NAME_REQUIRED: 'Last name is required',
  LAST_NAME_MIN: 'Last name must be at least 2 characters',

  // Email Validation
  EMAIL_REQUIRED: 'Email is required',
  EMAIL_INVALID: 'Invalid email address',
  EMAIL_FORMAT: 'Please enter a valid email address',

  // Phone Validation
  PHONE_REQUIRED: 'Phone number is required',
  PHONE_EXACT_LENGTH: 'Phone number must be exactly 10 digits',
  PHONE_DIGITS_ONLY: 'Phone number must contain only digits',

  // Password Validation
  PASSWORD_REQUIRED: 'Password is required',
  PASSWORD_MIN: 'Password must be at least 6 characters',
  CONFIRM_PASSWORD_REQUIRED: 'Please confirm your password',
  PASSWORDS_DONT_MATCH: "Passwords don't match",

  // Role Validation
  ROLE_REQUIRED: 'Please select a role',
  ROLE_INVALID: 'Invalid role selected',

  // Gender Validation
  GENDER_REQUIRED: 'Gender is required',
  GENDER_INVALID: 'Please select a gender',

  // Date Validation
  DATE_INVALID: 'Please enter a valid date',

  // Duplicate Validation
  EMAIL_ALREADY_REGISTERED: 'This email is already registered',
  PHONE_ALREADY_REGISTERED: 'This phone number is already registered',
  LICENSE_NUMBER_ALREADY_REGISTERED: 'This license number is already registered',

  // License Number Validation
  LICENSE_NUMBER_REQUIRED: 'License number is required for doctors',
  LICENSE_NUMBER_MIN: 'License number must be at least 6 characters',
  LICENSE_NUMBER_MAX: 'License number must not exceed 20 characters',
  LICENSE_NUMBER_FORMAT: 'License number should contain letters and numbers (e.g., MD123456 or AB/12345)',

  // Specialization Validation
  SPECIALIZATION_REQUIRED: 'Specialization is required for doctors',
  SPECIALIZATION_MIN: 'Specialization must be at least 2 characters',

  // Contact Form Validation
  NAME_REQUIRED: 'Name is required',
  NAME_MIN: 'Name must be at least 2 characters',
  SUBJECT_REQUIRED: 'Subject is required',
  SUBJECT_MIN: 'Subject must be at least 3 characters',
  SUBJECT_MAX: 'Subject must not exceed 100 characters',
  MESSAGE_REQUIRED: 'Message is required',
  MESSAGE_MIN: 'Message must be at least 10 characters',
  MESSAGE_MAX: 'Message must not exceed 1000 characters',
} as const;

// Validation Patterns
export const VALIDATION_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^\d{10}$/,
  // License number: 2-4 letters, optional separator (/ or -), 4-6 digits, allows alphanumeric combinations
  // Examples: MD123456, AB/12345, ABCD-123456, MD12AB34
  LICENSE_NUMBER: /^[A-Za-z]{2,4}[\/\-]?[A-Za-z0-9]{4,12}$/i,
} as const;

// Validation Rules
export const VALIDATION_RULES = {
  FIRST_NAME_MIN_LENGTH: 2,
  LAST_NAME_MIN_LENGTH: 2,
  PASSWORD_MIN_LENGTH: 6,
  PHONE_EXACT_LENGTH: 10,
  LICENSE_NUMBER_MIN_LENGTH: 6,
  LICENSE_NUMBER_MAX_LENGTH: 20,
  // Contact Form Rules
  CONTACT_NAME_MIN_LENGTH: 2,
  CONTACT_SUBJECT_MIN_LENGTH: 3,
  CONTACT_SUBJECT_MAX_LENGTH: 100,
  CONTACT_MESSAGE_MIN_LENGTH: 10,
  CONTACT_MESSAGE_MAX_LENGTH: 1000,
} as const;

