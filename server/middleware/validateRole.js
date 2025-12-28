import { getRoleNames, getRoleById, isValidRoleId, isValidRoleName } from '../utils/roleHelper.js';

/**
 * Middleware to validate role from database
 * Validates if role exists in master_roles collection
 */
export const validateRoleFromDB = async (req, res, next) => {
  try {
    const { role, roleId } = req.body;

    // If roleId is provided, validate it
    if (roleId) {
      const isValid = await isValidRoleId(roleId);
      if (!isValid) {
        return res.status(400).json({ 
          message: 'Invalid role ID. Role does not exist or is inactive.' 
        });
      }
      next();
      return;
    }

    // If role name is provided, validate it
    if (role) {
      const isValid = await isValidRoleName(role);
      if (!isValid) {
        return res.status(400).json({ 
          message: 'Invalid role. Role does not exist or is inactive.' 
        });
      }
      next();
      return;
    }

    // If neither is provided, it might be optional (depending on use case)
    next();
  } catch (error) {
    console.error('Error validating role from database:', error);
    res.status(500).json({ message: 'Error validating role' });
  }
};

/**
 * Custom express-validator for role validation using database
 */
export const validateRole = () => {
  return async (value) => {
    if (!value) {
      throw new Error('Role is required');
    }
    
    const isValid = await isValidRoleName(value);
    if (!isValid) {
      throw new Error('Invalid role. Role does not exist or is inactive.');
    }
    
    return true;
  };
};

/**
 * Custom express-validator for roleId validation using database
 */
export const validateRoleId = () => {
  return async (value) => {
    if (!value) {
      throw new Error('Role ID is required');
    }
    
    const isValid = await isValidRoleId(value);
    if (!isValid) {
      throw new Error('Invalid role ID. Role does not exist or is inactive.');
    }
    
    return true;
  };
};

/**
 * Get dynamic role validation values for express-validator
 * This fetches roles from database to use in isIn() validation
 */
export const getRoleValidationValues = async () => {
  try {
    const roleNames = await getRoleNames();
    return roleNames.length > 0 ? roleNames : ['patient', 'doctor', 'admin']; // Fallback
  } catch (error) {
    console.error('Error getting role validation values:', error);
    return ['patient', 'doctor', 'admin']; // Fallback to default roles
  }
};

export default {
  validateRoleFromDB,
  validateRole,
  validateRoleId,
  getRoleValidationValues
};

