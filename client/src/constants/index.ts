// User Roles
export const USER_ROLES = {
  PATIENT: 'patient',
  DOCTOR: 'doctor',
  ADMIN: 'admin',
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

export const USER_ROLE_OPTIONS = [
  { value: USER_ROLES.PATIENT, label: 'Patient' },
  { value: USER_ROLES.DOCTOR, label: 'Doctor' },
  { value: USER_ROLES.ADMIN, label: 'Admin' },
] as const;

// Gender Options
export const GENDERS = {
  MALE: 'male',
  FEMALE: 'female',
  OTHER: 'other',
} as const;

export type Gender = typeof GENDERS[keyof typeof GENDERS];

export const GENDER_OPTIONS = [
  { value: GENDERS.MALE, label: 'Male' },
  { value: GENDERS.FEMALE, label: 'Female' },
  { value: GENDERS.OTHER, label: 'Other' },
] as const;

// Appointment Statuses
export const APPOINTMENT_STATUSES = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export type AppointmentStatus = typeof APPOINTMENT_STATUSES[keyof typeof APPOINTMENT_STATUSES];

export const APPOINTMENT_STATUS_OPTIONS = [
  { value: APPOINTMENT_STATUSES.PENDING, label: 'Pending' },
  { value: APPOINTMENT_STATUSES.CONFIRMED, label: 'Confirmed' },
  { value: APPOINTMENT_STATUSES.COMPLETED, label: 'Completed' },
  { value: APPOINTMENT_STATUSES.CANCELLED, label: 'Cancelled' },
] as const;

// Payment Statuses
export const PAYMENT_STATUSES = {
  PENDING: 'pending',
  PAID: 'paid',
  REFUNDED: 'refunded',
} as const;

export type PaymentStatus = typeof PAYMENT_STATUSES[keyof typeof PAYMENT_STATUSES];

export const PAYMENT_STATUS_OPTIONS = [
  { value: PAYMENT_STATUSES.PENDING, label: 'Pending' },
  { value: PAYMENT_STATUSES.PAID, label: 'Paid' },
  { value: PAYMENT_STATUSES.REFUNDED, label: 'Refunded' },
] as const;

// Days of Week
export const DAYS_OF_WEEK = {
  MONDAY: 'monday',
  TUESDAY: 'tuesday',
  WEDNESDAY: 'wednesday',
  THURSDAY: 'thursday',
  FRIDAY: 'friday',
  SATURDAY: 'saturday',
  SUNDAY: 'sunday',
} as const;

export type DayOfWeek = typeof DAYS_OF_WEEK[keyof typeof DAYS_OF_WEEK];

export const DAY_OF_WEEK_OPTIONS = [
  { value: DAYS_OF_WEEK.MONDAY, label: 'Monday' },
  { value: DAYS_OF_WEEK.TUESDAY, label: 'Tuesday' },
  { value: DAYS_OF_WEEK.WEDNESDAY, label: 'Wednesday' },
  { value: DAYS_OF_WEEK.THURSDAY, label: 'Thursday' },
  { value: DAYS_OF_WEEK.FRIDAY, label: 'Friday' },
  { value: DAYS_OF_WEEK.SATURDAY, label: 'Saturday' },
  { value: DAYS_OF_WEEK.SUNDAY, label: 'Sunday' },
] as const;

// Appointment Filters
export const APPOINTMENT_FILTERS = {
  ALL: 'all',
  UPCOMING: 'upcoming',
  PAST: 'past',
} as const;

export type AppointmentFilter = typeof APPOINTMENT_FILTERS[keyof typeof APPOINTMENT_FILTERS];

// Helper functions for status styling
export const getAppointmentStatusColor = (status: AppointmentStatus): string => {
  switch (status) {
    case APPOINTMENT_STATUSES.CONFIRMED:
      return 'bg-success-500 text-white';
    case APPOINTMENT_STATUSES.COMPLETED:
      return 'bg-blue-500 text-white';
    case APPOINTMENT_STATUSES.CANCELLED:
      return 'bg-danger-500 text-white';
    case APPOINTMENT_STATUSES.PENDING:
    default:
      return 'bg-yellow-500 text-white';
  }
};

// Helper function to check if appointment can be cancelled
export const canCancelAppointment = (status: AppointmentStatus): boolean => {
  return status === APPOINTMENT_STATUSES.PENDING || status === APPOINTMENT_STATUSES.CONFIRMED;
};

// Helper function to check if appointment is active (can be updated)
export const isActiveAppointment = (status: AppointmentStatus): boolean => {
  return status !== APPOINTMENT_STATUSES.COMPLETED && status !== APPOINTMENT_STATUSES.CANCELLED;
};

// Document Types (Medical Records)
export const DOCUMENT_TYPES = {
  PRESCRIPTION: 'prescription',
  LAB_REPORT: 'lab_report',
  XRAY: 'xray',
  SCAN: 'scan',
  OTHER: 'other',
} as const;

export type DocumentType = typeof DOCUMENT_TYPES[keyof typeof DOCUMENT_TYPES];

export const DOCUMENT_TYPE_OPTIONS = [
  { value: DOCUMENT_TYPES.PRESCRIPTION, label: 'Prescription' },
  { value: DOCUMENT_TYPES.LAB_REPORT, label: 'Lab Report' },
  { value: DOCUMENT_TYPES.XRAY, label: 'X-Ray' },
  { value: DOCUMENT_TYPES.SCAN, label: 'Scan' },
  { value: DOCUMENT_TYPES.OTHER, label: 'Other' },
] as const;

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
} as const;

