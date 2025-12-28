import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { getContactInfo, updateContactInfo } from '../controllers/contactInfoController.js';
import { USER_ROLES } from '../constants/index.js';

const router = express.Router();

// Public route to get contact information
router.get('/', getContactInfo);

// Admin route to update contact information
router.put('/', protect, authorize(USER_ROLES.ADMIN), updateContactInfo);

export default router;

