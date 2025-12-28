import ReviewRating from '../models/ReviewRating.js';
import Appointment from '../models/Appointment.js';
import Doctor from '../models/Doctor.js';
import { createReviewRatingNotification } from '../utils/notificationService.js';
import { APPOINTMENT_STATUSES, USER_ROLES } from '../constants/index.js';
import { REVIEW_MESSAGES, AUTHZ_MESSAGES, REVIEW_RATING_MESSAGES } from '../constants/messages.js';

/**
 * @desc    Create review/rating for an appointment
 * @route   POST /api/review-ratings
 * @access  Private (Patient)
 */
export const createReviewRating = async (req, res) => {
  try {
    const { appointmentId, rating, comment, categories } = req.body;
    const userId = req.user._id || req.user.id;

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
    if (appointment.patientId.toString() !== userId.toString()) {
      return res.status(403).json({ message: AUTHZ_MESSAGES.NOT_AUTHORIZED });
    }

    // Check if appointment is completed
    if (appointment.status !== APPOINTMENT_STATUSES.COMPLETED) {
      return res.status(400).json({ message: REVIEW_MESSAGES.CAN_ONLY_REVIEW_COMPLETED_APPOINTMENTS });
    }

    // Check if review already exists
    const existingReview = await ReviewRating.findOne({ appointmentId });
    if (existingReview) {
      return res.status(400).json({ message: REVIEW_MESSAGES.REVIEW_ALREADY_EXISTS });
    }

    // Create review rating
    const reviewRating = await ReviewRating.create({
      patientId: userId,
      doctorId: appointment.doctorId,
      appointmentId,
      rating,
      comment: comment || '',
      categories: categories || {}
    });

    // Update doctor's rating
    await updateDoctorRating(appointment.doctorId);

    // Create notification for doctor
    try {
      await createReviewRatingNotification(appointment.doctorId, {
        title: 'New Review Received',
        message: `You have received a ${rating}-star review for your appointment`,
        reviewId: reviewRating._id,
        actionUrl: `/reviews/${reviewRating._id}`,
        priority: 'medium',
        metadata: { rating, appointmentId }
      });
    } catch (notifError) {
      console.error('Error creating notification:', notifError);
    }

    const populatedReview = await ReviewRating.findById(reviewRating._id)
      .populate('patientId', 'firstName lastName profileImage')
      .populate('doctorId', 'firstName lastName specialization');

    res.status(201).json({
      success: true,
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

/**
 * @desc    Update review/rating
 * @route   PUT /api/review-ratings/:id
 * @access  Private (Patient)
 */
export const updateReviewRating = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id || req.user.id;
    const { rating, comment, categories } = req.body;

    const reviewRating = await ReviewRating.findById(id);

    if (!reviewRating) {
      return res.status(404).json({ message: REVIEW_MESSAGES.REVIEW_NOT_FOUND });
    }

    // Check authorization
    if (reviewRating.patientId.toString() !== userId.toString()) {
      return res.status(403).json({ message: AUTHZ_MESSAGES.NOT_AUTHORIZED });
    }

    if (rating !== undefined) {
      if (rating < 1 || rating > 5) {
        return res.status(400).json({ message: REVIEW_MESSAGES.RATING_MUST_BE_BETWEEN_1_AND_5 });
      }
      reviewRating.rating = rating;
    }

    if (comment !== undefined) {
      reviewRating.comment = comment;
    }

    if (categories !== undefined) {
      reviewRating.categories = { ...reviewRating.categories, ...categories };
    }

    await reviewRating.save();

    // Update doctor's rating
    await updateDoctorRating(reviewRating.doctorId);

    const updatedReview = await ReviewRating.findById(reviewRating._id)
      .populate('patientId', 'firstName lastName profileImage')
      .populate('doctorId', 'firstName lastName specialization');

    res.json({
      success: true,
      message: REVIEW_MESSAGES.REVIEW_UPDATED_SUCCESSFULLY,
      data: updatedReview
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Delete review/rating
 * @route   DELETE /api/review-ratings/:id
 * @access  Private (Patient)
 */
export const deleteReviewRating = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id || req.user.id;

    const reviewRating = await ReviewRating.findById(id);

    if (!reviewRating) {
      return res.status(404).json({ message: REVIEW_MESSAGES.REVIEW_NOT_FOUND });
    }

    // Check authorization
    if (reviewRating.patientId.toString() !== userId.toString()) {
      return res.status(403).json({ message: AUTHZ_MESSAGES.NOT_AUTHORIZED });
    }

    const doctorId = reviewRating.doctorId;

    await ReviewRating.findByIdAndDelete(id);

    // Update doctor's rating
    await updateDoctorRating(doctorId);

    res.json({
      success: true,
      message: REVIEW_MESSAGES.REVIEW_DELETED_SUCCESSFULLY
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Get reviews/ratings for a doctor
 * @route   GET /api/review-ratings/doctor/:doctorId
 * @access  Public
 */
export const getDoctorReviewRatings = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { page = 1, limit = 10, rating } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = { doctorId, isVisible: true };
    if (rating) {
      query.rating = parseInt(rating);
    }

    const reviews = await ReviewRating.find(query)
      .populate('patientId', 'firstName lastName profileImage')
      .populate('appointmentId', 'appointmentDate')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await ReviewRating.countDocuments(query);

    // Calculate average rating
    const avgRatingResult = await ReviewRating.aggregate([
      { $match: { doctorId: doctorId, isVisible: true } },
      { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } }
    ]);

    const avgRating = avgRatingResult.length > 0 ? avgRatingResult[0].avgRating : 0;
    const totalReviews = avgRatingResult.length > 0 ? avgRatingResult[0].count : 0;

    res.json({
      success: true,
      data: reviews,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      averageRating: Math.round(avgRating * 10) / 10,
      totalReviews
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Get patient's reviews/ratings
 * @route   GET /api/review-ratings/patient
 * @access  Private (Patient)
 */
export const getPatientReviewRatings = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const reviews = await ReviewRating.find({ patientId: userId })
      .populate('doctorId', 'firstName lastName specialization profileImage')
      .populate('appointmentId', 'appointmentDate')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await ReviewRating.countDocuments({ patientId: userId });

    res.json({
      success: true,
      data: reviews,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Get review/rating by ID
 * @route   GET /api/review-ratings/:id
 * @access  Public
 */
export const getReviewRating = async (req, res) => {
  try {
    const { id } = req.params;

    const review = await ReviewRating.findById(id)
      .populate('patientId', 'firstName lastName profileImage')
      .populate('doctorId', 'firstName lastName specialization profileImage')
      .populate('appointmentId');

    if (!review) {
      return res.status(404).json({ message: REVIEW_MESSAGES.REVIEW_NOT_FOUND });
    }

    res.json({
      success: true,
      data: review
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Add doctor response to review
 * @route   PUT /api/review-ratings/:id/respond
 * @access  Private (Doctor)
 */
export const respondToReview = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id || req.user.id;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ message: REVIEW_RATING_MESSAGES.RESPONSE_MESSAGE_REQUIRED });
    }

    const reviewRating = await ReviewRating.findById(id);

    if (!reviewRating) {
      return res.status(404).json({ message: REVIEW_MESSAGES.REVIEW_NOT_FOUND });
    }

    // Check authorization - only the reviewed doctor can respond
    if (reviewRating.doctorId.toString() !== userId.toString()) {
      return res.status(403).json({ message: AUTHZ_MESSAGES.NOT_AUTHORIZED });
    }

    reviewRating.response = {
      message,
      respondedBy: userId,
      respondedAt: new Date()
    };

    await reviewRating.save();

    // Notify patient about doctor's response
    try {
      const { createReviewRatingNotification } = await import('../utils/notificationService.js');
      await createReviewRatingNotification(reviewRating.patientId, {
        title: 'Doctor Responded to Your Review',
        message: 'The doctor has responded to your review',
        reviewId: reviewRating._id,
        actionUrl: `/reviews/${reviewRating._id}`,
        priority: 'medium'
      });
    } catch (notifError) {
      console.error('Error creating notification:', notifError);
    }

    const updatedReview = await ReviewRating.findById(reviewRating._id)
      .populate('patientId', 'firstName lastName profileImage')
      .populate('doctorId', 'firstName lastName specialization');

    res.json({
      success: true,
      message: 'Response added successfully',
      data: updatedReview
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

    const reviews = await ReviewRating.find({ doctorId: doctorUserId, isVisible: true });
    
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

