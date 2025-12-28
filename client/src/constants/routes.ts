// API Route Paths
// Base paths for different resources
export const API_ROUTES = {
  AUTH: '/api/auth',
  PATIENT: '/api/patient',
  DOCTOR: '/api/doctor',
  ADMIN: '/api/admin',
  APPOINTMENTS: '/api/appointments',
  DOCTORS_PUBLIC: '/api/doctors',
  SPECIALIZATIONS: '/api/specializations',
  AVAILABILITY_SCHEDULES: '/api/availability-schedules',
  NOTIFICATIONS: '/api/notifications',
  REVIEW_RATINGS: '/api/review-ratings',
  REVIEWS: '/api/reviews',
  AUDIT_LOGS: '/api/audit-logs',
  MASTER_ROLES: '/api/master-roles',
  FILES: '/api/files',
} as const;

// Auth Routes
export const AUTH_ROUTES = {
  BASE: '/auth',
  REGISTER: '/register',
  LOGIN: '/login',
  ME: '/me',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  PROFILE: '/profile',
} as const;

// Patient Routes
export const PATIENT_ROUTES = {
  BASE: '/patient',
  PROFILE: '/profile',
  APPOINTMENTS: '/appointments',
  MEDICAL_RECORDS: '/medical-records',
  getMedicalRecordById: (id: string) => `/medical-records/${id}`,
  FAVORITE_DOCTORS: '/favorite-doctors',
  getFavoriteDoctorById: (doctorId: string) => `/favorite-doctors/${doctorId}`,
} as const;

// Doctor Routes
export const DOCTOR_ROUTES = {
  BASE: '/doctor',
  PROFILE: '/profile',
  APPOINTMENTS: '/appointments',
  getAppointmentById: (id: string) => `/appointments/${id}`,
  PATIENTS: '/patients',
  getPatientHistory: (patientId: string) => `/patients/${patientId}/history`,
  SCHEDULE: '/schedule',
  SCHEDULE_WEEKLY: '/schedule/weekly',
  SCHEDULE_BLOCK_DATES: '/schedule/block-dates',
  STATS: '/stats',
} as const;

// Admin Routes
export const ADMIN_ROUTES = {
  BASE: '/admin',
  STATS: '/stats',
  DOCTORS: '/doctors',
  getDoctorApprove: (id: string) => `/doctors/${id}/approve`,
  PATIENTS: '/patients',
  APPOINTMENTS: '/appointments',
  USERS: '/users',
} as const;

// Appointment Routes
export const APPOINTMENT_ROUTES = {
  BASE: '/appointments',
  ROOT: '/',
  getAvailableSlots: (doctorId: string) => `/available-slots/${doctorId}`,
  getId: (id: string) => `/${id}`,
  getCancel: (id: string) => `/${id}/cancel`,
  getReschedule: (id: string) => `/${id}/reschedule`,
  getDetails: (id: string) => `/${id}/details`,
} as const;

// Public Doctor Routes
export const DOCTOR_PUBLIC_ROUTES = {
  BASE: '/doctors',
  ROOT: '/',
  FEATURED: '/featured',
  SEARCH: '/search',
  getId: (id: string) => `/${id}`,
} as const;

// Specialization Routes
export const SPECIALIZATION_ROUTES = {
  BASE: '/specializations',
  ROOT: '/',
} as const;

// Contact Info Routes
export const CONTACT_INFO_ROUTES = {
  BASE: '/contact-info',
  ROOT: '/',
} as const;

// File Routes
export const FILE_ROUTES = {
  BASE: '/files',
  UPLOAD: '/upload',
  UPLOAD_MULTIPLE: '/upload-multiple',
  getId: (id: string) => `/${id}`,
  getDownload: (id: string) => `/${id}/download`,
} as const;

// Availability Schedule Routes
export const AVAILABILITY_SCHEDULE_ROUTES = {
  BASE: '/availability-schedules',
  ROOT: '/',
  getId: (id: string) => `/${id}`,
  BULK: '/bulk',
} as const;

// Notification Routes
export const NOTIFICATION_ROUTES = {
  BASE: '/notifications',
  ROOT: '/',
  getId: (id: string) => `/${id}`,
  UNREAD_COUNT: '/unread/count',
  getMarkRead: (id: string) => `/${id}/read`,
  MARK_ALL_READ: '/mark-all-read',
  MARK_READ_BULK: '/mark-read',
  getByType: (type: string) => `/type/${type}`,
} as const;

// Review Rating Routes
export const REVIEW_RATING_ROUTES = {
  BASE: '/review-ratings',
  ROOT: '/',
  getId: (id: string) => `/${id}`,
  getDoctorById: (doctorId: string) => `/doctor/${doctorId}`,
  PATIENT: '/patient',
  getRespond: (id: string) => `/${id}/respond`,
} as const;

// Review Routes (for /api/reviews endpoint)
export const REVIEW_ROUTES = {
  BASE: '/reviews',
  ROOT: '/',
  getId: (id: string) => `/${id}`,
  getDoctorById: (doctorId: string) => `/doctor/${doctorId}`,
  PATIENT: '/patient',
} as const;

// Audit Log Routes
export const AUDIT_LOG_ROUTES = {
  BASE: '/audit-logs',
  ROOT: '/',
  getId: (id: string) => `/${id}`,
  MY_LOGS: '/my-logs',
  getEntity: (entityType: string, entityId: string) => `/entity/${entityType}/${entityId}`,
  STATS: '/stats',
} as const;

// Master Role Routes
export const MASTER_ROLE_ROUTES = {
  BASE: '/master-roles',
  ROOT: '/',
  getId: (id: string) => `/${id}`,
  ACTIVE: '/active',
  STATS: '/stats',
} as const;

// Helper function to build route with params
export const buildRoute = (route: string, params: Record<string, string> = {}): string => {
  let builtRoute = route;
  Object.keys(params).forEach((key) => {
    builtRoute = builtRoute.replace(`:${key}`, params[key]);
  });
  return builtRoute;
};
