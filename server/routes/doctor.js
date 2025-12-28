import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  // Profile
  getProfile,
  updateProfile,
  updateSchedule,
  getSchedule,
  updateWeeklySchedule,
  blockDates,
  unblockDates,
  changePassword,
  uploadCertifications,
  // Dashboard
  getDashboard,
  getStats,
  // Appointments
  getAppointments,
  getAppointment,
  updateAppointment,
  acceptAppointment,
  declineAppointment,
  completeAppointment,
  rescheduleAppointment,
  // Patients
  getPatients,
  getPatientHistory,
  getCompletePatientHistory,
  referPatient
} from '../controllers/doctorController.js';
import {
  getMessages,
  getDoctorMessage,
  markAsRead,
  respondToMessageWithAttachments,
  archiveMessage,
  getUnreadCount,
  markMultipleAsRead
} from '../controllers/messageController.js';
import { USER_ROLES } from '../constants/index.js';
import { DOCTOR_ROUTES } from '../constants/routes.js';

const router = express.Router();

// All routes require authentication and doctor role
router.use(protect);
router.use(authorize(USER_ROLES.DOCTOR));

// Profile Routes
router.get(DOCTOR_ROUTES.PROFILE, getProfile);
router.put(DOCTOR_ROUTES.PROFILE, updateProfile);
router.put(DOCTOR_ROUTES.CHANGE_PASSWORD, changePassword);
router.post(DOCTOR_ROUTES.CERTIFICATIONS, uploadCertifications);

// Schedule Management Routes
router.get(DOCTOR_ROUTES.SCHEDULE, getSchedule);
router.put(DOCTOR_ROUTES.SCHEDULE, updateSchedule); // Backward compatibility
router.put(DOCTOR_ROUTES.SCHEDULE_WEEKLY, updateWeeklySchedule);
router.post(DOCTOR_ROUTES.SCHEDULE_BLOCK_DATES, blockDates);
router.delete(DOCTOR_ROUTES.SCHEDULE_BLOCK_DATES, unblockDates);

// Dashboard Routes
router.get(DOCTOR_ROUTES.DASHBOARD, getDashboard);
router.get(DOCTOR_ROUTES.STATS, getStats);

// Appointment Routes
router.get(DOCTOR_ROUTES.APPOINTMENTS, getAppointments);
router.get(DOCTOR_ROUTES.APPOINTMENT_BY_ID, getAppointment);
router.put(DOCTOR_ROUTES.APPOINTMENT_BY_ID, updateAppointment);
router.put(DOCTOR_ROUTES.APPOINTMENT_ACCEPT, acceptAppointment);
router.put(DOCTOR_ROUTES.APPOINTMENT_DECLINE, declineAppointment);
router.put(DOCTOR_ROUTES.APPOINTMENT_COMPLETE, completeAppointment);
router.put(DOCTOR_ROUTES.APPOINTMENT_RESCHEDULE, rescheduleAppointment);

// Patient Routes
router.get(DOCTOR_ROUTES.PATIENTS, getPatients);
router.get(DOCTOR_ROUTES.PATIENT_HISTORY, getPatientHistory);
router.get('/patients/:patientId/complete-history', getCompletePatientHistory);
router.post('/appointments/:id/refer', referPatient);

// Message Routes
router.get(DOCTOR_ROUTES.MESSAGES, getMessages);
router.get(DOCTOR_ROUTES.MESSAGES_UNREAD_COUNT, getUnreadCount);
router.get(DOCTOR_ROUTES.MESSAGE_BY_ID, getDoctorMessage);
router.put(DOCTOR_ROUTES.MESSAGE_READ, markAsRead);
router.put(DOCTOR_ROUTES.MESSAGES_MARK_READ, markMultipleAsRead);
router.post(DOCTOR_ROUTES.MESSAGE_RESPOND, respondToMessageWithAttachments);
router.put(DOCTOR_ROUTES.MESSAGE_ARCHIVE, archiveMessage);

export default router;
