import Specialization from '../models/Specialization.js';
import { SPECIALIZATION_MESSAGES, HTTP_STATUS } from '../constants/index.js';
import { createAuditLog } from '../utils/auditLogger.js';

// @desc    Get all specializations
// @route   GET /api/specializations
// @access  Public (for public route) / Private/Admin (for admin route)
export const getSpecializations = async (req, res) => {
  try {
    const { isActive } = req.query;
    const query = {};
    
    // For public route, only show active ones
    // For admin route (accessed via /api/admin/specializations), show all if isActive is not specified
    // Check if user is authenticated and is admin
    if (req.user && req.user.role === 'admin') {
      if (isActive !== undefined) query.isActive = isActive === 'true';
    } else {
      query.isActive = true;
    }
    
    const specializations = await Specialization.find(query)
      .sort({ name: 1 });

    res.json(specializations);
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

// @desc    Get specialization by ID
// @route   GET /api/admin/specializations/:id
// @access  Private/Admin
export const getSpecializationById = async (req, res) => {
  try {
    const specialization = await Specialization.findById(req.params.id);
    if (!specialization) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Specialization not found' });
    }
    res.json(specialization);
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

// @desc    Create a specialization
// @route   POST /api/admin/specializations
// @access  Private/Admin
export const createSpecialization = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: SPECIALIZATION_MESSAGES.NAME_REQUIRED || 'Name is required' });
    }

    const specialization = await Specialization.create({
      name,
      description
    });
    
    await createAuditLog({
      user: req.user,
      action: 'create_specialization',
      entityType: 'specialization',
      entityId: specialization._id,
      method: req.method,
      endpoint: req.originalUrl,
      status: 'success',
      statusCode: HTTP_STATUS.CREATED,
      changes: { before: null, after: specialization.toObject() },
      req
    });

    res.status(HTTP_STATUS.CREATED).json({ message: 'Specialization created successfully', specialization });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: SPECIALIZATION_MESSAGES.ALREADY_EXISTS || 'Specialization already exists' });
    }
    
    await createAuditLog({
      user: req.user,
      action: 'create_specialization',
      entityType: 'specialization',
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

// @desc    Update specialization
// @route   PUT /api/admin/specializations/:id
// @access  Private/Admin
export const updateSpecialization = async (req, res) => {
  try {
    const specialization = await Specialization.findById(req.params.id);
    if (!specialization) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Specialization not found' });
    }
    
    const oldSpecialization = specialization.toObject();
    Object.assign(specialization, req.body);
    await specialization.save();
    
    await createAuditLog({
      user: req.user,
      action: 'update_specialization',
      entityType: 'specialization',
      entityId: specialization._id,
      method: req.method,
      endpoint: req.originalUrl,
      status: 'success',
      statusCode: HTTP_STATUS.OK,
      changes: { before: oldSpecialization, after: specialization.toObject() },
      req
    });
    
    res.json({ message: 'Specialization updated successfully', specialization });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: 'Specialization name already exists' });
    }
    
    await createAuditLog({
      user: req.user,
      action: 'update_specialization',
      entityType: 'specialization',
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

// @desc    Delete specialization
// @route   DELETE /api/admin/specializations/:id
// @access  Private/Admin
export const deleteSpecialization = async (req, res) => {
  try {
    const specialization = await Specialization.findById(req.params.id);
    if (!specialization) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Specialization not found' });
    }
    
    const oldSpecialization = specialization.toObject();
    // Soft delete by setting isActive to false
    specialization.isActive = false;
    await specialization.save();
    
    await createAuditLog({
      user: req.user,
      action: 'delete_specialization',
      entityType: 'specialization',
      entityId: specialization._id,
      method: req.method,
      endpoint: req.originalUrl,
      status: 'success',
      statusCode: HTTP_STATUS.OK,
      changes: { before: oldSpecialization, after: specialization.toObject() },
      req
    });
    
    res.json({ message: 'Specialization deleted successfully' });
  } catch (error) {
    await createAuditLog({
      user: req.user,
      action: 'delete_specialization',
      entityType: 'specialization',
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

