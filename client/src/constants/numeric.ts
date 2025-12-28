// Numeric Constants for Client
// All numeric values used in the frontend

// Date/Time Constants
export const DATE_CONSTANTS = {
  // Appointment Booking
  APPOINTMENT_ADVANCE_DAYS: 30,
} as const;

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

// Timeout Constants (milliseconds)
export const TIMEOUTS = {
  DEBOUNCE_DELAY: 300,
  API_TIMEOUT: 30000, // 30 seconds
  TOAST_DURATION: 4000, // 4 seconds
} as const;

// Form Limits
export const FORM_LIMITS = {
  // Experience limits (in years)
  EXPERIENCE_MAX: 100,
  EXPERIENCE_MAX_DIGITS: 5, // e.g., 99.99
  
  // Consultation fee limits (in ₹)
  CONSULTATION_FEE_MAX: 100000, // ₹100,000
  CONSULTATION_FEE_MAX_DIGITS: 6, // e.g., 100000
  
  // Consultation duration limits (in minutes)
  CONSULTATION_DURATION_MIN: 5,
  CONSULTATION_DURATION_MAX: 480, // 8 hours
  CONSULTATION_DURATION_MAX_DIGITS: 3, // e.g., 480
} as const;

