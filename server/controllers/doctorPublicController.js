import Doctor from '../models/Doctor.js';
import User from '../models/User.js';
import Review from '../models/Review.js';
import { DOCTOR_MESSAGES, HTTP_STATUS } from '../constants/index.js';
import { getPaginationParams, buildPaginationMeta, applyPagination } from '../utils/pagination.js';
import { calculateDistance, formatDistance } from '../utils/location.js';

// @desc    Get all approved doctors with advanced search and filters
// @route   GET /api/doctors
// @access  Public
export const getAllDoctors = async (req, res) => {
  try {
    const {
      specialization,
      minRating,
      experience,
      search,
      consultationType,
      minFee,
      maxFee,
      latitude,
      longitude,
      radius, // in kilometers
      availability, // 'today', 'thisWeek', 'available'
      sortBy // 'distance', 'rating', 'fee', 'experience'
    } = req.query;

    // Get pagination parameters
    const { limit, offset } = getPaginationParams(req, { defaultLimit: 12, maxLimit: 50 });

    // Build base query
    let query = { isApproved: true, isDeleted: { $ne: true } };

    if (specialization) {
      query.specialization = new RegExp(specialization, 'i');
    }

    if (minRating) {
      query.rating = { $gte: parseFloat(minRating) };
    }

    if (experience) {
      query.experience = { $gte: parseInt(experience) };
    }

    if (consultationType && consultationType !== 'all') {
      // Match doctors who have the requested consultation type in their array or have 'both'
      query.consultationType = { $in: [consultationType, 'both'] };
    }

    if (minFee || maxFee) {
      query.consultationFee = {};
      if (minFee) query.consultationFee.$gte = parseFloat(minFee);
      if (maxFee) query.consultationFee.$lte = parseFloat(maxFee);
    }

    // Fetch doctors with populated user data
    let doctorsQuery = Doctor.find(query).populate('userId', 'firstName lastName profileImage address');

    // Apply pagination
    doctorsQuery = applyPagination(doctorsQuery, limit, offset);

    // Execute query
    let doctors = await doctorsQuery.exec();

    // Text search filter (applied after query to support name search)
    if (search) {
      const searchLower = search.toLowerCase();
      doctors = doctors.filter(doc => {
        const user = doc.userId;
        if (!user) return false;
        return (
          user.firstName?.toLowerCase().includes(searchLower) ||
          user.lastName?.toLowerCase().includes(searchLower) ||
          doc.specialization?.toLowerCase().includes(searchLower)
        );
      });
    }

    // Location-based filtering and distance calculation
    let doctorsWithDistance = doctors.map(doc => {
      const user = doc.userId;
      let distance = null;

      if (latitude && longitude && user?.address?.latitude && user?.address?.longitude) {
        distance = calculateDistance(
          parseFloat(latitude),
          parseFloat(longitude),
          user.address.latitude,
          user.address.longitude
        );

        // Filter by radius if provided
        if (radius && distance > parseFloat(radius)) {
          return null;
        }
      }

      return {
        ...doc.toObject(),
        distance: distance !== null ? parseFloat(distance.toFixed(2)) : null,
        distanceFormatted: distance !== null ? formatDistance(distance) : null
      };
    }).filter(doc => doc !== null);

    // Availability filter
    if (availability) {
      const now = new Date();
      
      doctorsWithDistance = doctorsWithDistance.filter(doc => {
        if (!doc.availability || doc.availability.length === 0) {
          // If no availability set, show doctor (they might be available)
          return availability !== 'today' && availability !== 'thisWeek';
        }

        if (availability === 'today') {
          // JavaScript getDay() returns 0 for Sunday, 1 for Monday, etc.
          const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
          const dayOfWeek = dayNames[now.getDay()];
          const todayAvailability = doc.availability.find(av => 
            av.day && av.day.toLowerCase() === dayOfWeek
          );
          return todayAvailability && todayAvailability.isAvailable && 
                 todayAvailability.timeSlots && todayAvailability.timeSlots.length > 0;
        }

        if (availability === 'thisWeek') {
          // Check if doctor has any available days this week
          return doc.availability.some(av => av.isAvailable);
        }

        if (availability === 'available') {
          // Show doctors who have availability set (regardless of specific day)
          return doc.availability.some(av => av.isAvailable);
        }

        return true;
      });
    }

    // Sorting
    if (sortBy === 'distance' && latitude && longitude) {
      doctorsWithDistance.sort((a, b) => {
        // Put doctors without distance at the end
        if (a.distance === null && b.distance === null) return 0;
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      });
    } else if (sortBy === 'fee') {
      doctorsWithDistance.sort((a, b) => (a.consultationFee || 0) - (b.consultationFee || 0));
    } else if (sortBy === 'experience') {
      doctorsWithDistance.sort((a, b) => (b.experience || 0) - (a.experience || 0));
    } else {
      // Default: sort by rating
      doctorsWithDistance.sort((a, b) => {
        const ratingDiff = (b.rating || 0) - (a.rating || 0);
        if (ratingDiff !== 0) return ratingDiff;
        return (b.totalReviews || 0) - (a.totalReviews || 0);
      });
    }

    // Get total count for pagination (need to count all matching doctors, not just paginated)
    const totalQuery = { ...query };
    let totalDoctors = await Doctor.find(totalQuery).populate('userId', 'address');
    
    // Apply same filters to count
    if (search) {
      const searchLower = search.toLowerCase();
      totalDoctors = totalDoctors.filter(doc => {
        const user = doc.userId;
        if (!user) return false;
        return (
          user.firstName?.toLowerCase().includes(searchLower) ||
          user.lastName?.toLowerCase().includes(searchLower) ||
          doc.specialization?.toLowerCase().includes(searchLower)
        );
      });
    }

    // Apply location filter to count
    if (latitude && longitude && radius) {
      totalDoctors = totalDoctors.filter(doc => {
        const user = doc.userId;
        if (!user?.address?.latitude || !user?.address?.longitude) return false;
        const distance = calculateDistance(
          parseFloat(latitude),
          parseFloat(longitude),
          user.address.latitude,
          user.address.longitude
        );
        return distance <= parseFloat(radius);
      });
    }

    const total = totalDoctors.length;
    const pagination = buildPaginationMeta(total, limit, offset);

    res.json({
      doctors: doctorsWithDistance,
      pagination
    });
  } catch (error) {
    console.error('Error fetching doctors:', error);
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

