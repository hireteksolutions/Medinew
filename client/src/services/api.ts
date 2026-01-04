import axios from 'axios';
import {
  API_ROUTES,
  AUTH_ROUTES,
  PATIENT_ROUTES,
  DOCTOR_ROUTES,
  ADMIN_ROUTES,
  APPOINTMENT_ROUTES,
  DOCTOR_PUBLIC_ROUTES,
  SPECIALIZATION_ROUTES,
  CONTACT_INFO_ROUTES,
  AVAILABILITY_SCHEDULE_ROUTES,
  NOTIFICATION_ROUTES,
  REVIEW_RATING_ROUTES,
  REVIEW_ROUTES,
  AUDIT_LOG_ROUTES,
  MASTER_ROLE_ROUTES,
  FILE_ROUTES,
  PAYMENT_ROUTES,
} from '../constants/routes';

// Use environment variable or default to local development API URL
// Note: API_ROUTES already include /api prefix, so baseURL should not include it
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Log API URL in development (helps with debugging)
if (import.meta.env.DEV) {
  console.log(`🔗 Backend API URL: ${API_URL}`);
}

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token from localStorage to every request
api.interceptors.request.use(
  (config) => {
    // Always read fresh token from localStorage to ensure it's up to date
    const token = localStorage.getItem('token');
    if (token) {
      // Set Authorization header (case-sensitive, must be 'Authorization')
      config.headers.Authorization = `Bearer ${token}`;
      // Also ensure it's in defaults for consistency
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Debug logging in development
      if (import.meta.env.DEV && config.url?.includes('/admin')) {
        console.log('API Request Debug:', {
          url: config.url,
          hasToken: !!token,
          tokenLength: token.length,
          tokenPreview: token.substring(0, 20) + '...',
          authHeader: config.headers.Authorization?.substring(0, 30) + '...'
        });
      }
    } else {
      // Remove Authorization header if no token
      delete config.headers.Authorization;
      delete api.defaults.headers.common['Authorization'];
      
      // Debug logging in development
      if (import.meta.env.DEV && config.url?.includes('/admin')) {
        console.warn('API Request Debug - No token found for:', config.url);
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const requestUrl = error.config?.url || '';
      const isAuthEndpoint = requestUrl.includes('/auth/login') || 
                            requestUrl.includes('/auth/register') ||
                            requestUrl.includes('/auth/forgot-password') ||
                            requestUrl.includes('/auth/reset-password');
      
      // Don't redirect if it's an auth endpoint (login/register) - let them handle the error
      if (!isAuthEndpoint) {
        const currentPath = window.location.pathname;
        const isProtectedRoute = currentPath.includes('/dashboard') || 
                                 currentPath.includes('/admin') || 
                                 currentPath.includes('/doctor') || 
                                 currentPath.includes('/patient') ||
                                 currentPath.includes('/book-appointment');
        
        // Only clear token and redirect if we're NOT on a protected route
        // Protected routes will handle their own redirects via ProtectedRoute component
        if (!isProtectedRoute) {
          // Clear token and user data on unauthorized error
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          delete api.defaults.headers.common['Authorization'];
          
          // Only redirect if not already on login/register pages
          if (currentPath !== '/login' && !currentPath.startsWith('/register')) {
            // Use setTimeout to avoid redirecting during navigation
            setTimeout(() => {
              if (window.location.pathname !== '/login') {
                window.location.href = '/login';
              }
            }, 100);
          }
        } else {
          // On protected routes, just clear the token - let ProtectedRoute handle redirect
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          delete api.defaults.headers.common['Authorization'];
        }
      }
    }
    return Promise.reject(error);
  }
);

export const authService = {
  setAuthToken: (token: string | null) => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.common['Authorization'];
    }
  },

  login: (email: string, password: string) => {
    return api.post(`${API_ROUTES.AUTH}${AUTH_ROUTES.LOGIN}`, { email, password });
  },

  register: (data: any) => {
    return api.post(`${API_ROUTES.AUTH}${AUTH_ROUTES.REGISTER}`, data);
  },

  checkEmail: (email: string) => {
    return api.get(`${API_ROUTES.AUTH}/check-email`, { params: { email } });
  },

  checkPhone: (phone: string) => {
    return api.get(`${API_ROUTES.AUTH}/check-phone`, { params: { phone } });
  },

  getMe: () => {
    return api.get(`${API_ROUTES.AUTH}${AUTH_ROUTES.ME}`);
  },

  updateProfile: (data: any) => {
    return api.put(`${API_ROUTES.AUTH}${AUTH_ROUTES.PROFILE}`, data);
  },

  forgotPassword: (email: string) => {
    return api.post(`${API_ROUTES.AUTH}/forgot-password`, { email });
  },

  resetPassword: (token: string, password: string) => {
    return api.post(`${API_ROUTES.AUTH}/reset-password`, { token, password });
  },
};

