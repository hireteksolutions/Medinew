import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import UserSession from '../models/UserSession.js';
import { AUTHZ_MESSAGES, GENERAL_MESSAGES, AUTH_MESSAGES } from '../constants/messages.js';

// Protect routes - verify JWT token
export const protect = async (req, res, next) => {
  try {
    let token;

    // Check for Authorization header (case-insensitive)
    const authHeader = req.headers.authorization || req.headers.Authorization;
    
    if (authHeader && authHeader.startsWith('Bearer')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      // Debug logging in development
      if (process.env.NODE_ENV === 'development') {
        // No token found - proceeding with request (will be rejected by protect middleware)
        // Debug logging removed
          authorization: req.headers.authorization,
          Authorization: req.headers.Authorization,
          allHeaders: Object.keys(req.headers)
        });
      }
      return res.status(401).json({ message: AUTHZ_MESSAGES.NOT_AUTHORIZED_NO_TOKEN });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
      req.user = await User.findById(decoded.id).select('-password');
      
      if (!req.user) {
        return res.status(401).json({ message: AUTHZ_MESSAGES.USER_NOT_FOUND });
      }

      if (!req.user.isActive) {
        return res.status(401).json({ message: AUTH_MESSAGES.ACCOUNT_DEACTIVATED });
      }

      // Optional: Check if session is still valid (if sessionId is provided)
      // This is optional since access tokens are short-lived
      // For stricter security, you can validate session here

      next();
    } catch (error) {
      // Debug logging in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Auth Debug - Token verification failed:', error.message);
      }
      return res.status(401).json({ message: AUTHZ_MESSAGES.NOT_AUTHORIZED_TOKEN_FAILED });
    }
  } catch (error) {
    res.status(500).json({ message: GENERAL_MESSAGES.SERVER_ERROR });
  }
};

// Role-based authorization
export const authorize = (...roles) => {
  return async (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: AUTHZ_MESSAGES.ROLE_NOT_AUTHORIZED(req.user.role)
      });
    }

    // For admin role, check if admin is fully approved
    const { USER_ROLES } = await import('../constants/index.js');
    if (req.user.role === USER_ROLES.ADMIN) {
      const Admin = (await import('../models/Admin.js')).default;
      let admin = await Admin.findOne({ userId: req.user._id });
      
      // Handle legacy admins (created before approval system was implemented)
      // Auto-approve existing admins by creating Admin record with full approval
      if (!admin) {
        admin = await Admin.create({
          userId: req.user._id,
          firstApproval: {
            approvedBy: req.user._id, // Self-approved for legacy admins
            approvedAt: new Date(),
            isApproved: true
          },
          secondApproval: {
            approvedBy: req.user._id, // Self-approved for legacy admins
            approvedAt: new Date(),
            isApproved: true
          },
          isFullyApproved: true,
          isRejected: false
        });
      }
      
      if (!admin.isFullyApproved || admin.isRejected) {
        return res.status(403).json({ 
          message: 'Admin account is not fully approved. Please contact system administrator.' 
        });
      }
    }

    next();
  };
};

