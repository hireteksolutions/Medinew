/**
 * Admin Settings Service
 * Handles retrieval and caching of admin settings, especially session timeout
 */

import AdminSettings from '../models/AdminSettings.js';

// Cache for settings (in-memory cache)
let settingsCache = null;
let cacheExpiry = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache TTL

/**
 * Get admin settings (with caching)
 * @returns {Promise<Object>} Admin settings object
 */
export const getAdminSettings = async () => {
  // Return cached settings if still valid
  if (settingsCache && cacheExpiry && Date.now() < cacheExpiry) {
    return settingsCache;
  }

  // Fetch from database
  const settings = await AdminSettings.getSettings();
  
  // Update cache
  settingsCache = {
    sessionTimeout: settings.sessionTimeout, // in minutes
    accessTokenExpiration: settings.accessTokenExpiration, // in minutes
    refreshTokenExpiration: settings.refreshTokenExpiration, // in days
    lastUpdated: settings.lastUpdated
  };
  cacheExpiry = Date.now() + CACHE_TTL;

  return settingsCache;
};

/**
 * Clear settings cache (call this after updating settings)
 */
export const clearSettingsCache = () => {
  settingsCache = null;
  cacheExpiry = null;
};

/**
 * Get session timeout in milliseconds
 * @returns {Promise<Number>} Session timeout in milliseconds
 */
export const getSessionTimeoutMs = async () => {
  const settings = await getAdminSettings();
  return settings.sessionTimeout * 60 * 1000; // Convert minutes to milliseconds
};

/**
 * Get session timeout in minutes
 * @returns {Promise<Number>} Session timeout in minutes
 */
export const getSessionTimeoutMinutes = async () => {
  const settings = await getAdminSettings();
  return settings.sessionTimeout;
};

/**
 * Get access token expiration string (e.g., '15m')
 * @returns {Promise<String>} Access token expiration string
 */
export const getAccessTokenExpiration = async () => {
  const settings = await getAdminSettings();
  return `${settings.accessTokenExpiration}m`;
};

/**
 * Get refresh token expiration string (e.g., '30d')
 * @returns {Promise<String>} Refresh token expiration string
 */
export const getRefreshTokenExpiration = async () => {
  const settings = await getAdminSettings();
  return `${settings.refreshTokenExpiration}d`;
};

/**
 * Update admin settings
 * @param {Object} updates - Settings to update
 * @param {String} updatedBy - User ID who made the update
 * @returns {Promise<Object>} Updated settings
 */
export const updateAdminSettings = async (updates, updatedBy) => {
  const settings = await AdminSettings.updateSettings(updates, updatedBy);
  
  // Clear cache after update
  clearSettingsCache();
  
  return {
    sessionTimeout: settings.sessionTimeout,
    accessTokenExpiration: settings.accessTokenExpiration,
    refreshTokenExpiration: settings.refreshTokenExpiration,
    lastUpdated: settings.lastUpdated,
    updatedBy: settings.updatedBy
  };
};