export const doctorService = {
  getAll: (params?: any) => {
    return api.get(`${API_ROUTES.DOCTORS_PUBLIC}${DOCTOR_PUBLIC_ROUTES.ROOT}`, { params });
  },

  getFeatured: () => {
    return api.get(`${API_ROUTES.DOCTORS_PUBLIC}${DOCTOR_PUBLIC_ROUTES.FEATURED}`);
  },

  getById: (id: string) => {
    return api.get(`${API_ROUTES.DOCTORS_PUBLIC}${DOCTOR_PUBLIC_ROUTES.getId(id)}`);
  },

  search: (params: any) => {
    return api.get(`${API_ROUTES.DOCTORS_PUBLIC}${DOCTOR_PUBLIC_ROUTES.SEARCH}`, { params });
  },
};

export const appointmentService = {
  getAvailableSlots: (doctorId: string, date: string) => {
    return api.get(`${API_ROUTES.APPOINTMENTS}${APPOINTMENT_ROUTES.getAvailableSlots(doctorId)}`, { params: { date } });
  },

  create: (data: any) => {
    return api.post(`${API_ROUTES.APPOINTMENTS}${APPOINTMENT_ROUTES.ROOT}`, data);
  },

  getById: (id: string) => {
    return api.get(`${API_ROUTES.APPOINTMENTS}${APPOINTMENT_ROUTES.getId(id)}`);
  },

  cancel: (id: string) => {
    return api.put(`${API_ROUTES.APPOINTMENTS}${APPOINTMENT_ROUTES.getCancel(id)}`);
  },

  reschedule: (id: string, data: any) => {
    return api.put(`${API_ROUTES.APPOINTMENTS}${APPOINTMENT_ROUTES.getReschedule(id)}`, data);
  },
};

export const patientService = {
  getProfile: () => {
    return api.get(`${API_ROUTES.PATIENT}${PATIENT_ROUTES.PROFILE}`);
  },

  updateProfile: (data: any) => {
    return api.put(`${API_ROUTES.PATIENT}${PATIENT_ROUTES.PROFILE}`, data);
  },

  getAppointments: (params?: any) => {
    return api.get(`${API_ROUTES.PATIENT}${PATIENT_ROUTES.APPOINTMENTS}`, { params });
  },

  getMedicalRecords: (params?: any) => {
    return api.get(`${API_ROUTES.PATIENT}${PATIENT_ROUTES.MEDICAL_RECORDS}`, { params });
  },

  uploadMedicalRecord: (data: any) => {
    return api.post(`${API_ROUTES.PATIENT}${PATIENT_ROUTES.MEDICAL_RECORDS}`, data);
  },

  deleteMedicalRecord: (id: string) => {
    return api.delete(`${API_ROUTES.PATIENT}${PATIENT_ROUTES.getMedicalRecordById(id)}`);
  },

  getFavoriteDoctors: () => {
    return api.get(`${API_ROUTES.PATIENT}${PATIENT_ROUTES.FAVORITE_DOCTORS}`);
  },

  addFavoriteDoctor: (doctorId: string) => {
    return api.post(`${API_ROUTES.PATIENT}${PATIENT_ROUTES.getFavoriteDoctorById(doctorId)}`);
  },

  removeFavoriteDoctor: (doctorId: string) => {
    return api.delete(`${API_ROUTES.PATIENT}${PATIENT_ROUTES.getFavoriteDoctorById(doctorId)}`);
  },

  getConsultationHistory: (params?: any) => {
    return api.get(`${API_ROUTES.PATIENT}/consultation-history`, { params });
  },

  getConsultationDetails: (id: string) => {
    return api.get(`${API_ROUTES.PATIENT}/consultation-history/${id}`);
  },

  getDoctorsForSwitch: (params: { appointmentId: string; sameSpecialization?: boolean }) => {
    return api.get(`${API_ROUTES.PATIENT}/doctors-for-switch`, { params });
  },

  getEmergencyInfo: () => {
    return api.get(`${API_ROUTES.PATIENT}/emergency-info`);
  },

  getIncompleteTreatments: () => {
    return api.get(`${API_ROUTES.PATIENT}/incomplete-treatments`);
  },

  getDoctorRecommendations: (appointmentId: string) => {
    return api.get(`${API_ROUTES.PATIENT}/doctor-recommendations`, { params: { appointmentId } });
  },
};

