import express from 'express';
import {
  getAllDoctors,
  getDoctorById,
  searchDoctors,
  getFeaturedDoctors
} from '../controllers/doctorPublicController.js';
import { DOCTOR_PUBLIC_ROUTES } from '../constants/routes.js';

const router = express.Router();

// Public routes for doctor listings
router.get(DOCTOR_PUBLIC_ROUTES.ROOT, getAllDoctors);
router.get(DOCTOR_PUBLIC_ROUTES.FEATURED, getFeaturedDoctors);
router.get(DOCTOR_PUBLIC_ROUTES.SEARCH, searchDoctors);
router.get(DOCTOR_PUBLIC_ROUTES.BY_ID, getDoctorById);

export default router;

