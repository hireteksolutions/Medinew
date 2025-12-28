import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  getRoles,
  getActiveRoles,
  getRole,
  createRole,
  updateRole,
  deleteRole,
  getRoleStats
} from '../controllers/masterRoleController.js';
import { USER_ROLES } from '../constants/index.js';
import { MASTER_ROLE_ROUTES } from '../constants/routes.js';

const router = express.Router();

// Public route for active roles (used for dropdowns, registration, etc.)
router.get(MASTER_ROLE_ROUTES.ACTIVE, getActiveRoles);

// All other routes require authentication
router.use(protect);

// Admin routes only
router.get(MASTER_ROLE_ROUTES.STATS, authorize(USER_ROLES.ADMIN), getRoleStats);
router.get(MASTER_ROLE_ROUTES.ROOT, authorize(USER_ROLES.ADMIN), getRoles);
router.get(MASTER_ROLE_ROUTES.BY_ID, authorize(USER_ROLES.ADMIN), getRole);
router.post(MASTER_ROLE_ROUTES.ROOT, authorize(USER_ROLES.ADMIN), createRole);
router.put(MASTER_ROLE_ROUTES.BY_ID, authorize(USER_ROLES.ADMIN), updateRole);
router.delete(MASTER_ROLE_ROUTES.BY_ID, authorize(USER_ROLES.ADMIN), deleteRole);

export default router;

