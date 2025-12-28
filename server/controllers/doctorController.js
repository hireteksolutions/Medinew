import Doctor from '../models/Doctor.js';
import User from '../models/User.js';
import Appointment from '../models/Appointment.js';
import Patient from '../models/Patient.js';
import Review from '../models/Review.js';
import Message from '../models/Message.js';
import AvailabilitySchedule from '../models/AvailabilitySchedule.js';
import { APPOINTMENT_STATUSES, MESSAGE_STATUSES, DAY_OF_WEEK_VALUES } from '../constants/index.js';
import { DOCTOR_MESSAGES, APPOINTMENT_MESSAGES, AUTH_MESSAGES } from '../constants/messages.js';

// ============================================
// PROFILE MANAGEMENT
// ============================================

// @desc    Get doctor profile
// @route   GET /api/doctor/profile
// @access  Private/Doctor
export const getProfile = async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ userId: req.user._id })
      .populate('userId', 'firstName lastName email phone profileImage dateOfBirth gender address');
    
    if (!doctor) {
      return res.status(404).json({ message: DOCTOR_MESSAGES.DOCTOR_PROFILE_NOT_FOUND });
    }
    
    res.json(doctor);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update doctor profile
// @route   PUT /api/doctor/profile
// @access  Private/Doctor
export const updateProfile = async (req, res) => {
  try {
    const {
      specialization,
      licenseNumber,
      education,
      experience,
      consultationFee,
      languages,
      biography,
      consultationDuration,
      certifications
    } = req.body;

    let doctor = await Doctor.findOne({ userId: req.user._id });

    if (!doctor) {
      return res.status(404).json({ message: DOCTOR_MESSAGES.DOCTOR_PROFILE_NOT_FOUND });
    }

    // Update doctor fields
    if (specialization) doctor.specialization = specialization;
    if (licenseNumber) {
      // Check if license number is already taken by another doctor
      const existingDoctor = await Doctor.findOne({ 
        licenseNumber, 
        _id: { $ne: doctor._id } 
      });
      if (existingDoctor) {
        return res.status(400).json({ message: DOCTOR_MESSAGES.LICENSE_NUMBER_ALREADY_EXISTS });
      }
      doctor.licenseNumber = licenseNumber;
    }
    if (education) doctor.education = education;
    if (experience !== undefined) doctor.experience = experience;
    if (consultationFee !== undefined) doctor.consultationFee = consultationFee;
    if (languages) doctor.languages = languages;
    if (biography !== undefined) doctor.biography = biography;
    if (consultationDuration) doctor.consultationDuration = consultationDuration;
    if (certifications) doctor.certifications = certifications;

    await doctor.save();
    
    const updatedDoctor = await Doctor.findOne({ userId: req.user._id })
      .populate('userId', 'firstName lastName email phone profileImage');
    
    res.json({ message: DOCTOR_MESSAGES.PROFILE_UPDATED_SUCCESSFULLY, doctor: updatedDoctor });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============================================
// SCHEDULE MANAGEMENT
// ============================================

// @desc    Get complete schedule (weekly + date-specific)
// @route   GET /api/doctor/schedule
// @access  Private/Doctor
export const getSchedule = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const userId = req.user._id;

    const doctor = await Doctor.findOne({ userId }).select('availability blockedDates consultationDuration');
    if (!doctor) {
      return res.status(404).json({ message: DOCTOR_MESSAGES.DOCTOR_PROFILE_NOT_FOUND });
    }

    // Get date-specific schedules if date range provided
    let dateSpecificSchedules = [];
    if (startDate || endDate) {
      const query = { doctorId: userId };
      if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = new Date(startDate);
        if (endDate) query.date.$lte = new Date(endDate);
      }
      dateSpecificSchedules = await AvailabilitySchedule.find(query).sort({ date: 1 });
    }

    res.json({
      success: true,
      data: {
        weeklySchedule: doctor.availability || [],
        blockedDates: doctor.blockedDates || [],
        consultationDuration: doctor.consultationDuration,
        dateSpecificSchedules: dateSpecificSchedules
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update weekly availability schedule
// @route   PUT /api/doctor/schedule/weekly
// @access  Private/Doctor
export const updateWeeklySchedule = async (req, res) => {
  try {
    const { availability } = req.body;

    if (!availability || !Array.isArray(availability)) {
      return res.status(400).json({ message: 'Availability array is required' });
    }

    // Validate availability structure
    for (const avail of availability) {
      if (!DAY_OF_WEEK_VALUES.includes(avail.day)) {
        return res.status(400).json({ message: `Invalid day: ${avail.day}` });
      }
      if (!avail.timeSlots || !Array.isArray(avail.timeSlots)) {
        return res.status(400).json({ message: `Time slots array required for ${avail.day}` });
      }
      // Validate time slots
      for (const slot of avail.timeSlots) {
        if (!slot.start || !slot.end) {
          return res.status(400).json({ message: 'Time slot must have start and end times' });
        }
        // Validate time format (HH:MM)
        const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(slot.start) || !timeRegex.test(slot.end)) {
          return res.status(400).json({ message: 'Time must be in HH:MM format' });
        }
        // Validate start < end
        const [startHour, startMin] = slot.start.split(':').map(Number);
        const [endHour, endMin] = slot.end.split(':').map(Number);
        const startTime = startHour * 60 + startMin;
        const endTime = endHour * 60 + endMin;
        if (startTime >= endTime) {
          return res.status(400).json({ message: `Start time must be before end time for ${avail.day}` });
        }
      }
    }

    const doctor = await Doctor.findOne({ userId: req.user._id });
    if (!doctor) {
      return res.status(404).json({ message: DOCTOR_MESSAGES.DOCTOR_PROFILE_NOT_FOUND });
    }

    doctor.availability = availability;
    await doctor.save();

    res.json({
      success: true,
      message: DOCTOR_MESSAGES.SCHEDULE_UPDATED_SUCCESSFULLY,
      data: {
        weeklySchedule: doctor.availability
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update availability schedule (backward compatibility)
// @route   PUT /api/doctor/schedule
// @access  Private/Doctor
export const updateSchedule = async (req, res) => {
  try {
    const { availability, blockedDates } = req.body;

    const doctor = await Doctor.findOne({ userId: req.user._id });
    if (!doctor) {
      return res.status(404).json({ message: DOCTOR_MESSAGES.DOCTOR_PROFILE_NOT_FOUND });
    }

    if (availability) {
      doctor.availability = availability;
    }
    if (blockedDates !== undefined) {
      // Validate dates are in the future
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const invalidDates = blockedDates.filter(date => new Date(date) < now);
      if (invalidDates.length > 0) {
        return res.status(400).json({ 
          message: 'Cannot block past dates',
          invalidDates 
        });
      }
      doctor.blockedDates = blockedDates.map(date => new Date(date));
    }

    await doctor.save();
    res.json({ 
      success: true,
      message: DOCTOR_MESSAGES.SCHEDULE_UPDATED_SUCCESSFULLY, 
      data: {
        weeklySchedule: doctor.availability,
        blockedDates: doctor.blockedDates
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Block specific dates
// @route   POST /api/doctor/schedule/block-dates
// @access  Private/Doctor
export const blockDates = async (req, res) => {
  try {
    const { dates, reason } = req.body;

    if (!dates || !Array.isArray(dates) || dates.length === 0) {
      return res.status(400).json({ message: 'Dates array is required' });
    }

    const doctor = await Doctor.findOne({ userId: req.user._id });
    if (!doctor) {
      return res.status(404).json({ message: DOCTOR_MESSAGES.DOCTOR_PROFILE_NOT_FOUND });
    }

    // Validate dates are in the future
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const dateObjects = dates.map(date => new Date(date));
    const invalidDates = dateObjects.filter(date => date < now);
    
    if (invalidDates.length > 0) {
      return res.status(400).json({ 
        message: 'Cannot block past dates',
        invalidDates: invalidDates.map(d => d.toISOString().split('T')[0])
      });
    }

    // Check for existing appointments on these dates
    const appointmentQueries = dateObjects.map(date => {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      return {
        doctorId: req.user._id,
        appointmentDate: {
          $gte: start,
          $lte: end
        },
        status: { $in: [APPOINTMENT_STATUSES.PENDING, APPOINTMENT_STATUSES.CONFIRMED] }
      };
    });

    const existingAppointments = await Appointment.find({
      $or: appointmentQueries
    });

    if (existingAppointments.length > 0) {
      return res.status(400).json({
        message: 'Cannot block dates with existing appointments',
        conflictingDates: [...new Set(existingAppointments.map(apt => 
          apt.appointmentDate.toISOString().split('T')[0]
        ))]
      });
    }

    // Add dates to blockedDates (avoid duplicates)
    const existingBlocked = doctor.blockedDates.map(d => d.toISOString().split('T')[0]);
    const newDates = dateObjects.filter(d => 
      !existingBlocked.includes(d.toISOString().split('T')[0])
    );
    
    doctor.blockedDates = [...doctor.blockedDates, ...newDates];
    await doctor.save();

    res.json({
      success: true,
      message: `${newDates.length} date(s) blocked successfully`,
      data: {
        blockedDates: doctor.blockedDates,
        newlyBlocked: newDates.map(d => d.toISOString().split('T')[0])
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Unblock specific dates
// @route   DELETE /api/doctor/schedule/block-dates
// @access  Private/Doctor
export const unblockDates = async (req, res) => {
  try {
    const { dates } = req.body;

    if (!dates || !Array.isArray(dates) || dates.length === 0) {
      return res.status(400).json({ message: 'Dates array is required' });
    }

    const doctor = await Doctor.findOne({ userId: req.user._id });
    if (!doctor) {
      return res.status(404).json({ message: DOCTOR_MESSAGES.DOCTOR_PROFILE_NOT_FOUND });
    }

    const dateStrings = dates.map(date => new Date(date).toISOString().split('T')[0]);
    const originalCount = doctor.blockedDates.length;
    
    doctor.blockedDates = doctor.blockedDates.filter(blockedDate => 
      !dateStrings.includes(blockedDate.toISOString().split('T')[0])
    );

    await doctor.save();

    res.json({
      success: true,
      message: `${originalCount - doctor.blockedDates.length} date(s) unblocked successfully`,
      data: {
        blockedDates: doctor.blockedDates
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Change password
// @route   PUT /api/doctor/change-password
// @access  Private/Doctor
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: DOCTOR_MESSAGES.CURRENT_AND_NEW_PASSWORD_REQUIRED });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: DOCTOR_MESSAGES.PASSWORD_MIN_LENGTH });
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({ message: AUTH_MESSAGES.USER_NOT_FOUND });
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: DOCTOR_MESSAGES.CURRENT_PASSWORD_INCORRECT });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: DOCTOR_MESSAGES.PASSWORD_CHANGED_SUCCESSFULLY });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Upload certifications
// @route   POST /api/doctor/certifications
// @access  Private/Doctor
export const uploadCertifications = async (req, res) => {
  try {
    const { certifications } = req.body;

    if (!certifications || !Array.isArray(certifications)) {
      return res.status(400).json({ message: DOCTOR_MESSAGES.CERTIFICATIONS_ARRAY_REQUIRED });
    }

    const doctor = await Doctor.findOne({ userId: req.user._id });
    if (!doctor) {
      return res.status(404).json({ message: DOCTOR_MESSAGES.DOCTOR_PROFILE_NOT_FOUND });
    }

    // Add new certifications to existing ones
    doctor.certifications = [...(doctor.certifications || []), ...certifications];
    await doctor.save();

    res.json({ 
      message: DOCTOR_MESSAGES.CERTIFICATIONS_UPLOADED_SUCCESSFULLY, 
      certifications: doctor.certifications 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============================================
// DASHBOARD & ANALYTICS
// ============================================

// @desc    Get comprehensive doctor dashboard stats
// @route   GET /api/doctor/dashboard
// @access  Private/Doctor
export const getDashboard = async (req, res) => {
  try {
    const doctorId = req.user._id;
    const now = new Date();
    
    // Date ranges
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    
    // Total appointments
    const totalAppointments = await Appointment.countDocuments({ doctorId });
    const monthAppointments = await Appointment.countDocuments({
      doctorId,
      createdAt: { $gte: startOfMonth }
    });
    const yearAppointments = await Appointment.countDocuments({
      doctorId,
      createdAt: { $gte: startOfYear }
    });

    // Appointment status breakdown
    const completedCount = await Appointment.countDocuments({
      doctorId,
      status: APPOINTMENT_STATUSES.COMPLETED
    });
    const cancelledCount = await Appointment.countDocuments({
      doctorId,
      status: APPOINTMENT_STATUSES.CANCELLED
    });
    const pendingCount = await Appointment.countDocuments({
      doctorId,
      status: APPOINTMENT_STATUSES.PENDING
    });
    const confirmedCount = await Appointment.countDocuments({
      doctorId,
      status: APPOINTMENT_STATUSES.CONFIRMED
    });

    // Calculate success rate (completed / (completed + cancelled))
    const totalProcessed = completedCount + cancelledCount;
    const successRate = totalProcessed > 0 
      ? ((completedCount / totalProcessed) * 100).toFixed(2) 
      : 0;

    // Calculate completion rate
    const completionRate = totalAppointments > 0
      ? ((completedCount / totalAppointments) * 100).toFixed(2)
      : 0;

    // Calculate cancellation rate
    const cancellationRate = totalAppointments > 0
      ? ((cancelledCount / totalAppointments) * 100).toFixed(2)
      : 0;

    // Patient satisfaction (average rating)
    const reviews = await Review.find({ doctorId });
    const avgRating = reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(2)
      : 0;

    // Total patients treated
    const totalPatients = await Appointment.distinct('patientId', { doctorId }).then(ids => ids.length);

    // Revenue generated (from completed appointments)
    const completedAppointments = await Appointment.find({
      doctorId,
      status: APPOINTMENT_STATUSES.COMPLETED,
      paymentStatus: 'paid'
    }).select('consultationFee updatedAt createdAt');

    const totalRevenue = completedAppointments
      .reduce((sum, apt) => sum + (apt.consultationFee || 0), 0);

    const monthRevenue = completedAppointments
      .filter(apt => apt.updatedAt >= startOfMonth)
      .reduce((sum, apt) => sum + (apt.consultationFee || 0), 0);

    // Pending messages count
    const pendingMessagesCount = await Message.countDocuments({
      doctorId,
      status: { $in: [MESSAGE_STATUSES.PENDING, MESSAGE_STATUSES.READ] }
    });

    // Appointments trend (last 12 months)
    const trendData = [];
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      
      const count = await Appointment.countDocuments({
        doctorId,
        createdAt: { $gte: monthStart, $lte: monthEnd }
      });
      
      trendData.push({
        month: monthStart.toLocaleString('default', { month: 'short', year: 'numeric' }),
        count
      });
    }

    // Monthly revenue (last 12 months)
    const revenueTrend = [];
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      
      const monthAppts = await Appointment.find({
        doctorId,
        status: APPOINTMENT_STATUSES.COMPLETED,
        updatedAt: { $gte: monthStart, $lte: monthEnd },
        paymentStatus: 'paid'
      }).select('consultationFee');

      const revenue = monthAppts.reduce((sum, apt) => sum + (apt.consultationFee || 0), 0);
      
      revenueTrend.push({
        month: monthStart.toLocaleString('default', { month: 'short', year: 'numeric' }),
        revenue
      });
    }

    // Most common health concerns (from appointments)
    const appointmentsWithReasons = await Appointment.find({
      doctorId,
      reasonForVisit: { $exists: true, $ne: '' }
    }).select('reasonForVisit');

    const concernCounts = {};
    appointmentsWithReasons.forEach(apt => {
      const reason = apt.reasonForVisit?.toLowerCase().trim();
      if (reason) {
        concernCounts[reason] = (concernCounts[reason] || 0) + 1;
      }
    });

    const mostCommonConcerns = Object.entries(concernCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([concern, count]) => ({ concern, count }));

    // Peak appointment hours
    const appointmentsWithTimes = await Appointment.find({
      doctorId
    }).select('timeSlot');

    const hourCounts = {};
    appointmentsWithTimes.forEach(apt => {
      if (apt.timeSlot?.start) {
        const hour = parseInt(apt.timeSlot.start.split(':')[0]);
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      }
    });

    const peakHours = Object.entries(hourCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([hour, count]) => ({ hour: `${hour}:00`, count }));

    // Peak appointment days
    const appointmentsWithDates = await Appointment.find({
      doctorId
    }).select('appointmentDate');

    const dayCounts = {};
    appointmentsWithDates.forEach(apt => {
      if (apt.appointmentDate) {
        const day = apt.appointmentDate.toLocaleDateString('en-US', { weekday: 'long' });
        dayCounts[day] = (dayCounts[day] || 0) + 1;
      }
    });

    const peakDays = Object.entries(dayCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([day, count]) => ({ day, count }));

    // Patient satisfaction over time (last 12 months)
    const satisfactionTrend = [];
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      
      const monthReviews = await Review.find({
        doctorId,
        createdAt: { $gte: monthStart, $lte: monthEnd }
      }).select('rating');

      const avgRating = monthReviews.length > 0
        ? (monthReviews.reduce((sum, r) => sum + r.rating, 0) / monthReviews.length).toFixed(2)
        : 0;

      satisfactionTrend.push({
        month: monthStart.toLocaleString('default', { month: 'short', year: 'numeric' }),
        rating: parseFloat(avgRating),
        count: monthReviews.length
      });
    }

    res.json({
      // Summary metrics
      summary: {
        totalAppointments: {
          thisMonth: monthAppointments,
          thisYear: yearAppointments,
          allTime: totalAppointments
        },
        appointmentSuccessRate: parseFloat(successRate),
        patientSatisfactionRating: parseFloat(avgRating),
        totalPatientsTreated: totalPatients,
        pendingMessagesCount,
        revenueGenerated: {
          thisMonth: monthRevenue,
          allTime: totalRevenue
        },
        appointmentCompletionRate: parseFloat(completionRate),
        cancellationRate: parseFloat(cancellationRate),
        mostCommonHealthConcerns: mostCommonConcerns,
        peakAppointmentHours: peakHours,
        peakAppointmentDays: peakDays
      },
      // Charts data
      charts: {
        appointmentsTrend: trendData,
        successRateBreakdown: {
          completed: completedCount,
          cancelled: cancelledCount,
          pending: pendingCount,
          confirmed: confirmedCount
        },
        patientSatisfactionOverTime: satisfactionTrend,
        monthlyRevenue: revenueTrend,
        appointmentStatusBreakdown: {
          completed: completedCount,
          cancelled: cancelledCount,
          pending: pendingCount,
          confirmed: confirmedCount
        }
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get doctor stats (simplified version for backward compatibility)
// @route   GET /api/doctor/stats
// @access  Private/Doctor
export const getStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const totalAppointments = await Appointment.countDocuments({ doctorId: req.user._id });
    const todayAppointments = await Appointment.countDocuments({
      doctorId: req.user._id,
      appointmentDate: { $gte: today, $lt: tomorrow },
      status: { $in: [APPOINTMENT_STATUSES.PENDING, APPOINTMENT_STATUSES.CONFIRMED] }
    });
    const totalPatients = await Appointment.distinct('patientId', { doctorId: req.user._id }).then(ids => ids.length);
    const completedAppointments = await Appointment.countDocuments({
      doctorId: req.user._id,
      status: APPOINTMENT_STATUSES.COMPLETED
    });

    const reviews = await Review.find({ doctorId: req.user._id });
    const avgRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

    res.json({
      totalAppointments,
      todayAppointments,
      totalPatients,
      completedAppointments,
      avgRating,
      totalReviews: reviews.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============================================
// APPOINTMENT MANAGEMENT
// ============================================

// @desc    Get doctor appointments with advanced filtering
// @route   GET /api/doctor/appointments
// @access  Private/Doctor
export const getAppointments = async (req, res) => {
  try {
    const { status, date, startDate, endDate, view, patientId } = req.query;
    let query = { doctorId: req.user._id };

    // Status filter
    if (status) {
      query.status = status;
    }

    // Date filtering
    if (date) {
      // Single date
      const startDateObj = new Date(date);
      startDateObj.setHours(0, 0, 0, 0);
      const endDateObj = new Date(date);
      endDateObj.setHours(23, 59, 59, 999);
      query.appointmentDate = { $gte: startDateObj, $lte: endDateObj };
    } else if (startDate && endDate) {
      // Date range
      const startDateObj = new Date(startDate);
      startDateObj.setHours(0, 0, 0, 0);
      const endDateObj = new Date(endDate);
      endDateObj.setHours(23, 59, 59, 999);
      query.appointmentDate = { $gte: startDateObj, $lte: endDateObj };
    } else if (view === 'daily') {
      // Today's appointments
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      query.appointmentDate = { $gte: today, $lt: tomorrow };
    } else if (view === 'weekly') {
      // This week's appointments
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 7);
      query.appointmentDate = { $gte: startOfWeek, $lt: endOfWeek };
    } else if (view === 'monthly') {
      // This month's appointments
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
      query.appointmentDate = { $gte: startOfMonth, $lte: endOfMonth };
    }

    // Patient filter
    if (patientId) {
      query.patientId = patientId;
    }

    const appointments = await Appointment.find(query)
      .populate('patientId', 'firstName lastName phone email profileImage dateOfBirth gender address')
      .sort({ appointmentDate: 1 });

    // Get all unique patient user IDs
    const patientUserIds = [...new Set(appointments.map(apt => apt.patientId._id.toString()))];

    // Fetch all patient profiles in a single query
    const patientProfiles = await Patient.find({ userId: { $in: patientUserIds } });
    
    // Create a map of userId -> patientProfile for quick lookup
    const patientProfileMap = new Map();
    patientProfiles.forEach(profile => {
      patientProfileMap.set(profile.userId.toString(), profile);
    });

    // Attach patient profiles to appointments
    const appointmentsWithPatientProfile = appointments.map(appointment => {
      const appointmentObj = appointment.toObject();
      const patientUserId = appointment.patientId._id.toString();
      appointmentObj.patientProfile = patientProfileMap.get(patientUserId) || null;
      return appointmentObj;
    });

    res.json(appointmentsWithPatientProfile);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single appointment with patient profile
// @route   GET /api/doctor/appointments/:id
// @access  Private/Doctor
export const getAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findOne({
      _id: req.params.id,
      doctorId: req.user._id
    })
      .populate('patientId', 'firstName lastName phone email profileImage dateOfBirth gender')
      .populate({
        path: 'patientId',
        populate: {
          path: 'userId',
          model: 'User'
        }
      });

    if (!appointment) {
      return res.status(404).json({ message: APPOINTMENT_MESSAGES.APPOINTMENT_NOT_FOUND });
    }

    // Get patient profile if exists
    const patient = await Patient.findOne({ userId: appointment.patientId._id });

    res.json({
      appointment,
      patientProfile: patient
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Accept appointment
// @route   PUT /api/doctor/appointments/:id/accept
// @access  Private/Doctor
export const acceptAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findOne({
      _id: req.params.id,
      doctorId: req.user._id
    });

    if (!appointment) {
      return res.status(404).json({ message: APPOINTMENT_MESSAGES.APPOINTMENT_NOT_FOUND });
    }

    if (appointment.status !== APPOINTMENT_STATUSES.PENDING) {
      return res.status(400).json({ message: DOCTOR_MESSAGES.ONLY_PENDING_APPOINTMENTS_CAN_BE_ACCEPTED });
    }

    appointment.status = APPOINTMENT_STATUSES.CONFIRMED;
    await appointment.save();

    const updatedAppointment = await Appointment.findById(appointment._id)
      .populate('patientId', 'firstName lastName email phone');

    res.json({ 
      message: DOCTOR_MESSAGES.APPOINTMENT_ACCEPTED_SUCCESSFULLY, 
      appointment: updatedAppointment 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Decline appointment
// @route   PUT /api/doctor/appointments/:id/decline
// @access  Private/Doctor
export const declineAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findOne({
      _id: req.params.id,
      doctorId: req.user._id
    });

    if (!appointment) {
      return res.status(404).json({ message: APPOINTMENT_MESSAGES.APPOINTMENT_NOT_FOUND });
    }

    if (appointment.status !== APPOINTMENT_STATUSES.PENDING) {
      return res.status(400).json({ message: DOCTOR_MESSAGES.ONLY_PENDING_APPOINTMENTS_CAN_BE_DECLINED });
    }

    appointment.status = APPOINTMENT_STATUSES.CANCELLED;
    await appointment.save();

    const updatedAppointment = await Appointment.findById(appointment._id)
      .populate('patientId', 'firstName lastName email phone');

    res.json({ 
      message: DOCTOR_MESSAGES.APPOINTMENT_DECLINED_SUCCESSFULLY, 
      appointment: updatedAppointment 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update appointment (with consultation notes)
// @route   PUT /api/doctor/appointments/:id
// @access  Private/Doctor
export const updateAppointment = async (req, res) => {
  try {
    const { status, diagnosis, prescription, consultationNotes } = req.body;

    const appointment = await Appointment.findOne({
      _id: req.params.id,
      doctorId: req.user._id
    });

    if (!appointment) {
      return res.status(404).json({ message: APPOINTMENT_MESSAGES.APPOINTMENT_NOT_FOUND });
    }

    if (status) appointment.status = status;
    if (diagnosis) appointment.diagnosis = diagnosis;
    if (prescription) appointment.prescription = prescription;
    
    // Add consultation notes as a field (we'll store it in diagnosis or create a notes field)
    // For now, we'll store it in diagnosis if not provided, or append to it
    if (consultationNotes) {
      appointment.diagnosis = appointment.diagnosis 
        ? `${appointment.diagnosis}\n\nConsultation Notes: ${consultationNotes}`
        : `Consultation Notes: ${consultationNotes}`;
    }

    await appointment.save();

    const updatedAppointment = await Appointment.findById(appointment._id)
      .populate('patientId', 'firstName lastName email phone profileImage');

    res.json({ 
      message: APPOINTMENT_MESSAGES.APPOINTMENT_UPDATED_SUCCESSFULLY, 
      appointment: updatedAppointment 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark appointment as completed
// @route   PUT /api/doctor/appointments/:id/complete
// @access  Private/Doctor
export const completeAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findOne({
      _id: req.params.id,
      doctorId: req.user._id
    });

    if (!appointment) {
      return res.status(404).json({ message: APPOINTMENT_MESSAGES.APPOINTMENT_NOT_FOUND });
    }

    if (appointment.status === APPOINTMENT_STATUSES.COMPLETED) {
      return res.status(400).json({ message: DOCTOR_MESSAGES.APPOINTMENT_ALREADY_COMPLETED });
    }

    if (appointment.status === APPOINTMENT_STATUSES.CANCELLED) {
      return res.status(400).json({ message: DOCTOR_MESSAGES.CANNOT_COMPLETE_CANCELLED_APPOINTMENT });
    }

    appointment.status = APPOINTMENT_STATUSES.COMPLETED;
    await appointment.save();

    const updatedAppointment = await Appointment.findById(appointment._id)
      .populate('patientId', 'firstName lastName email phone');

    res.json({ 
      message: DOCTOR_MESSAGES.APPOINTMENT_MARKED_AS_COMPLETED, 
      appointment: updatedAppointment 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Reschedule appointment
// @route   PUT /api/doctor/appointments/:id/reschedule
// @access  Private/Doctor
export const rescheduleAppointment = async (req, res) => {
  try {
    const { appointmentDate, timeSlot } = req.body;

    const appointment = await Appointment.findOne({
      _id: req.params.id,
      doctorId: req.user._id
    });

    if (!appointment) {
      return res.status(404).json({ message: APPOINTMENT_MESSAGES.APPOINTMENT_NOT_FOUND });
    }

    if (appointment.status === APPOINTMENT_STATUSES.COMPLETED || 
        appointment.status === APPOINTMENT_STATUSES.CANCELLED) {
      return res.status(400).json({ message: APPOINTMENT_MESSAGES.CANNOT_RESCHEDULE_COMPLETED_OR_CANCELLED });
    }

    // Check if new slot is available
    if (appointmentDate && timeSlot) {
      const selectedDate = new Date(appointmentDate);
      const existingAppointment = await Appointment.findOne({
        doctorId: req.user._id,
        _id: { $ne: appointment._id },
        appointmentDate: {
          $gte: new Date(selectedDate.setHours(0, 0, 0, 0)),
          $lte: new Date(selectedDate.setHours(23, 59, 59, 999))
        },
        'timeSlot.start': timeSlot.start,
        status: { $in: [APPOINTMENT_STATUSES.PENDING, APPOINTMENT_STATUSES.CONFIRMED] }
      });

      if (existingAppointment) {
        return res.status(400).json({ message: APPOINTMENT_MESSAGES.TIME_SLOT_ALREADY_BOOKED });
      }

      appointment.appointmentDate = new Date(appointmentDate);
      appointment.timeSlot = timeSlot;
    }

    await appointment.save();

    const updatedAppointment = await Appointment.findById(appointment._id)
      .populate('patientId', 'firstName lastName email phone');

    res.json({ 
      message: APPOINTMENT_MESSAGES.APPOINTMENT_RESCHEDULED_SUCCESSFULLY, 
      appointment: updatedAppointment 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============================================
// PATIENT MANAGEMENT
// ============================================

// @desc    Get patients
// @route   GET /api/doctor/patients
// @access  Private/Doctor
export const getPatients = async (req, res) => {
  try {
    const patientIds = await Appointment.distinct('patientId', { doctorId: req.user._id });
    
    const patients = await User.find({ _id: { $in: patientIds } })
      .select('firstName lastName phone email profileImage dateOfBirth gender')
      .sort({ firstName: 1, lastName: 1 });

    res.json(patients);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get patient history
// @route   GET /api/doctor/patients/:patientId/history
// @access  Private/Doctor
export const getPatientHistory = async (req, res) => {
  try {
    const appointments = await Appointment.find({
      patientId: req.params.patientId,
      doctorId: req.user._id
    })
      .sort({ appointmentDate: -1 });

    const patient = await Patient.findOne({ userId: req.params.patientId });
    const user = await User.findById(req.params.patientId)
      .select('firstName lastName phone email profileImage dateOfBirth gender address');

    res.json({
      patient: {
        ...user?.toObject(),
        ...patient?.toObject()
      },
      appointments
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
