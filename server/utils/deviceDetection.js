import crypto from 'crypto';

/**
 * Parse user agent string to extract device information
 * @param {string} userAgent - User agent string from request
 * @returns {Object} Device information
 */
export const parseUserAgent = (userAgent = '') => {
  const ua = userAgent.toLowerCase();
  
  // Detect OS
  let os = 'Unknown';
  if (ua.includes('windows')) os = 'Windows';
  else if (ua.includes('mac os') || ua.includes('macos')) os = 'macOS';
  else if (ua.includes('linux')) os = 'Linux';
  else if (ua.includes('android')) os = 'Android';
  else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';

  // Detect Browser
  let browser = 'Unknown';
  if (ua.includes('chrome') && !ua.includes('edg')) browser = 'Chrome';
  else if (ua.includes('firefox')) browser = 'Firefox';
  else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari';
  else if (ua.includes('edg')) browser = 'Edge';
  else if (ua.includes('opera') || ua.includes('opr')) browser = 'Opera';

  // Detect Device Type
  let type = 'web';
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    type = 'mobile';
  } else if (ua.includes('tablet') || ua.includes('ipad')) {
    type = 'tablet';
  }

  // Create device name
  let name = `${browser} on ${os}`;
  if (type === 'mobile') {
    if (ua.includes('iphone')) {
      const match = ua.match(/iphone\s+os\s+(\d+)/);
      name = match ? `iPhone (iOS ${match[1]})` : 'iPhone';
    } else if (ua.includes('android')) {
      name = 'Android Device';
    }
  } else if (type === 'tablet') {
    if (ua.includes('ipad')) {
      name = 'iPad';
    } else {
      name = `${browser} on ${os} (Tablet)`;
    }
  }

  return {
    name,
    type,
    os,
    browser
  };
};

/**
 * Get client IP address from request
 * @param {Object} req - Express request object
 * @returns {string} IP address
 */
export const getClientIP = (req) => {
  return req.ip || 
         req.connection?.remoteAddress || 
         req.socket?.remoteAddress ||
         (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
         req.headers['x-real-ip'] ||
         'Unknown';
};

/**
 * Generate session ID (UUID v4)
 * @returns {string} Session ID
 */
export const generateSessionId = () => {
  return crypto.randomUUID();
};