export const doctorDashboardService = {
  getProfile: () => {
    return api.get(`${API_ROUTES.DOCTOR}${DOCTOR_ROUTES.PROFILE}`);
  },

  updateProfile: (data: any) => {
    return api.put(`${API_ROUTES.DOCTOR}${DOCTOR_ROUTES.PROFILE}`, data);
  },

  getAppointments: (params?: any) => {
    return api.get(`${API_ROUTES.DOCTOR}${DOCTOR_ROUTES.APPOINTMENTS}`, { params });
  },

  updateAppointment: (id: string, data: any) => {
    return api.put(`${API_ROUTES.DOCTOR}${DOCTOR_ROUTES.getAppointmentById(id)}`, data);
  },

  getPatients: (params?: any) => {
    return api.get(`${API_ROUTES.DOCTOR}${DOCTOR_ROUTES.PATIENTS}`, { params });
  },

  getPatientHistory: (patientId: string) => {
    return api.get(`${API_ROUTES.DOCTOR}${DOCTOR_ROUTES.getPatientHistory(patientId)}`);
  },

  getCompletePatientHistory: (patientId: string, params?: any) => {
    return api.get(`${API_ROUTES.DOCTOR}/patients/${patientId}/complete-history`, { params });
  },

  referPatient: (appointmentId: string, data: { doctorId: string; reason: string }) => {
    return api.post(`${API_ROUTES.DOCTOR}/appointments/${appointmentId}/refer`, data);
  },

  getSchedule: (params?: { startDate?: string; endDate?: string }) => {
    return api.get(`${API_ROUTES.DOCTOR}${DOCTOR_ROUTES.SCHEDULE}`, { params });
  },

  updateSchedule: (data: any) => {
    return api.put(`${API_ROUTES.DOCTOR}${DOCTOR_ROUTES.SCHEDULE}`, data);
  },

  updateWeeklySchedule: (availability: any[]) => {
    return api.put(`${API_ROUTES.DOCTOR}${DOCTOR_ROUTES.SCHEDULE_WEEKLY}`, { availability });
  },

  blockDates: (dates: string[], reason?: string) => {
    return api.post(`${API_ROUTES.DOCTOR}${DOCTOR_ROUTES.SCHEDULE_BLOCK_DATES}`, { dates, reason });
  },

  unblockDates: (dates: string[]) => {
    return api.delete(`${API_ROUTES.DOCTOR}${DOCTOR_ROUTES.SCHEDULE_BLOCK_DATES}`, { data: { dates } });
  },

  getStats: () => {
    return api.get(`${API_ROUTES.DOCTOR}${DOCTOR_ROUTES.STATS}`);
  },
};

