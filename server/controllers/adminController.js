import User from '../models/User.js';
import Doctor from '../models/Doctor.js';
import Patient from '../models/Patient.js';
import Appointment from '../models/Appointment.js';
import Review from '../models/Review.js';
import Payment from '../models/Payment.js';
import { USER_ROLES, APPOINTMENT_STATUSES, PAYMENT_STATUSES, DATE_CONSTANTS } from '../constants/index.js';
import { DOCTOR_MESSAGES, ADMIN_MESSAGES, AUTHZ_MESSAGES, PATIENT_MESSAGES, APPOINTMENT_MESSAGES } from '../constants/messages.js';

// Helper function to get date ranges
const getDateRanges = () => {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  weekStart.setHours(0, 0, 0, 0);
  
  const monthStart = new Date();
  monthStart.setMonth(monthStart.getMonth() - 1);
  monthStart.setHours(0, 0, 0, 0);
  
  return { todayStart, todayEnd, weekStart, monthStart, now };
};

// @desc    Get comprehensive admin stats
// @route   GET /api/admin/stats
// @access  Private/Admin
export const getStats = async (req, res) => {
  try {
    const { todayStart, todayEnd, weekStart, monthStart } = getDateRanges();
    
    // Basic counts
    const totalPatients = await User.countDocuments({ role: USER_ROLES.PATIENT });
    const totalDoctors = await User.countDocuments({ role: USER_ROLES.DOCTOR });
    const activeUsers = await User.countDocuments({ isActive: true });
    
    // Appointments by period
    const totalAppointments = await Appointment.countDocuments();
    const appointmentsToday = await Appointment.countDocuments({
      appointmentDate: { $gte: todayStart, $lte: todayEnd }
    });
    const appointmentsThisWeek = await Appointment.countDocuments({
      appointmentDate: { $gte: weekStart }
    });
    const appointmentsThisMonth = await Appointment.countDocuments({
      appointmentDate: { $gte: monthStart }
    });
    
    // Appointment statuses
    const pendingAppointments = await Appointment.countDocuments({ status: APPOINTMENT_STATUSES.PENDING });
    const completedAppointments = await Appointment.countDocuments({ status: APPOINTMENT_STATUSES.COMPLETED });
    const cancelledAppointments = await Appointment.countDocuments({ status: APPOINTMENT_STATUSES.CANCELLED });
    
    // Revenue calculations from Payment model
    // Get all payments that should be counted: completed, offline (Pay at Clinic), or online (not failed/cancelled/refunded)
    const allPayments = await Payment.find({
      $or: [
        { status: PAYMENT_STATUSES.COMPLETED },
        { paymentGateway: 'offline' }, // Pay at Clinic - expected payment
        { 
          paymentGateway: 'online',
          status: { $nin: ['failed', 'cancelled', 'refunded'] }
        }
      ]
    }).populate('appointmentId', 'appointmentDate');

    // Calculate total revenue from all valid payments
    const totalRevenue = allPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
    
    // Calculate revenue by period based on appointment dates
    const revenueToday = allPayments
      .filter(payment => {
        if (!payment.appointmentId || !payment.appointmentId.appointmentDate) return false;
        const aptDate = new Date(payment.appointmentId.appointmentDate);
        return aptDate >= todayStart && aptDate <= todayEnd;
      })
      .reduce((sum, payment) => sum + (payment.amount || 0), 0);
    
    const revenueThisWeek = allPayments
      .filter(payment => {
        if (!payment.appointmentId || !payment.appointmentId.appointmentDate) return false;
        const aptDate = new Date(payment.appointmentId.appointmentDate);
        return aptDate >= weekStart;
      })
      .reduce((sum, payment) => sum + (payment.amount || 0), 0);
    
    const revenueThisMonth = allPayments
      .filter(payment => {
        if (!payment.appointmentId || !payment.appointmentId.appointmentDate) return false;
        const aptDate = new Date(payment.appointmentId.appointmentDate);
        return aptDate >= monthStart;
      })
      .reduce((sum, payment) => sum + (payment.amount || 0), 0);
    
    // Pending doctor verifications
    const pendingDoctorVerifications = await Doctor.countDocuments({ isApproved: false });
    
    // Specialty statistics - most booked specialties
    const mostBookedSpecialties = await Appointment.aggregate([
      {
        $lookup: {
          from: 'doctors',
          localField: 'doctorId',
          foreignField: 'userId',
          as: 'doctor'
        }
      },
      { $unwind: '$doctor' },
      {
        $group: {
          _id: '$doctor.specialization',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);
    
    // User growth trends (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - DATE_CONSTANTS.STATS_DAYS_BACK);
    thirtyDaysAgo.setHours(0, 0, 0, 0);
    
    const userGrowth = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' },
            role: '$role'
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ]);
    
    // Appointment trends (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    
    const appointmentTrends = await Appointment.aggregate([
      {
        $match: {
          createdAt: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ]);

    res.json({
      overview: {
        totalPatients,
        totalDoctors,
        activeUsers,
        pendingDoctorVerifications,
      },
      appointments: {
        total: totalAppointments,
        today: appointmentsToday,
        thisWeek: appointmentsThisWeek,
        thisMonth: appointmentsThisMonth,
        pending: pendingAppointments,
        completed: completedAppointments,
        cancelled: cancelledAppointments,
      },
      revenue: {
        total: totalRevenue,
        today: revenueToday,
        thisWeek: revenueThisWeek,
        thisMonth: revenueThisMonth,
      },
      specialties: {
        mostBooked: mostBookedSpecialties.map(s => ({
          specialization: s._id || 'Unknown',
          appointmentCount: s.count
        })),
      },
      trends: {
        userGrowth,
        appointmentTrends,
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all doctors
// @route   GET /api/admin/doctors
// @access  Private/Admin
export const getDoctors = async (req, res) => {
  try {
    const { approved, search } = req.query;
    let query = { 
      $or: [
        { isDeleted: { $exists: false } }, // Include doctors without isDeleted field (existing records)
        { isDeleted: false } // Include doctors that are not deleted
      ]
    };

    if (approved !== undefined) {
      query.isApproved = approved === 'true';
    }

    const doctors = await Doctor.find(query)
      .populate('userId', 'firstName lastName email phone profileImage isActive')
      .sort({ createdAt: -1 });

    let filteredDoctors = doctors;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredDoctors = doctors.filter(doc => {
        const user = doc.userId;
        return (
          user.firstName.toLowerCase().includes(searchLower) ||
          user.lastName.toLowerCase().includes(searchLower) ||
          doc.specialization.toLowerCase().includes(searchLower)
        );
      });
    }

    res.json(filteredDoctors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Approve doctor
// @route   PUT /api/admin/doctors/:id/approve
// @access  Private/Admin
export const approveDoctor = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor || (doctor.isDeleted === true)) {
      return res.status(404).json({ message: DOCTOR_MESSAGES.DOCTOR_NOT_FOUND });
    }

    doctor.isApproved = true;
    await doctor.save();

    res.json({ message: DOCTOR_MESSAGES.DOCTOR_APPROVED_SUCCESSFULLY, doctor });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all patients
// @route   GET /api/admin/patients
// @access  Private/Admin
export const getPatients = async (req, res) => {
  try {
    const { search, status, dateFrom, dateTo } = req.query;
    let userQuery = {};
    
    // Filter by status (active/inactive)
    if (status) {
      userQuery.isActive = status === 'active';
    }

    const patients = await Patient.find()
      .populate({
        path: 'userId',
        match: Object.keys(userQuery).length > 0 ? userQuery : undefined,
        select: 'firstName lastName email phone profileImage isActive createdAt'
      })
      .sort({ createdAt: -1 });

    // Filter out patients where user doesn't match query
    let filteredPatients = patients.filter(pat => pat.userId !== null);
    
    // Filter by registration date range
    if (dateFrom || dateTo) {
      const fromDate = dateFrom ? new Date(dateFrom) : new Date(0);
      const toDate = dateTo ? new Date(dateTo) : new Date();
      toDate.setHours(23, 59, 59, 999);
      
      filteredPatients = filteredPatients.filter(pat => {
        const createdDate = new Date(pat.userId.createdAt);
        return createdDate >= fromDate && createdDate <= toDate;
      });
    }
    
    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      filteredPatients = filteredPatients.filter(pat => {
        const user = pat.userId;
        return (
          user.firstName.toLowerCase().includes(searchLower) ||
          user.lastName.toLowerCase().includes(searchLower) ||
          user.email.toLowerCase().includes(searchLower) ||
          user.phone?.toLowerCase().includes(searchLower)
        );
      });
    }

    // Get additional stats for each patient
    const patientsWithStats = await Promise.all(
      filteredPatients.map(async (patient) => {
        const totalAppointments = await Appointment.countDocuments({ patientId: patient.userId._id });
        return {
          ...patient.toObject(),
          totalAppointments
        };
      })
    );

    res.json(patientsWithStats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all appointments
// @route   GET /api/admin/appointments
// @access  Private/Admin
export const getAppointments = async (req, res) => {
  try {
    const { status, date, doctorId, patientId, search, dateFrom, dateTo } = req.query;
    let query = {};

    if (status) query.status = status;
    if (doctorId) query.doctorId = doctorId;
    if (patientId) query.patientId = patientId;
    
    // Date range filter
    if (dateFrom || dateTo) {
      const startDate = dateFrom ? new Date(dateFrom) : new Date(0);
      startDate.setHours(0, 0, 0, 0);
      const endDate = dateTo ? new Date(dateTo) : new Date();
      endDate.setHours(23, 59, 59, 999);
      query.appointmentDate = { $gte: startDate, $lte: endDate };
    } else if (date) {
      // Single date filter (backward compatibility)
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      query.appointmentDate = { $gte: startDate, $lte: endDate };
    }

    let appointments = await Appointment.find(query)
      .populate('patientId', 'firstName lastName email phone')
      .populate('doctorId', 'firstName lastName specialization')
      .sort({ appointmentDate: -1 });

    // Search filter (searches in patient/doctor names)
    if (search) {
      const searchLower = search.toLowerCase();
      appointments = appointments.filter(apt => {
        const patient = apt.patientId;
        const doctor = apt.doctorId;
        return (
          patient.firstName.toLowerCase().includes(searchLower) ||
          patient.lastName.toLowerCase().includes(searchLower) ||
          doctor.firstName.toLowerCase().includes(searchLower) ||
          doctor.lastName.toLowerCase().includes(searchLower) ||
          apt.appointmentNumber?.toLowerCase().includes(searchLower)
        );
      });
    }

    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
export const getAllUsers = async (req, res) => {
  try {
    const { role, search } = req.query;
    let query = {};

    if (role) query.role = role;

    const users = await User.find(query).select('-password').sort({ createdAt: -1 });

    let filteredUsers = users;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredUsers = users.filter(user =>
        user.firstName.toLowerCase().includes(searchLower) ||
        user.lastName.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower)
      );
    }

    res.json(filteredUsers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get patient by ID
// @route   GET /api/admin/patients/:id
// @access  Private/Admin
export const getPatientById = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id)
      .populate('userId', 'firstName lastName email phone profileImage dateOfBirth gender address isActive createdAt')
      .populate('favoriteDoctors');
    
    if (!patient) {
      return res.status(404).json({ message: PATIENT_MESSAGES.PATIENT_PROFILE_NOT_FOUND });
    }

    // Get patient's appointment history
    const appointments = await Appointment.find({ patientId: patient.userId._id })
      .populate('doctorId', 'firstName lastName specialization')
      .sort({ appointmentDate: -1 })
      .limit(10);

    res.json({ patient, recentAppointments: appointments });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update patient
// @route   PUT /api/admin/patients/:id
// @access  Private/Admin
export const updatePatient = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id).populate('userId');
    if (!patient) {
      return res.status(404).json({ message: PATIENT_MESSAGES.PATIENT_PROFILE_NOT_FOUND });
    }

    // Update user info
    const { firstName, lastName, email, phone, dateOfBirth, gender, address } = req.body;
    if (firstName) patient.userId.firstName = firstName;
    if (lastName) patient.userId.lastName = lastName;
    if (email) patient.userId.email = email;
    if (phone) patient.userId.phone = phone;
    if (dateOfBirth) patient.userId.dateOfBirth = dateOfBirth;
    if (gender) patient.userId.gender = gender;
    if (address) patient.userId.address = address;
    
    await patient.userId.save();

    // Update patient-specific fields
    const { bloodGroup, allergies, medicalHistory, emergencyContact, insuranceInfo } = req.body;
    if (bloodGroup !== undefined) patient.bloodGroup = bloodGroup;
    if (allergies !== undefined) patient.allergies = allergies;
    if (medicalHistory !== undefined) patient.medicalHistory = medicalHistory;
    if (emergencyContact !== undefined) patient.emergencyContact = emergencyContact;
    if (insuranceInfo !== undefined) patient.insuranceInfo = insuranceInfo;
    
    await patient.save();

    const updatedPatient = await Patient.findById(req.params.id).populate('userId');
    res.json({ message: ADMIN_MESSAGES.PATIENT_UPDATED_SUCCESSFULLY, patient: updatedPatient });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Suspend patient
// @route   PUT /api/admin/patients/:id/suspend
// @access  Private/Admin
export const suspendPatient = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id).populate('userId');
    if (!patient) {
      return res.status(404).json({ message: PATIENT_MESSAGES.PATIENT_PROFILE_NOT_FOUND });
    }

    patient.userId.isActive = false;
    await patient.userId.save();

    res.json({ message: ADMIN_MESSAGES.PATIENT_SUSPENDED_SUCCESSFULLY });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Activate patient
// @route   PUT /api/admin/patients/:id/activate
// @access  Private/Admin
export const activatePatient = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id).populate('userId');
    if (!patient) {
      return res.status(404).json({ message: PATIENT_MESSAGES.PATIENT_PROFILE_NOT_FOUND });
    }

    patient.userId.isActive = true;
    await patient.userId.save();

    res.json({ message: ADMIN_MESSAGES.PATIENT_ACTIVATED_SUCCESSFULLY });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete patient
// @route   DELETE /api/admin/patients/:id
// @access  Private/Admin
export const deletePatient = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({ message: PATIENT_MESSAGES.PATIENT_PROFILE_NOT_FOUND });
    }

    // Delete associated user
    await User.findByIdAndDelete(patient.userId);
    // Delete patient profile
    await Patient.findByIdAndDelete(req.params.id);

    res.json({ message: ADMIN_MESSAGES.PATIENT_DELETED_SUCCESSFULLY });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get doctor by ID
// @route   GET /api/admin/doctors/:id
// @access  Private/Admin
export const getDoctorById = async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ 
      _id: req.params.id,
      $or: [
        { isDeleted: { $exists: false } },
        { isDeleted: false }
      ]
    })
      .populate('userId', 'firstName lastName email phone profileImage dateOfBirth gender address isActive createdAt');
    
    if (!doctor) {
      return res.status(404).json({ message: DOCTOR_MESSAGES.DOCTOR_NOT_FOUND });
    }

    // Get doctor's statistics
    const totalAppointments = await Appointment.countDocuments({ doctorId: doctor.userId._id });
    const totalPatients = await Appointment.distinct('patientId', { doctorId: doctor.userId._id });
    const reviews = await Review.find({ doctorId: doctor.userId._id })
      .populate('patientId', 'firstName lastName profileImage')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({ 
      doctor, 
      stats: {
        totalAppointments,
        totalPatients: totalPatients.length,
        reviews: reviews.length
      },
      recentReviews: reviews
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update doctor
// @route   PUT /api/admin/doctors/:id
// @access  Private/Admin
export const updateDoctor = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id).populate('userId');
    if (!doctor) {
      return res.status(404).json({ message: DOCTOR_MESSAGES.DOCTOR_NOT_FOUND });
    }

    // Update user info
    const { firstName, lastName, email, phone, dateOfBirth, gender, address } = req.body;
    if (firstName) doctor.userId.firstName = firstName;
    if (lastName) doctor.userId.lastName = lastName;
    if (email) doctor.userId.email = email;
    if (phone) doctor.userId.phone = phone;
    if (dateOfBirth) doctor.userId.dateOfBirth = dateOfBirth;
    if (gender) doctor.userId.gender = gender;
    if (address) doctor.userId.address = address;
    
    await doctor.userId.save();

    // Update doctor-specific fields
    const { specialization, licenseNumber, experience, consultationFee, biography, languages, education } = req.body;
    if (specialization) doctor.specialization = specialization;
    if (licenseNumber) doctor.licenseNumber = licenseNumber;
    if (experience !== undefined) doctor.experience = experience;
    if (consultationFee !== undefined) doctor.consultationFee = consultationFee;
    if (biography !== undefined) doctor.biography = biography;
    if (languages !== undefined) doctor.languages = languages;
    if (education !== undefined) doctor.education = education;
    
    await doctor.save();

    const updatedDoctor = await Doctor.findById(req.params.id).populate('userId');
    res.json({ message: ADMIN_MESSAGES.DOCTOR_UPDATED_SUCCESSFULLY, doctor: updatedDoctor });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Reject doctor
// @route   PUT /api/admin/doctors/:id/reject
// @access  Private/Admin
export const rejectDoctor = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor || (doctor.isDeleted === true)) {
      return res.status(404).json({ message: DOCTOR_MESSAGES.DOCTOR_NOT_FOUND });
    }

    // Soft delete doctor (mark as rejected and deleted)
    doctor.isApproved = false;
    doctor.isDeleted = true;
    doctor.deletedAt = new Date();
    await doctor.save();

    res.json({ message: ADMIN_MESSAGES.DOCTOR_REJECTED_SUCCESSFULLY });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Suspend doctor
// @route   PUT /api/admin/doctors/:id/suspend
// @access  Private/Admin
export const suspendDoctor = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id).populate('userId');
    if (!doctor || (doctor.isDeleted === true)) {
      return res.status(404).json({ message: DOCTOR_MESSAGES.DOCTOR_NOT_FOUND });
    }

    doctor.userId.isActive = false;
    await doctor.userId.save();

    res.json({ message: ADMIN_MESSAGES.DOCTOR_SUSPENDED_SUCCESSFULLY });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Activate doctor
// @route   PUT /api/admin/doctors/:id/activate
// @access  Private/Admin
export const activateDoctor = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id).populate('userId');
    if (!doctor || (doctor.isDeleted === true)) {
      return res.status(404).json({ message: DOCTOR_MESSAGES.DOCTOR_NOT_FOUND });
    }

    doctor.userId.isActive = true;
    await doctor.userId.save();

    res.json({ message: ADMIN_MESSAGES.DOCTOR_ACTIVATED_SUCCESSFULLY });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete doctor
// @route   DELETE /api/admin/doctors/:id
// @access  Private/Admin
export const deleteDoctor = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor || (doctor.isDeleted === true)) {
      return res.status(404).json({ message: DOCTOR_MESSAGES.DOCTOR_NOT_FOUND });
    }

    // Soft delete doctor
    doctor.isDeleted = true;
    doctor.deletedAt = new Date();
    await doctor.save();

    // Also deactivate the associated user account
    const user = await User.findById(doctor.userId);
    if (user) {
      user.isActive = false;
      await user.save();
    }

    res.json({ message: ADMIN_MESSAGES.DOCTOR_DELETED_SUCCESSFULLY });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Cancel appointment (admin)
// @route   PUT /api/admin/appointments/:id/cancel
// @access  Private/Admin
export const cancelAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ message: APPOINTMENT_MESSAGES.APPOINTMENT_NOT_FOUND });
    }

    if (appointment.status === APPOINTMENT_STATUSES.CANCELLED) {
      return res.status(400).json({ message: APPOINTMENT_MESSAGES.APPOINTMENT_ALREADY_CANCELLED });
    }

    appointment.status = APPOINTMENT_STATUSES.CANCELLED;
    await appointment.save();

    res.json({ message: ADMIN_MESSAGES.APPOINTMENT_CANCELLED_SUCCESSFULLY, appointment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

