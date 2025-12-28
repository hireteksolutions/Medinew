import SystemSettings from '../models/SystemSettings.js';
import { HTTP_STATUS } from '../constants/index.js';
import { createAuditLog } from '../utils/auditLogger.js';

// @desc    Get system settings
// @route   GET /api/admin/settings
// @access  Private/Admin
export const getSettings = async (req, res) => {
  try {
    const settings = await SystemSettings.getSettings();
    res.json(settings);
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

// @desc    Update system settings
// @route   PUT /api/admin/settings
// @access  Private/Admin
export const updateSettings = async (req, res) => {
  try {
    let settings = await SystemSettings.findOne();
    
    if (!settings) {
      settings = await SystemSettings.create({
        ...req.body,
        updatedBy: req.user._id
      });
      
      await createAuditLog({
        user: req.user,
        action: 'create_settings',
        entityType: 'settings',
        entityId: settings._id,
        method: req.method,
        endpoint: req.originalUrl,
        status: 'success',
        statusCode: HTTP_STATUS.OK,
        changes: { before: null, after: settings.toObject() },
        req
      });
    } else {
      const oldSettings = settings.toObject();
      Object.assign(settings, {
        ...req.body,
        updatedBy: req.user._id
      });
      await settings.save();
      
      await createAuditLog({
        user: req.user,
        action: 'update_settings',
        entityType: 'settings',
        entityId: settings._id,
        method: req.method,
        endpoint: req.originalUrl,
        status: 'success',
        statusCode: HTTP_STATUS.OK,
        changes: { before: oldSettings, after: settings.toObject() },
        req
      });
    }
    
    res.json({ message: 'Settings updated successfully', settings });
  } catch (error) {
    await createAuditLog({
      user: req.user,
      action: 'update_settings',
      entityType: 'settings',
      method: req.method,
      endpoint: req.originalUrl,
      status: 'failure',
      statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      errorMessage: error.message,
      req
    });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

