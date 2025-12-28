// User Roles
export const USER_ROLES = {
  PATIENT: 'patient',
  DOCTOR: 'doctor',
  ADMIN: 'admin',
};

export const USER_ROLE_VALUES = Object.values(USER_ROLES);

// Gender Options
export const GENDERS = {
  MALE: 'male',
  FEMALE: 'female',
  OTHER: 'other',
};

export const GENDER_VALUES = Object.values(GENDERS);

// Appointment Statuses
export const APPOINTMENT_STATUSES = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

export const APPOINTMENT_STATUS_VALUES = Object.values(APPOINTMENT_STATUSES);

// Payment Statuses
export const PAYMENT_STATUSES = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
  PARTIALLY_REFUNDED: 'partially_refunded',
};

export const PAYMENT_STATUS_VALUES = Object.values(PAYMENT_STATUSES);

// Payment Methods
export const PAYMENT_METHODS = {
  ONLINE: 'online',
  CASH: 'cash',
  CARD: 'card',
  UPI: 'upi',
  BANK_TRANSFER: 'bank_transfer',
  WALLET: 'wallet',
  CHEQUE: 'cheque',
};

export const PAYMENT_METHOD_VALUES = Object.values(PAYMENT_METHODS);

// Payment Types
export const PAYMENT_TYPES = {
  APPOINTMENT: 'appointment',
  CONSULTATION: 'consultation',
  SERVICE: 'service',
  OTHER: 'other',
};

export const PAYMENT_TYPE_VALUES = Object.values(PAYMENT_TYPES);

// Payment Gateways
export const PAYMENT_GATEWAYS = {
  STRIPE: 'stripe',
  PAYPAL: 'paypal',
  RAZORPAY: 'razorpay',
  SQUARE: 'square',
  PAYU: 'payu',
  CASHFREE: 'cashfree',
  OFFLINE: 'offline', // For pay at clinic
};

export const PAYMENT_GATEWAY_VALUES = Object.values(PAYMENT_GATEWAYS);

// Days of Week
export const DAYS_OF_WEEK = {
  MONDAY: 'monday',
  TUESDAY: 'tuesday',
  WEDNESDAY: 'wednesday',
  THURSDAY: 'thursday',
  FRIDAY: 'friday',
  SATURDAY: 'saturday',
  SUNDAY: 'sunday',
};

export const DAY_OF_WEEK_VALUES = Object.values(DAYS_OF_WEEK);

// Document Types (Medical Records)
export const DOCUMENT_TYPES = {
  PRESCRIPTION: 'prescription',
  LAB_REPORT: 'lab_report',
  XRAY: 'xray',
  SCAN: 'scan',
  OTHER: 'other',
};

export const DOCUMENT_TYPE_VALUES = Object.values(DOCUMENT_TYPES);

// Blood Groups
export const BLOOD_GROUPS = {
  A_POSITIVE: 'A+',
  A_NEGATIVE: 'A-',
  B_POSITIVE: 'B+',
  B_NEGATIVE: 'B-',
  AB_POSITIVE: 'AB+',
  AB_NEGATIVE: 'AB-',
  O_POSITIVE: 'O+',
  O_NEGATIVE: 'O-',
};

export const BLOOD_GROUP_VALUES = Object.values(BLOOD_GROUPS);

// Message Statuses
export const MESSAGE_STATUSES = {
  PENDING: 'pending',
  READ: 'read',
  RESPONDED: 'responded',
  CLOSED: 'closed'
};

export const MESSAGE_STATUS_VALUES = Object.values(MESSAGE_STATUSES);

// Message Priorities
export const MESSAGE_PRIORITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent'
};

export const MESSAGE_PRIORITY_VALUES = Object.values(MESSAGE_PRIORITIES);

// Contact Preferences
export const CONTACT_PREFERENCES = {
  EMAIL: 'email',
  PHONE: 'phone',
  IN_APP: 'in_app'
};

export const CONTACT_PREFERENCE_VALUES = Object.values(CONTACT_PREFERENCES);

// Storage Providers
export const STORAGE_PROVIDERS = {
  LOCAL: 'local',
  AWS_S3: 'aws-s3',
  GOOGLE_CLOUD: 'google-cloud',
  AZURE_BLOB: 'azure-blob',
};

export const STORAGE_PROVIDER_VALUES = Object.values(STORAGE_PROVIDERS);

// File Types
export const FILE_TYPES = {
  IMAGE: 'image',
  DOCUMENT: 'document',
  VIDEO: 'video',
  OTHER: 'other',
};

export const FILE_TYPE_VALUES = Object.values(FILE_TYPES);

// Virus Scan Status
export const VIRUS_SCAN_STATUS = {
  PENDING: 'pending',
  CLEAN: 'clean',
  INFECTED: 'infected',
  ERROR: 'error',
};

export const VIRUS_SCAN_STATUS_VALUES = Object.values(VIRUS_SCAN_STATUS);

// Virus Scan Providers
export const VIRUS_SCAN_PROVIDERS = {
  CLAMAV: 'clamav',
  CLOUDMERSIVE: 'cloudmersive',
  VIRUSTOTAL: 'virustotal',
};

export const VIRUS_SCAN_PROVIDER_VALUES = Object.values(VIRUS_SCAN_PROVIDERS);

// Related Entity Types
export const RELATED_ENTITY_TYPES = {
  MEDICAL_RECORD: 'medical-record',
  PROFILE_IMAGE: 'profile-image',
  APPOINTMENT_DOCUMENT: 'appointment-document',
  PRESCRIPTION: 'prescription',
  OTHER: 'other',
};

export const RELATED_ENTITY_TYPE_VALUES = Object.values(RELATED_ENTITY_TYPES);

// Default Values
export const DEFAULT_USER_ROLE = USER_ROLES.PATIENT;
export const DEFAULT_APPOINTMENT_STATUS = APPOINTMENT_STATUSES.PENDING;
export const DEFAULT_PAYMENT_STATUS = PAYMENT_STATUSES.PENDING;
export const DEFAULT_PAYMENT_METHOD = PAYMENT_METHODS.ONLINE;
export const DEFAULT_MESSAGE_STATUS = MESSAGE_STATUSES.PENDING;
export const DEFAULT_MESSAGE_PRIORITY = MESSAGE_PRIORITIES.MEDIUM;
export const DEFAULT_STORAGE_PROVIDER = STORAGE_PROVIDERS.LOCAL;

// Re-export numeric constants
export * from './numeric.js';

// Re-export HTTP status codes
export * from './httpStatus.js';

// Re-export messages
export * from './messages.js';

