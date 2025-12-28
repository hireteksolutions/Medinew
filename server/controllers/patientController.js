import Patient from '../models/Patient.js';
import User from '../models/User.js';
import Appointment from '../models/Appointment.js';
import MedicalRecord from '../models/MedicalRecord.js';
import Doctor from '../models/Doctor.js';
import { APPOINTMENT_STATUSES } from '../constants/index.js';
import { PATIENT_MESSAGES } from '../constants/messages.js';

// @desc    Get patient profile
// @route   GET /api/patient/profile
// @access  Private/Patient
export const getProfile = async (req, res) => {
  try {
    const patient = await Patient.findOne({ userId: req.user._id }).populate('userId');
    if (!patient) {
      return res.status(404).json({ message: PATIENT_MESSAGES.PATIENT_PROFILE_NOT_FOUND });
    }
    res.json(patient);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update patient profile
// @route   PUT /api/patient/profile
// @access  Private/Patient
export const updateProfile = async (req, res) => {
  try {
    const {
      bloodGroup,
      allergies,
      medicalHistory,
      currentMedications,
      chronicConditions,
      previousSurgeries,
      emergencyContact,
      insuranceInfo
    } = req.body;
    
    let patient = await Patient.findOne({ userId: req.user._id });
    
    if (!patient) {
      patient = await Patient.create({ userId: req.user._id });
    }

    if (bloodGroup !== undefined) patient.bloodGroup = bloodGroup;
    if (allergies !== undefined) patient.allergies = allergies;
    if (medicalHistory !== undefined) patient.medicalHistory = medicalHistory;
    if (currentMedications !== undefined) patient.currentMedications = currentMedications;
    if (chronicConditions !== undefined) patient.chronicConditions = chronicConditions;
    if (previousSurgeries !== undefined) patient.previousSurgeries = previousSurgeries;
    if (emergencyContact !== undefined) patient.emergencyContact = emergencyContact;
    if (insuranceInfo !== undefined) patient.insuranceInfo = insuranceInfo;

    await patient.save();
    
    const populatedPatient = await Patient.findById(patient._id).populate('userId');
    res.json({ message: PATIENT_MESSAGES.PROFILE_UPDATED_SUCCESSFULLY, patient: populatedPatient });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get patient appointments
// @route   GET /api/patient/appointments
// @access  Private/Patient
export const getAppointments = async (req, res) => {
  try {
    const { status, upcoming } = req.query;
    let query = { patientId: req.user._id };

    if (status) {
      query.status = status;
    }

    if (upcoming === 'true') {
      query.appointmentDate = { $gte: new Date() };
      query.status = { $in: [APPOINTMENT_STATUSES.PENDING, APPOINTMENT_STATUSES.CONFIRMED] };
    }

    const appointments = await Appointment.find(query)
      .populate('doctorId', 'firstName lastName specialization profileImage')
      .sort({ createdAt: -1 });

    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get medical records
// @route   GET /api/patient/medical-records
// @access  Private/Patient
export const getMedicalRecords = async (req, res) => {
  try {
    const records = await MedicalRecord.find({ patientId: req.user._id })
      .populate('doctorId', 'firstName lastName specialization')
      .populate('appointmentId')
      .sort({ uploadedAt: -1 });

    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Upload medical record
// @route   POST /api/patient/medical-records
// @access  Private/Patient
export const uploadMedicalRecord = async (req, res) => {
  try {
    const { documentType, description, appointmentId, doctorId } = req.body;
    
    // Check if file was uploaded via file storage system
    if (req.body.fileId) {
      // File already uploaded via /api/files/upload
      const File = (await import('../models/File.js')).default;
      const file = await File.findById(req.body.fileId);
      
      if (!file || file.uploadedBy.toString() !== req.user._id.toString()) {
        return res.status(404).json({ message: 'File not found or access denied' });
      }

      const record = await MedicalRecord.create({
        patientId: req.user._id,
        doctorId,
        appointmentId,
        documentType,
        fileName: file.originalName,
        fileUrl: file.fileUrl,
        fileId: file._id, // Store reference to file
        description
      });

      // Link file to medical record
      file.relatedEntity = {
        type: 'medical-record',
        id: record._id
      };
      await file.save();

      return res.status(201).json({ message: PATIENT_MESSAGES.MEDICAL_RECORD_UPLOADED_SUCCESSFULLY, record });
    }

    // Legacy support: direct fileUrl (deprecated)
    const { fileName, fileUrl } = req.body;
    if (!fileName || !fileUrl) {
      return res.status(400).json({ message: PATIENT_MESSAGES.FILE_ID_OR_URL_REQUIRED });
    }

    const record = await MedicalRecord.create({
      patientId: req.user._id,
      doctorId,
      appointmentId,
      documentType,
      fileName,
      fileUrl,
      description
    });

    res.status(201).json({ message: PATIENT_MESSAGES.MEDICAL_RECORD_UPLOADED_SUCCESSFULLY, record });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get favorite doctors
// @route   GET /api/patient/favorite-doctors
// @access  Private/Patient
export const getFavoriteDoctors = async (req, res) => {
  try {
    const patient = await Patient.findOne({ userId: req.user._id }).populate({
      path: 'favoriteDoctors',
      populate: { path: 'userId', select: 'firstName lastName profileImage' }
    });

    res.json(patient?.favoriteDoctors || []);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add favorite doctor
// @route   POST /api/patient/favorite-doctors/:doctorId
// @access  Private/Patient
export const addFavoriteDoctor = async (req, res) => {
  try {
    const patient = await Patient.findOne({ userId: req.user._id });
    if (!patient) {
      return res.status(404).json({ message: PATIENT_MESSAGES.PATIENT_PROFILE_NOT_FOUND });
    }

    // Find doctor by userId (since frontend passes userId._id)
    const doctor = await Doctor.findOne({ userId: req.params.doctorId });
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    // Check if already in favorites (compare as strings)
    const doctorIdStr = doctor._id.toString();
    const isAlreadyFavorite = patient.favoriteDoctors.some(
      (favId) => favId.toString() === doctorIdStr
    );

    if (!isAlreadyFavorite) {
      patient.favoriteDoctors.push(doctor._id);
      await patient.save();
    }

    res.json({ message: PATIENT_MESSAGES.DOCTOR_ADDED_TO_FAVORITES, patient });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Remove favorite doctor
// @route   DELETE /api/patient/favorite-doctors/:doctorId
// @access  Private/Patient
export const removeFavoriteDoctor = async (req, res) => {
  try {
    const patient = await Patient.findOne({ userId: req.user._id });
    if (!patient) {
      return res.status(404).json({ message: PATIENT_MESSAGES.PATIENT_PROFILE_NOT_FOUND });
    }

    // Find doctor by userId (since frontend passes userId._id)
    const doctor = await Doctor.findOne({ userId: req.params.doctorId });
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    // Remove from favorites
    patient.favoriteDoctors = patient.favoriteDoctors.filter(
      id => id.toString() !== doctor._id.toString()
    );
    await patient.save();

    res.json({ message: PATIENT_MESSAGES.DOCTOR_REMOVED_FROM_FAVORITES, patient });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Change password
// @route   PUT /api/patient/change-password
// @access  Private/Patient
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: PATIENT_MESSAGES.CURRENT_AND_NEW_PASSWORD_REQUIRED });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: PATIENT_MESSAGES.PASSWORD_MIN_LENGTH });
    }

    const user = await User.findById(req.user._id).select('+password');
    
    // Verify current password
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: PATIENT_MESSAGES.INCORRECT_CURRENT_PASSWORD });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({ message: PATIENT_MESSAGES.PASSWORD_CHANGED_SUCCESSFULLY });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete medical record
// @route   DELETE /api/patient/medical-records/:id
// @access  Private/Patient
export const deleteMedicalRecord = async (req, res) => {
  try {
    const record = await MedicalRecord.findById(req.params.id);

    if (!record) {
      return res.status(404).json({ message: PATIENT_MESSAGES.MEDICAL_RECORD_NOT_FOUND });
    }

    // Check authorization
    if (record.patientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: PATIENT_MESSAGES.NOT_AUTHORIZED });
    }

    await MedicalRecord.findByIdAndDelete(req.params.id);

    res.json({ message: PATIENT_MESSAGES.MEDICAL_RECORD_DELETED_SUCCESSFULLY });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get complete patient profile with user data
// @route   GET /api/patient/profile/complete
// @access  Private/Patient
export const getCompleteProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    const patient = await Patient.findOne({ userId: req.user._id });

    if (!patient) {
      return res.status(404).json({ message: PATIENT_MESSAGES.PATIENT_PROFILE_NOT_FOUND });
    }

    res.json({
      user,
      patient
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

