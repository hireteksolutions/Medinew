import AvailabilitySchedule from '../models/AvailabilitySchedule.js';
import Doctor from '../models/Doctor.js';
import User from '../models/User.js';
import { createAvailabilityScheduleNotification } from '../utils/notificationService.js';
import { DOCTOR_MESSAGES, AUTHZ_MESSAGES, AVAILABILITY_SCHEDULE_MESSAGES } from '../constants/messages.js';
import { USER_ROLES } from '../constants/index.js';

/**
 * @desc    Get availability schedules for a doctor
 * @route   GET /api/availability-schedules
 * @access  Private (Doctor)
 */
export const getAvailabilitySchedules = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const userId = req.user._id || req.user.id;

    // Find doctor profile
    const doctor = await Doctor.findOne({ userId });
    if (!doctor) {
      return res.status(404).json({ message: DOCTOR_MESSAGES.DOCTOR_PROFILE_NOT_FOUND });
    }

    const query = { doctorId: userId };

    // Filter by date range if provided
    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate);
      }
      if (endDate) {
        query.date.$lte = new Date(endDate);
      }
    }

    const schedules = await AvailabilitySchedule.find(query)
      .sort({ date: 1 })
      .populate('updatedBy', 'firstName lastName email');

    res.json({
      success: true,
      count: schedules.length,
      data: schedules
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Get a specific availability schedule
 * @route   GET /api/availability-schedules/:id
 * @access  Private (Doctor)
 */
export const getAvailabilitySchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id || req.user.id;

    const schedule = await AvailabilitySchedule.findById(id)
      .populate('updatedBy', 'firstName lastName email');

    if (!schedule) {
      return res.status(404).json({ message: 'Availability schedule not found' });
    }

    // Verify ownership
    if (schedule.doctorId.toString() !== userId.toString()) {
      return res.status(403).json({ message: AUTHZ_MESSAGES.NOT_AUTHORIZED });
    }

    res.json({
      success: true,
      data: schedule
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Create availability schedule
 * @route   POST /api/availability-schedules
 * @access  Private (Doctor)
 */
export const createAvailabilitySchedule = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { date, timeSlots, isAvailable, isBlocked, reason } = req.body;

    // Validate required fields
    if (!date || !timeSlots || timeSlots.length === 0) {
      return res.status(400).json({ message: 'Date and time slots are required' });
    }

    // Find doctor profile
    const doctor = await Doctor.findOne({ userId });
    if (!doctor) {
      return res.status(404).json({ message: DOCTOR_MESSAGES.DOCTOR_PROFILE_NOT_FOUND });
    }

    const scheduleDate = new Date(date);
    const dayOfWeek = scheduleDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

    // Check if schedule already exists for this date
    const existingSchedule = await AvailabilitySchedule.findOne({
      doctorId: userId,
      date: scheduleDate
    });

    if (existingSchedule) {
      return res.status(400).json({ message: AVAILABILITY_SCHEDULE_MESSAGES.SCHEDULE_ALREADY_EXISTS });
    }

    const schedule = await AvailabilitySchedule.create({
      doctorId: userId,
      date: scheduleDate,
      dayOfWeek,
      timeSlots,
      isAvailable: isAvailable !== undefined ? isAvailable : true,
      isBlocked: isBlocked || false,
      reason,
      updatedBy: userId
    });

    // Create notification
    try {
      await createAvailabilityScheduleNotification(userId, {
        title: 'Schedule Created',
        message: `Your availability schedule for ${scheduleDate.toLocaleDateString()} has been created`,
        scheduleId: schedule._id,
        metadata: { date: scheduleDate, timeSlotsCount: timeSlots.length }
      });
    } catch (notifError) {
      console.error('Error creating notification:', notifError);
      // Don't fail the request if notification fails
    }

    res.status(201).json({
      success: true,
      message: 'Availability schedule created successfully',
      data: schedule
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Update availability schedule
 * @route   PUT /api/availability-schedules/:id
 * @access  Private (Doctor)
 */
export const updateAvailabilitySchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id || req.user.id;
    const { timeSlots, isAvailable, isBlocked, reason } = req.body;

    const schedule = await AvailabilitySchedule.findById(id);

    if (!schedule) {
      return res.status(404).json({ message: 'Availability schedule not found' });
    }

    // Verify ownership
    if (schedule.doctorId.toString() !== userId.toString()) {
      return res.status(403).json({ message: AUTHZ_MESSAGES.NOT_AUTHORIZED });
    }

    // Update fields
    if (timeSlots !== undefined) schedule.timeSlots = timeSlots;
    if (isAvailable !== undefined) schedule.isAvailable = isAvailable;
    if (isBlocked !== undefined) schedule.isBlocked = isBlocked;
    if (reason !== undefined) schedule.reason = reason;
    schedule.updatedBy = userId;

    await schedule.save();

    // Create notification
    try {
      await createAvailabilityScheduleNotification(userId, {
        title: 'Schedule Updated',
        message: `Your availability schedule for ${schedule.date.toLocaleDateString()} has been updated`,
        scheduleId: schedule._id,
        metadata: { date: schedule.date, changes: Object.keys(req.body) }
      });
    } catch (notifError) {
      console.error('Error creating notification:', notifError);
    }

    res.json({
      success: true,
      message: 'Availability schedule updated successfully',
      data: schedule
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Delete availability schedule
 * @route   DELETE /api/availability-schedules/:id
 * @access  Private (Doctor)
 */
export const deleteAvailabilitySchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id || req.user.id;

    const schedule = await AvailabilitySchedule.findById(id);

    if (!schedule) {
      return res.status(404).json({ message: 'Availability schedule not found' });
    }

    // Verify ownership
    if (schedule.doctorId.toString() !== userId.toString()) {
      return res.status(403).json({ message: AUTHZ_MESSAGES.NOT_AUTHORIZED });
    }

    await AvailabilitySchedule.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Availability schedule deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Bulk create/update availability schedules
 * @route   POST /api/availability-schedules/bulk
 * @access  Private (Doctor)
 */
export const bulkUpdateAvailabilitySchedules = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { schedules } = req.body;

    if (!schedules || !Array.isArray(schedules) || schedules.length === 0) {
      return res.status(400).json({ message: AVAILABILITY_SCHEDULE_MESSAGES.SCHEDULES_ARRAY_REQUIRED });
    }

    // Find doctor profile
    const doctor = await Doctor.findOne({ userId });
    if (!doctor) {
      return res.status(404).json({ message: DOCTOR_MESSAGES.DOCTOR_PROFILE_NOT_FOUND });
    }

    const results = {
      created: [],
      updated: [],
      errors: []
    };

    for (const scheduleData of schedules) {
      try {
        const scheduleDate = new Date(scheduleData.date);
        const dayOfWeek = scheduleDate.toLocaleDateString('en-US', { weekday: 'lowercase' });

        const existingSchedule = await AvailabilitySchedule.findOne({
          doctorId: userId,
          date: scheduleDate
        });

        if (existingSchedule) {
          // Update existing
          existingSchedule.timeSlots = scheduleData.timeSlots;
          existingSchedule.isAvailable = scheduleData.isAvailable !== undefined ? scheduleData.isAvailable : true;
          existingSchedule.isBlocked = scheduleData.isBlocked || false;
          existingSchedule.reason = scheduleData.reason;
          existingSchedule.updatedBy = userId;
          await existingSchedule.save();
          results.updated.push(existingSchedule._id);
        } else {
          // Create new
          const newSchedule = await AvailabilitySchedule.create({
            doctorId: userId,
            date: scheduleDate,
            dayOfWeek,
            timeSlots: scheduleData.timeSlots,
            isAvailable: scheduleData.isAvailable !== undefined ? scheduleData.isAvailable : true,
            isBlocked: scheduleData.isBlocked || false,
            reason: scheduleData.reason,
            updatedBy: userId
          });
          results.created.push(newSchedule._id);
        }
      } catch (error) {
        results.errors.push({
          date: scheduleData.date,
          error: error.message
        });
      }
    }

    // Create notification for bulk update
    try {
      await createAvailabilityScheduleNotification(userId, {
        title: 'Bulk Schedule Update',
        message: `Updated ${results.updated.length + results.created.length} schedule entries`,
        metadata: { created: results.created.length, updated: results.updated.length }
      });
    } catch (notifError) {
      console.error('Error creating notification:', notifError);
    }

    res.json({
      success: true,
      message: 'Bulk update completed',
      data: results
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

