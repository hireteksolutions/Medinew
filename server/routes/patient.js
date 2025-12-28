import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  getProfile,
  getCompleteProfile,
  updateProfile,
  changePassword,
  getAppointments,
  getMedicalRecords,
  uploadMedicalRecord,
  deleteMedicalRecord,
  getFavoriteDoctors,
  addFavoriteDoctor,
  removeFavoriteDoctor
} from '../controllers/patientController.js';
import { USER_ROLES } from '../constants/index.js';
import { PATIENT_ROUTES } from '../constants/routes.js';

const router = express.Router();

// All routes require authentication and patient role
router.use(protect);
router.use(authorize(USER_ROLES.PATIENT));

router.get(PATIENT_ROUTES.PROFILE, getProfile);
router.get(PATIENT_ROUTES.PROFILE_COMPLETE, getCompleteProfile);
router.put(PATIENT_ROUTES.PROFILE, updateProfile);
router.put(PATIENT_ROUTES.CHANGE_PASSWORD, changePassword);
router.get(PATIENT_ROUTES.APPOINTMENTS, getAppointments);
router.get(PATIENT_ROUTES.MEDICAL_RECORDS, getMedicalRecords);
router.post(PATIENT_ROUTES.MEDICAL_RECORDS, uploadMedicalRecord);
router.delete(PATIENT_ROUTES.MEDICAL_RECORD_BY_ID, deleteMedicalRecord);
router.get(PATIENT_ROUTES.FAVORITE_DOCTORS, getFavoriteDoctors);
router.post(PATIENT_ROUTES.FAVORITE_DOCTOR_BY_ID, addFavoriteDoctor);
router.delete(PATIENT_ROUTES.FAVORITE_DOCTOR_BY_ID, removeFavoriteDoctor);

export default router;

