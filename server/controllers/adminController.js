import User from '../models/User.js';
import Doctor from '../models/Doctor.js';
import Patient from '../models/Patient.js';
import Appointment from '../models/Appointment.js';
import Review from '../models/Review.js';
import Payment from '../models/Payment.js';
import Admin from '../models/Admin.js';
import { USER_ROLES, APPOINTMENT_STATUSES, PAYMENT_STATUSES, DATE_CONSTANTS, HTTP_STATUS } from '../constants/index.js';
import { DOCTOR_MESSAGES, ADMIN_MESSAGES, AUTHZ_MESSAGES, PATIENT_MESSAGES, APPOINTMENT_MESSAGES, AUTH_MESSAGES } from '../constants/messages.js';
import { getPaginationParams, buildPaginationMeta } from '../utils/pagination.js';
import { createAppointmentNotification } from '../utils/notificationService.js';
import { createAuditLog } from '../utils/auditLogger.js';

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
    
    // Basic counts (exclude soft-deleted users)
    const totalPatients = await User.countDocuments({ 
      role: USER_ROLES.PATIENT,
      $or: [
        { isDeleted: { $exists: false } },
        { isDeleted: false }
      ]
    });
    const totalDoctors = await User.countDocuments({ 
      role: USER_ROLES.DOCTOR,
      $or: [
        { isDeleted: { $exists: false } },
        { isDeleted: false }
      ]
    });
    const activeUsers = await User.countDocuments({ 
      isActive: true,
      $or: [
        { isDeleted: { $exists: false } },
        { isDeleted: false }
      ]
    });
    
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
    
    // Get pagination parameters
    const { limit, offset } = getPaginationParams(req);
    
    let query = { 
      $or: [
        { isDeleted: { $exists: false } }, // Include doctors without isDeleted field (existing records)
        { isDeleted: false } // Include doctors that are not deleted
      ]
    };

    if (approved !== undefined) {
      query.isApproved = approved === 'true';
    }

    // Build search query for MongoDB if possible
    if (search) {
      const doctorsWithUsers = await Doctor.find(query)
        .populate('userId', 'firstName lastName email phone profileImage isActive')
        .lean();
      
      const searchLower = search.toLowerCase();
      const filteredDoctors = doctorsWithUsers.filter(doc => {
        const user = doc.userId;
        return (
          user?.firstName?.toLowerCase().includes(searchLower) ||
          user?.lastName?.toLowerCase().includes(searchLower) ||
          doc.specialization?.toLowerCase().includes(searchLower)
        );
      });

      const total = filteredDoctors.length;
      const paginatedDoctors = filteredDoctors.slice(offset, offset + limit);
      const pagination = buildPaginationMeta(total, limit, offset);

      return res.json({
        doctors: paginatedDoctors,
        pagination
      });
    }

    // Get total count before pagination
    const total = await Doctor.countDocuments(query);

    const doctors = await Doctor.find(query)
      .populate('userId', 'firstName lastName email phone profileImage isActive')
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean();

    // Build pagination metadata
    const pagination = buildPaginationMeta(total, limit, offset);

    res.json({
      doctors,
      pagination
    });
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

    const doctorObj = doctor.toObject ? doctor.toObject() : doctor;
    res.json({ 
      message: DOCTOR_MESSAGES.DOCTOR_APPROVED_SUCCESSFULLY, 
      doctor: {
        ...doctorObj,
        currentHospitalName: doctorObj.currentHospitalName || null,
        education: doctorObj.education || []
      }
    });
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
    
    // Get pagination parameters
    const { limit, offset } = getPaginationParams(req);
    
    let userQuery = {};
    
    // Filter by status (active/inactive)
    if (status) {
      userQuery.isActive = status === 'active';
    }

    // Exclude soft-deleted patients
    let patientQuery = {
      $or: [
        { isDeleted: { $exists: false } }, // Include patients without isDeleted field (existing records)
        { isDeleted: false } // Include patients that are not deleted
      ]
    };

    const patients = await Patient.find(patientQuery)
      .populate({
        path: 'userId',
        match: Object.keys(userQuery).length > 0 ? { ...userQuery, isDeleted: { $ne: true } } : { isDeleted: { $ne: true } },
        select: 'firstName lastName email phone profileImage isActive createdAt'
      })
      .sort({ createdAt: -1 })
      .lean();

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
          user?.firstName?.toLowerCase().includes(searchLower) ||
          user?.lastName?.toLowerCase().includes(searchLower) ||
          user?.email?.toLowerCase().includes(searchLower) ||
          user?.phone?.toLowerCase().includes(searchLower)
        );
      });
    }

    // Get total count (before pagination and stats)
    const total = filteredPatients.length;

    // Apply pagination to filtered results
    const paginatedPatients = filteredPatients.slice(offset, offset + limit);

    // Get additional stats for paginated patients only (for performance)
    const patientsWithStats = await Promise.all(
      paginatedPatients.map(async (patient) => {
        const totalAppointments = await Appointment.countDocuments({ patientId: patient.userId._id });
        return {
          ...patient,
          totalAppointments
        };
      })
    );

    // Build pagination metadata
    const pagination = buildPaginationMeta(total, limit, offset);

    res.json({
      patients: patientsWithStats,
      pagination
    });
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
    
    // Get pagination parameters
    const { limit, offset } = getPaginationParams(req);
    
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

    // Handle search with populated data
    if (search) {
      // For search, we need to load all and filter in memory using aggregation
      let appointments = await Appointment.aggregate([
        { $match: query },
        {
          $lookup: {
            from: 'users',
            localField: 'patientId',
            foreignField: '_id',
            as: 'patientId'
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'doctorId',
            foreignField: '_id',
            as: 'doctorUser'
          }
        },
        {
          $lookup: {
            from: 'doctors',
            localField: 'doctorId',
            foreignField: 'userId',
            as: 'doctorInfo'
          }
        },
        {
          $unwind: {
            path: '$patientId',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $unwind: {
            path: '$doctorUser',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $unwind: {
            path: '$doctorInfo',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $project: {
            _id: 1,
            appointmentNumber: 1,
            appointmentDate: 1,
            timeSlot: 1,
            status: 1,
            paymentStatus: 1,
            consultationFee: 1,
            reasonForVisit: 1,
            symptoms: 1,
            createdAt: 1,
            patientId: {
              _id: '$patientId._id',
              firstName: '$patientId.firstName',
              lastName: '$patientId.lastName',
              email: '$patientId.email',
              phone: '$patientId.phone',
              profileImage: '$patientId.profileImage'
            },
            doctorId: {
              _id: '$doctorUser._id',
              firstName: '$doctorUser.firstName',
              lastName: '$doctorUser.lastName',
              email: '$doctorUser.email',
              phone: '$doctorUser.phone',
              profileImage: '$doctorUser.profileImage',
              specialization: '$doctorInfo.specialization'
            }
          }
        },
        { $sort: { appointmentDate: -1 } }
      ]);

      const searchLower = search.toLowerCase();
      const filteredAppointments = appointments.filter(apt => {
        const patient = apt.patientId;
        const doctor = apt.doctorId;
        return (
          patient?.firstName?.toLowerCase().includes(searchLower) ||
          patient?.lastName?.toLowerCase().includes(searchLower) ||
          doctor?.firstName?.toLowerCase().includes(searchLower) ||
          doctor?.lastName?.toLowerCase().includes(searchLower) ||
          doctor?.specialization?.toLowerCase().includes(searchLower) ||
          apt.appointmentNumber?.toLowerCase().includes(searchLower)
        );
      });

      const total = filteredAppointments.length;
      const paginatedAppointments = filteredAppointments.slice(offset, offset + limit);
      const pagination = buildPaginationMeta(total, limit, offset);

      return res.json({
        appointments: paginatedAppointments,
        pagination
      });
    }

    // Get total count before pagination
    const total = await Appointment.countDocuments(query);

    // Use aggregation to join with Doctor model to get specialization
    const appointments = await Appointment.aggregate([
      { $match: query },
      {
        $lookup: {
          from: 'users',
          localField: 'patientId',
          foreignField: '_id',
          as: 'patientId'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'doctorId',
          foreignField: '_id',
          as: 'doctorUser'
        }
      },
      {
        $lookup: {
          from: 'doctors',
          localField: 'doctorId',
          foreignField: 'userId',
          as: 'doctorInfo'
        }
      },
      {
        $unwind: {
          path: '$patientId',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $unwind: {
          path: '$doctorUser',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $unwind: {
          path: '$doctorInfo',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 1,
          appointmentNumber: 1,
          appointmentDate: 1,
          timeSlot: 1,
          status: 1,
          paymentStatus: 1,
          consultationFee: 1,
          reasonForVisit: 1,
          symptoms: 1,
          createdAt: 1,
          patientId: {
            _id: '$patientId._id',
            firstName: '$patientId.firstName',
            lastName: '$patientId.lastName',
            email: '$patientId.email',
            phone: '$patientId.phone',
            profileImage: '$patientId.profileImage'
          },
          doctorId: {
            _id: '$doctorUser._id',
            firstName: '$doctorUser.firstName',
            lastName: '$doctorUser.lastName',
            email: '$doctorUser.email',
            phone: '$doctorUser.phone',
            profileImage: '$doctorUser.profileImage',
            specialization: '$doctorInfo.specialization',
            education: '$doctorInfo.education',
            languages: '$doctorInfo.languages'
          }
        }
      },
      { $sort: { appointmentDate: -1 } },
      { $skip: offset },
      { $limit: limit }
    ]);

    // Build pagination metadata
    const pagination = buildPaginationMeta(total, limit, offset);

    res.json({
      appointments,
      pagination
    });
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
    
    // Get pagination parameters
    const { limit, offset } = getPaginationParams(req);
    
    let query = { 
      role: role || { $exists: true },
      $or: [
        { isDeleted: { $exists: false } },
        { isDeleted: false }
      ]
    };

    if (role) query.role = role;

    // Handle search filter
    if (search) {
      const users = await User.find(query).select('-password').sort({ createdAt: -1 }).lean();
      const searchLower = search.toLowerCase();
      const filteredUsers = users.filter(user =>
        user.firstName?.toLowerCase().includes(searchLower) ||
        user.lastName?.toLowerCase().includes(searchLower) ||
        user.email?.toLowerCase().includes(searchLower)
      );

      const total = filteredUsers.length;
      const paginatedUsers = filteredUsers.slice(offset, offset + limit);
      const pagination = buildPaginationMeta(total, limit, offset);

      return res.json({
        users: paginatedUsers,
        pagination
      });
    }

    // Get total count before pagination
    const total = await User.countDocuments(query);

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean();

    // Build pagination metadata
    const pagination = buildPaginationMeta(total, limit, offset);

    res.json({
      users,
      pagination
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get patient by ID
// @route   GET /api/admin/patients/:id
// @access  Private/Admin
export const getPatientById = async (req, res) => {
  try {
    const patient = await Patient.findOne({
      _id: req.params.id,
      $or: [
        { isDeleted: { $exists: false } },
        { isDeleted: false }
      ]
    })
      .populate('userId', 'firstName lastName email phone profileImage dateOfBirth gender address isActive isVerified createdAt updatedAt')
      .populate('favoriteDoctors', 'firstName lastName specialization');
    
    if (!patient) {
      return res.status(404).json({ message: PATIENT_MESSAGES.PATIENT_PROFILE_NOT_FOUND });
    }

    // Get comprehensive patient statistics
    const totalAppointments = await Appointment.countDocuments({ patientId: patient.userId._id });
    const completedAppointments = await Appointment.countDocuments({ 
      patientId: patient.userId._id,
      status: APPOINTMENT_STATUSES.COMPLETED
    });
    const upcomingAppointments = await Appointment.countDocuments({
      patientId: patient.userId._id,
      status: { $in: [APPOINTMENT_STATUSES.PENDING, APPOINTMENT_STATUSES.CONFIRMED] },
      appointmentDate: { $gte: new Date() }
    });

    // Get patient's appointment history with payment information
    const MedicalRecord = (await import('../models/MedicalRecord.js')).default;
    const Payment = (await import('../models/Payment.js')).default;
    
    const appointments = await Appointment.find({ patientId: patient.userId._id })
      .populate('doctorId', 'firstName lastName specialization profileImage')
      .sort({ createdAt: -1 })
      .lean();

    // Get payment information for all appointments
    const appointmentIds = appointments.map(apt => apt._id);
    const payments = await Payment.find({ appointmentId: { $in: appointmentIds } });
    const paymentMap = new Map();
    payments.forEach(payment => {
      paymentMap.set(payment.appointmentId.toString(), payment.toObject());
    });

    // Attach payment info to appointments
    const appointmentsWithPayment = appointments.map(appointment => ({
      ...appointment,
      payment: paymentMap.get(appointment._id.toString()) || null
    }));

    // Get medical records count
    const medicalRecordsCount = await MedicalRecord.countDocuments({ patientId: patient.userId._id });

    // Calculate total amount paid
    const totalPaid = payments
      .filter(payment => {
        if (payment.status === PAYMENT_STATUSES.COMPLETED) return true;
        if (payment.paymentGateway === 'offline' && payment.status !== 'failed' && payment.status !== 'cancelled' && payment.status !== 'refunded') return true;
        if (payment.paymentGateway === 'online' && payment.status !== 'failed' && payment.status !== 'cancelled' && payment.status !== 'refunded') return true;
        return false;
      })
      .reduce((sum, payment) => sum + (payment.amount || 0), 0);

    res.json({ 
      patient,
      statistics: {
        totalAppointments,
        completedAppointments,
        upcomingAppointments,
        medicalRecordsCount,
        totalPaid
      },
      appointments: appointmentsWithPayment
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update patient
// @route   PUT /api/admin/patients/:id
// @access  Private/Admin
export const updatePatient = async (req, res) => {
  try {
    const patient = await Patient.findOne({
      _id: req.params.id,
      $or: [
        { isDeleted: { $exists: false } },
        { isDeleted: false }
      ]
    }).populate('userId');
    if (!patient) {
      return res.status(404).json({ message: PATIENT_MESSAGES.PATIENT_PROFILE_NOT_FOUND });
    }

    // Update user info
    const { 
      firstName, 
      lastName, 
      email, 
      phone, 
      dateOfBirth, 
      gender, 
      address,
      profileImage 
    } = req.body;
    
    if (firstName !== undefined) patient.userId.firstName = firstName;
    if (lastName !== undefined) patient.userId.lastName = lastName;
    if (email !== undefined) patient.userId.email = email;
    if (phone !== undefined) patient.userId.phone = phone;
    if (dateOfBirth !== undefined) patient.userId.dateOfBirth = dateOfBirth;
    if (gender !== undefined) patient.userId.gender = gender;
    if (address !== undefined) {
      if (typeof address === 'object') {
        patient.userId.address = { ...patient.userId.address, ...address };
      } else {
        patient.userId.address = address;
      }
    }
    if (profileImage !== undefined) patient.userId.profileImage = profileImage;
    
    await patient.userId.save();

    // Update patient-specific fields
    const { 
      bloodGroup, 
      height, 
      weight, 
      allergies, 
      medicalHistory, 
      currentMedications,
      chronicConditions,
      previousSurgeries,
      emergencyContact, 
      insuranceInfo 
    } = req.body;
    
    if (bloodGroup !== undefined) patient.bloodGroup = bloodGroup;
    if (height !== undefined) {
      patient.height = height;
      // Recalculate BMI if both height and weight are present
      if (height > 0 && patient.weight > 0) {
        const heightInMeters = height / 100;
        patient.bmi = parseFloat((patient.weight / (heightInMeters * heightInMeters)).toFixed(2));
      }
    }
    if (weight !== undefined) {
      patient.weight = weight;
      // Recalculate BMI if both height and weight are present
      if (patient.height > 0 && weight > 0) {
        const heightInMeters = patient.height / 100;
        patient.bmi = parseFloat((weight / (heightInMeters * heightInMeters)).toFixed(2));
      }
    }
    if (allergies !== undefined) {
      patient.allergies = Array.isArray(allergies) ? allergies : allergies.split(',').map(a => a.trim());
    }
    if (medicalHistory !== undefined) patient.medicalHistory = medicalHistory;
    if (currentMedications !== undefined) patient.currentMedications = currentMedications;
    if (chronicConditions !== undefined) patient.chronicConditions = chronicConditions;
    if (previousSurgeries !== undefined) patient.previousSurgeries = previousSurgeries;
    if (emergencyContact !== undefined) {
      patient.emergencyContact = typeof emergencyContact === 'object' ? { ...patient.emergencyContact, ...emergencyContact } : emergencyContact;
    }
    if (insuranceInfo !== undefined) {
      patient.insuranceInfo = typeof insuranceInfo === 'object' ? { ...patient.insuranceInfo, ...insuranceInfo } : insuranceInfo;
    }
    
    await patient.save();

    // Create audit log
    await createAuditLog({
      userId: req.user.id,
      action: 'UPDATE_PATIENT_PROFILE',
      resourceType: 'Patient',
      resourceId: patient._id,
      changes: req.body,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

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
    const patient = await Patient.findOne({
      _id: req.params.id,
      $or: [
        { isDeleted: { $exists: false } },
        { isDeleted: false }
      ]
    }).populate('userId');
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
    const patient = await Patient.findOne({
      _id: req.params.id,
      $or: [
        { isDeleted: { $exists: false } },
        { isDeleted: false }
      ]
    }).populate('userId');
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
    if (!patient || (patient.isDeleted === true)) {
      return res.status(404).json({ message: PATIENT_MESSAGES.PATIENT_PROFILE_NOT_FOUND });
    }

    // Soft delete patient profile
    patient.isDeleted = true;
    patient.deletedAt = new Date();
    await patient.save();

    // Soft delete associated user
    const user = await User.findById(patient.userId);
    if (user) {
      user.isDeleted = true;
      user.deletedAt = new Date();
      user.isActive = false; // Also deactivate the account
      await user.save();
    }

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

    const doctorObj = doctor.toObject ? doctor.toObject() : doctor;
    res.json({ 
      doctor: {
        ...doctorObj,
        currentHospitalName: doctorObj.currentHospitalName || null,
        education: doctorObj.education || []
      }, 
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
    if (!doctor || doctor.isDeleted) {
      return res.status(404).json({ message: DOCTOR_MESSAGES.DOCTOR_NOT_FOUND });
    }

    // Update user info
    const { 
      firstName, 
      lastName, 
      email, 
      phone, 
      dateOfBirth, 
      gender, 
      address,
      profileImage 
    } = req.body;
    
    if (firstName !== undefined) doctor.userId.firstName = firstName;
    if (lastName !== undefined) doctor.userId.lastName = lastName;
    if (email !== undefined) doctor.userId.email = email;
    if (phone !== undefined) doctor.userId.phone = phone;
    if (dateOfBirth !== undefined) doctor.userId.dateOfBirth = dateOfBirth;
    if (gender !== undefined) doctor.userId.gender = gender;
    if (address !== undefined) {
      if (typeof address === 'object') {
        doctor.userId.address = { ...doctor.userId.address, ...address };
      } else {
        doctor.userId.address = address;
      }
    }
    if (profileImage !== undefined) doctor.userId.profileImage = profileImage;
    
    await doctor.userId.save();

    // Update doctor-specific fields
    const { 
      specialization, 
      licenseNumber, 
      experience, 
      consultationFee, 
      biography, 
      languages, 
      education, 
      currentHospitalName,
      consultationType,
      consultationDuration,
      certifications
    } = req.body;
    
    if (specialization !== undefined) doctor.specialization = specialization;
    if (licenseNumber !== undefined) doctor.licenseNumber = licenseNumber;
    if (experience !== undefined) doctor.experience = experience;
    if (consultationFee !== undefined) doctor.consultationFee = consultationFee;
    if (biography !== undefined) doctor.biography = biography;
    if (languages !== undefined) doctor.languages = Array.isArray(languages) ? languages : languages.split(',').map(l => l.trim());
    if (education !== undefined) doctor.education = education;
    if (currentHospitalName !== undefined) doctor.currentHospitalName = currentHospitalName;
    if (consultationType !== undefined) doctor.consultationType = Array.isArray(consultationType) ? consultationType : [consultationType];
    if (consultationDuration !== undefined) doctor.consultationDuration = consultationDuration;
    if (certifications !== undefined) doctor.certifications = certifications;
    
    await doctor.save();

    // Create audit log
    await createAuditLog({
      userId: req.user.id,
      action: 'UPDATE_DOCTOR_PROFILE',
      resourceType: 'Doctor',
      resourceId: doctor._id,
      changes: req.body,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    const updatedDoctor = await Doctor.findById(req.params.id).populate('userId');
    const doctorObj = updatedDoctor.toObject ? updatedDoctor.toObject() : updatedDoctor;
    res.json({ 
      message: ADMIN_MESSAGES.DOCTOR_UPDATED_SUCCESSFULLY, 
      doctor: {
        ...doctorObj,
        currentHospitalName: doctorObj.currentHospitalName || null,
        education: doctorObj.education || []
      }
    });
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

// @desc    Reschedule appointment by admin
// @route   PUT /api/admin/appointments/:id/reschedule
// @access  Private/Admin
export const rescheduleAppointment = async (req, res) => {
  try {
    const { appointmentDate, timeSlot, reason } = req.body;

    if (!appointmentDate || !timeSlot || !timeSlot.start || !timeSlot.end) {
      return res.status(400).json({ message: 'New appointment date and time slot are required' });
    }

    const appointment = await Appointment.findById(req.params.id)
      .populate('patientId', 'firstName lastName email')
      .populate('doctorId', 'firstName lastName');
    
    if (!appointment) {
      return res.status(404).json({ message: APPOINTMENT_MESSAGES.APPOINTMENT_NOT_FOUND });
    }

    // Validate new date is in the future
    const newDate = new Date(appointmentDate);
    const now = new Date();
    if (newDate < now) {
      return res.status(400).json({ message: 'Cannot reschedule to a past date' });
    }

    // Check if new slot is available
    const newDateStart = new Date(newDate);
    newDateStart.setHours(0, 0, 0, 0);
    const newDateEnd = new Date(newDate);
    newDateEnd.setHours(23, 59, 59, 999);

    const conflictingAppointment = await Appointment.findOne({
      doctorId: appointment.doctorId,
      appointmentDate: {
        $gte: newDateStart,
        $lte: newDateEnd
      },
      'timeSlot.start': timeSlot.start,
      'timeSlot.end': timeSlot.end,
      status: { $in: [APPOINTMENT_STATUSES.PENDING, APPOINTMENT_STATUSES.CONFIRMED, APPOINTMENT_STATUSES.RESCHEDULE_REQUESTED] },
      _id: { $ne: appointment._id }
    });

    if (conflictingAppointment) {
      return res.status(400).json({ message: 'Time slot is already booked' });
    }

    // Store original appointment details
    const originalDate = appointment.appointmentDate;
    const originalTimeSlot = appointment.timeSlot;

    // Update appointment
    appointment.appointmentDate = newDate;
    appointment.timeSlot = timeSlot;
    appointment.status = APPOINTMENT_STATUSES.RESCHEDULED_BY_ADMIN;

    // Update rescheduling info
    if (!appointment.reschedulingInfo) {
      appointment.reschedulingInfo = {};
    }
    appointment.reschedulingInfo.originalDate = originalDate;
    appointment.reschedulingInfo.originalTimeSlot = originalTimeSlot;
    appointment.reschedulingInfo.rescheduledDate = newDate;
    appointment.reschedulingInfo.rescheduledTimeSlot = timeSlot;
    appointment.reschedulingInfo.rescheduledBy = req.user._id;
    appointment.reschedulingInfo.rescheduledAt = new Date();
    appointment.reschedulingInfo.reason = reason || 'Rescheduled by admin';

    await appointment.save();

    // Notify patient
    await createAppointmentNotification(appointment.patientId._id, {
      appointmentType: 'appointment_rescheduled',
      title: 'Appointment Rescheduled',
      message: `Your appointment with Dr. ${appointment.doctorId.firstName} ${appointment.doctorId.lastName} has been rescheduled to ${newDate.toLocaleDateString()} at ${timeSlot.start} - ${timeSlot.end}. ${reason ? `Reason: ${reason}` : ''}`,
      priority: 'high',
      appointmentId: appointment._id,
      actionUrl: `/appointments/${appointment._id}`,
      metadata: {
        originalDate: originalDate,
        originalTimeSlot: originalTimeSlot,
        newDate: newDate,
        newTimeSlot: timeSlot,
        reason: reason
      }
    });

    // Log the action
    await createAuditLog({
      user: req.user,
      action: 'reschedule_appointment',
      entityType: 'appointment',
      entityId: appointment._id,
      method: 'PUT',
      endpoint: req.originalUrl,
      status: 'success',
      statusCode: HTTP_STATUS.OK,
      metadata: {
        appointmentId: appointment._id,
        originalDate: originalDate,
        originalTimeSlot: originalTimeSlot,
        newDate: newDate,
        newTimeSlot: timeSlot,
        reason: reason,
        patientId: appointment.patientId._id
      },
      req
    });

    res.json({
      message: ADMIN_MESSAGES.APPOINTMENT_RESCHEDULED_SUCCESSFULLY || 'Appointment rescheduled successfully',
      appointment: {
        ...appointment.toObject(),
        originalDate: originalDate,
        originalTimeSlot: originalTimeSlot
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============================================
// ADMIN MANAGEMENT (TWO-LEVEL APPROVAL)
// ============================================

// @desc    Create new admin account (only existing approved admins can create)
// @route   POST /api/admin/admins
// @access  Private/Admin
export const createAdmin = async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, dateOfBirth, gender, address } = req.body;

    if (!email || !password || !firstName || !lastName || !phone) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
        message: 'Email, password, firstName, lastName, and phone are required' 
      });
    }

    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: AUTH_MESSAGES.EMAIL_ALREADY_REGISTERED });
    }

    const phoneExists = await User.findOne({ phone });
    if (phoneExists) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: AUTH_MESSAGES.PHONE_ALREADY_REGISTERED });
    }

    const createdUser = await User.create({
      email,
      password,
      firstName,
      lastName,
      phone,
      role: USER_ROLES.ADMIN,
      dateOfBirth,
      gender,
      address
    });

    const admin = await Admin.create({
      userId: createdUser._id,
      firstApproval: { isApproved: false },
      secondApproval: { isApproved: false },
      isFullyApproved: false,
      isRejected: false
    });

    const adminWithUser = await Admin.findById(admin._id)
      .populate('userId', 'email firstName lastName phone role');

    res.status(HTTP_STATUS.CREATED).json({
      message: 'Admin account created successfully. Approval from two administrators is required.',
      admin: adminWithUser
    });
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

// @desc    Get all admins (pending and approved)
// @route   GET /api/admin/admins
// @access  Private/Admin
export const getAdmins = async (req, res) => {
  try {
    const { status } = req.query;
    let query = {};

    if (status === 'pending') {
      query.isFullyApproved = false;
      query.isRejected = false;
    } else if (status === 'approved') {
      query.isFullyApproved = true;
    } else if (status === 'rejected') {
      query.isRejected = true;
    }

    const admins = await Admin.find(query)
      .populate('userId', 'email firstName lastName phone role isActive createdAt')
      .populate('firstApproval.approvedBy', 'firstName lastName email')
      .populate('secondApproval.approvedBy', 'firstName lastName email')
      .populate('rejectedBy', 'firstName lastName email')
      .sort({ createdAt: -1 });

    res.json(admins);
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

// @desc    Get admin by ID
// @route   GET /api/admin/admins/:id
// @access  Private/Admin
export const getAdminById = async (req, res) => {
  try {
    const admin = await Admin.findOne({ userId: req.params.id })
      .populate('userId', 'email firstName lastName phone role dateOfBirth gender address isActive createdAt')
      .populate('firstApproval.approvedBy', 'firstName lastName email')
      .populate('secondApproval.approvedBy', 'firstName lastName email')
      .populate('rejectedBy', 'firstName lastName email');

    if (!admin) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Admin not found' });
    }

    res.json(admin);
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

// @desc    First level approval for admin
// @route   PUT /api/admin/admins/:id/first-approval
// @access  Private/Admin
export const firstApprovalAdmin = async (req, res) => {
  try {
    const admin = await Admin.findOne({ userId: req.params.id });

    if (!admin) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Admin not found' });
    }

    if (admin.isRejected) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: 'Cannot approve a rejected admin account' });
    }

    if (admin.firstApproval.isApproved) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: 'Admin already has first approval' });
    }

    if (admin.userId.toString() === req.user._id.toString()) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: 'You cannot approve your own admin account' });
    }

    admin.firstApproval = {
      approvedBy: req.user._id,
      approvedAt: new Date(),
      isApproved: true
    };

    if (admin.firstApproval.isApproved && admin.secondApproval.isApproved) {
      admin.isFullyApproved = true;
    }

    await admin.save();

    const updatedAdmin = await Admin.findById(admin._id)
      .populate('userId', 'email firstName lastName phone role')
      .populate('firstApproval.approvedBy', 'firstName lastName email')
      .populate('secondApproval.approvedBy', 'firstName lastName email');

    res.json({
      message: 'First approval granted successfully',
      admin: updatedAdmin
    });
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

// @desc    Second level approval for admin
// @route   PUT /api/admin/admins/:id/second-approval
// @access  Private/Admin
export const secondApprovalAdmin = async (req, res) => {
  try {
    const admin = await Admin.findOne({ userId: req.params.id });

    if (!admin) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Admin not found' });
    }

    if (admin.isRejected) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: 'Cannot approve a rejected admin account' });
    }

    if (!admin.firstApproval.isApproved) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: 'First approval is required before second approval' });
    }

    if (admin.secondApproval.isApproved) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: 'Admin already has second approval' });
    }

    if (admin.userId.toString() === req.user._id.toString()) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: 'You cannot approve your own admin account' });
    }

    if (admin.firstApproval.approvedBy && admin.firstApproval.approvedBy.toString() === req.user._id.toString()) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: 'You cannot provide both approvals. A different administrator must provide the second approval' });
    }

    admin.secondApproval = {
      approvedBy: req.user._id,
      approvedAt: new Date(),
      isApproved: true
    };

    admin.isFullyApproved = true;

    await admin.save();

    const updatedAdmin = await Admin.findById(admin._id)
      .populate('userId', 'email firstName lastName phone role')
      .populate('firstApproval.approvedBy', 'firstName lastName email')
      .populate('secondApproval.approvedBy', 'firstName lastName email');

    res.json({
      message: 'Second approval granted successfully. Admin account is now fully approved.',
      admin: updatedAdmin
    });
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

// @desc    Reject admin account
// @route   PUT /api/admin/admins/:id/reject
// @access  Private/Admin
export const rejectAdmin = async (req, res) => {
  try {
    const { reason } = req.body;
    const admin = await Admin.findOne({ userId: req.params.id });

    if (!admin) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Admin not found' });
    }

    if (admin.isFullyApproved) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: 'Cannot reject a fully approved admin account' });
    }

    admin.isRejected = true;
    admin.rejectedBy = req.user._id;
    admin.rejectedAt = new Date();
    admin.rejectionReason = reason || 'No reason provided';

    const user = await User.findById(admin.userId);
    if (user) {
      user.isActive = false;
      await user.save();
    }

    await admin.save();

    const updatedAdmin = await Admin.findById(admin._id)
      .populate('userId', 'email firstName lastName phone role')
      .populate('rejectedBy', 'firstName lastName email');

    res.json({
      message: 'Admin account rejected successfully',
      admin: updatedAdmin
    });
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