export const adminService = {
  getStats: () => {
    return api.get(`${API_ROUTES.ADMIN}${ADMIN_ROUTES.STATS}`);
  },

  getDoctors: (params?: any) => {
    return api.get(`${API_ROUTES.ADMIN}${ADMIN_ROUTES.DOCTORS}`, { params });
  },

  getDoctorById: (id: string) => {
    return api.get(`${API_ROUTES.ADMIN}/doctors/${id}`);
  },

  approveDoctor: (id: string) => {
    return api.put(`${API_ROUTES.ADMIN}/doctors/${id}/approve`);
  },

  rejectDoctor: (id: string) => {
    return api.put(`${API_ROUTES.ADMIN}/doctors/${id}/reject`);
  },

  updateDoctor: (id: string, data: any) => {
    return api.put(`${API_ROUTES.ADMIN}/doctors/${id}`, data);
  },

  suspendDoctor: (id: string) => {
    return api.put(`${API_ROUTES.ADMIN}/doctors/${id}/suspend`);
  },

  activateDoctor: (id: string) => {
    return api.put(`${API_ROUTES.ADMIN}/doctors/${id}/activate`);
  },

  deleteDoctor: (id: string) => {
    return api.delete(`${API_ROUTES.ADMIN}/doctors/${id}`);
  },

  getPatients: (params?: any) => {
    return api.get(`${API_ROUTES.ADMIN}${ADMIN_ROUTES.PATIENTS}`, { params });
  },

  getPatientById: (id: string) => {
    return api.get(`${API_ROUTES.ADMIN}/patients/${id}`);
  },

  updatePatient: (id: string, data: any) => {
    return api.put(`${API_ROUTES.ADMIN}/patients/${id}`, data);
  },

  suspendPatient: (id: string) => {
    return api.put(`${API_ROUTES.ADMIN}/patients/${id}/suspend`);
  },

  activatePatient: (id: string) => {
    return api.put(`${API_ROUTES.ADMIN}/patients/${id}/activate`);
  },

  deletePatient: (id: string) => {
    return api.delete(`${API_ROUTES.ADMIN}/patients/${id}`);
  },

  getAppointments: (params?: any) => {
    return api.get(`${API_ROUTES.ADMIN}${ADMIN_ROUTES.APPOINTMENTS}`, { params });
  },

  cancelAppointment: (id: string) => {
    return api.put(`${API_ROUTES.ADMIN}/appointments/${id}/cancel`);
  },

  getAllUsers: (params?: any) => {
    return api.get(`${API_ROUTES.ADMIN}${ADMIN_ROUTES.USERS}`, { params });
  },

  // Reports & Analytics
  getMostBookedSpecialties: (params?: any) => {
    return api.get(`${API_ROUTES.ADMIN}/reports/specialties`, { params });
  },

  getAppointmentStatistics: (params?: any) => {
    return api.get(`${API_ROUTES.ADMIN}/reports/appointments`, { params });
  },

  getRevenueStatistics: (params?: any) => {
    return api.get(`${API_ROUTES.ADMIN}/reports/revenue`, { params });
  },

  getDoctorPerformance: (params?: any) => {
    return api.get(`${API_ROUTES.ADMIN}/reports/doctor-performance`, { params });
  },

  getPatientSatisfaction: (params?: any) => {
    return api.get(`${API_ROUTES.ADMIN}/reports/patient-satisfaction`, { params });
  },

  getPeakHours: (params?: any) => {
    return api.get(`${API_ROUTES.ADMIN}/reports/peak-hours`, { params });
  },

  getCancellationAnalysis: (params?: any) => {
    return api.get(`${API_ROUTES.ADMIN}/reports/cancellations`, { params });
  },

  getNoShowAnalysis: (params?: any) => {
    return api.get(`${API_ROUTES.ADMIN}/reports/no-shows`, { params });
  },

  // Settings
  getSettings: () => {
    return api.get(`${API_ROUTES.ADMIN}/settings`);
  },
  updateSettings: (data: any) => {
    return api.put(`${API_ROUTES.ADMIN}/settings`, data);
  },

  // Email Templates
  getEmailTemplates: (params?: any) => {
    return api.get(`${API_ROUTES.ADMIN}/email-templates`, { params });
  },
  getEmailTemplateById: (id: string) => {
    return api.get(`${API_ROUTES.ADMIN}/email-templates/${id}`);
  },
  createEmailTemplate: (data: any) => {
    return api.post(`${API_ROUTES.ADMIN}/email-templates`, data);
  },
  updateEmailTemplate: (id: string, data: any) => {
    return api.put(`${API_ROUTES.ADMIN}/email-templates/${id}`, data);
  },
  deleteEmailTemplate: (id: string) => {
    return api.delete(`${API_ROUTES.ADMIN}/email-templates/${id}`);
  },

  // Roles
  getRoles: (params?: any) => {
    return api.get(`${API_ROUTES.ADMIN}/roles`, { params });
  },
  getRoleById: (id: string) => {
    return api.get(`${API_ROUTES.ADMIN}/roles/${id}`);
  },
  getPermissions: () => {
    return api.get(`${API_ROUTES.ADMIN}/roles/permissions`);
  },
  createRole: (data: any) => {
    return api.post(`${API_ROUTES.ADMIN}/roles`, data);
  },
  updateRole: (id: string, data: any) => {
    return api.put(`${API_ROUTES.ADMIN}/roles/${id}`, data);
  },
  deleteRole: (id: string) => {
    return api.delete(`${API_ROUTES.ADMIN}/roles/${id}`);
  },
  assignRoleToUser: (userId: string, roleId: string | null) => {
    return api.put(`${API_ROUTES.ADMIN}/users/${userId}/role`, { roleId });
  },

  // Specializations (Admin CRUD)
  getSpecializations: (params?: any) => {
    return api.get(`${API_ROUTES.ADMIN}/specializations`, { params });
  },
  getSpecializationById: (id: string) => {
    return api.get(`${API_ROUTES.ADMIN}/specializations/${id}`);
  },
  createSpecialization: (data: any) => {
    return api.post(`${API_ROUTES.ADMIN}/specializations`, data);
  },
  updateSpecialization: (id: string, data: any) => {
    return api.put(`${API_ROUTES.ADMIN}/specializations/${id}`, data);
  },
  deleteSpecialization: (id: string) => {
    return api.delete(`${API_ROUTES.ADMIN}/specializations/${id}`);
  },
};

