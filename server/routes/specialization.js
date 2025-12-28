import express from 'express';
import { getSpecializations } from '../controllers/specializationController.js';

const router = express.Router();

// Public route to get all specializations (only active ones for non-admin users)
router.get('/', getSpecializations);

// Admin routes are handled in admin.js

export default router;

