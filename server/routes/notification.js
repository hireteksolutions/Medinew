import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  getNotifications,
  getNotification,
  getUnreadCount,
  markNotificationAsRead,
  markNotificationsAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  deleteAllNotifications,
  getNotificationsByType
} from '../controllers/notificationController.js';
import { NOTIFICATION_ROUTES } from '../constants/routes.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Routes
router.get(NOTIFICATION_ROUTES.ROOT, getNotifications);
router.get(NOTIFICATION_ROUTES.UNREAD_COUNT, getUnreadCount);
router.get(NOTIFICATION_ROUTES.BY_TYPE, getNotificationsByType);
router.get(NOTIFICATION_ROUTES.BY_ID, getNotification);
router.put(NOTIFICATION_ROUTES.MARK_READ, markNotificationAsRead);
router.put(NOTIFICATION_ROUTES.MARK_READ_BULK, markNotificationsAsRead);
router.put(NOTIFICATION_ROUTES.MARK_ALL_READ, markAllNotificationsAsRead);
router.delete(NOTIFICATION_ROUTES.BY_ID, deleteNotification);
router.delete(NOTIFICATION_ROUTES.ROOT, deleteAllNotifications);

export default router;

