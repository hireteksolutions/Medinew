// Numeric Constants
// All numeric values used across the application

// Time Constants (in milliseconds)
export const TIME_CONSTANTS = {
  // JWT Token Expiration
  JWT_ACCESS_EXPIRE_MS: 15 * 60 * 1000, // 15 minutes
  JWT_REFRESH_EXPIRE_MS: 30 * 24 * 60 * 60 * 1000, // 30 days
  JWT_EXPIRE_MS: 7 * 24 * 60 * 60 * 1000, // 7 days
  
  // Session Management
  SESSION_EXPIRE_DAYS: 30,
  SESSION_EXPIRE_MS: 30 * 24 * 60 * 60 * 1000, // 30 days
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: 100,
  
  // Password Reset
  PASSWORD_RESET_EXPIRE_HOURS: 1,
  PASSWORD_RESET_EXPIRE_MS: 60 * 60 * 1000, // 1 hour
};

// File Size Limits (in bytes)
export const FILE_SIZE_LIMITS = {
  IMAGE_MAX_SIZE: 10 * 1024 * 1024, // 10MB
  DOCUMENT_MAX_SIZE: 20 * 1024 * 1024, // 20MB
  VIDEO_MAX_SIZE: 50 * 1024 * 1024, // 50MB
  DEFAULT_MAX_SIZE: 20 * 1024 * 1024, // 20MB
};

// String Length Limits
export const STRING_LIMITS = {
  // User Fields
  FIRST_NAME_MIN: 2,
  LAST_NAME_MIN: 2,
  PASSWORD_MIN: 6,
  PHONE_EXACT: 10,
  
  // License Number
  LICENSE_NUMBER_MIN: 6,
  LICENSE_NUMBER_MAX: 20,
  
  // Specialization
  SPECIALIZATION_MIN: 2,
  
  // Contact Form
  CONTACT_NAME_MIN: 2,
  CONTACT_SUBJECT_MIN: 3,
  CONTACT_SUBJECT_MAX: 100,
  CONTACT_MESSAGE_MIN: 10,
  CONTACT_MESSAGE_MAX: 1000,
  
  // Biography
  BIOGRAPHY_MAX: 1000,
  
  // File Names
  FILENAME_BASE_MAX: 50,
  
  // Experience
  EXPERIENCE_MAX: 50,
  EXPERIENCE_MAX_DIGITS: 5,
  
  // Consultation Fee
  CONSULTATION_FEE_MAX: 10000,
  CONSULTATION_FEE_MAX_DIGITS: 5,
  
  // Consultation Duration
  CONSULTATION_DURATION_MIN: 5,
  CONSULTATION_DURATION_MAX: 180,
  CONSULTATION_DURATION_MAX_DIGITS: 3,
};

// Pagination Defaults
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
};

// Date/Time Constants
export const DATE_CONSTANTS = {
  // Appointment Booking
  APPOINTMENT_ADVANCE_DAYS: 30,
  
  // Default Consultation Duration (minutes)
  DEFAULT_CONSULTATION_DURATION: 30,
  
  // Statistics
  STATS_DAYS_BACK: 30, // Number of days to look back for stats
};

// AWS S3 Defaults
export const AWS_DEFAULTS = {
  DEFAULT_REGION: 'us-east-1',
};

// Crypto Constants
export const CRYPTO = {
  RANDOM_BYTES_LENGTH: 8,
  BCRYPT_SALT_ROUNDS: 10,
  REFRESH_TOKEN_BYTES: 40,
  PASSWORD_RESET_TOKEN_BYTES: 20,
};

// File Upload Constants
export const FILE_UPLOAD = {
  MAX_FILES_MULTIPLE: 10,
  MEMORY_STORAGE: true,
};

