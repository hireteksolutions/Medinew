import User from '../models/User.js';
import Patient from '../models/Patient.js';
import Doctor from '../models/Doctor.js';
import UserSession from '../models/UserSession.js';
import { validationResult } from 'express-validator';
import crypto from 'crypto';
import { USER_ROLES, CRYPTO, TIME_CONSTANTS, HTTP_STATUS } from '../constants/index.js';
import { AUTH_MESSAGES, GENERAL_MESSAGES } from '../constants/messages.js';
import { parseUserAgent, getClientIP, generateSessionId } from '../utils/deviceDetection.js';

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ errors: errors.array() });
    }

    const { email, password, firstName, lastName, phone, role, dateOfBirth, gender, address, licenseNumber, specialization } = req.body;

    // Check if email already exists
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: AUTH_MESSAGES.EMAIL_ALREADY_REGISTERED });
    }

    // Check if phone already exists
    const phoneExists = await User.findOne({ phone });
    if (phoneExists) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: AUTH_MESSAGES.PHONE_ALREADY_REGISTERED });
    }

    // Validate doctor-specific fields
    if (role === USER_ROLES.DOCTOR) {
      if (!licenseNumber || !licenseNumber.trim()) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: AUTH_MESSAGES.LICENSE_NUMBER_REQUIRED });
      }
      
      const trimmedLicense = licenseNumber.trim().toUpperCase();
      
      // Validate license number length
      if (trimmedLicense.length < 6) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: AUTH_MESSAGES.LICENSE_NUMBER_MIN_LENGTH });
      }
      
      if (trimmedLicense.length > 20) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: AUTH_MESSAGES.LICENSE_NUMBER_MAX_LENGTH });
      }
      
      // Validate format - must contain at least one letter and one number
      const hasLetter = /[A-Za-z]/.test(trimmedLicense);
      const hasNumber = /[0-9]/.test(trimmedLicense);
      if (!hasLetter || !hasNumber) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: AUTH_MESSAGES.LICENSE_NUMBER_FORMAT });
      }
      
      if (!specialization || !specialization.trim()) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: AUTH_MESSAGES.SPECIALIZATION_REQUIRED });
      }
      
      // Check if license number already exists
      const licenseExists = await Doctor.findOne({ licenseNumber: trimmedLicense });
      if (licenseExists) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: AUTH_MESSAGES.LICENSE_NUMBER_ALREADY_REGISTERED });
      }
    }

    // Create user (without transaction for standalone MongoDB)
    let createdUser;
    try {
      createdUser = await User.create({
        email,
        password,
        firstName,
        lastName,
        phone,
        role,
        dateOfBirth,
        gender,
        address
      });

      // Create role-specific profile
      try {
        if (role === USER_ROLES.PATIENT) {
          await Patient.create({ userId: createdUser._id });
        } else if (role === USER_ROLES.DOCTOR) {
          await Doctor.create({ 
            userId: createdUser._id,
            licenseNumber: licenseNumber.trim().toUpperCase(),
            specialization: specialization.trim(),
            consultationFee: 0, // Default consultation fee, can be updated later in profile
            isApproved: false // Doctors need admin approval
          });
        }
      } catch (profileError) {
        // If profile creation fails, delete the user to maintain consistency
        await User.findByIdAndDelete(createdUser._id);
        throw profileError;
      }

      const finalUser = createdUser;

      // For doctors, don't generate token - they need admin approval first
      if (role === USER_ROLES.DOCTOR) {
        return res.status(HTTP_STATUS.CREATED).json({
          message: AUTH_MESSAGES.REGISTRATION_SUCCESS_PENDING_APPROVAL,
          requiresApproval: true,
          user: {
            id: finalUser._id,
            email: finalUser.email,
            firstName: finalUser.firstName,
            lastName: finalUser.lastName,
            role: finalUser.role
          }
        });
      }

      // Generate tokens for patients and other roles
      const accessToken = finalUser.generateAccessToken();
      const refreshToken = finalUser.generateRefreshToken();

      // Get device information
      const userAgent = req.headers['user-agent'] || '';
      const device = parseUserAgent(userAgent);
      const ipAddress = getClientIP(req);
      const sessionId = generateSessionId();

      // Hash refresh token
      const refreshTokenHash = await UserSession.hashRefreshToken(refreshToken);

      // Calculate expiration (30 days from now)
      const expiresAt = new Date(Date.now() + TIME_CONSTANTS.SESSION_EXPIRE_MS);

      // Create session
      await UserSession.create({
        userId: finalUser._id,
        sessionId,
        refreshTokenHash,
        device,
        ipAddress,
        location: {
          country: 'Unknown',
          city: 'Unknown'
        },
        isActive: true,
        isRevoked: false,
        expiresAt
      });

      res.status(HTTP_STATUS.CREATED).json({
        accessToken,
        refreshToken,
        sessionId,
        user: {
          id: finalUser._id,
          email: finalUser.email,
          firstName: finalUser.firstName,
          lastName: finalUser.lastName,
          role: finalUser.role
        }
      });
    } catch (error) {
      // If it's a validation error, return specific message
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map(err => err.message);
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
          message: GENERAL_MESSAGES.VALIDATION_FAILED,
          errors: validationErrors
        });
      }
      
      // If it's a duplicate key error
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern || {})[0] || 'field';
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
          message: GENERAL_MESSAGES.FIELD_ALREADY_REGISTERED(field)
        });
      }
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
  } catch (error) {
    // Handle errors from validation or checks before user creation
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
        message: GENERAL_MESSAGES.VALIDATION_FAILED,
        errors: validationErrors
      });
    }
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || 'field';
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
        message: GENERAL_MESSAGES.FIELD_ALREADY_REGISTERED(field)
      });
    }
    
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