export type BloodGroup = typeof BLOOD_GROUPS[keyof typeof BLOOD_GROUPS];

export const BLOOD_GROUP_OPTIONS = [
  { value: BLOOD_GROUPS.A_POSITIVE, label: 'A+' },
  { value: BLOOD_GROUPS.A_NEGATIVE, label: 'A-' },
  { value: BLOOD_GROUPS.B_POSITIVE, label: 'B+' },
  { value: BLOOD_GROUPS.B_NEGATIVE, label: 'B-' },
  { value: BLOOD_GROUPS.AB_POSITIVE, label: 'AB+' },
  { value: BLOOD_GROUPS.AB_NEGATIVE, label: 'AB-' },
  { value: BLOOD_GROUPS.O_POSITIVE, label: 'O+' },
  { value: BLOOD_GROUPS.O_NEGATIVE, label: 'O-' },
] as const;

// Dashboard Routes
export const DASHBOARD_ROUTES = {
  PATIENT: {
    BASE: '/patient/dashboard',
    OVERVIEW: '/patient/dashboard',
    APPOINTMENTS: '/patient/dashboard/appointments',
    CONSULTATION_HISTORY: '/patient/dashboard/consultation-history',
    MEDICAL_RECORDS: '/patient/dashboard/medical-records',
    FAVORITE_DOCTORS: '/patient/dashboard/favorite-doctors',
    PROFILE: '/patient/dashboard/profile',
  },
  DOCTOR: {
    BASE: '/doctor/dashboard',
    OVERVIEW: '/doctor/dashboard',
    APPOINTMENTS: '/doctor/dashboard/appointments',
    PATIENTS: '/doctor/dashboard/patients',
    SCHEDULE: '/doctor/dashboard/schedule',
    PROFILE: '/doctor/dashboard/profile',
  },
  ADMIN: {
    BASE: '/admin/dashboard',
    OVERVIEW: '/admin/dashboard',
    DOCTORS: '/admin/dashboard/doctors',
    PATIENTS: '/admin/dashboard/patients',
    APPOINTMENTS: '/admin/dashboard/appointments',
    REPORTS: '/admin/dashboard/reports',
    SETTINGS: '/admin/dashboard/settings',
  },
} as const;

// Helper function to get dashboard path based on role
export const getDashboardPath = (role: UserRole): string => {
  switch (role) {
    case USER_ROLES.PATIENT:
      return DASHBOARD_ROUTES.PATIENT.BASE;
    case USER_ROLES.DOCTOR:
      return DASHBOARD_ROUTES.DOCTOR.BASE;
    case USER_ROLES.ADMIN:
      return DASHBOARD_ROUTES.ADMIN.BASE;
    default:
      return '/';
  }
};

// Re-export validation constants
export * from './validation';

// Re-export messages
export * from './messages';

// Re-export numeric constants
export * from './numeric';

