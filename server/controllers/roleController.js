import Role, { PERMISSIONS, PERMISSION_VALUES } from '../models/Role.js';
import User from '../models/User.js';
import { HTTP_STATUS } from '../constants/index.js';
import { createAuditLog } from '../utils/auditLogger.js';

// @desc    Get all roles
// @route   GET /api/admin/roles
// @access  Private/Admin
export const getRoles = async (req, res) => {
  try {
    const { isActive } = req.query;
    const query = {};
    if (isActive !== undefined) query.isActive = isActive === 'true';
    
    const roles = await Role.find(query).sort({ name: 1 });
    res.json(roles);
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

// @desc    Get role by ID
// @route   GET /api/admin/roles/:id
// @access  Private/Admin
export const getRoleById = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Role not found' });
    }
    res.json(role);
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

// @desc    Create role
// @route   POST /api/admin/roles
// @access  Private/Admin
export const createRole = async (req, res) => {
  try {
    const { name, displayName, description, permissions } = req.body;
    
    // Validate permissions
    if (permissions && Array.isArray(permissions)) {
      const invalidPermissions = permissions.filter(p => !PERMISSION_VALUES.includes(p));
      if (invalidPermissions.length > 0) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
          message: `Invalid permissions: ${invalidPermissions.join(', ')}` 
        });
      }
    }
    
    const role = await Role.create({
      name,
      displayName,
      description,
      permissions: permissions || [],
      createdBy: req.user._id,
      updatedBy: req.user._id
    });
    
    await createAuditLog({
      user: req.user,
      action: 'create_role',
      entityType: 'role',
      entityId: role._id,
      method: req.method,
      endpoint: req.originalUrl,
      status: 'success',
      statusCode: HTTP_STATUS.CREATED,
      changes: { before: null, after: role.toObject() },
      req
    });
    
    res.status(HTTP_STATUS.CREATED).json({ message: 'Role created successfully', role });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: 'Role name already exists' });
    }
    
    await createAuditLog({
      user: req.user,
      action: 'create_role',
      entityType: 'role',
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

// @desc    Update role
// @route   PUT /api/admin/roles/:id
// @access  Private/Admin
export const updateRole = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Role not found' });
    }
    
    // Prevent modification of system roles
    if (role.isSystem && (req.body.permissions || req.body.name)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: 'Cannot modify system roles' });
    }
    
    // Validate permissions
    if (req.body.permissions && Array.isArray(req.body.permissions)) {
      const invalidPermissions = req.body.permissions.filter(p => !PERMISSION_VALUES.includes(p));
      if (invalidPermissions.length > 0) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
          message: `Invalid permissions: ${invalidPermissions.join(', ')}` 
        });
      }
    }
    
    const oldRole = role.toObject();
    Object.assign(role, {
      ...req.body,
      updatedBy: req.user._id
    });
    await role.save();
    
    await createAuditLog({
      user: req.user,
      action: 'update_role',
      entityType: 'role',
      entityId: role._id,
      method: req.method,
      endpoint: req.originalUrl,
      status: 'success',
      statusCode: HTTP_STATUS.OK,
      changes: { before: oldRole, after: role.toObject() },
      req
    });
    
    res.json({ message: 'Role updated successfully', role });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: 'Role name already exists' });
    }
    
    await createAuditLog({
      user: req.user,
      action: 'update_role',
      entityType: 'role',
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

// @desc    Delete role
// @route   DELETE /api/admin/roles/:id
// @access  Private/Admin
export const deleteRole = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Role not found' });
    }
    
    // Prevent deletion of system roles
    if (role.isSystem) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: 'Cannot delete system roles' });
    }
    
    // Check if any users are using this role
    const usersWithRole = await User.countDocuments({ customRoleId: role._id });
    if (usersWithRole > 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
        message: `Cannot delete role. ${usersWithRole} user(s) are assigned to this role.` 
      });
    }
    
    const oldRole = role.toObject();
    await role.deleteOne();
    
    await createAuditLog({
      user: req.user,
      action: 'delete_role',
      entityType: 'role',
      entityId: role._id,
      method: req.method,
      endpoint: req.originalUrl,
      status: 'success',
      statusCode: HTTP_STATUS.OK,
      changes: { before: oldRole, after: null },
      req
    });
    
    res.json({ message: 'Role deleted successfully' });
  } catch (error) {
    await createAuditLog({
      user: req.user,
      action: 'delete_role',
      entityType: 'role',
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

// @desc    Get all available permissions
// @route   GET /api/admin/roles/permissions
// @access  Private/Admin
export const getPermissions = async (req, res) => {
  try {
    const permissions = Object.entries(PERMISSIONS).map(([key, value]) => ({
      key,
      value,
      label: value.replace(/:/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    }));
    res.json(permissions);
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

// @desc    Assign role to user
// @route   PUT /api/admin/users/:userId/role
// @access  Private/Admin
export const assignRoleToUser = async (req, res) => {
  try {
    const { roleId } = req.body;
    const user = await User.findById(req.params.userId);
    
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'User not found' });
    }
    
    if (roleId) {
      const role = await Role.findById(roleId);
      if (!role) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Role not found' });
      }
      if (!role.isActive) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: 'Cannot assign inactive role' });
      }
      user.customRoleId = roleId;
    } else {
      user.customRoleId = null;
    }
    
    await user.save();
    
    await createAuditLog({
      user: req.user,
      action: 'assign_role',
      entityType: 'user',
      entityId: user._id,
      method: req.method,
      endpoint: req.originalUrl,
      status: 'success',
      statusCode: HTTP_STATUS.OK,
      changes: { before: { customRoleId: user.customRoleId }, after: { customRoleId: roleId } },
      metadata: { userId: user._id, roleId },
      req
    });
    
    res.json({ message: 'Role assigned successfully', user });
  } catch (error) {
    await createAuditLog({
      user: req.user,
      action: 'assign_role',
      entityType: 'user',
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

