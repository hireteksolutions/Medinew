import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  createReviewRating,
  updateReviewRating,
  deleteReviewRating,
  getDoctorReviewRatings,
  getPatientReviewRatings,
  getReviewRating,
  respondToReview
} from '../controllers/reviewRatingController.js';
import { USER_ROLES } from '../constants/index.js';
import { REVIEW_RATING_ROUTES } from '../constants/routes.js';

const router = express.Router();

// Public route
router.get(`${REVIEW_RATING_ROUTES.DOCTOR_BY_ID}`, getDoctorReviewRatings);
router.get(REVIEW_RATING_ROUTES.BY_ID, getReviewRating);

// Protected routes
router.use(protect);

// Patient routes
router.post(REVIEW_RATING_ROUTES.ROOT, authorize(USER_ROLES.PATIENT), createReviewRating);
router.get(REVIEW_RATING_ROUTES.PATIENT, authorize(USER_ROLES.PATIENT), getPatientReviewRatings);
router.put(REVIEW_RATING_ROUTES.BY_ID, authorize(USER_ROLES.PATIENT), updateReviewRating);
router.delete(REVIEW_RATING_ROUTES.BY_ID, authorize(USER_ROLES.PATIENT), deleteReviewRating);

// Doctor routes
router.put(`${REVIEW_RATING_ROUTES.RESPOND}`, authorize(USER_ROLES.DOCTOR), respondToReview);

export default router;

