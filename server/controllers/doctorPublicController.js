import Doctor from '../models/Doctor.js';
import User from '../models/User.js';
import Review from '../models/Review.js';
import { DOCTOR_MESSAGES, HTTP_STATUS } from '../constants/index.js';

// @desc    Get all approved doctors
// @route   GET /api/doctors
// @access  Public
export const getAllDoctors = async (req, res) => {
  try {
    const { specialization, minRating, experience, search } = req.query;
    let query = { isApproved: true };

    if (specialization) {
      query.specialization = new RegExp(specialization, 'i');
    }

    if (minRating) {
      query.rating = { $gte: parseFloat(minRating) };
    }

    if (experience) {
      query.experience = { $gte: parseInt(experience) };
    }

    const doctors = await Doctor.find(query)
      .populate('userId', 'firstName lastName profileImage')
      .sort({ rating: -1, totalReviews: -1 });

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
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

// @desc    Get featured doctors
// @route   GET /api/doctors/featured
// @access  Public
export const getFeaturedDoctors = async (req, res) => {
  try {
    const doctors = await Doctor.find({ isApproved: true })
      .populate('userId', 'firstName lastName profileImage')
      .sort({ rating: -1, totalReviews: -1 })
      .limit(6);

    res.json(doctors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Search doctors
// @route   GET /api/doctors/search
// @access  Public
export const searchDoctors = async (req, res) => {
  try {
    const { q, specialization, location } = req.query;
    let query = { isApproved: true };

    if (specialization) {
      query.specialization = new RegExp(specialization, 'i');
    }

    const doctors = await Doctor.find(query)
      .populate('userId', 'firstName lastName profileImage address');

    let filteredDoctors = doctors;

    if (q) {
      const searchLower = q.toLowerCase();
      filteredDoctors = doctors.filter(doc => {
        const user = doc.userId;
        return (
          user.firstName.toLowerCase().includes(searchLower) ||
          user.lastName.toLowerCase().includes(searchLower) ||
          doc.specialization.toLowerCase().includes(searchLower)
        );
      });
    }

    if (location) {
      const locationLower = location.toLowerCase();
      filteredDoctors = filteredDoctors.filter(doc => {
        const user = doc.userId;
        return (
          user.address?.city?.toLowerCase().includes(locationLower) ||
          user.address?.state?.toLowerCase().includes(locationLower)
        );
      });
    }

    res.json(filteredDoctors);
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

// @desc    Get doctor by ID
// @route   GET /api/doctors/:id
// @access  Public
export const getDoctorById = async (req, res) => {
  try {
    const doctor = await Doctor.findOne({
      userId: req.params.id,
      isApproved: true
    }).populate('userId', 'firstName lastName email phone profileImage address dateOfBirth gender');

    if (!doctor) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ message: DOCTOR_MESSAGES.DOCTOR_NOT_FOUND });
    }

    // Get reviews
    const reviews = await Review.find({ doctorId: req.params.id })
      .populate('patientId', 'firstName lastName profileImage')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      doctor,
      reviews
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

