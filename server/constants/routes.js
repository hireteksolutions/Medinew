// API Route Paths
// Base paths for different resources
export const API_ROUTES = {
  AUTH: '/api/auth',
  PATIENT: '/api/patient',
  DOCTOR: '/api/doctor',
  ADMIN: '/api/admin',
  APPOINTMENTS: '/api/appointments',
  DOCTORS_PUBLIC: '/api/doctors',
  MESSAGES: '/api/messages',
  REVIEWS: '/api/reviews',
  AVAILABILITY_SCHEDULES: '/api/availability-schedules',
  NOTIFICATIONS: '/api/notifications',
  REVIEW_RATINGS: '/api/review-ratings',
  AUDIT_LOGS: '/api/audit-logs',
  MASTER_ROLES: '/api/master-roles',
};

// Auth Routes
export const AUTH_ROUTES = {
  BASE: '/auth',
  REGISTER: '/register',
  LOGIN: '/login',
  ME: '/me',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  PROFILE: '/profile',
};

// Patient Routes
export const PATIENT_ROUTES = {
  BASE: '/patient',
  PROFILE: '/profile',
  PROFILE_COMPLETE: '/profile/complete',
  CHANGE_PASSWORD: '/change-password',
  APPOINTMENTS: '/appointments',
  MEDICAL_RECORDS: '/medical-records',
  MEDICAL_RECORD_BY_ID: '/medical-records/:id',
  FAVORITE_DOCTORS: '/favorite-doctors',
  FAVORITE_DOCTOR_BY_ID: '/favorite-doctors/:doctorId',
};

// Doctor Routes
export const DOCTOR_ROUTES = {
  BASE: '/doctor',
  PROFILE: '/profile',
  CHANGE_PASSWORD: '/change-password',
  CERTIFICATIONS: '/certifications',
  DASHBOARD: '/dashboard',
  APPOINTMENTS: '/appointments',
  APPOINTMENT_BY_ID: '/appointments/:id',
  APPOINTMENT_ACCEPT: '/appointments/:id/accept',
  APPOINTMENT_DECLINE: '/appointments/:id/decline',
  APPOINTMENT_COMPLETE: '/appointments/:id/complete',
  APPOINTMENT_RESCHEDULE: '/appointments/:id/reschedule',
  PATIENTS: '/patients',
  PATIENT_HISTORY: '/patients/:patientId/history',
  SCHEDULE: '/schedule',
  SCHEDULE_WEEKLY: '/schedule/weekly',
  SCHEDULE_BLOCK_DATES: '/schedule/block-dates',
  SCHEDULE: '/schedule',
  STATS: '/stats',
  MESSAGES: '/messages',
  MESSAGE_BY_ID: '/messages/:id',
  MESSAGE_READ: '/messages/:id/read',
  MESSAGE_RESPOND: '/messages/:id/respond',
  MESSAGE_ARCHIVE: '/messages/:id/archive',
  MESSAGES_UNREAD_COUNT: '/messages/unread/count',
  MESSAGES_MARK_READ: '/messages/mark-read',
};

// Admin Routes
export const ADMIN_ROUTES = {
  BASE: '/admin',
  STATS: '/stats',
  DOCTORS: '/doctors',
  DOCTOR_BY_ID: '/doctors/:id',
  DOCTOR_APPROVE: '/doctors/:id/approve',
  DOCTOR_REJECT: '/doctors/:id/reject',
  DOCTOR_SUSPEND: '/doctors/:id/suspend',
  DOCTOR_ACTIVATE: '/doctors/:id/activate',
  PATIENTS: '/patients',
  PATIENT_BY_ID: '/patients/:id',
  PATIENT_SUSPEND: '/patients/:id/suspend',
  PATIENT_ACTIVATE: '/patients/:id/activate',
  APPOINTMENTS: '/appointments',
  APPOINTMENT_BY_ID: '/appointments/:id',
  APPOINTMENT_CANCEL: '/appointments/:id/cancel',
  USERS: '/users',
  EXPORT: '/export',
  REPORTS: '/reports',
};

// Appointment Routes
export const APPOINTMENT_ROUTES = {
  BASE: '/appointments',
  ROOT: '/',
  AVAILABLE_SLOTS: '/available-slots/:doctorId',
  BY_ID: '/:id',
  CANCEL: '/:id/cancel',
  RESCHEDULE: '/:id/reschedule',
  DETAILS: '/:id/details',
};

// Public Doctor Routes
export const DOCTOR_PUBLIC_ROUTES = {
  BASE: '/doctors',
  ROOT: '/',
  FEATURED: '/featured',
  SEARCH: '/search',
  BY_ID: '/:id',
};

// Message Routes
export const MESSAGE_ROUTES = {
  BASE: '/messages',
  ROOT: '/',
  BY_ID: '/:id',
  DOCTOR: '/doctor',
  RESPOND: '/:id/respond',
};

// Review Routes
export const REVIEW_ROUTES = {
  BASE: '/reviews',
  ROOT: '/',
  BY_ID: '/:id',
  DOCTOR_BY_ID: '/doctor/:doctorId',
  PATIENT: '/patient',
};

// Availability Schedule Routes
export const AVAILABILITY_SCHEDULE_ROUTES = {
  BASE: '/availability-schedules',
  ROOT: '/',
  BY_ID: '/:id',
  BULK: '/bulk',
};

// Notification Routes
export const NOTIFICATION_ROUTES = {
  BASE: '/notifications',
  ROOT: '/',
  BY_ID: '/:id',
  UNREAD_COUNT: '/unread/count',
  MARK_READ: '/:id/read',
  MARK_ALL_READ: '/mark-all-read',
  MARK_READ_BULK: '/mark-read',
  BY_TYPE: '/type/:type',
};

// Review Rating Routes
export const REVIEW_RATING_ROUTES = {
  BASE: '/review-ratings',
  ROOT: '/',
  BY_ID: '/:id',
  DOCTOR_BY_ID: '/doctor/:doctorId',
  PATIENT: '/patient',
  RESPOND: '/:id/respond',
};

// Audit Log Routes
export const AUDIT_LOG_ROUTES = {
  BASE: '/audit-logs',
  ROOT: '/',
  BY_ID: '/:id',
  MY_LOGS: '/my-logs',
  ENTITY: '/entity/:entityType/:entityId',
  STATS: '/stats',
};

// Master Role Routes
export const MASTER_ROLE_ROUTES = {
  BASE: '/master-roles',
  ROOT: '/',
  BY_ID: '/:id',
  ACTIVE: '/active',
  STATS: '/stats',
};

// Helper function to build route with params
export const buildRoute = (route, params = {}) => {
  let builtRoute = route;
  Object.keys(params).forEach((key) => {
    builtRoute = builtRoute.replace(`:${key}`, params[key]);
  });
  return builtRoute;
};