export const specializationService = {
  getAll: () => {
    return api.get(`${API_ROUTES.SPECIALIZATIONS}${SPECIALIZATION_ROUTES.ROOT}`);
  },
};

export const contactInfoService = {
  get: () => {
    return api.get(`/api${CONTACT_INFO_ROUTES.BASE}${CONTACT_INFO_ROUTES.ROOT}`);
  },
  update: (data: any) => {
    return api.put(`/api${CONTACT_INFO_ROUTES.BASE}${CONTACT_INFO_ROUTES.ROOT}`, data);
  },
};

export const availabilityScheduleService = {
  getAll: (params?: any) => {
    return api.get(`${API_ROUTES.AVAILABILITY_SCHEDULES}${AVAILABILITY_SCHEDULE_ROUTES.ROOT}`, { params });
  },
  getById: (id: string) => {
    return api.get(`${API_ROUTES.AVAILABILITY_SCHEDULES}${AVAILABILITY_SCHEDULE_ROUTES.getId(id)}`);
  },
  create: (data: any) => {
    return api.post(`${API_ROUTES.AVAILABILITY_SCHEDULES}${AVAILABILITY_SCHEDULE_ROUTES.ROOT}`, data);
  },
  update: (id: string, data: any) => {
    return api.put(`${API_ROUTES.AVAILABILITY_SCHEDULES}${AVAILABILITY_SCHEDULE_ROUTES.getId(id)}`, data);
  },
  delete: (id: string) => {
    return api.delete(`${API_ROUTES.AVAILABILITY_SCHEDULES}${AVAILABILITY_SCHEDULE_ROUTES.getId(id)}`);
  },
  bulkUpdate: (data: any) => {
    return api.post(`${API_ROUTES.AVAILABILITY_SCHEDULES}${AVAILABILITY_SCHEDULE_ROUTES.BULK}`, data);
  },
};

