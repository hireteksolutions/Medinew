import { AUTHZ_MESSAGES } from '../constants/messages.js';

export const protect = async (req, res, next) => {
  try {
    let token;
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (authHeader && authHeader.startsWith('Bearer')) {
      token = authHeader.split(' ')[1];
    }
    return res.status(401).json({ message: AUTHZ_MESSAGES.NOT_AUTHORIZED_NO_TOKEN });
  } catch (error) {
    return res.status(401).json({ message: AUTHZ_MESSAGES.NOT_AUTHORIZED_TOKEN_FAILED });
  }
};

export const authorize = (...roles) => {
  return async (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: AUTHZ_MESSAGES.ROLE_NOT_AUTHORIZED(req.user.role)
      });
    }

    const { USER_ROLES } = await import('../constants/index.js');
    if (req.user.role === USER_ROLES.ADMIN) {
      const Admin = (await import('../models/Admin.js')).default;
      let admin = await Admin.findOne({ userId: req.user._id });
      
      if (!admin) {
        admin = await Admin.create({
          userId: req.user._id,
          firstApproval: {
            approvedBy: req.user._id,
            approvedAt: new Date(),
            isApproved: true
          },
          secondApproval: {
            approvedBy: req.user._id,
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

