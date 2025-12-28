import User from '../models/User.js';
import Role from '../models/Role.js';
import { USER_ROLES } from '../constants/index.js';
import { AUTHZ_MESSAGES } from '../constants/messages.js';

/**
 * Permission-based authorization middleware
 * Checks if the user has the required permission(s)
 * 
 * @param {...string} requiredPermissions - One or more permission strings (e.g., 'doctors:create', 'patients:edit')
 * @returns {Function} Express middleware function
 */
export const requirePermission = (...requiredPermissions) => {
  return async (req, res, next) => {
    try {
      // Ensure user is authenticated (should be called after protect middleware)
      if (!req.user) {
        return res.status(401).json({ message: AUTHZ_MESSAGES.NOT_AUTHORIZED_NO_TOKEN });
      }

      // Admins with default admin role have all permissions
      if (req.user.role === USER_ROLES.ADMIN && !req.user.customRoleId) {
        return next();
      }

      // For users with custom roles, check their role's permissions
      let userPermissions = [];

      if (req.user.customRoleId) {
        // User has a custom role, get permissions from that role
        const role = await Role.findById(req.user.customRoleId);
        if (!role) {
          return res.status(403).json({ message: 'User role not found' });
        }
        if (!role.isActive) {
          return res.status(403).json({ message: 'User role is inactive' });
        }
        userPermissions = role.permissions || [];
      } else {
        // User has default role (patient/doctor/admin), map to default permissions
        userPermissions = getDefaultPermissionsForRole(req.user.role);
      }

      // Check if user has at least one of the required permissions
      const hasPermission = requiredPermissions.some(permission => 
        userPermissions.includes(permission)
      );

      if (!hasPermission) {
        return res.status(403).json({ 
          message: `Access denied. Required permission(s): ${requiredPermissions.join(', ')}` 
        });
      }

      // User has required permission, proceed
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ message: 'Error checking permissions' });
    }
  };
};

/**
 * Get default permissions for a standard role
 * @param {string} role - User role (patient, doctor, admin)
 * @returns {string[]} Array of permission strings
 */
function getDefaultPermissionsForRole(role) {
  // Default permissions for standard roles
  const defaultPermissions = {
    [USER_ROLES.PATIENT]: [
      'dashboard:view',
      'appointments:view',
      'appointments:create',
      'appointments:cancel', // Can cancel own appointments
    ],
    [USER_ROLES.DOCTOR]: [
      'dashboard:view',
      'appointments:view',
      'appointments:edit',
      'patients:view',
    ],
    [USER_ROLES.ADMIN]: [
      // Admins with default role have all permissions (checked above)
      // This is a fallback if somehow reached
      'dashboard:view',
      'doctors:view',
      'doctors:create',
      'doctors:edit',
      'doctors:delete',
      'doctors:approve',
      'patients:view',
      'patients:create',
      'patients:edit',
      'patients:delete',
      'appointments:view',
      'appointments:create',
      'appointments:edit',
      'appointments:cancel',
      'reports:view',
      'reports:export',
      'settings:view',
      'settings:edit',
      'users:view',
      'users:create',
      'users:edit',
      'users:delete',
      'roles:view',
      'roles:create',
      'roles:edit',
      'roles:delete',
      'specialties:view',
      'specialties:create',
      'specialties:edit',
      'specialties:delete',
    ],
  };

  return defaultPermissions[role] || [];
}

/**
 * Middleware to require ALL specified permissions (AND logic)
 * User must have all permissions to proceed
 * 
 * @param {...string} requiredPermissions - Permission strings that must all be present
 * @returns {Function} Express middleware function
 */
export const requireAllPermissions = (...requiredPermissions) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: AUTHZ_MESSAGES.NOT_AUTHORIZED_NO_TOKEN });
      }

      // Admins with default admin role have all permissions
      if (req.user.role === USER_ROLES.ADMIN && !req.user.customRoleId) {
        return next();
      }

      let userPermissions = [];

      if (req.user.customRoleId) {
        const role = await Role.findById(req.user.customRoleId);
        if (!role || !role.isActive) {
          return res.status(403).json({ message: 'User role not found or inactive' });
        }
        userPermissions = role.permissions || [];
      } else {
        userPermissions = getDefaultPermissionsForRole(req.user.role);
      }

      // Check if user has ALL required permissions
      const hasAllPermissions = requiredPermissions.every(permission => 
        userPermissions.includes(permission)
      );

      if (!hasAllPermissions) {
        return res.status(403).json({ 
          message: `Access denied. Required all permissions: ${requiredPermissions.join(', ')}` 
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ message: 'Error checking permissions' });
    }
  };
};