export const notificationService = {
  getAll: (params?: any) => {
    return api.get(`${API_ROUTES.NOTIFICATIONS}${NOTIFICATION_ROUTES.ROOT}`, { params });
  },
  getById: (id: string) => {
    return api.get(`${API_ROUTES.NOTIFICATIONS}${NOTIFICATION_ROUTES.getId(id)}`);
  },
  getUnreadCount: () => {
    return api.get(`${API_ROUTES.NOTIFICATIONS}${NOTIFICATION_ROUTES.UNREAD_COUNT}`);
  },
  getByType: (type: string, params?: any) => {
    return api.get(`${API_ROUTES.NOTIFICATIONS}${NOTIFICATION_ROUTES.getByType(type)}`, { params });
  },
  markAsRead: (id: string) => {
    return api.put(`${API_ROUTES.NOTIFICATIONS}${NOTIFICATION_ROUTES.getMarkRead(id)}`);
  },
  markMultipleAsRead: (notificationIds: string[]) => {
    return api.put(`${API_ROUTES.NOTIFICATIONS}${NOTIFICATION_ROUTES.MARK_READ_BULK}`, { notificationIds });
  },
  markAllAsRead: () => {
    return api.put(`${API_ROUTES.NOTIFICATIONS}${NOTIFICATION_ROUTES.MARK_ALL_READ}`);
  },
  delete: (id: string) => {
    return api.delete(`${API_ROUTES.NOTIFICATIONS}${NOTIFICATION_ROUTES.getId(id)}`);
  },
  deleteAll: () => {
    return api.delete(`${API_ROUTES.NOTIFICATIONS}${NOTIFICATION_ROUTES.ROOT}`);
  },
};

export const reviewRatingService = {
  create: (data: any) => {
    return api.post(`${API_ROUTES.REVIEW_RATINGS}${REVIEW_RATING_ROUTES.ROOT}`, data);
  },
  getById: (id: string) => {
    return api.get(`${API_ROUTES.REVIEW_RATINGS}${REVIEW_RATING_ROUTES.getId(id)}`);
  },
  update: (id: string, data: any) => {
    return api.put(`${API_ROUTES.REVIEW_RATINGS}${REVIEW_RATING_ROUTES.getId(id)}`, data);
  },
  delete: (id: string) => {
    return api.delete(`${API_ROUTES.REVIEW_RATINGS}${REVIEW_RATING_ROUTES.getId(id)}`);
  },
  getDoctorReviews: (doctorId: string, params?: any) => {
    return api.get(`${API_ROUTES.REVIEW_RATINGS}${REVIEW_RATING_ROUTES.getDoctorById(doctorId)}`, { params });
  },
  getPatientReviews: (params?: any) => {
    return api.get(`${API_ROUTES.REVIEW_RATINGS}${REVIEW_RATING_ROUTES.PATIENT}`, { params });
  },
  respondToReview: (id: string, message: string) => {
    return api.put(`${API_ROUTES.REVIEW_RATINGS}${REVIEW_RATING_ROUTES.getRespond(id)}`, { message });
  },
};

export const reviewService = {
  create: (data: any) => {
    return api.post(`${API_ROUTES.REVIEWS}${REVIEW_ROUTES.ROOT}`, data);
  },
  update: (id: string, data: any) => {
    return api.put(`${API_ROUTES.REVIEWS}${REVIEW_ROUTES.getId(id)}`, data);
  },
  delete: (id: string) => {
    return api.delete(`${API_ROUTES.REVIEWS}${REVIEW_ROUTES.getId(id)}`);
  },
  getDoctorReviews: (doctorId: string, params?: any) => {
    return api.get(`${API_ROUTES.REVIEWS}${REVIEW_ROUTES.getDoctorById(doctorId)}`, { params });
  },
  getPatientReviews: (params?: any) => {
    return api.get(`${API_ROUTES.REVIEWS}${REVIEW_ROUTES.PATIENT}`, { params });
  },
};

export const auditLogService = {
  getAll: (params?: any) => {
    return api.get(`${API_ROUTES.AUDIT_LOGS}${AUDIT_LOG_ROUTES.ROOT}`, { params });
  },
  getById: (id: string) => {
    return api.get(`${API_ROUTES.AUDIT_LOGS}${AUDIT_LOG_ROUTES.getId(id)}`);
  },
  getMyLogs: (params?: any) => {
    return api.get(`${API_ROUTES.AUDIT_LOGS}${AUDIT_LOG_ROUTES.MY_LOGS}`, { params });
  },
  getByEntity: (entityType: string, entityId: string, params?: any) => {
    return api.get(`${API_ROUTES.AUDIT_LOGS}${AUDIT_LOG_ROUTES.getEntity(entityType, entityId)}`, { params });
  },
  getStats: (params?: any) => {
    return api.get(`${API_ROUTES.AUDIT_LOGS}${AUDIT_LOG_ROUTES.STATS}`, { params });
  },
  create: (data: any) => {
    return api.post(`${API_ROUTES.AUDIT_LOGS}${AUDIT_LOG_ROUTES.ROOT}`, data);
  },
};

