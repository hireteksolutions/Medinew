import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  getAuditLogs,
  getAuditLog,
  getMyAuditLogs,
  getAuditLogsByEntity,
  createAuditLog,
  getAuditLogStats
} from '../controllers/auditLogController.js';
import { USER_ROLES } from '../constants/index.js';
import { AUDIT_LOG_ROUTES } from '../constants/routes.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// User can view their own audit logs
router.get(AUDIT_LOG_ROUTES.MY_LOGS, getMyAuditLogs);

// Admin routes
router.get(AUDIT_LOG_ROUTES.STATS, authorize(USER_ROLES.ADMIN), getAuditLogStats);
router.get(AUDIT_LOG_ROUTES.ROOT, authorize(USER_ROLES.ADMIN), getAuditLogs);
router.get(AUDIT_LOG_ROUTES.BY_ID, authorize(USER_ROLES.ADMIN), getAuditLog);
router.get(`${AUDIT_LOG_ROUTES.ENTITY}`, authorize(USER_ROLES.ADMIN), getAuditLogsByEntity);

// Create audit log (can be called by any authenticated user, usually internally)
router.post(AUDIT_LOG_ROUTES.ROOT, createAuditLog);

export default router;

