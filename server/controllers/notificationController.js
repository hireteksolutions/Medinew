import Notification from '../models/Notification.js';
import { getPaginationParams, buildPaginationMeta } from '../utils/pagination.js';
import {
  markAsRead,
  markMultipleAsRead,
  markAllAsRead
} from '../utils/notificationService.js';
import { NOTIFICATION_MESSAGES } from '../constants/messages.js';

/**
 * @desc    Get notifications for current user
 * @route   GET /api/notifications
 * @access  Private
 */
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { type, isRead, priority } = req.query;

    // Get pagination parameters
    const { limit, offset } = getPaginationParams(req);

    const query = { userId };
    if (type) query.type = type;
    if (isRead !== undefined) query.isRead = isRead === 'true';
    if (priority) query.priority = priority;

    // Get total count before pagination
    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ userId, isRead: false });

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit);

    // Build pagination metadata
    const pagination = buildPaginationMeta(total, limit, offset);

    res.json({
      success: true,
      notifications,
      pagination,
      unreadCount
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Get notification by ID
 * @route   GET /api/notifications/:id
 * @access  Private
 */
export const getNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id || req.user.id;

    const notification = await Notification.findOne({ _id: id, userId });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({
      success: true,
      data: notification
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Get unread notification count
 * @route   GET /api/notifications/unread/count
 * @access  Private
 */
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const count = await Notification.countDocuments({ userId, isRead: false });

    res.json({
      success: true,
      count
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Mark notification as read
 * @route   PUT /api/notifications/:id/read
 * @access  Private
 */
export const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id || req.user.id;

    const notification = await Notification.findOne({ _id: id, userId });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    const updatedNotification = await markAsRead(id);

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: updatedNotification
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Mark multiple notifications as read
 * @route   PUT /api/notifications/mark-read
 * @access  Private
 */
export const markNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { notificationIds } = req.body;

    if (!notificationIds || !Array.isArray(notificationIds)) {
      return res.status(400).json({ message: NOTIFICATION_MESSAGES.NOTIFICATION_IDS_REQUIRED });
    }

    const result = await markMultipleAsRead(userId, notificationIds);

    res.json({
      success: true,
      message: `${result.modifiedCount} notifications marked as read`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Mark all notifications as read
 * @route   PUT /api/notifications/mark-all-read
 * @access  Private
 */
export const markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    const result = await markAllAsRead(userId);

    res.json({
      success: true,
      message: `${result.modifiedCount} notifications marked as read`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Delete notification
 * @route   DELETE /api/notifications/:id
 * @access  Private
 */
export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id || req.user.id;

    const notification = await Notification.findOneAndDelete({ _id: id, userId });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Delete all notifications
 * @route   DELETE /api/notifications
 * @access  Private
 */
export const deleteAllNotifications = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    const result = await Notification.deleteMany({ userId });

    res.json({
      success: true,
      message: `${result.deletedCount} notifications deleted`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Get notifications by type
 * @route   GET /api/notifications/type/:type
 * @access  Private
 */
export const getNotificationsByType = async (req, res) => {
  try {
    const { type } = req.params;
    const userId = req.user._id || req.user.id;
    
    // Get pagination parameters
    const { limit, offset } = getPaginationParams(req);

    // Get total count before pagination
    const total = await Notification.countDocuments({ userId, type });

    const notifications = await Notification.find({ userId, type })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit);

    // Build pagination metadata
    const pagination = buildPaginationMeta(total, limit, offset);

    res.json({
      success: true,
      notifications,
      pagination
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

