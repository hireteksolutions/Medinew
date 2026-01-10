import Patient from '../models/Patient.js';
import User from '../models/User.js';
import Appointment from '../models/Appointment.js';
import MedicalRecord from '../models/MedicalRecord.js';
import Doctor from '../models/Doctor.js';
import Payment from '../models/Payment.js';
import { APPOINTMENT_STATUSES, HTTP_STATUS } from '../constants/index.js';
import { PATIENT_MESSAGES } from '../constants/messages.js';
import { createAuditLog } from '../utils/auditLogger.js';
import { getPaginationParams, buildPaginationMeta } from '../utils/pagination.js';

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
    const beforeUpdate = patient ? JSON.parse(JSON.stringify(patient)) : null;
    
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

    // Log profile update
    await createAuditLog({
      user: req.user,
      action: 'update_patient_profile',
      entityType: 'patient',
      entityId: patient._id,
      method: 'PUT',
      endpoint: req.originalUrl,
      status: 'success',
      statusCode: HTTP_STATUS.OK,
      changes: beforeUpdate ? { before: beforeUpdate, after: patient.toObject() } : {},
      req
    });
    
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
    
    // Get pagination parameters
    const { limit, offset } = getPaginationParams(req);
    
    let query = { patientId: req.user._id };

    if (status) {
      query.status = status;
    }

    if (upcoming === 'true') {
      query.appointmentDate = { $gte: new Date() };
      query.status = { $in: [APPOINTMENT_STATUSES.PENDING, APPOINTMENT_STATUSES.CONFIRMED] };
    }

    // Get total count before pagination
    const total = await Appointment.countDocuments(query);

    const appointments = await Appointment.find(query)
      .populate('doctorId', 'firstName lastName specialization profileImage')
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean();

    // Get payment information for appointments
    const appointmentIds = appointments.map(apt => apt._id);
    const payments = await Payment.find({ appointmentId: { $in: appointmentIds } }).lean();
    const paymentMap = new Map();
    payments.forEach(payment => {
      paymentMap.set(payment.appointmentId.toString(), payment);
    });

    // Attach payment info to appointments
    const appointmentsWithPayment = appointments.map(appointment => {
      const payment = paymentMap.get(appointment._id.toString());
      if (payment) {
        appointment.payment = payment;
      }
      return appointment;
    });

    // Build pagination metadata
    const pagination = buildPaginationMeta(total, limit, offset);

    res.json({
      appointments: appointmentsWithPayment,
      pagination
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get medical records
// @route   GET /api/patient/medical-records
// @access  Private/Patient
export const getMedicalRecords = async (req, res) => {
  try {
    // Get pagination parameters
    const { limit, offset } = getPaginationParams(req);

    // Query to exclude soft-deleted records
    const query = {
      patientId: req.user._id,
      $or: [
        { isDeleted: { $exists: false } }, // Include records without isDeleted field (existing records)
        { isDeleted: false } // Include records that are not deleted
      ]
    };

    // Get total count before pagination
    const total = await MedicalRecord.countDocuments(query);

    let records = await MedicalRecord.find(query)
      .populate('doctorId', 'firstName lastName specialization')
      .populate('appointmentId')
      .populate({
        path: 'fileId',
        select: 'originalName fileName fileUrl storageKey size mimeType storageProvider isActive',
        match: { isActive: true } // Only populate if file is active
      })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean();

    // Map records to include file info in a more accessible format
    records = records.map(record => {
      const recordObj = record.toObject ? record.toObject() : record;
      // Check if fileId is populated (object) and has the expected structure
      if (recordObj.fileId && typeof recordObj.fileId === 'object' && recordObj.fileId._id) {
        recordObj.file = {
          size: recordObj.fileId.size,
          mimeType: recordObj.fileId.mimeType,
          originalName: recordObj.fileId.originalName || recordObj.fileId.fileName,
          fileUrl: recordObj.fileId.fileUrl || recordObj.fileUrl,
          storageKey: recordObj.fileId.storageKey
        };
      } else if (recordObj.fileId) {
        // If fileId exists but wasn't populated (just ID), keep it as is
        // The frontend can use the existing fileUrl
      }
      return recordObj;
    });

    // Build pagination metadata
    const pagination = buildPaginationMeta(total, limit, offset);

    res.json({
      records,
      pagination
    });
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

    // Log medical record upload
    await createAuditLog({
      user: req.user,
      action: 'upload_medical_record',
      entityType: 'medical_record',
      entityId: record._id,
      method: 'POST',
      endpoint: req.originalUrl,
      status: 'success',
      statusCode: HTTP_STATUS.CREATED,
      metadata: { documentType, fileName, appointmentId, doctorId },
      req
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
    // Get pagination parameters
    const { limit, offset } = getPaginationParams(req);

    const patient = await Patient.findOne({ userId: req.user._id }).populate({
      path: 'favoriteDoctors',
      populate: { path: 'userId', select: 'firstName lastName profileImage' }
    });

    const favoriteDoctors = patient?.favoriteDoctors || [];
    const total = favoriteDoctors.length;

    // Apply pagination to array
    const paginatedDoctors = favoriteDoctors.slice(offset, offset + limit);

    // Ensure currentHospitalName and education are always included
    const doctorsWithFields = paginatedDoctors.map(doc => {
      const doctorObj = doc.toObject ? doc.toObject() : doc;
      return {
        ...doctorObj,
        currentHospitalName: doctorObj.currentHospitalName || null,
        education: doctorObj.education || []
      };
    });

    // Build pagination metadata
    const pagination = buildPaginationMeta(total, limit, offset);

    res.json({
      doctors: doctorsWithFields,
      pagination
    });
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
    const record = await MedicalRecord.findOne({
      _id: req.params.id,
      $or: [
        { isDeleted: { $exists: false } },
        { isDeleted: false }
      ]
    });

    if (!record) {
      return res.status(404).json({ message: PATIENT_MESSAGES.MEDICAL_RECORD_NOT_FOUND });
    }

    // Check authorization
    if (record.patientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: PATIENT_MESSAGES.NOT_AUTHORIZED });
    }

    // Delete associated file from bucket if fileId exists
    if (record.fileId) {
      try {
        const File = (await import('../models/File.js')).default;
        const fileStorageService = (await import('../services/fileStorageService.js')).default;
        
        const file = await File.findById(record.fileId);
        if (file && file.storageKey && file.isActive) {
          console.log(`🗑️  Deleting medical record file from bucket: ${file.storageKey}`);
          
          try {
            await fileStorageService.initialize();
            // Delete file from bucket using the deleteFile method
            await fileStorageService.deleteFile(file._id.toString(), req.user._id.toString());
            console.log(`✅ Medical record file deleted from bucket: ${file.storageKey}`);
          } catch (deleteError) {
            console.error('❌ Error deleting medical record file from bucket:', deleteError.message);
            // Try fallback deletion
            try {
              await fileStorageService.initialize();
              if (file.storageProvider === 'aws-s3' || file.storageProvider === 'AWS_S3') {
                await fileStorageService.deleteFromS3(file.storageKey);
              } else if (file.storageProvider === 'google-cloud' || file.storageProvider === 'GOOGLE_CLOUD') {
                await fileStorageService.deleteFromGCS(file.storageKey);
              } else if (file.storageProvider === 'azure-blob' || file.storageProvider === 'AZURE_BLOB') {
                await fileStorageService.deleteFromAzure(file.storageKey);
              }
              // Soft delete file record
              file.isActive = false;
              file.deletedAt = new Date();
              await file.save();
              console.log(`✅ Medical record file deleted from bucket (fallback method)`);
            } catch (fallbackError) {
              console.error('❌ Fallback deletion also failed:', fallbackError.message);
              // Continue with record deletion even if file deletion fails
            }
          }
        }
      } catch (fileError) {
        console.error('❌ Error processing file deletion:', fileError.message);
        // Continue with record deletion even if file deletion fails
      }
    }

    // Soft delete medical record
    record.isDeleted = true;
    record.deletedAt = new Date();
    await record.save();

    // Log medical record deletion
    await createAuditLog({
      user: req.user,
      action: 'delete_medical_record',
      entityType: 'medical_record',
      entityId: record._id,
      method: 'DELETE',
      endpoint: req.originalUrl,
      status: 'success',
      statusCode: HTTP_STATUS.OK,
      req
    });

    res.json({ 
      message: PATIENT_MESSAGES.MEDICAL_RECORD_DELETED_SUCCESSFULLY || 'Medical record and associated file deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting medical record:', error);
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

// @desc    Get complete consultation history
// @route   GET /api/patient/consultation-history
// @access  Private/Patient
export const getConsultationHistory = async (req, res) => {
  try {
    const { doctorId, specialization, startDate, endDate, search } = req.query;
    const { limit, offset } = getPaginationParams(req);

    let query = { 
      patientId: req.user._id,
      status: APPOINTMENT_STATUSES.COMPLETED
    };

    if (doctorId) {
      query.doctorId = doctorId;
    }

    if (specialization) {
      const doctors = await Doctor.find({ specialization }).select('userId');
      const doctorUserIds = doctors.map(d => d.userId);
      query.doctorId = { $in: doctorUserIds };
    }

    if (startDate || endDate) {
      query.appointmentDate = {};
      if (startDate) query.appointmentDate.$gte = new Date(startDate);
      if (endDate) query.appointmentDate.$lte = new Date(endDate);
    }

    if (search) {
      query.$or = [
        { reasonForVisit: { $regex: search, $options: 'i' } },
        { symptoms: { $regex: search, $options: 'i' } },
        { diagnosis: { $regex: search, $options: 'i' } },
        { doctorNotes: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await Appointment.countDocuments(query);

    const appointments = await Appointment.find(query)
      .populate('doctorId', 'firstName lastName specialization profileImage')
      .populate('previousAppointmentId')
      .populate('referredFrom.doctorId', 'firstName lastName specialization')
      .populate('referredTo.doctorId', 'firstName lastName specialization')
      .sort({ appointmentDate: -1 })
      .skip(offset)
      .limit(limit)
      .lean();

    // Get test reports from medical records
    const appointmentIds = appointments.map(apt => apt._id);
    const testReports = await MedicalRecord.find({
      appointmentId: { $in: appointmentIds },
      documentType: { $in: ['lab_report', 'xray', 'scan'] }
    }).lean();

    const reportsMap = new Map();
    testReports.forEach(report => {
      const aptId = report.appointmentId?.toString();
      if (aptId) {
        if (!reportsMap.has(aptId)) {
          reportsMap.set(aptId, []);
        }
        reportsMap.get(aptId).push(report);
      }
    });

    // Attach test reports to appointments
    const appointmentsWithReports = appointments.map(appointment => {
      const reports = reportsMap.get(appointment._id.toString()) || [];
      return {
        ...appointment,
        testReports: reports
      };
    });

    const pagination = buildPaginationMeta(total, limit, offset);

    // Log history access
    await createAuditLog({
      user: req.user,
      action: 'view_consultation_history',
      entityType: 'appointment',
      method: 'GET',
      endpoint: req.originalUrl,
      status: 'success',
      statusCode: HTTP_STATUS.OK,
      metadata: { doctorId, specialization, total: appointments.length },
      req
    });

    res.json({
      consultations: appointmentsWithReports,
      pagination
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get consultation details for follow-up booking
// @route   GET /api/patient/consultation-history/:id
// @access  Private/Patient
export const getConsultationDetails = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('doctorId', 'firstName lastName specialization profileImage')
      .populate('previousAppointmentId')
      .populate('referredFrom.doctorId', 'firstName lastName specialization')
      .populate('referredTo.doctorId', 'firstName lastName specialization');

    if (!appointment) {
      return res.status(404).json({ message: 'Consultation not found' });
    }

    if (appointment.patientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Get test reports
    const testReports = await MedicalRecord.find({
      appointmentId: appointment._id,
      documentType: { $in: ['lab_report', 'xray', 'scan'] }
    }).lean();

    res.json({
      consultation: {
        ...appointment.toObject(),
        testReports
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get doctors for switching (same or different specialization)
// @route   GET /api/patient/doctors-for-switch
// @access  Private/Patient
export const getDoctorsForSwitch = async (req, res) => {
  try {
    const { appointmentId, sameSpecialization } = req.query;

    if (!appointmentId) {
      return res.status(400).json({ message: 'Appointment ID is required' });
    }

    const appointment = await Appointment.findById(appointmentId)
      .populate('doctorId', 'specialization');

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (appointment.patientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    let query = { isApproved: true };
    
    if (sameSpecialization === 'true') {
      const doctor = await Doctor.findOne({ userId: appointment.doctorId._id });
      if (doctor) {
        query.specialization = doctor.specialization;
      }
    }

    // Exclude current doctor
    query.userId = { $ne: appointment.doctorId._id };

    const doctors = await Doctor.find(query)
      .populate('userId', 'firstName lastName profileImage')
      .select('specialization consultationFee rating totalReviews')
      .limit(50);

    res.json({ doctors });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get critical patient info for emergency consultation
// @route   GET /api/patient/emergency-info
// @access  Private/Patient
export const getEmergencyInfo = async (req, res) => {
  try {
    const patient = await Patient.findOne({ userId: req.user._id });
    if (!patient) {
      return res.status(404).json({ message: PATIENT_MESSAGES.PATIENT_PROFILE_NOT_FOUND });
    }

    // Get last diagnosis and current medications from recent appointments
    const lastAppointment = await Appointment.findOne({
      patientId: req.user._id,
      status: APPOINTMENT_STATUSES.COMPLETED
    })
      .populate('doctorId', 'firstName lastName specialization')
      .sort({ appointmentDate: -1 })
      .lean();

    const emergencyInfo = {
      allergies: patient.allergies || [],
      chronicConditions: patient.chronicConditions || [],
      currentMedications: patient.currentMedications || [],
      lastDiagnosis: lastAppointment ? {
        diagnosis: lastAppointment.diagnosis,
        date: lastAppointment.appointmentDate,
        doctor: lastAppointment.doctorId
      } : null,
      bloodGroup: patient.bloodGroup,
      emergencyContact: patient.emergencyContact
    };

    res.json(emergencyInfo);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get incomplete treatments (missed follow-ups, long gaps)
// @route   GET /api/patient/incomplete-treatments
// @access  Private/Patient
export const getIncompleteTreatments = async (req, res) => {
  try {
    const patient = await Patient.findOne({ userId: req.user._id });
    if (!patient) {
      return res.status(404).json({ message: PATIENT_MESSAGES.PATIENT_PROFILE_NOT_FOUND });
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Find appointments with follow-up required but not completed
    const incompleteAppointments = await Appointment.find({
      patientId: req.user._id,
      followUpRequired: true,
      $or: [
        { followUpDate: { $lt: now } },
        { treatmentStatus: { $in: ['ongoing', 'dropped'] } }
      ]
    })
      .populate('doctorId', 'firstName lastName specialization profileImage')
      .sort({ appointmentDate: -1 })
      .lean();

    // Find appointments with long gaps (no follow-up in 30+ days for ongoing treatment)
    const appointmentsWithGaps = await Appointment.find({
      patientId: req.user._id,
      status: APPOINTMENT_STATUSES.COMPLETED,
      appointmentDate: { $lt: thirtyDaysAgo },
      treatmentStatus: { $in: ['ongoing', 'pending'] }
    })
      .populate('doctorId', 'firstName lastName specialization profileImage')
      .sort({ appointmentDate: -1 })
      .lean();

    // Check for follow-ups that should have happened
    const missedFollowUps = incompleteAppointments.filter(apt => {
      if (apt.followUpDate) {
        return new Date(apt.followUpDate) < now;
      }
      return false;
    });

    res.json({
      incompleteTreatments: incompleteAppointments,
      missedFollowUps,
      appointmentsWithGaps
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get smart doctor recommendations
// @route   GET /api/patient/doctor-recommendations
// @access  Private/Patient
export const getDoctorRecommendations = async (req, res) => {
  try {
    const { appointmentId } = req.query;

    if (!appointmentId) {
      return res.status(400).json({ message: 'Appointment ID is required' });
    }

    const appointment = await Appointment.findById(appointmentId)
      .populate('doctorId', 'specialization');

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (appointment.patientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const doctor = await Doctor.findOne({ userId: appointment.doctorId._id });
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    // Get patient's appointment history with this doctor
    const historyWithDoctor = await Appointment.countDocuments({
      patientId: req.user._id,
      doctorId: appointment.doctorId._id,
      status: APPOINTMENT_STATUSES.COMPLETED
    });

    const recommendations = {
      sameDoctor: {
        doctor: appointment.doctorId,
        specialization: doctor.specialization,
        consultationFee: doctor.consultationFee,
        rating: doctor.rating,
        totalReviews: doctor.totalReviews,
        previousConsultations: historyWithDoctor,
        reason: historyWithDoctor > 0 ? 'You have consulted with this doctor before' : 'Your current doctor'
      },
      sameSpecialization: [],
      differentSpecialization: []
    };

    // Get doctors with same specialization
    const sameSpecializationDoctors = await Doctor.find({
      specialization: doctor.specialization,
      isApproved: true,
      userId: { $ne: appointment.doctorId._id }
    })
      .populate('userId', 'firstName lastName profileImage')
      .select('specialization consultationFee rating totalReviews')
      .sort({ rating: -1, totalReviews: -1 })
      .limit(5)
      .lean();

    recommendations.sameSpecialization = sameSpecializationDoctors;

    // Get top-rated doctors in other specializations
    const otherSpecializationDoctors = await Doctor.find({
      specialization: { $ne: doctor.specialization },
      isApproved: true
    })
      .populate('userId', 'firstName lastName profileImage')
      .select('specialization consultationFee rating totalReviews')
      .sort({ rating: -1, totalReviews: -1 })
      .limit(5)
      .lean();

    recommendations.differentSpecialization = otherSpecializationDoctors;

    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

