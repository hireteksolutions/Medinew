import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  getAvailabilitySchedules,
  getAvailabilitySchedule,
  createAvailabilitySchedule,
  updateAvailabilitySchedule,
  deleteAvailabilitySchedule,
  bulkUpdateAvailabilitySchedules
} from '../controllers/availabilityScheduleController.js';
import { USER_ROLES } from '../constants/index.js';
import { AVAILABILITY_SCHEDULE_ROUTES } from '../constants/routes.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// All routes require doctor role
router.use(authorize(USER_ROLES.DOCTOR));

// Routes
router.get(AVAILABILITY_SCHEDULE_ROUTES.ROOT, getAvailabilitySchedules);
router.get(AVAILABILITY_SCHEDULE_ROUTES.BY_ID, getAvailabilitySchedule);
router.post(AVAILABILITY_SCHEDULE_ROUTES.ROOT, createAvailabilitySchedule);
router.put(AVAILABILITY_SCHEDULE_ROUTES.BY_ID, updateAvailabilitySchedule);
router.delete(AVAILABILITY_SCHEDULE_ROUTES.BY_ID, deleteAvailabilitySchedule);
router.post(AVAILABILITY_SCHEDULE_ROUTES.BULK, bulkUpdateAvailabilitySchedules);

export default router;

