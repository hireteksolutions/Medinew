import Doctor from '../models/Doctor.js';
import User from '../models/User.js';
import Appointment from '../models/Appointment.js';
import Patient from '../models/Patient.js';
import MedicalRecord from '../models/MedicalRecord.js';
import Review from '../models/Review.js';
import Message from '../models/Message.js';
import Payment from '../models/Payment.js';
import AvailabilitySchedule from '../models/AvailabilitySchedule.js';
import { APPOINTMENT_STATUSES, MESSAGE_STATUSES, DAY_OF_WEEK_VALUES, PAYMENT_STATUSES, HTTP_STATUS, USER_ROLES } from '../constants/index.js';
import { DOCTOR_MESSAGES, APPOINTMENT_MESSAGES, AUTH_MESSAGES } from '../constants/messages.js';
import { getPaginationParams, buildPaginationMeta, applyPagination } from '../utils/pagination.js';
import { createAuditLog } from '../utils/auditLogger.js';
import { createAppointmentNotification, createBulkNotifications } from '../utils/notificationService.js';

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
    
    const doctorObj = doctor.toObject ? doctor.toObject() : doctor;
    res.json({
      ...doctorObj,
      currentHospitalName: doctorObj.currentHospitalName || null,
      education: doctorObj.education || []
    });
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
      currentHospitalName,
      experience,
      consultationFee,
      languages,
      biography,
      consultationDuration,
      certifications,
      consultationType // Add this
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
    if (currentHospitalName !== undefined) doctor.currentHospitalName = currentHospitalName;
    if (experience !== undefined) doctor.experience = experience;
    if (consultationFee !== undefined) doctor.consultationFee = consultationFee;
    if (languages) doctor.languages = languages;
    if (biography !== undefined) doctor.biography = biography;
    if (consultationDuration) doctor.consultationDuration = consultationDuration;
    if (certifications) doctor.certifications = certifications;
    
    // Handle consultationType
    if (consultationType !== undefined) {
      // Ensure it's an array and has valid values
      const validTypes = ['online', 'offline', 'both'];
      let filteredTypes;
      
      if (Array.isArray(consultationType)) {
        filteredTypes = consultationType.filter(t => validTypes.includes(t));
      } else {
        filteredTypes = [consultationType].filter(t => validTypes.includes(t));
      }
      
      // If no valid types, default to 'both'
      if (filteredTypes.length === 0) {
        filteredTypes = ['both'];
      }
      
      // If both 'online' and 'offline' are selected, set to 'both'
      if (filteredTypes.includes('online') && filteredTypes.includes('offline')) {
        filteredTypes = ['both'];
      }
      
      doctor.consultationType = filteredTypes;
    }

    await doctor.save();
    
    const updatedDoctor = await Doctor.findOne({ userId: req.user._id })
      .populate('userId', 'firstName lastName email phone profileImage address');
    
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

    const doctor = await Doctor.findOne({ userId }).select('availability blockedDates blockedTimeSlots consultationDuration');
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
        blockedTimeSlots: doctor.blockedTimeSlots || [],
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

    // Prepare date objects
    const dateObjects = dates.map(date => new Date(date));

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
    }).populate('patientId', 'firstName lastName');

    // Add dates to blockedDates (avoid duplicates)
    const existingBlocked = doctor.blockedDates.map(d => d.toISOString().split('T')[0]);
    const newDates = dateObjects.filter(d => 
      !existingBlocked.includes(d.toISOString().split('T')[0])
    );
    
    doctor.blockedDates = [...doctor.blockedDates, ...newDates];
    await doctor.save();

    // If there are existing appointments, notify admin
    if (existingAppointments.length > 0) {
      // Get all admin users
      const admins = await User.find({ role: USER_ROLES.ADMIN, isActive: true });
      
      // Create notifications for all admins
      const notifications = admins.map(admin => ({
        userId: admin._id,
        type: 'doctor_unavailable',
        title: 'Doctor Unavailability - Action Required',
        message: `Dr. ${req.user.firstName} ${req.user.lastName} has marked ${existingAppointments.length} appointment(s) as unavailable. Please reschedule these appointments.`,
        priority: 'urgent',
        relatedEntityType: 'appointment',
        actionUrl: `/admin/appointments?doctorId=${req.user._id}&status=pending`,
        metadata: {
          doctorId: req.user._id,
          doctorName: `${req.user.firstName} ${req.user.lastName}`,
          appointmentIds: existingAppointments.map(apt => apt._id.toString()),
          blockedDates: dates,
          reason: reason || 'No reason provided',
          appointmentCount: existingAppointments.length
        }
      }));

      await createBulkNotifications(notifications);

      // Update appointments to track unavailability
      for (const appointment of existingAppointments) {
        if (!appointment.reschedulingInfo) {
          appointment.reschedulingInfo = {};
        }
        appointment.reschedulingInfo.doctorUnavailabilityReason = reason || 'Doctor marked time as unavailable';
        appointment.reschedulingInfo.originalDate = appointment.appointmentDate;
        appointment.reschedulingInfo.originalTimeSlot = appointment.timeSlot;
        await appointment.save();
      }

      // Log the action
      await createAuditLog({
        user: req.user,
        action: 'mark_unavailable',
        entityType: 'appointment',
        method: 'POST',
        endpoint: req.originalUrl,
        status: 'success',
        statusCode: HTTP_STATUS.OK,
        metadata: {
          blockedDates: dates,
          affectedAppointments: existingAppointments.length,
          reason: reason
        },
        req
      });

      return res.json({
        success: true,
        message: `${newDates.length} date(s) blocked. ${existingAppointments.length} appointment(s) require rescheduling. Admin has been notified.`,
        data: {
          blockedDates: doctor.blockedDates,
          newlyBlocked: newDates.map(d => d.toISOString().split('T')[0]),
          appointmentsRequiringRescheduling: existingAppointments.map(apt => ({
            id: apt._id,
            appointmentNumber: apt.appointmentNumber,
            patientName: `${apt.patientId.firstName} ${apt.patientId.lastName}`,
            date: apt.appointmentDate,
            timeSlot: apt.timeSlot
          }))
        }
      });
    }

    // No appointments affected, just confirm blocking
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

