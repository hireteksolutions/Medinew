import { authorize } from './auth.js';
import { USER_ROLES } from '../constants/index.js';

/**
 * Role-based route guards
 * These middleware functions ensure only specific roles can access routes
 */

// Admin only routes
export const adminOnly = [authorize(USER_ROLES.ADMIN)];

// Doctor only routes
export const doctorOnly = [authorize(USER_ROLES.DOCTOR)];

// Patient only routes
export const patientOnly = [authorize(USER_ROLES.PATIENT)];

// Doctor and Admin routes
export const doctorAndAdmin = [authorize(USER_ROLES.DOCTOR, USER_ROLES.ADMIN)];

// Patient and Admin routes
export const patientAndAdmin = [authorize(USER_ROLES.PATIENT, USER_ROLES.ADMIN)];

// Patient and Doctor routes
export const patientAndDoctor = [authorize(USER_ROLES.PATIENT, USER_ROLES.DOCTOR)];

// All authenticated users (any role)
export const anyAuthenticated = [];

