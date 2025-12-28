import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  createMessage,
  getPatientMessages,
  getMessage,
  updateMessage,
  deleteMessage,
  getDoctorMessages,
  respondToMessage
} from '../controllers/messageController.js';
import { USER_ROLES } from '../constants/index.js';
import { MESSAGE_ROUTES } from '../constants/routes.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Patient routes
router.post(MESSAGE_ROUTES.ROOT, authorize(USER_ROLES.PATIENT), createMessage);
router.get(MESSAGE_ROUTES.ROOT, authorize(USER_ROLES.PATIENT), getPatientMessages);
router.get(MESSAGE_ROUTES.BY_ID, authorize(USER_ROLES.PATIENT), getMessage);
router.put(MESSAGE_ROUTES.BY_ID, authorize(USER_ROLES.PATIENT), updateMessage);
router.delete(MESSAGE_ROUTES.BY_ID, authorize(USER_ROLES.PATIENT), deleteMessage);

// Doctor/Admin routes
router.get(MESSAGE_ROUTES.DOCTOR, authorize(USER_ROLES.DOCTOR, USER_ROLES.ADMIN), getDoctorMessages);
router.post(MESSAGE_ROUTES.RESPOND, authorize(USER_ROLES.DOCTOR, USER_ROLES.ADMIN), respondToMessage);

export default router;

