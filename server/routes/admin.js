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
  getAllUsers
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

// Users
router.get(ADMIN_ROUTES.USERS, getAllUsers);

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

export default router;

