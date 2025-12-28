import MasterRole from '../models/MasterRole.js';
import { clearRoleCache } from '../utils/roleHelper.js';
import { AUTHZ_MESSAGES, MASTER_ROLE_MESSAGES } from '../constants/messages.js';

/**
 * @desc    Get all roles
 * @route   GET /api/master-roles
 * @access  Private (Admin)
 */
export const getRoles = async (req, res) => {
  try {
    const { isActive, isSystem, page = 1, limit = 50 } = req.query;
    
    const query = {};
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (isSystem !== undefined) query.isSystem = isSystem === 'true';

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const roles = await MasterRole.find(query)
      .sort({ priority: -1, createdAt: 1 })
      .limit(parseInt(limit))
      .skip(skip)
      .populate('createdBy', 'firstName lastName email')
      .populate('updatedBy', 'firstName lastName email');

    const total = await MasterRole.countDocuments(query);

    res.json({
      success: true,
      data: roles,
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
 * @desc    Get active roles (public endpoint for dropdowns, etc.)
 * @route   GET /api/master-roles/active
 * @access  Public (but can be restricted if needed)
 */
export const getActiveRoles = async (req, res) => {
  try {
    const roles = await MasterRole.find({ isActive: true })
      .sort({ priority: -1, createdAt: 1 })
      .select('_id roleName displayName description')
      .lean();

    res.json({
      success: true,
      data: roles
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Get role by ID
 * @route   GET /api/master-roles/:id
 * @access  Private (Admin)
 */
export const getRole = async (req, res) => {
  try {
    const { id } = req.params;

    const role = await MasterRole.findById(id)
      .populate('createdBy', 'firstName lastName email')
      .populate('updatedBy', 'firstName lastName email');

    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }

    res.json({
      success: true,
      data: role
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Create role
 * @route   POST /api/master-roles
 * @access  Private (Admin)
 */
export const createRole = async (req, res) => {
  try {
    const { roleName, displayName, description, permissions, priority, metadata } = req.body;
    const userId = req.user._id || req.user.id;

    if (!roleName || !displayName) {
      return res.status(400).json({ message: 'Role name and display name are required' });
    }

    // Check if role already exists
    const existingRole = await MasterRole.findOne({ 
      roleName: roleName.toLowerCase().trim() 
    });

    if (existingRole) {
      return res.status(400).json({ message: MASTER_ROLE_MESSAGES.ROLE_ALREADY_EXISTS });
    }

    const role = await MasterRole.create({
      roleName: roleName.toLowerCase().trim(),
      displayName,
      description,
      permissions: permissions || [],
      priority: priority || 0,
      metadata,
      createdBy: userId,
      updatedBy: userId
    });

    // Clear cache to refresh role list
    clearRoleCache();

    const populatedRole = await MasterRole.findById(role._id)
      .populate('createdBy', 'firstName lastName email')
      .populate('updatedBy', 'firstName lastName email');

    res.status(201).json({
      success: true,
      message: 'Role created successfully',
      data: populatedRole
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: MASTER_ROLE_MESSAGES.ROLE_ALREADY_EXISTS });
    }
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Update role
 * @route   PUT /api/master-roles/:id
 * @access  Private (Admin)
 */
export const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id || req.user.id;
    const { displayName, description, permissions, isActive, priority, metadata } = req.body;

    const role = await MasterRole.findById(id);

    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }

    // Prevent updating system role name
    if (req.body.roleName && role.isSystem) {
      return res.status(400).json({ message: 'Cannot update role name for system roles' });
    }

    // Update fields
    if (displayName !== undefined) role.displayName = displayName;
    if (description !== undefined) role.description = description;
    if (permissions !== undefined) role.permissions = permissions;
    if (isActive !== undefined) role.isActive = isActive;
    if (priority !== undefined) role.priority = priority;
    if (metadata !== undefined) role.metadata = metadata;
    if (req.body.roleName && !role.isSystem) {
      role.roleName = req.body.roleName.toLowerCase().trim();
    }
    role.updatedBy = userId;

    await role.save();

    // Clear cache
    clearRoleCache();

    const updatedRole = await MasterRole.findById(role._id)
      .populate('createdBy', 'firstName lastName email')
      .populate('updatedBy', 'firstName lastName email');

    res.json({
      success: true,
      message: 'Role updated successfully',
      data: updatedRole
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: MASTER_ROLE_MESSAGES.ROLE_ALREADY_EXISTS });
    }
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Delete role
 * @route   DELETE /api/master-roles/:id
 * @access  Private (Admin)
 */
export const deleteRole = async (req, res) => {
  try {
    const { id } = req.params;

    const role = await MasterRole.findById(id);

    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }

    // Prevent deletion of system roles
    if (role.isSystem) {
      return res.status(400).json({ message: 'Cannot delete system roles' });
    }

    // Check if role is being used by any users
    const User = (await import('../models/User.js')).default;
    const userCount = await User.countDocuments({ roleId: id });

    if (userCount > 0) {
      return res.status(400).json({ 
        message: `Cannot delete role. It is being used by ${userCount} user(s). Please reassign users first.` 
      });
    }

    await MasterRole.findByIdAndDelete(id);

    // Clear cache
    clearRoleCache();

    res.json({
      success: true,
      message: 'Role deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Get role statistics
 * @route   GET /api/master-roles/stats
 * @access  Private (Admin)
 */
export const getRoleStats = async (req, res) => {
  try {
    const User = (await import('../models/User.js')).default;

    const totalRoles = await MasterRole.countDocuments();
    const activeRoles = await MasterRole.countDocuments({ isActive: true });
    const systemRoles = await MasterRole.countDocuments({ isSystem: true });

    // Get user count per role
    const rolesWithUserCount = await MasterRole.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: 'roleId',
          as: 'users'
        }
      },
      {
        $project: {
          _id: 1,
          roleName: 1,
          displayName: 1,
          userCount: { $size: '$users' }
        }
      },
      {
        $sort: { userCount: -1 }
      }
    ]);

    res.json({
      success: true,
      data: {
        totalRoles,
        activeRoles,
        systemRoles,
        rolesWithUserCount
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

