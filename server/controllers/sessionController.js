import UserSession from '../models/UserSession.js';
import User from '../models/User.js';
import Doctor from '../models/Doctor.js';
import { USER_ROLES, TIME_CONSTANTS } from '../constants/index.js';
import { SESSION_MESSAGES, AUTH_MESSAGES } from '../constants/messages.js';
import jwt from 'jsonwebtoken';

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Public
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken, sessionId } = req.body;

    if (!refreshToken || !sessionId) {
      return res.status(400).json({ message: SESSION_MESSAGES.REFRESH_TOKEN_AND_SESSION_ID_REQUIRED });
    }

    // Find session
    const session = await UserSession.findOne({ 
      sessionId,
      isActive: true,
      isRevoked: false,
      expiresAt: { $gt: new Date() }
    });

    if (!session) {
      return res.status(401).json({ message: SESSION_MESSAGES.INVALID_OR_EXPIRED_SESSION });
    }

    // Verify refresh token hash
    const isValid = await session.compareRefreshToken(refreshToken);
    if (!isValid) {
      return res.status(401).json({ message: SESSION_MESSAGES.INVALID_REFRESH_TOKEN });
    }

    // Get user
    const user = await User.findById(session.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({ message: SESSION_MESSAGES.USER_NOT_FOUND_OR_INACTIVE });
    }

    // Check if doctor is approved (only for doctors)
    if (user.role === USER_ROLES.DOCTOR) {
      const doctor = await Doctor.findOne({ userId: user._id });
      if (!doctor || !doctor.isApproved) {
        return res.status(403).json({ 
          message: 'Your account is pending admin approval. You will be able to login once approved.' 
        });
      }
    }

    // Generate new tokens
    const newAccessToken = user.generateAccessToken();
    const newRefreshToken = user.generateRefreshToken();

    // Hash new refresh token
    const newRefreshTokenHash = await UserSession.hashRefreshToken(newRefreshToken);

    // Update session with new refresh token and activity
    session.refreshTokenHash = newRefreshTokenHash;
    session.lastActivityAt = new Date();
    await session.save();

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      sessionId: session.sessionId
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all active sessions for current user
// @route   GET /api/auth/sessions
// @access  Private
export const getSessions = async (req, res) => {
  try {
    const sessions = await UserSession.find({
      userId: req.user._id,
      isActive: true,
      isRevoked: false,
      expiresAt: { $gt: new Date() }
    }).sort({ lastActivityAt: -1 });

    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Revoke a specific session (logout from one device)
// @route   DELETE /api/auth/sessions/:sessionId
// @access  Private
export const revokeSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await UserSession.findOne({
      sessionId,
      userId: req.user._id
    });

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    session.isActive = false;
    session.isRevoked = true;
    await session.save();

    res.json({ message: SESSION_MESSAGES.SESSION_REVOKED_SUCCESSFULLY });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Revoke all sessions (logout from all devices)
// @route   DELETE /api/auth/sessions
// @access  Private
export const revokeAllSessions = async (req, res) => {
  try {
    await UserSession.updateMany(
      { userId: req.user._id },
      { $set: { isActive: false, isRevoked: true } }
    );

    res.json({ message: SESSION_MESSAGES.ALL_SESSIONS_REVOKED_SUCCESSFULLY });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

