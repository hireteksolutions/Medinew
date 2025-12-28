import Appointment from '../models/Appointment.js';
import Doctor from '../models/Doctor.js';
import User from '../models/User.js';
import { USER_ROLES, APPOINTMENT_STATUSES, DEFAULT_APPOINTMENT_STATUS } from '../constants/index.js';
import { APPOINTMENT_MESSAGES, DOCTOR_MESSAGES, AUTHZ_MESSAGES } from '../constants/messages.js';

// @desc    Get available slots for a doctor
// @route   GET /api/appointments/available-slots/:doctorId
// @access  Public
export const getAvailableSlots = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ message: APPOINTMENT_MESSAGES.DATE_REQUIRED });
    }

    const doctor = await Doctor.findOne({ userId: doctorId, isApproved: true });
    if (!doctor) {
      return res.status(404).json({ message: DOCTOR_MESSAGES.DOCTOR_NOT_FOUND_OR_NOT_APPROVED });
    }

    const selectedDate = new Date(date);
    const dayName = selectedDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

    // Check if date is blocked
    const isBlocked = doctor.blockedDates.some(blockedDate =>
      blockedDate.toDateString() === selectedDate.toDateString()
    );

    if (isBlocked) {
      return res.json({ available: false, slots: [] });
    }

    // Get availability for the day
    const dayAvailability = doctor.availability.find(avail => avail.day === dayName);
    if (!dayAvailability || !dayAvailability.isAvailable) {
      return res.json({ available: false, slots: [] });
    }

    // Get existing appointments for the date
    const existingAppointments = await Appointment.find({
      doctorId: doctorId,
      appointmentDate: {
        $gte: new Date(selectedDate.setHours(0, 0, 0, 0)),
        $lt: new Date(selectedDate.setHours(23, 59, 59, 999))
      },
      status: { $in: [APPOINTMENT_STATUSES.PENDING, APPOINTMENT_STATUSES.CONFIRMED] }
    });

    const bookedSlots = existingAppointments.map(apt => apt.timeSlot.start);

    // Filter available slots
    let availableSlots = dayAvailability.timeSlots
      .filter(slot => slot.isAvailable && !bookedSlots.includes(slot.start))
      .map(slot => ({
        start: slot.start,
        end: slot.end
      }));

    // Filter out past time slots if the selected date is today
    const today = new Date();
    const isToday = selectedDate.toDateString() === today.toDateString();
    
    if (isToday) {
      const currentTime = today.getHours() * 60 + today.getMinutes(); // Current time in minutes
      availableSlots = availableSlots.filter(slot => {
        const [hours, minutes] = slot.start.split(':').map(Number);
        const slotTime = hours * 60 + minutes;
        return slotTime > currentTime; // Only show future slots
      });
    }

    res.json({
      available: availableSlots.length > 0,
      slots: availableSlots
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create appointment
// @route   POST /api/appointments
// @access  Private
export const createAppointment = async (req, res) => {
  try {
    const { doctorId, appointmentDate, timeSlot, reasonForVisit, symptoms, paymentGateway } = req.body;

    // Validate required fields
    if (!doctorId || !appointmentDate || !timeSlot) {
      return res.status(400).json({ message: APPOINTMENT_MESSAGES.DOCTOR_DATE_TIME_SLOT_REQUIRED });
    }

    // Check if doctor exists and is approved
    const doctor = await Doctor.findOne({ userId: doctorId, isApproved: true });
    if (!doctor) {
      return res.status(404).json({ message: DOCTOR_MESSAGES.DOCTOR_NOT_FOUND_OR_NOT_APPROVED });
    }

    // Check if slot is available
    const selectedDate = new Date(appointmentDate);
    const existingAppointment = await Appointment.findOne({
      doctorId,
      appointmentDate: {
        $gte: new Date(selectedDate.setHours(0, 0, 0, 0)),
        $lt: new Date(selectedDate.setHours(23, 59, 59, 999))
      },
      'timeSlot.start': timeSlot.start,
      status: { $in: [APPOINTMENT_STATUSES.PENDING, APPOINTMENT_STATUSES.CONFIRMED] }
    });

    if (existingAppointment) {
      return res.status(400).json({ message: APPOINTMENT_MESSAGES.TIME_SLOT_ALREADY_BOOKED });
    }

    // Create appointment
    const appointment = await Appointment.create({
      patientId: req.user._id,
      doctorId,
      appointmentDate: new Date(appointmentDate),
      timeSlot,
      reasonForVisit,
      symptoms,
      consultationFee: doctor.consultationFee,
      status: DEFAULT_APPOINTMENT_STATUS
    });

    // Create payment record if paymentGateway is provided
    if (paymentGateway) {
      const Payment = (await import('../models/Payment.js')).default;
      const { PAYMENT_GATEWAYS, PAYMENT_STATUSES, PAYMENT_TYPES } = await import('../constants/index.js');
      
      await Payment.create({
        appointmentId: appointment._id,
        patientId: req.user._id,
        doctorId,
        amount: doctor.consultationFee,
        currency: 'INR',
        paymentGateway: paymentGateway === 'online' ? PAYMENT_GATEWAYS.RAZORPAY : PAYMENT_GATEWAYS.OFFLINE,
        paymentMethod: paymentGateway === 'online' ? 'online' : 'cash',
        paymentType: PAYMENT_TYPES.APPOINTMENT,
        status: paymentGateway === 'offline' ? PAYMENT_STATUSES.PENDING : PAYMENT_STATUSES.PENDING
      });
    }

    const populatedAppointment = await Appointment.findById(appointment._id)
      .populate('doctorId', 'firstName lastName specialization profileImage')
      .populate('patientId', 'firstName lastName email phone');

    res.status(201).json({
      message: APPOINTMENT_MESSAGES.APPOINTMENT_BOOKED_SUCCESSFULLY,
      appointment: populatedAppointment
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get appointment
// @route   GET /api/appointments/:id
// @access  Private
export const getAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('doctorId', 'firstName lastName specialization profileImage')
      .populate('patientId', 'firstName lastName email phone profileImage');

    if (!appointment) {
      return res.status(404).json({ message: APPOINTMENT_MESSAGES.APPOINTMENT_NOT_FOUND });
    }

    // Check if user has access
    if (req.user.role === USER_ROLES.PATIENT && appointment.patientId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: AUTHZ_MESSAGES.NOT_AUTHORIZED });
    }

    if (req.user.role === USER_ROLES.DOCTOR && appointment.doctorId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: AUTHZ_MESSAGES.NOT_AUTHORIZED });
    }

    res.json(appointment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Cancel appointment
// @route   PUT /api/appointments/:id/cancel
// @access  Private
export const cancelAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ message: APPOINTMENT_MESSAGES.APPOINTMENT_NOT_FOUND });
    }

    // Check authorization
    if (req.user.role === USER_ROLES.PATIENT && appointment.patientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: AUTHZ_MESSAGES.NOT_AUTHORIZED });
    }

    if (req.user.role === USER_ROLES.DOCTOR && appointment.doctorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: AUTHZ_MESSAGES.NOT_AUTHORIZED });
    }

    if (appointment.status === APPOINTMENT_STATUSES.CANCELLED) {
      return res.status(400).json({ message: APPOINTMENT_MESSAGES.APPOINTMENT_ALREADY_CANCELLED });
    }

    if (appointment.status === APPOINTMENT_STATUSES.COMPLETED) {
      return res.status(400).json({ message: APPOINTMENT_MESSAGES.CANNOT_CANCEL_COMPLETED_APPOINTMENT });
    }

    appointment.status = APPOINTMENT_STATUSES.CANCELLED;
    await appointment.save();

    res.json({ message: APPOINTMENT_MESSAGES.APPOINTMENT_CANCELLED_SUCCESSFULLY, appointment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Reschedule appointment
// @route   PUT /api/appointments/:id/reschedule
// @access  Private
export const rescheduleAppointment = async (req, res) => {
  try {
    const { appointmentDate, timeSlot } = req.body;

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ message: APPOINTMENT_MESSAGES.APPOINTMENT_NOT_FOUND });
    }

    // Check authorization
    if (req.user.role === USER_ROLES.PATIENT && appointment.patientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: AUTHZ_MESSAGES.NOT_AUTHORIZED });
    }

    if (appointment.status === APPOINTMENT_STATUSES.COMPLETED || appointment.status === APPOINTMENT_STATUSES.CANCELLED) {
      return res.status(400).json({ message: APPOINTMENT_MESSAGES.CANNOT_RESCHEDULE_COMPLETED_OR_CANCELLED });
    }

    // Check if new slot is available
    if (appointmentDate && timeSlot) {
      const selectedDate = new Date(appointmentDate);
      const existingAppointment = await Appointment.findOne({
        doctorId: appointment.doctorId,
        _id: { $ne: appointment._id },
        appointmentDate: {
          $gte: new Date(selectedDate.setHours(0, 0, 0, 0)),
          $lt: new Date(selectedDate.setHours(23, 59, 59, 999))
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
      .populate('doctorId', 'firstName lastName specialization')
      .populate('patientId', 'firstName lastName email phone');

    res.json({ message: APPOINTMENT_MESSAGES.APPOINTMENT_RESCHEDULED_SUCCESSFULLY, appointment: updatedAppointment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get appointment details
// @route   GET /api/appointments/:id/details
// @access  Private
export const getAppointmentDetails = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('doctorId')
      .populate('patientId');

    if (!appointment) {
      return res.status(404).json({ message: APPOINTMENT_MESSAGES.APPOINTMENT_NOT_FOUND });
    }

    // Check authorization
    if (req.user.role === USER_ROLES.PATIENT && appointment.patientId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: AUTHZ_MESSAGES.NOT_AUTHORIZED });
    }

    if (req.user.role === USER_ROLES.DOCTOR && appointment.doctorId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: AUTHZ_MESSAGES.NOT_AUTHORIZED });
    }

    res.json(appointment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

