import express from 'express';
import { body, validationResult } from 'express-validator';
import { register, login, getMe, forgotPassword, resetPassword, updateProfile, checkEmail, checkPhone, logout } from '../controllers/authController.js';
import { refreshToken, getSessions, revokeSession, revokeAllSessions } from '../controllers/sessionController.js';
import { protect } from '../middleware/auth.js';
import { USER_ROLE_VALUES } from '../constants/index.js';
import { AUTH_ROUTES } from '../constants/routes.js';

const router = express.Router();

// Validation middleware
const registerValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('firstName').trim().notEmpty(),
  body('lastName').trim().notEmpty(),
  body('phone').trim().notEmpty(),
  body('role').isIn(USER_ROLE_VALUES)
];

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
];

// Routes
router.get('/check-email', checkEmail);
router.get('/check-phone', checkPhone);
router.post(AUTH_ROUTES.REGISTER, registerValidation, register);
router.post(AUTH_ROUTES.LOGIN, loginValidation, login);
router.post('/refresh', refreshToken);
router.post('/logout', protect, logout);
router.get('/sessions', protect, getSessions);
router.delete('/sessions', protect, revokeAllSessions);
router.delete('/sessions/:sessionId', protect, revokeSession);
router.get(AUTH_ROUTES.ME, protect, getMe);
router.post(AUTH_ROUTES.FORGOT_PASSWORD, forgotPassword);
router.post(AUTH_ROUTES.RESET_PASSWORD, resetPassword);
router.put(AUTH_ROUTES.PROFILE, protect, updateProfile);

export default router;

