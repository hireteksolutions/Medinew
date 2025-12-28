import MasterRole from '../models/MasterRole.js';

let roleCache = null;
let cacheTimestamp = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get all active roles from database
 * @param {boolean} useCache - Whether to use cache
 * @returns {Promise<Array>} Array of role documents
 */
export const getActiveRoles = async (useCache = true) => {
  const now = Date.now();
  
  if (useCache && roleCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_TTL) {
    return roleCache;
  }

  try {
    const roles = await MasterRole.find({ isActive: true })
      .sort({ priority: -1, createdAt: 1 })
      .lean();
    
    roleCache = roles;
    cacheTimestamp = now;
    
    return roles;
  } catch (error) {
    console.error('Error fetching roles from database:', error);
    // Return empty array on error to prevent system breakage
    return [];
  }
};

/**
 * Get role by ID
 * @param {string} roleId - Role ID
 * @returns {Promise<Object|null>} Role document or null
 */
export const getRoleById = async (roleId) => {
  try {
    const role = await MasterRole.findById(roleId).lean();
    return role;
  } catch (error) {
    console.error('Error fetching role by ID:', error);
    return null;
  }
};

/**
 * Get role by role name
 * @param {string} roleName - Role name (e.g., 'patient', 'doctor', 'admin')
 * @returns {Promise<Object|null>} Role document or null
 */
export const getRoleByName = async (roleName) => {
  try {
    const role = await MasterRole.findOne({ 
      roleName: roleName.toLowerCase(),
      isActive: true 
    }).lean();
    return role;
  } catch (error) {
    console.error('Error fetching role by name:', error);
    return null;
  }
};

/**
 * Get role names array for validation
 * @returns {Promise<Array<string>>} Array of role names
 */
export const getRoleNames = async () => {
  const roles = await getActiveRoles();
  return roles.map(role => role.roleName);
};

/**
 * Get role IDs array
 * @returns {Promise<Array<string>>} Array of role IDs
 */
export const getRoleIds = async () => {
  const roles = await getActiveRoles();
  return roles.map(role => role._id.toString());
};

/**
 * Validate if a role ID exists and is active
 * @param {string} roleId - Role ID to validate
 * @returns {Promise<boolean>} True if valid, false otherwise
 */
export const isValidRoleId = async (roleId) => {
  try {
    const role = await MasterRole.findOne({ 
      _id: roleId,
      isActive: true 
    }).lean();
    return !!role;
  } catch (error) {
    return false;
  }
};

/**
 * Validate if a role name exists and is active
 * @param {string} roleName - Role name to validate
 * @returns {Promise<boolean>} True if valid, false otherwise
 */
export const isValidRoleName = async (roleName) => {
  try {
    const role = await getRoleByName(roleName);
    return !!role;
  } catch (error) {
    return false;
  }
};

/**
 * Clear role cache
 */
export const clearRoleCache = () => {
  roleCache = null;
  cacheTimestamp = null;
};

/**
 * Get default role (usually patient)
 * @returns {Promise<Object|null>} Default role document
 */
export const getDefaultRole = async () => {
  try {
    // First try to get role with lowest priority (usually default)
    let role = await MasterRole.findOne({ isActive: true })
      .sort({ priority: 1, createdAt: 1 })
      .lean();
    
    // If not found, try to get 'patient' role
    if (!role) {
      role = await getRoleByName('patient');
    }
    
    return role;
  } catch (error) {
    console.error('Error fetching default role:', error);
    return null;
  }
};

export default {
  getActiveRoles,
  getRoleById,
  getRoleByName,
  getRoleNames,
  getRoleIds,
  isValidRoleId,
  isValidRoleName,
  clearRoleCache,
  getDefaultRole
};

