import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { getSpecializations, createSpecialization } from '../controllers/specializationController.js';
import { USER_ROLES } from '../constants/index.js';

const router = express.Router();

// Public route to get all specializations
router.get('/', getSpecializations);

// Admin route to create specialization
router.post('/', protect, authorize(USER_ROLES.ADMIN), createSpecialization);

export default router;