// @desc    Check if email is available
// @route   GET /api/auth/check-email
// @access  Public
export const checkEmail = async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: GENERAL_MESSAGES.EMAIL_REQUIRED });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(HTTP_STATUS.CONFLICT).json({ message: AUTH_MESSAGES.EMAIL_ALREADY_REGISTERED });
    }

    res.json({ available: true, message: GENERAL_MESSAGES.EMAIL_AVAILABLE });
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

// @desc    Check if phone is available
// @route   GET /api/auth/check-phone
// @access  Public
export const checkPhone = async (req, res) => {
  try {
    const { phone } = req.query;
    
    if (!phone) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: GENERAL_MESSAGES.PHONE_REQUIRED });
    }

    const userExists = await User.findOne({ phone });
    if (userExists) {
      return res.status(HTTP_STATUS.CONFLICT).json({ message: AUTH_MESSAGES.PHONE_ALREADY_REGISTERED });
    }

    res.json({ available: true, message: GENERAL_MESSAGES.PHONE_AVAILABLE });
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Check if user exists and get password
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: AUTH_MESSAGES.INVALID_CREDENTIALS });
    }

    // Check password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: AUTH_MESSAGES.INVALID_CREDENTIALS });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: AUTH_MESSAGES.ACCOUNT_DEACTIVATED });
    }

    // Check if doctor is approved (only for doctors)
    if (user.role === USER_ROLES.DOCTOR) {
      const doctor = await Doctor.findOne({ userId: user._id });
      if (!doctor) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ message: AUTH_MESSAGES.DOCTOR_PROFILE_NOT_FOUND });
      }
      if (!doctor.isApproved) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({ 
          message: AUTH_MESSAGES.ACCOUNT_PENDING_APPROVAL_MESSAGE 
        });
      }
    }

    // Generate tokens
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    // Get device information
    const userAgent = req.headers['user-agent'] || '';
    const device = parseUserAgent(userAgent);
    const ipAddress = getClientIP(req);
    const sessionId = generateSessionId();

    // Hash refresh token
    const refreshTokenHash = await UserSession.hashRefreshToken(refreshToken);

    // Calculate expiration (30 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Create session
    await UserSession.create({
      userId: user._id,
      sessionId,
      refreshTokenHash,
      device,
      ipAddress,
      location: {
        country: 'Unknown', // Can be enhanced with IP geolocation service
        city: 'Unknown'
      },
      isActive: true,
      isRevoked: false,
      expiresAt
    });

    res.json({
      accessToken,
      refreshToken,
      sessionId,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        profileImage: user.profileImage
      }
    });
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    
    // Get role-specific data
    let profileData = {};
    if (user.role === USER_ROLES.PATIENT) {
      const patient = await Patient.findOne({ userId: user._id });
      profileData = patient;
    } else if (user.role === USER_ROLES.DOCTOR) {
      const doctor = await Doctor.findOne({ userId: user._id });
      profileData = doctor;
    }

    res.json({
      user,
      profile: profileData
    });
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ message: AUTH_MESSAGES.USER_NOT_FOUND });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(CRYPTO.PASSWORD_RESET_TOKEN_BYTES).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

    await user.save();

    // In production, send email with reset token
    // For now, return token (remove in production)
    res.json({
      message: AUTH_MESSAGES.PASSWORD_RESET_EMAIL_SENT,
      resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
    });
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    const resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: AUTH_MESSAGES.INVALID_OR_EXPIRED_TOKEN });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    res.json({ message: AUTH_MESSAGES.PASSWORD_RESET_SUCCESSFUL });
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

// @desc    Logout user (revoke current session)
// @route   POST /api/auth/logout
// @access  Private
export const logout = async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (sessionId) {
      // Revoke specific session
      const session = await UserSession.findOne({
        sessionId,
        userId: req.user._id
      });

      if (session) {
        session.isActive = false;
        session.isRevoked = true;
        await session.save();
      }
    }

    res.json({ message: GENERAL_MESSAGES.LOGGED_OUT_SUCCESSFULLY });
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

// @desc    Update profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, phone, dateOfBirth, gender, address, profileImage } = req.body;

    const user = await User.findById(req.user._id);

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phone) user.phone = phone;
    if (dateOfBirth) user.dateOfBirth = dateOfBirth;
    if (gender) user.gender = gender;
    if (address) user.address = { ...user.address, ...address };
    if (profileImage) user.profileImage = profileImage;

    await user.save();

    res.json({
      message: AUTH_MESSAGES.PROFILE_UPDATED_SUCCESSFULLY,
      user
    });
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

