import Review from '../models/Review.js';
import Appointment from '../models/Appointment.js';
import Doctor from '../models/Doctor.js';
import { APPOINTMENT_STATUSES, USER_ROLES } from '../constants/index.js';
import { REVIEW_MESSAGES, AUTHZ_MESSAGES } from '../constants/messages.js';
import { getPaginationParams, buildPaginationMeta } from '../utils/pagination.js';

// @desc    Create review/rating for an appointment
// @route   POST /api/reviews
// @access  Private/Patient
export const createReview = async (req, res) => {
  try {
    const { appointmentId, rating, comment } = req.body;

    // Validate required fields
    if (!appointmentId || !rating) {
      return res.status(400).json({ message: REVIEW_MESSAGES.APPOINTMENT_ID_AND_RATING_REQUIRED });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: REVIEW_MESSAGES.RATING_MUST_BE_BETWEEN_1_AND_5 });
    }

    // Check if appointment exists and belongs to patient
    const appointment = await Appointment.findById(appointmentId);

    if (!appointment) {
      return res.status(404).json({ message: REVIEW_MESSAGES.APPOINTMENT_NOT_FOUND });
    }

    // Check authorization
    if (appointment.patientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: AUTHZ_MESSAGES.NOT_AUTHORIZED });
    }

    // Check if appointment is completed
    if (appointment.status !== APPOINTMENT_STATUSES.COMPLETED) {
      return res.status(400).json({ message: REVIEW_MESSAGES.CAN_ONLY_REVIEW_COMPLETED_APPOINTMENTS });
    }

    // Check if review already exists
    const existingReview = await Review.findOne({ appointmentId });
    if (existingReview) {
      return res.status(400).json({ message: REVIEW_MESSAGES.REVIEW_ALREADY_EXISTS });
    }

    // Create review (doctorId in appointment is already User reference)
    const review = await Review.create({
      patientId: req.user._id,
      doctorId: appointment.doctorId,
      appointmentId,
      rating,
      comment: comment || ''
    });

    // Update doctor's rating
    await updateDoctorRating(appointment.doctorId);

    const populatedReview = await Review.findById(review._id)
      .populate('patientId', 'firstName lastName profileImage')
      .populate('doctorId', 'firstName lastName specialization')
      .populate('appointmentId');

    res.status(201).json({
      message: REVIEW_MESSAGES.REVIEW_CREATED_SUCCESSFULLY,
      data: populatedReview
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: REVIEW_MESSAGES.REVIEW_ALREADY_EXISTS });
    }
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update review
// @route   PUT /api/reviews/:id
// @access  Private/Patient
export const updateReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;

    const review = await Review.findById(req.params.id)
      .populate('appointmentId');

    if (!review) {
      return res.status(404).json({ message: REVIEW_MESSAGES.REVIEW_NOT_FOUND });
    }

    // Check authorization
    if (review.patientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: AUTHZ_MESSAGES.NOT_AUTHORIZED });
    }

    if (rating !== undefined) {
      if (rating < 1 || rating > 5) {
        return res.status(400).json({ message: REVIEW_MESSAGES.RATING_MUST_BE_BETWEEN_1_AND_5 });
      }
      review.rating = rating;
    }

    if (comment !== undefined) {
      review.comment = comment;
    }

    await review.save();

    // Update doctor's rating
    await updateDoctorRating(review.doctorId);

    const updatedReview = await Review.findById(review._id)
      .populate('patientId', 'firstName lastName profileImage')
      .populate('doctorId', 'firstName lastName specialization')
      .populate('appointmentId');

    res.json({
      message: REVIEW_MESSAGES.REVIEW_UPDATED_SUCCESSFULLY,
      data: updatedReview
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete review
// @route   DELETE /api/reviews/:id
// @access  Private/Patient
export const deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ message: REVIEW_MESSAGES.REVIEW_NOT_FOUND });
    }

    // Check authorization
    if (review.patientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: AUTHZ_MESSAGES.NOT_AUTHORIZED });
    }

    const doctorId = review.doctorId;

    await Review.findByIdAndDelete(req.params.id);

    // Update doctor's rating
    await updateDoctorRating(doctorId);

    res.json({ message: REVIEW_MESSAGES.REVIEW_DELETED_SUCCESSFULLY });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get reviews for a doctor
// @route   GET /api/reviews/doctor/:doctorId
// @access  Public
export const getDoctorReviews = async (req, res) => {
  try {
    const { doctorId } = req.params;
    
    // Get pagination parameters
    const { limit, offset } = getPaginationParams(req);

    // Get total count before pagination
    const total = await Review.countDocuments({ doctorId });

    const reviews = await Review.find({ doctorId })
      .populate('patientId', 'firstName lastName profileImage')
      .populate('appointmentId', 'appointmentDate')
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit);

    // Calculate average rating
    const avgRatingResult = await Review.aggregate([
      { $match: { doctorId: doctorId } },
      { $group: { _id: null, avgRating: { $avg: '$rating' } } }
    ]);

    const avgRating = avgRatingResult.length > 0 ? avgRatingResult[0].avgRating : 0;

    // Build pagination metadata
    const pagination = buildPaginationMeta(total, limit, offset);

    res.json({
      reviews,
      pagination,
      averageRating: Math.round(avgRating * 10) / 10
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get patient's reviews
// @route   GET /api/reviews/patient
// @access  Private/Patient
export const getPatientReviews = async (req, res) => {
  try {
    // Get pagination parameters
    const { limit, offset } = getPaginationParams(req);

    // Get total count before pagination
    const total = await Review.countDocuments({ patientId: req.user._id });

    const reviews = await Review.find({ patientId: req.user._id })
      .populate('doctorId', 'firstName lastName specialization profileImage')
      .populate('appointmentId', 'appointmentDate')
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit);

    // Build pagination metadata
    const pagination = buildPaginationMeta(total, limit, offset);

    res.json({
      reviews,
      pagination
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Helper function to update doctor's rating
const updateDoctorRating = async (doctorUserId) => {
  try {
    const doctor = await Doctor.findOne({ userId: doctorUserId });
    if (!doctor) return;

    const reviews = await Review.find({ doctorId: doctorUserId });
    
    if (reviews.length === 0) {
      doctor.rating = 0;
      doctor.totalReviews = 0;
    } else {
      const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
      doctor.rating = Math.round((totalRating / reviews.length) * 10) / 10;
      doctor.totalReviews = reviews.length;
    }

    await doctor.save();
  } catch (error) {
    console.error('Error updating doctor rating:', error);
  }
};