export const masterRoleService = {
  getAll: (params?: any) => {
    return api.get(`${API_ROUTES.MASTER_ROLES}${MASTER_ROLE_ROUTES.ROOT}`, { params });
  },
  getActive: () => {
    return api.get(`${API_ROUTES.MASTER_ROLES}${MASTER_ROLE_ROUTES.ACTIVE}`);
  },
  getById: (id: string) => {
    return api.get(`${API_ROUTES.MASTER_ROLES}${MASTER_ROLE_ROUTES.getId(id)}`);
  },
  create: (data: any) => {
    return api.post(`${API_ROUTES.MASTER_ROLES}${MASTER_ROLE_ROUTES.ROOT}`, data);
  },
  update: (id: string, data: any) => {
    return api.put(`${API_ROUTES.MASTER_ROLES}${MASTER_ROLE_ROUTES.getId(id)}`, data);
  },
  delete: (id: string) => {
    return api.delete(`${API_ROUTES.MASTER_ROLES}${MASTER_ROLE_ROUTES.getId(id)}`);
  },
  getStats: () => {
    return api.get(`${API_ROUTES.MASTER_ROLES}${MASTER_ROLE_ROUTES.STATS}`);
  },
};

// Payment Service
export const paymentService = {
  create: (data: any) => {
    return api.post(`${API_ROUTES.PAYMENTS}${PAYMENT_ROUTES.ROOT}`, data);
  },

  getById: (id: string) => {
    return api.get(`${API_ROUTES.PAYMENTS}${PAYMENT_ROUTES.getId(id)}`);
  },

  getAll: (params?: any) => {
    return api.get(`${API_ROUTES.PAYMENTS}${PAYMENT_ROUTES.ROOT}`, { params });
  },

  getByAppointment: (appointmentId: string) => {
    return api.get(`${API_ROUTES.PAYMENTS}${PAYMENT_ROUTES.getByAppointment(appointmentId)}`);
  },

  verify: (id: string) => {
    return api.post(`${API_ROUTES.PAYMENTS}${PAYMENT_ROUTES.getVerify(id)}`);
  },

  cancel: (id: string) => {
    return api.put(`${API_ROUTES.PAYMENTS}${PAYMENT_ROUTES.getCancel(id)}`);
  },

  updateStatus: (id: string, data: any) => {
    return api.put(`${API_ROUTES.PAYMENTS}${PAYMENT_ROUTES.getUpdateStatus(id)}`, data);
  },

  refund: (id: string, data: any) => {
    return api.post(`${API_ROUTES.PAYMENTS}${PAYMENT_ROUTES.getRefund(id)}`, data);
  },
};

// File Service
export const fileService = {
  upload: (file: File, metadata?: any) => {
    const formData = new FormData();
    formData.append('file', file);
    if (metadata) {
      Object.keys(metadata).forEach(key => {
        formData.append(key, metadata[key]);
      });
    }
    return api.post(`${API_ROUTES.FILES}${FILE_ROUTES.UPLOAD}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  uploadMultiple: (files: File[], metadata?: any) => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    if (metadata) {
      Object.keys(metadata).forEach(key => {
        formData.append(key, metadata[key]);
      });
    }
    return api.post(`${API_ROUTES.FILES}${FILE_ROUTES.UPLOAD_MULTIPLE}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  getById: (id: string) => {
    return api.get(`${API_ROUTES.FILES}${FILE_ROUTES.getId(id)}`);
  },
  download: (id: string) => {
    return api.get(`${API_ROUTES.FILES}${FILE_ROUTES.getDownload(id)}`, {
      responseType: 'blob',
    });
  },
  delete: (id: string) => {
    return api.delete(`${API_ROUTES.FILES}${FILE_ROUTES.getId(id)}`);
  },
};

export default api;

