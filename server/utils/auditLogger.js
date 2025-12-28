import AuditLog from '../models/AuditLog.js';
import { getClientIP } from './deviceDetection.js';

/**
 * Create an audit log entry
 * @param {Object} options - Audit log options
 * @param {Object} options.user - User object (from req.user)
 * @param {String} options.action - Action performed (e.g., 'create_appointment', 'update_profile')
 * @param {String} options.entityType - Type of entity (e.g., 'appointment', 'user', 'patient')
 * @param {String|ObjectId} options.entityId - ID of the entity affected
 * @param {String} options.method - HTTP method (GET, POST, PUT, DELETE)
 * @param {String} options.endpoint - API endpoint
 * @param {Object} options.changes - Object with 'before' and 'after' states
 * @param {String} options.status - 'success', 'failure', or 'error'
 * @param {Number} options.statusCode - HTTP status code
 * @param {String} options.errorMessage - Error message if status is error/failure
 * @param {Object} options.metadata - Additional metadata
 * @param {Object} options.req - Express request object (optional, for IP and user agent)
 */
export const createAuditLog = async (options) => {
  try {
    const {
      user,
      action,
      entityType,
      entityId,
      method,
      endpoint,
      changes,
      status = 'success',
      statusCode,
      errorMessage,
      metadata,
      req
    } = options;

    // Skip logging if no user (shouldn't happen in protected routes, but safety check)
    if (!user || !user._id) {
      return;
    }

    // Get IP address and user agent from request if provided
    let ipAddress;
    let userAgent;
    if (req) {
      ipAddress = getClientIP(req);
      userAgent = req.get('user-agent') || req.headers['user-agent'];
    }

    const auditLogData = {
      userId: user._id,
      userRole: user.role,
      action,
      entityType,
      entityId: entityId || null,
      method: method || null,
      endpoint: endpoint || null,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      changes: changes || {},
      status,
      statusCode: statusCode || null,
      errorMessage: errorMessage || null,
      metadata: metadata || {}
    };

    // Create audit log (don't await to avoid blocking)
    AuditLog.create(auditLogData).catch(err => {
      console.error('Error creating audit log:', err);
      // Don't throw - audit logging failures shouldn't break the main operation
    });
  } catch (error) {
    console.error('Error in createAuditLog utility:', error);
    // Don't throw - audit logging failures shouldn't break the main operation
  }
};

/**
 * Create audit log for successful action
 */
export const logSuccess = async (user, action, entityType, options = {}) => {
  await createAuditLog({
    user,
    action,
    entityType,
    status: 'success',
    ...options
  });
};

/**
 * Create audit log for failed action
 */
export const logFailure = async (user, action, entityType, errorMessage, options = {}) => {
  await createAuditLog({
    user,
    action,
    entityType,
    status: 'failure',
    errorMessage,
    ...options
  });
};

/**
 * Create audit log for error
 */
export const logError = async (user, action, entityType, errorMessage, options = {}) => {
  await createAuditLog({
    user,
    action,
    entityType,
    status: 'error',
    errorMessage,
    ...options
  });
};

