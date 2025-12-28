import AuditLog from '../models/AuditLog.js';
import { createAuditLogNotification } from '../utils/notificationService.js';
import { USER_ROLES } from '../constants/index.js';
import { AUTHZ_MESSAGES } from '../constants/messages.js';

/**
 * @desc    Get audit logs
 * @route   GET /api/audit-logs
 * @access  Private (Admin)
 */
export const getAuditLogs = async (req, res) => {
  try {
    const {
      userId,
      userRole,
      action,
      entityType,
      entityId,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 50
    } = req.query;

    const query = {};

    if (userId) query.userId = userId;
    if (userRole) query.userRole = userRole;
    if (action) query.action = action;
    if (entityType) query.entityType = entityType;
    if (entityId) query.entityId = entityId;
    if (status) query.status = status;

    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const auditLogs = await AuditLog.find(query)
      .populate('userId', 'firstName lastName email role')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await AuditLog.countDocuments(query);

    res.json({
      success: true,
      data: auditLogs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Get audit log by ID
 * @route   GET /api/audit-logs/:id
 * @access  Private (Admin)
 */
export const getAuditLog = async (req, res) => {
  try {
    const { id } = req.params;

    const auditLog = await AuditLog.findById(id)
      .populate('userId', 'firstName lastName email role');

    if (!auditLog) {
      return res.status(404).json({ message: 'Audit log not found' });
    }

    res.json({
      success: true,
      data: auditLog
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Get audit logs for current user
 * @route   GET /api/audit-logs/my-logs
 * @access  Private
 */
export const getMyAuditLogs = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const {
      action,
      entityType,
      status,
      page = 1,
      limit = 50
    } = req.query;

    const query = { userId };

    if (action) query.action = action;
    if (entityType) query.entityType = entityType;
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const auditLogs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await AuditLog.countDocuments(query);

    res.json({
      success: true,
      data: auditLogs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Get audit logs by entity
 * @route   GET /api/audit-logs/entity/:entityType/:entityId
 * @access  Private (Admin)
 */
export const getAuditLogsByEntity = async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const auditLogs = await AuditLog.find({ entityType, entityId })
      .populate('userId', 'firstName lastName email role')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await AuditLog.countDocuments({ entityType, entityId });

    res.json({
      success: true,
      data: auditLogs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Create audit log (usually called internally)
 * @route   POST /api/audit-logs
 * @access  Private
 */
export const createAuditLog = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const userRole = req.user.role;
    const {
      action,
      entityType,
      entityId,
      method,
      endpoint,
      changes,
      status,
      statusCode,
      errorMessage,
      metadata
    } = req.body;

    if (!action || !entityType) {
      return res.status(400).json({ message: 'Action and entity type are required' });
    }

    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');

    const auditLog = await AuditLog.create({
      userId,
      userRole,
      action,
      entityType,
      entityId,
      method,
      endpoint,
      ipAddress,
      userAgent,
      changes,
      status: status || 'success',
      statusCode,
      errorMessage,
      metadata
    });

    // Create notification for admin if it's an important action
    if (status === 'error' || action.includes('delete') || action.includes('suspend')) {
      try {
        // Find admin users (you might want to create a separate admin notification service)
        // For now, we'll skip admin notifications as they would need admin user lookup
        // await createAuditLogNotification(adminUserId, { ... });
      } catch (notifError) {
        console.error('Error creating audit log notification:', notifError);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Audit log created successfully',
      data: auditLog
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Get audit log statistics
 * @route   GET /api/audit-logs/stats
 * @access  Private (Admin)
 */
export const getAuditLogStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    // Total logs
    const totalLogs = await AuditLog.countDocuments(dateFilter);

    // Logs by status
    const logsByStatus = await AuditLog.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Logs by action
    const logsByAction = await AuditLog.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$action', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Logs by entity type
    const logsByEntityType = await AuditLog.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$entityType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Logs by user role
    const logsByRole = await AuditLog.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$userRole', count: { $sum: 1 } } }
    ]);

    // Error logs count
    const errorLogs = await AuditLog.countDocuments({ ...dateFilter, status: 'error' });

    res.json({
      success: true,
      data: {
        totalLogs,
        logsByStatus,
        logsByAction,
        logsByEntityType,
        logsByRole,
        errorLogs
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

