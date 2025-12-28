import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  createReview,
  updateReview,
  deleteReview,
  getDoctorReviews,
  getPatientReviews
} from '../controllers/reviewController.js';
import { USER_ROLES } from '../constants/index.js';
import { REVIEW_ROUTES } from '../constants/routes.js';

const router = express.Router();

// Public route - get doctor reviews
router.get(REVIEW_ROUTES.DOCTOR_BY_ID, getDoctorReviews);

// Protected routes
router.use(protect);

// Patient routes
router.post(REVIEW_ROUTES.ROOT, authorize(USER_ROLES.PATIENT), createReview);
router.put(REVIEW_ROUTES.BY_ID, authorize(USER_ROLES.PATIENT), updateReview);
router.delete(REVIEW_ROUTES.BY_ID, authorize(USER_ROLES.PATIENT), deleteReview);
router.get(REVIEW_ROUTES.PATIENT, authorize(USER_ROLES.PATIENT), getPatientReviews);

export default router;

