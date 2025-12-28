import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  createAppointment,
  getAppointment,
  cancelAppointment,
  rescheduleAppointment,
  getAvailableSlots,
  getAppointmentDetails
} from '../controllers/appointmentController.js';
import { USER_ROLES } from '../constants/index.js';
import { APPOINTMENT_ROUTES } from '../constants/routes.js';

const router = express.Router();

// Public route for checking available slots
router.get(APPOINTMENT_ROUTES.AVAILABLE_SLOTS, getAvailableSlots);

// Protected routes - require authentication
router.use(protect);

// Create appointment - only patients can create
router.post(APPOINTMENT_ROUTES.ROOT, authorize(USER_ROLES.PATIENT), createAppointment);

// Get appointment - patients, doctors, and admins can view (with proper authorization in controller)
router.get(APPOINTMENT_ROUTES.BY_ID, authorize(USER_ROLES.PATIENT, USER_ROLES.DOCTOR, USER_ROLES.ADMIN), getAppointment);

// Cancel appointment - patients, doctors, and admins can cancel (with proper authorization in controller)
router.put(APPOINTMENT_ROUTES.CANCEL, authorize(USER_ROLES.PATIENT, USER_ROLES.DOCTOR, USER_ROLES.ADMIN), cancelAppointment);

// Reschedule appointment - patients and doctors can reschedule (with proper authorization in controller)
router.put(APPOINTMENT_ROUTES.RESCHEDULE, authorize(USER_ROLES.PATIENT, USER_ROLES.DOCTOR), rescheduleAppointment);

// Get appointment details - patients, doctors, and admins can view
router.get(APPOINTMENT_ROUTES.DETAILS, authorize(USER_ROLES.PATIENT, USER_ROLES.DOCTOR, USER_ROLES.ADMIN), getAppointmentDetails);

export default router;

