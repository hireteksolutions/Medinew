import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  getStats,
  getDoctors,
  getDoctorById,
  approveDoctor,
  rejectDoctor,
  updateDoctor,
  suspendDoctor,
  activateDoctor,
  deleteDoctor,
  getPatients,
  getPatientById,
  updatePatient,
  suspendPatient,
  activatePatient,
  deletePatient,
  getAppointments,
  cancelAppointment,
  rescheduleAppointment,
  getAllUsers,
  createAdmin,
  getAdmins,
  getAdminById,
  firstApprovalAdmin,
  secondApprovalAdmin,
  rejectAdmin
} from '../controllers/adminController.js';
import {
  getMostBookedSpecialties,
  getAppointmentStatistics,
  getRevenueStatistics,
  getDoctorPerformance,
  getPatientSatisfaction,
  getPeakHours,
  getCancellationAnalysis,
  getNoShowAnalysis
} from '../controllers/reportsController.js';
import {
  getConfig,
  updateConfig,
  testConnection
} from '../controllers/fileStorageConfigController.js';
import { getSettings, updateSettings } from '../controllers/settingsController.js';
import {
  getEmailTemplates,
  getEmailTemplateById,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate
} from '../controllers/emailTemplateController.js';
import {
  getRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  getPermissions,
  assignRoleToUser
} from '../controllers/roleController.js';
import {
  getSpecializations,
  getSpecializationById,
  createSpecialization,
  updateSpecialization,
  deleteSpecialization
} from '../controllers/specializationController.js';
import { USER_ROLES } from '../constants/index.js';
import { ADMIN_ROUTES, buildRoute } from '../constants/routes.js';

const router = express.Router();

// All routes require authentication and admin role
router.use(protect);
router.use(authorize(USER_ROLES.ADMIN));

// Stats
router.get(ADMIN_ROUTES.STATS, getStats);

// Doctors
router.get(ADMIN_ROUTES.DOCTORS, getDoctors);
router.get('/doctors/:id', getDoctorById);
router.put('/doctors/:id/approve', approveDoctor);
router.put('/doctors/:id/reject', rejectDoctor);
router.put('/doctors/:id', updateDoctor);
router.put('/doctors/:id/suspend', suspendDoctor);
router.put('/doctors/:id/activate', activateDoctor);
router.delete('/doctors/:id', deleteDoctor);

// Patients
router.get(ADMIN_ROUTES.PATIENTS, getPatients);
router.get('/patients/:id', getPatientById);
router.put('/patients/:id', updatePatient);
router.put('/patients/:id/suspend', suspendPatient);
router.put('/patients/:id/activate', activatePatient);
router.delete('/patients/:id', deletePatient);

// Appointments
router.get(ADMIN_ROUTES.APPOINTMENTS, getAppointments);
router.put('/appointments/:id/cancel', cancelAppointment);
router.put('/appointments/:id/reschedule', rescheduleAppointment);

// Users
router.get(ADMIN_ROUTES.USERS, getAllUsers);

// Admin Management (Two-Level Approval)
router.post('/admins', createAdmin);
router.get('/admins', getAdmins);
router.get('/admins/:id', getAdminById);
router.put('/admins/:id/first-approval', firstApprovalAdmin);
router.put('/admins/:id/second-approval', secondApprovalAdmin);
router.put('/admins/:id/reject', rejectAdmin);

// Reports & Analytics
router.get('/reports/specialties', getMostBookedSpecialties);
router.get('/reports/appointments', getAppointmentStatistics);
router.get('/reports/revenue', getRevenueStatistics);
router.get('/reports/doctor-performance', getDoctorPerformance);
router.get('/reports/patient-satisfaction', getPatientSatisfaction);
router.get('/reports/peak-hours', getPeakHours);
router.get('/reports/cancellations', getCancellationAnalysis);
router.get('/reports/no-shows', getNoShowAnalysis);

// File Storage Configuration
router.get('/file-storage/config', getConfig);
router.put('/file-storage/config', updateConfig);
router.post('/file-storage/test', testConnection);

// Settings
router.get('/settings', getSettings);
router.put('/settings', updateSettings);

// Email Templates
router.get('/email-templates', getEmailTemplates);
router.get('/email-templates/:id', getEmailTemplateById);
router.post('/email-templates', createEmailTemplate);
router.put('/email-templates/:id', updateEmailTemplate);
router.delete('/email-templates/:id', deleteEmailTemplate);

// Roles
router.get('/roles', getRoles);
router.get('/roles/permissions', getPermissions);
router.get('/roles/:id', getRoleById);
router.post('/roles', createRole);
router.put('/roles/:id', updateRole);
router.delete('/roles/:id', deleteRole);

// User Role Assignment
router.put('/users/:userId/role', assignRoleToUser);

// Specializations (Admin CRUD)
router.get('/specializations', getSpecializations);
router.get('/specializations/:id', getSpecializationById);
router.post('/specializations', createSpecialization);
router.put('/specializations/:id', updateSpecialization);
router.delete('/specializations/:id', deleteSpecialization);

export default router;