// @desc    Mark specific time slot as unavailable and notify admin
// @route   POST /api/doctor/schedule/mark-unavailable
// @access  Private/Doctor
export const markTimeSlotUnavailable = async (req, res) => {
  try {
    const { appointmentDate, timeSlot, reason } = req.body;

    if (!appointmentDate || !timeSlot || !timeSlot.start || !timeSlot.end) {
      return res.status(400).json({ 
        success: false,
        message: 'Appointment date and time slot are required' 
      });
    }

    const doctor = await Doctor.findOne({ userId: req.user._id });
    if (!doctor) {
      return res.status(404).json({ message: DOCTOR_MESSAGES.DOCTOR_PROFILE_NOT_FOUND });
    }

    // Validate date format
    const selectedDate = new Date(appointmentDate);
    if (isNaN(selectedDate.getTime())) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid date format' 
      });
    }

    // Normalize date to start of day for comparison
    const normalizedDate = new Date(selectedDate);
    normalizedDate.setHours(0, 0, 0, 0);
    const dateStr = normalizedDate.toISOString().split('T')[0];

    // Validate time format (HH:MM)
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(timeSlot.start) || !timeRegex.test(timeSlot.end)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid time format. Use HH:MM format (e.g., 09:00, 14:30)' 
      });
    }

    // Check if the slot time has passed for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    if (dateStr === todayStr) {
      // It's today - check if the slot time has passed
      const currentTime = new Date();
      const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
      
      const [slotHours, slotMins] = timeSlot.start.split(':').map(Number);
      const slotMinutes = slotHours * 60 + slotMins;
      
      if (slotMinutes <= currentMinutes) {
        return res.status(400).json({ 
          success: false,
          message: 'Cannot block past time slots. Please select a future time slot.' 
        });
      }
    } else if (normalizedDate < today) {
      // It's a past date
      return res.status(400).json({ 
        success: false,
        message: 'Cannot block slots for past dates. Please select a current or future date.' 
      });
    }

    // Check if this exact time slot is already blocked
    const existingBlocked = (doctor.blockedTimeSlots || []).find(blocked => {
      const blockedDateStr = new Date(blocked.date).toISOString().split('T')[0];
      return blockedDateStr === dateStr && 
             blocked.timeSlot.start === timeSlot.start && 
             blocked.timeSlot.end === timeSlot.end;
    });

    if (existingBlocked) {
      return res.status(400).json({ 
        success: false,
        message: 'This time slot is already marked as unavailable' 
      });
    }

    // Add blocked time slot to doctor's blockedTimeSlots array
    if (!doctor.blockedTimeSlots) {
      doctor.blockedTimeSlots = [];
    }
    doctor.blockedTimeSlots.push({
      date: normalizedDate,
      timeSlot: {
        start: timeSlot.start,
        end: timeSlot.end
      },
      reason: reason || 'Doctor marked time slot as unavailable',
      blockedAt: new Date()
    });
    await doctor.save();

    // Find appointments at this specific time slot
    const appointmentDateStart = new Date(normalizedDate);
    appointmentDateStart.setHours(0, 0, 0, 0);
    const appointmentDateEnd = new Date(normalizedDate);
    appointmentDateEnd.setHours(23, 59, 59, 999);

    const existingAppointments = await Appointment.find({
      doctorId: req.user._id,
      appointmentDate: {
        $gte: appointmentDateStart,
        $lte: appointmentDateEnd
      },
      'timeSlot.start': timeSlot.start,
      'timeSlot.end': timeSlot.end,
      status: { $in: [APPOINTMENT_STATUSES.PENDING, APPOINTMENT_STATUSES.CONFIRMED] }
    }).populate('patientId', 'firstName lastName email phone');

    // Get all admin users
    const admins = await User.find({ role: USER_ROLES.ADMIN, isActive: true });
    
    if (existingAppointments.length > 0) {
      // Create notifications for all admins
      const notifications = admins.map(admin => ({
        userId: admin._id,
        type: 'doctor_unavailable',
        title: 'Doctor Time Slot Unavailable - Action Required',
        message: `Dr. ${req.user.firstName} ${req.user.lastName} has marked a time slot (${timeSlot.start} - ${timeSlot.end}) on ${selectedDate.toLocaleDateString()} as unavailable. ${existingAppointments.length} appointment(s) require rescheduling. ${reason ? `Reason: ${reason}` : ''}`,
        priority: 'urgent',
        relatedEntityType: 'appointment',
        actionUrl: `/admin/appointments?doctorId=${req.user._id}&status=pending`,
        metadata: {
          doctorId: req.user._id,
          doctorName: `${req.user.firstName} ${req.user.lastName}`,
          appointmentIds: existingAppointments.map(apt => apt._id.toString()),
          appointmentDate: normalizedDate,
          timeSlot: timeSlot,
          reason: reason || 'Doctor marked time slot as unavailable',
          appointmentCount: existingAppointments.length
        }
      }));

      await createBulkNotifications(notifications);

      // Update appointments to track unavailability and mark for rescheduling
      for (const appointment of existingAppointments) {
        if (!appointment.reschedulingInfo) {
          appointment.reschedulingInfo = {};
        }
        appointment.reschedulingInfo.doctorUnavailabilityReason = reason || 'Doctor marked time slot as unavailable';
        appointment.reschedulingInfo.originalDate = appointment.appointmentDate;
        appointment.reschedulingInfo.originalTimeSlot = appointment.timeSlot;
        appointment.reschedulingInfo.requestedAt = new Date();
        appointment.reschedulingInfo.requestedBy = req.user._id;
        
        // Mark appointment status as requiring rescheduling (if not already completed/cancelled)
        if (appointment.status === APPOINTMENT_STATUSES.PENDING || 
            appointment.status === APPOINTMENT_STATUSES.CONFIRMED) {
          appointment.status = APPOINTMENT_STATUSES.RESCHEDULE_REQUESTED;
        }
        
        await appointment.save();
      }

      // Log the action
      await createAuditLog({
        user: req.user,
        action: 'mark_time_slot_unavailable',
        entityType: 'appointment',
        method: 'POST',
        endpoint: req.originalUrl,
        status: 'success',
        statusCode: HTTP_STATUS.OK,
        metadata: {
          appointmentDate: normalizedDate,
          timeSlot: timeSlot,
          affectedAppointments: existingAppointments.length,
          reason: reason
        },
        req
      });

      return res.json({
        success: true,
        message: `Time slot marked as unavailable. ${existingAppointments.length} appointment(s) require rescheduling. Admin has been notified.`,
        data: {
          appointmentDate: normalizedDate,
          timeSlot: timeSlot,
          appointmentsRequiringRescheduling: existingAppointments.map(apt => ({
            id: apt._id,
            appointmentNumber: apt.appointmentNumber,
            patientName: `${apt.patientId.firstName} ${apt.patientId.lastName}`,
            date: apt.appointmentDate,
            timeSlot: apt.timeSlot
          }))
        }
      });
    } else {
      // No appointments affected, but still log the action
      await createAuditLog({
        user: req.user,
        action: 'mark_time_slot_unavailable',
        entityType: 'doctor',
        entityId: doctor._id,
        method: 'POST',
        endpoint: req.originalUrl,
        status: 'success',
        statusCode: HTTP_STATUS.OK,
        metadata: {
          appointmentDate: normalizedDate,
          timeSlot: timeSlot,
          affectedAppointments: 0,
          reason: reason
        },
        req
      });

      return res.json({
        success: true,
        message: 'Time slot marked as unavailable. No appointments affected.',
        data: {
          appointmentDate: normalizedDate,
          timeSlot: timeSlot
        }
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Unblock a specific time slot
// @route   DELETE /api/doctor/schedule/mark-unavailable
// @access  Private/Doctor
export const unblockTimeSlot = async (req, res) => {
  try {
    const { appointmentDate, timeSlot } = req.body;

    // Validate required fields
    if (!appointmentDate) {
      return res.status(400).json({ 
        success: false,
        message: 'Appointment date is required' 
      });
    }

    if (!timeSlot || !timeSlot.start || !timeSlot.end) {
      return res.status(400).json({ 
        success: false,
        message: 'Time slot with start and end time is required' 
      });
    }

    // Validate date format
    const selectedDate = new Date(appointmentDate);
    if (isNaN(selectedDate.getTime())) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid date format' 
      });
    }

    // Validate time format (HH:MM)
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(timeSlot.start) || !timeRegex.test(timeSlot.end)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid time format. Use HH:MM format (e.g., 09:00, 14:30)' 
      });
    }

    const doctor = await Doctor.findOne({ userId: req.user._id });
    if (!doctor) {
      return res.status(404).json({ 
        success: false,
        message: DOCTOR_MESSAGES.DOCTOR_PROFILE_NOT_FOUND 
      });
    }

    // Normalize date to start of day for comparison
    const normalizedDate = new Date(selectedDate);
    normalizedDate.setHours(0, 0, 0, 0);
    const dateStr = normalizedDate.toISOString().split('T')[0];

    // Check if doctor has any blocked time slots
    if (!doctor.blockedTimeSlots || doctor.blockedTimeSlots.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'No blocked time slots found. This slot may already be unblocked.' 
      });
    }

    // Find the specific blocked time slot
    const blockedSlotIndex = doctor.blockedTimeSlots.findIndex(blocked => {
      const blockedDateStr = new Date(blocked.date).toISOString().split('T')[0];
      return blockedDateStr === dateStr && 
             blocked.timeSlot &&
             blocked.timeSlot.start === timeSlot.start && 
             blocked.timeSlot.end === timeSlot.end;
    });

    if (blockedSlotIndex === -1) {
      return res.status(404).json({ 
        success: false,
        message: `Time slot (${timeSlot.start} - ${timeSlot.end}) on ${selectedDate.toLocaleDateString()} is not blocked or may have already been unblocked.` 
      });
    }

    const originalCount = doctor.blockedTimeSlots.length;

    // Remove the specific blocked time slot
    doctor.blockedTimeSlots.splice(blockedSlotIndex, 1);
    await doctor.save();

    // Log the action
    await createAuditLog({
      user: req.user,
      action: 'unblock_time_slot',
      entityType: 'doctor',
      entityId: doctor._id,
      method: 'DELETE',
      endpoint: req.originalUrl,
      status: 'success',
      statusCode: HTTP_STATUS.OK,
      metadata: {
        appointmentDate: normalizedDate,
        timeSlot: timeSlot,
        unblockedSlotId: doctor.blockedTimeSlots[blockedSlotIndex]?._id
      },
      req
    }).catch(err => {
      // Log error but don't fail the request
      console.error('Error creating audit log:', err);
    });

    return res.json({
      success: true,
      message: `Time slot (${timeSlot.start} - ${timeSlot.end}) on ${selectedDate.toLocaleDateString()} has been unblocked successfully`,
      data: {
        appointmentDate: normalizedDate,
        timeSlot: timeSlot,
        unblockedCount: 1,
        remainingBlockedSlots: doctor.blockedTimeSlots.length
      }
    });
  } catch (error) {
    console.error('Error unblocking time slot:', error);
    return res.status(500).json({ 
      success: false,
      message: error.message || 'An error occurred while unblocking the time slot' 
    });
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

    // Revenue generated from Payment model
    // Get all appointments for this doctor
    const doctorAppointments = await Appointment.find({ doctorId }).select('_id');
    const appointmentIds = doctorAppointments.map(apt => apt._id);
    
    // Get all payments that should be counted: completed, offline (Pay at Clinic), or online (not failed/cancelled/refunded)
    const allPayments = await Payment.find({
      appointmentId: { $in: appointmentIds },
      $or: [
        { status: PAYMENT_STATUSES.COMPLETED },
        { paymentGateway: 'offline' }, // Pay at Clinic - expected payment
        { 
          paymentGateway: 'online',
          status: { $nin: ['failed', 'cancelled', 'refunded'] }
        }
      ]
    }).populate('appointmentId', 'updatedAt createdAt');

    const totalRevenue = allPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);

    const monthRevenue = allPayments
      .filter(payment => {
        if (!payment.appointmentId || !payment.appointmentId.updatedAt) return false;
        const aptDate = new Date(payment.appointmentId.updatedAt);
        return aptDate >= startOfMonth;
      })
      .reduce((sum, payment) => sum + (payment.amount || 0), 0);

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

    // Monthly revenue (last 12 months) from Payment model
    const revenueTrend = [];
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      
      // Get payments for appointments in this month
      const monthPayments = allPayments.filter(payment => {
        if (!payment.appointmentId || !payment.appointmentId.updatedAt) return false;
        const aptDate = new Date(payment.appointmentId.updatedAt);
        return aptDate >= monthStart && aptDate <= monthEnd;
      });

      const revenue = monthPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
      
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
    
    // Get pagination parameters
    const { limit, offset } = getPaginationParams(req);
    
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

    // Get total count before pagination
    const total = await Appointment.countDocuments(query);

    // Use lean() to bypass Mongoose validation for reading (handles invalid enum values in DB)
    // Apply pagination
    const appointments = await Appointment.find(query)
      .populate('patientId', 'firstName lastName phone email profileImage dateOfBirth gender address')
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean();

    // Get all unique patient user IDs (filter out null patientId)
    const patientUserIds = [...new Set(
      appointments
        .filter(apt => apt.patientId && apt.patientId._id)
        .map(apt => apt.patientId._id.toString())
    )];

    // Fetch all patient profiles in a single query
    const patientProfiles = patientUserIds.length > 0 
      ? await Patient.find({ userId: { $in: patientUserIds } }).lean()
      : [];
    
    // Create a map of userId -> patientProfile for quick lookup
    const patientProfileMap = new Map();
    patientProfiles.forEach(profile => {
      if (profile.userId) {
        patientProfileMap.set(profile.userId.toString(), profile);
      }
    });

    // Get payment information for all appointments
    const appointmentIds = appointments.map(apt => apt._id);
    const payments = appointmentIds.length > 0
      ? await Payment.find({ appointmentId: { $in: appointmentIds } }).lean()
      : [];
    const paymentMap = new Map();
    payments.forEach(payment => {
      if (payment.appointmentId) {
        paymentMap.set(payment.appointmentId.toString(), payment);
      }
    });

    // Attach patient profiles and payment info to appointments
    // Also normalize invalid paymentStatus values
    const appointmentsWithPatientProfile = appointments.map(appointment => {
      const patientUserId = appointment.patientId && appointment.patientId._id 
        ? appointment.patientId._id.toString() 
        : null;
      appointment.patientProfile = patientUserId ? patientProfileMap.get(patientUserId) || null : null;
      appointment.payment = paymentMap.get(appointment._id.toString()) || null;
      
      // Normalize invalid paymentStatus values
      if (appointment.paymentStatus === 'paid') {
        appointment.paymentStatus = PAYMENT_STATUSES.COMPLETED;
        // Optionally update in database (async, don't wait)
        Appointment.findByIdAndUpdate(appointment._id, { 
          paymentStatus: PAYMENT_STATUSES.COMPLETED 
        }).catch(err => console.error('Error updating paymentStatus:', err));
      }
      
      return appointment;
    });

    // Build pagination metadata
    const pagination = buildPaginationMeta(total, limit, offset);

    res.json({
      appointments: appointmentsWithPatientProfile,
      pagination
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single appointment with patient profile
// @route   GET /api/doctor/appointments/:id
// @access  Private/Doctor
export const getAppointment = async (req, res) => {
  try {
    // Use lean() to bypass Mongoose validation for reading
    // This prevents validation errors if database has invalid enum values
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
      })
      .lean();

    if (!appointment) {
      return res.status(404).json({ message: APPOINTMENT_MESSAGES.APPOINTMENT_NOT_FOUND });
    }

    // Normalize invalid paymentStatus values
    if (appointment.paymentStatus === 'paid') {
      appointment.paymentStatus = PAYMENT_STATUSES.COMPLETED;
      // Optionally update in database (async, don't wait)
      Appointment.findByIdAndUpdate(appointment._id, { 
        paymentStatus: PAYMENT_STATUSES.COMPLETED 
      }).catch(err => console.error('Error updating paymentStatus:', err));
    }

    // Get payment information
    const payment = await Payment.findOne({ appointmentId: appointment._id }).lean();
    
    // Get patient profile if exists
    const patient = await Patient.findOne({ userId: appointment.patientId._id }).lean();

    if (payment) {
      appointment.payment = payment;
    } else {
      appointment.payment = null;
    }

    res.json({
      appointment: appointment,
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

// @desc    Request reschedule for an appointment (doctor unavailable)
// @route   PUT /api/doctor/appointments/:id/request-reschedule
// @access  Private/Doctor
export const requestRescheduleAppointment = async (req, res) => {
  try {
    const { reason } = req.body;

    const appointment = await Appointment.findOne({
      _id: req.params.id,
      doctorId: req.user._id
    }).populate('patientId', 'firstName lastName email phone');

    if (!appointment) {
      return res.status(404).json({ message: APPOINTMENT_MESSAGES.APPOINTMENT_NOT_FOUND });
    }

    // Only allow reschedule request for pending or confirmed appointments
    if (appointment.status === APPOINTMENT_STATUSES.COMPLETED || 
        appointment.status === APPOINTMENT_STATUSES.CANCELLED ||
        appointment.status === APPOINTMENT_STATUSES.RESCHEDULE_REQUESTED) {
      return res.status(400).json({ 
        message: DOCTOR_MESSAGES.CANNOT_REQUEST_RESCHEDULE_COMPLETED_OR_CANCELLED 
      });
    }

    // Store original appointment info if not already stored
    if (!appointment.reschedulingInfo) {
      appointment.reschedulingInfo = {};
    }
    appointment.reschedulingInfo.originalDate = appointment.appointmentDate;
    appointment.reschedulingInfo.originalTimeSlot = appointment.timeSlot;
    appointment.reschedulingInfo.doctorUnavailabilityReason = reason || 'Doctor unavailable due to personal work';
    appointment.reschedulingInfo.requestedAt = new Date();
    appointment.reschedulingInfo.requestedBy = req.user._id;

    // Update status to indicate reschedule requested
    appointment.status = APPOINTMENT_STATUSES.RESCHEDULE_REQUESTED;
    await appointment.save();

    // Get all admin users
    const admins = await User.find({ role: USER_ROLES.ADMIN, isActive: true });
    
    // Create notifications for all admins
    const notifications = admins.map(admin => ({
      userId: admin._id,
      type: 'doctor_unavailable',
      title: 'Appointment Reschedule Request - Action Required',
      message: `Dr. ${req.user.firstName} ${req.user.lastName} has requested to reschedule appointment ${appointment.appointmentNumber} with patient ${appointment.patientId.firstName} ${appointment.patientId.lastName}. Reason: ${reason || 'Doctor unavailable due to personal work'}`,
      priority: 'urgent',
      relatedEntityType: 'appointment',
      relatedEntityId: appointment._id,
      actionUrl: `/admin/appointments/${appointment._id}`,
      metadata: {
        doctorId: req.user._id,
        doctorName: `${req.user.firstName} ${req.user.lastName}`,
        appointmentId: appointment._id.toString(),
        appointmentNumber: appointment.appointmentNumber,
        patientName: `${appointment.patientId.firstName} ${appointment.patientId.lastName}`,
        appointmentDate: appointment.appointmentDate,
        timeSlot: appointment.timeSlot,
        reason: reason || 'Doctor unavailable due to personal work'
      }
    }));

    await createBulkNotifications(notifications);

    // Log the action
    await createAuditLog({
      user: req.user,
      action: 'request_appointment_reschedule',
      entityType: 'appointment',
      entityId: appointment._id,
      method: 'PUT',
      endpoint: req.originalUrl,
      status: 'success',
      statusCode: HTTP_STATUS.OK,
      metadata: {
        appointmentId: appointment._id,
        appointmentNumber: appointment.appointmentNumber,
        patientId: appointment.patientId._id,
        reason: reason || 'Doctor unavailable due to personal work'
      },
      req
    });

    const updatedAppointment = await Appointment.findById(appointment._id)
      .populate('patientId', 'firstName lastName email phone');

    res.json({ 
      message: DOCTOR_MESSAGES.APPOINTMENT_RESCHEDULE_REQUESTED, 
      appointment: updatedAppointment,
      notificationSent: true,
      adminNotified: admins.length
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
    const {
      diagnosis,
      prescription,
      doctorNotes,
      testReports,
      followUpRequired,
      followUpDate,
      treatmentStatus,
      referredTo
    } = req.body;

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

    // Update appointment fields
    appointment.status = APPOINTMENT_STATUSES.COMPLETED;
    if (diagnosis !== undefined) appointment.diagnosis = diagnosis;
    if (prescription !== undefined) appointment.prescription = prescription;
    if (doctorNotes !== undefined) appointment.doctorNotes = doctorNotes;
    if (testReports !== undefined) appointment.testReports = testReports;
    if (followUpRequired !== undefined) appointment.followUpRequired = followUpRequired;
    if (followUpDate !== undefined) appointment.followUpDate = followUpDate ? new Date(followUpDate) : null;
    if (treatmentStatus !== undefined) appointment.treatmentStatus = treatmentStatus;
    
    // Handle referral
    if (referredTo) {
      appointment.referredTo = {
        doctorId: referredTo.doctorId,
        reason: referredTo.reason
      };
    }

    await appointment.save();

    const updatedAppointment = await Appointment.findById(appointment._id)
      .populate('patientId', 'firstName lastName email phone')
      .populate('referredTo.doctorId', 'firstName lastName specialization');

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
    // Get pagination parameters
    const { limit, offset } = getPaginationParams(req);

    const patientIds = await Appointment.distinct('patientId', { doctorId: req.user._id });
    
    // Get total count
    const total = patientIds.length;

    const patients = await User.find({ _id: { $in: patientIds } })
      .select('firstName lastName phone email profileImage dateOfBirth gender')
      .sort({ firstName: 1, lastName: 1 })
      .skip(offset)
      .limit(limit);

    // Build pagination metadata
    const pagination = buildPaginationMeta(total, limit, offset);

    res.json({
      patients,
      pagination
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get patient history (all consultations with this doctor)
// @route   GET /api/doctor/patients/:patientId/history
// @access  Private/Doctor
export const getPatientHistory = async (req, res) => {
  try {
    // Get pagination parameters
    const { limit, offset } = getPaginationParams(req);

    // Get total count before pagination
    const total = await Appointment.countDocuments({
      patientId: req.params.patientId,
      doctorId: req.user._id
    });

    const appointments = await Appointment.find({
      patientId: req.params.patientId,
      doctorId: req.user._id
    })
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

    // Get payment information for all appointments
    const payments = await Payment.find({ appointmentId: { $in: appointmentIds } }).lean();
    const paymentMap = new Map();
    payments.forEach(payment => {
      paymentMap.set(payment.appointmentId.toString(), payment);
    });

    // Attach payment data and test reports to appointments
    const appointmentsWithPayment = appointments.map(appointment => {
      const appointmentObj = { ...appointment };
      const payment = paymentMap.get(appointment._id.toString());
      const reports = reportsMap.get(appointment._id.toString()) || [];
      if (payment) {
        appointmentObj.payment = payment;
      }
      appointmentObj.testReports = reports;
      return appointmentObj;
    });

    const patient = await Patient.findOne({ userId: req.params.patientId }).lean();
    const user = await User.findById(req.params.patientId)
      .select('firstName lastName phone email profileImage dateOfBirth gender address')
      .lean();

    // Build pagination metadata
    const pagination = buildPaginationMeta(total, limit, offset);

    // Log history access
    await createAuditLog({
      user: req.user,
      action: 'view_patient_history',
      entityType: 'patient',
      entityId: req.params.patientId,
      method: 'GET',
      endpoint: req.originalUrl,
      status: 'success',
      statusCode: HTTP_STATUS.OK,
      metadata: { patientId: req.params.patientId, total: appointments.length },
      req
    });

    res.json({
      patient: {
        ...user,
        ...patient
      },
      appointments: appointmentsWithPayment,
      pagination
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get complete patient history (all doctors, read-only for new doctor)
// @route   GET /api/doctor/patients/:patientId/complete-history
// @access  Private/Doctor
export const getCompletePatientHistory = async (req, res) => {
  try {
    const { limit, offset } = getPaginationParams(req);

    // Get all appointments for this patient
    const total = await Appointment.countDocuments({
      patientId: req.params.patientId,
      status: APPOINTMENT_STATUSES.COMPLETED
    });

    const appointments = await Appointment.find({
      patientId: req.params.patientId,
      status: APPOINTMENT_STATUSES.COMPLETED
    })
      .populate('doctorId', 'firstName lastName specialization profileImage')
      .populate('previousAppointmentId')
      .populate('referredFrom.doctorId', 'firstName lastName specialization')
      .populate('referredTo.doctorId', 'firstName lastName specialization')
      .sort({ appointmentDate: -1 })
      .skip(offset)
      .limit(limit)
      .lean();

    // Get test reports
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

    // Attach test reports
    const appointmentsWithReports = appointments.map(appointment => {
      const reports = reportsMap.get(appointment._id.toString()) || [];
      return {
        ...appointment,
        testReports: reports,
        isReadOnly: appointment.doctorId._id.toString() !== req.user._id.toString()
      };
    });

    // Get patient profile
    const patient = await Patient.findOne({ userId: req.params.patientId }).lean();
    const user = await User.findById(req.params.patientId)
      .select('firstName lastName phone email profileImage dateOfBirth gender address')
      .lean();

    // Log history access
    await createAuditLog({
      user: req.user,
      action: 'view_complete_patient_history',
      entityType: 'patient',
      entityId: req.params.patientId,
      method: 'GET',
      endpoint: req.originalUrl,
      status: 'success',
      statusCode: HTTP_STATUS.OK,
      metadata: { patientId: req.params.patientId, total: appointments.length },
      req
    });

    const pagination = buildPaginationMeta(total, limit, offset);

    res.json({
      patient: {
        ...user,
        ...patient
      },
      consultations: appointmentsWithReports,
      pagination
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Refer patient to another doctor
// @route   POST /api/doctor/appointments/:id/refer
// @access  Private/Doctor
export const referPatient = async (req, res) => {
  try {
    const { doctorId, reason } = req.body;

    if (!doctorId || !reason) {
      return res.status(400).json({ message: 'Doctor ID and reason are required' });
    }

    const appointment = await Appointment.findOne({
      _id: req.params.id,
      doctorId: req.user._id
    });

    if (!appointment) {
      return res.status(404).json({ message: APPOINTMENT_MESSAGES.APPOINTMENT_NOT_FOUND });
    }

    // Verify referred doctor exists
    const referredDoctor = await Doctor.findOne({ userId: doctorId, isApproved: true });
    if (!referredDoctor) {
      return res.status(404).json({ message: 'Referred doctor not found or not approved' });
    }

    // Update appointment with referral
    appointment.referredTo = {
      doctorId: doctorId,
      reason: reason
    };

    await appointment.save();

    // Log referral
    await createAuditLog({
      user: req.user,
      action: 'refer_patient',
      entityType: 'appointment',
      entityId: appointment._id,
      method: 'POST',
      endpoint: req.originalUrl,
      status: 'success',
      statusCode: HTTP_STATUS.OK,
      metadata: { patientId: appointment.patientId, referredTo: doctorId, reason },
      req
    });

    const updatedAppointment = await Appointment.findById(appointment._id)
      .populate('referredTo.doctorId', 'firstName lastName specialization')
      .populate('patientId', 'firstName lastName');

    res.json({
      message: 'Patient referred successfully',
      appointment: updatedAppointment
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
