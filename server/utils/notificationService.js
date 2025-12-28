import Notification from '../models/Notification.js';

/**
 * Modular Notification Service
 * Centralized service for creating and managing notifications
 */

/**
 * Create a notification
 * @param {Object} notificationData - Notification data
 * @param {string} notificationData.userId - User ID to notify
 * @param {string} notificationData.type - Notification type
 * @param {string} notificationData.title - Notification title
 * @param {string} notificationData.message - Notification message
 * @param {string} notificationData.priority - Priority level (low, medium, high, urgent)
 * @param {string} notificationData.relatedEntityType - Related entity type
 * @param {string} notificationData.relatedEntityId - Related entity ID
 * @param {string} notificationData.actionUrl - Action URL
 * @param {Object} notificationData.metadata - Additional metadata
 * @returns {Promise<Object>} Created notification
 */
export const createNotification = async (notificationData) => {
  try {
    const notification = await Notification.create(notificationData);
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

/**
 * Create multiple notifications for multiple users
 * @param {Array} notificationsData - Array of notification data objects
 * @returns {Promise<Array>} Created notifications
 */
export const createBulkNotifications = async (notificationsData) => {
  try {
    const notifications = await Notification.insertMany(notificationsData);
    return notifications;
  } catch (error) {
    console.error('Error creating bulk notifications:', error);
    throw error;
  }
};

/**
 * Mark notification as read
 * @param {string} notificationId - Notification ID
 * @returns {Promise<Object>} Updated notification
 */
export const markAsRead = async (notificationId) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      notificationId,
      {
        isRead: true,
        readAt: new Date()
      },
      { new: true }
    );
    return notification;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

/**
 * Mark multiple notifications as read
 * @param {string} userId - User ID
 * @param {Array} notificationIds - Array of notification IDs
 * @returns {Promise<Object>} Update result
 */
export const markMultipleAsRead = async (userId, notificationIds) => {
  try {
    const result = await Notification.updateMany(
      {
        _id: { $in: notificationIds },
        userId: userId
      },
      {
        isRead: true,
        readAt: new Date()
      }
    );
    return result;
  } catch (error) {
    console.error('Error marking multiple notifications as read:', error);
    throw error;
  }
};

/**
 * Mark all notifications as read for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Update result
 */
export const markAllAsRead = async (userId) => {
  try {
    const result = await Notification.updateMany(
      {
        userId: userId,
        isRead: false
      },
      {
        isRead: true,
        readAt: new Date()
      }
    );
    return result;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
};

/**
 * Notification factory functions for specific entity types
 */

// Availability Schedule Notifications
export const createAvailabilityScheduleNotification = async (userId, data) => {
  return createNotification({
    userId,
    type: 'availability_schedule',
    title: data.title || 'Schedule Updated',
    message: data.message || 'Your availability schedule has been updated',
    priority: data.priority || 'medium',
    relatedEntityType: 'schedule',
    relatedEntityId: data.scheduleId,
    actionUrl: data.actionUrl || '/doctor/schedule',
    metadata: data.metadata || {}
  });
};

// Review/Rating Notifications
export const createReviewRatingNotification = async (userId, data) => {
  return createNotification({
    userId,
    type: 'review_rating',
    title: data.title || 'New Review',
    message: data.message || 'You have received a new review',
    priority: data.priority || 'medium',
    relatedEntityType: 'review',
    relatedEntityId: data.reviewId,
    actionUrl: data.actionUrl || `/reviews/${data.reviewId}`,
    metadata: data.metadata || {}
  });
};

// Message Notifications
export const createMessageNotification = async (userId, data) => {
  return createNotification({
    userId,
    type: 'message',
    title: data.title || 'New Message',
    message: data.message || 'You have received a new message',
    priority: data.priority || 'medium',
    relatedEntityType: 'message',
    relatedEntityId: data.messageId,
    actionUrl: data.actionUrl || `/messages/${data.messageId}`,
    metadata: data.metadata || {}
  });
};

// Audit Log Notifications (for admin/system)
export const createAuditLogNotification = async (userId, data) => {
  return createNotification({
    userId,
    type: 'audit_log',
    title: data.title || 'System Activity',
    message: data.message || 'System activity detected',
    priority: data.priority || 'low',
    relatedEntityType: 'audit',
    relatedEntityId: data.auditLogId,
    actionUrl: data.actionUrl || `/admin/audit-logs/${data.auditLogId}`,
    metadata: data.metadata || {}
  });
};

// Appointment Notifications
export const createAppointmentNotification = async (userId, data) => {
  return createNotification({
    userId,
    type: data.appointmentType || 'appointment',
    title: data.title || 'Appointment Update',
    message: data.message || 'Your appointment has been updated',
    priority: data.priority || 'medium',
    relatedEntityType: 'appointment',
    relatedEntityId: data.appointmentId,
    actionUrl: data.actionUrl || `/appointments/${data.appointmentId}`,
    metadata: data.metadata || {}
  });
};

// System Notifications
export const createSystemNotification = async (userId, data) => {
  return createNotification({
    userId,
    type: 'system',
    title: data.title || 'System Notification',
    message: data.message || 'System notification',
    priority: data.priority || 'medium',
    relatedEntityType: 'system',
    actionUrl: data.actionUrl,
    metadata: data.metadata || {}
  });
};

export default {
  createNotification,
  createBulkNotifications,
  markAsRead,
  markMultipleAsRead,
  markAllAsRead,
  createAvailabilityScheduleNotification,
  createReviewRatingNotification,
  createMessageNotification,
  createAuditLogNotification,
  createAppointmentNotification,
  createSystemNotification
};

