import EmailTemplate from '../models/EmailTemplate.js';
import { HTTP_STATUS } from '../constants/index.js';
import { createAuditLog } from '../utils/auditLogger.js';

// @desc    Get all email templates
// @route   GET /api/admin/email-templates
// @access  Private/Admin
export const getEmailTemplates = async (req, res) => {
  try {
    const { category, isActive } = req.query;
    const query = {};
    
    if (category) query.category = category;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    
    const templates = await EmailTemplate.find(query).sort({ name: 1 });
    res.json(templates);
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

// @desc    Get email template by ID
// @route   GET /api/admin/email-templates/:id
// @access  Private/Admin
export const getEmailTemplateById = async (req, res) => {
  try {
    const template = await EmailTemplate.findById(req.params.id);
    if (!template) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Email template not found' });
    }
    res.json(template);
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

// @desc    Create email template
// @route   POST /api/admin/email-templates
// @access  Private/Admin
export const createEmailTemplate = async (req, res) => {
  try {
    const template = await EmailTemplate.create({
      ...req.body,
      updatedBy: req.user._id
    });
    
    await createAuditLog({
      user: req.user,
      action: 'create_email_template',
      entityType: 'email_template',
      entityId: template._id,
      method: req.method,
      endpoint: req.originalUrl,
      status: 'success',
      statusCode: HTTP_STATUS.CREATED,
      changes: { before: null, after: template.toObject() },
      req
    });
    
    res.status(HTTP_STATUS.CREATED).json({ message: 'Email template created successfully', template });
  } catch (error) {
    await createAuditLog({
      user: req.user,
      action: 'create_email_template',
      entityType: 'email_template',
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

// @desc    Update email template
// @route   PUT /api/admin/email-templates/:id
// @access  Private/Admin
export const updateEmailTemplate = async (req, res) => {
  try {
    const template = await EmailTemplate.findById(req.params.id);
    if (!template) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Email template not found' });
    }
    
    const oldTemplate = template.toObject();
    Object.assign(template, {
      ...req.body,
      updatedBy: req.user._id
    });
    await template.save();
    
    await createAuditLog({
      user: req.user,
      action: 'update_email_template',
      entityType: 'email_template',
      entityId: template._id,
      method: req.method,
      endpoint: req.originalUrl,
      status: 'success',
      statusCode: HTTP_STATUS.OK,
      changes: { before: oldTemplate, after: template.toObject() },
      req
    });
    
    res.json({ message: 'Email template updated successfully', template });
  } catch (error) {
    await createAuditLog({
      user: req.user,
      action: 'update_email_template',
      entityType: 'email_template',
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

// @desc    Delete email template
// @route   DELETE /api/admin/email-templates/:id
// @access  Private/Admin
export const deleteEmailTemplate = async (req, res) => {
  try {
    const template = await EmailTemplate.findById(req.params.id);
    if (!template) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Email template not found' });
    }
    
    const oldTemplate = template.toObject();
    await template.deleteOne();
    
    await createAuditLog({
      user: req.user,
      action: 'delete_email_template',
      entityType: 'email_template',
      entityId: template._id,
      method: req.method,
      endpoint: req.originalUrl,
      status: 'success',
      statusCode: HTTP_STATUS.OK,
      changes: { before: oldTemplate, after: null },
      req
    });
    
    res.json({ message: 'Email template deleted successfully' });
  } catch (error) {
    await createAuditLog({
      user: req.user,
      action: 'delete_email_template',
      entityType: 'email_template',
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

