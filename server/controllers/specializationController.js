import Specialization from '../models/Specialization.js';
import { SPECIALIZATION_MESSAGES, HTTP_STATUS } from '../constants/index.js';

// @desc    Get all specializations
// @route   GET /api/specializations
// @access  Public
export const getSpecializations = async (req, res) => {
  try {
    const specializations = await Specialization.find({ isActive: true })
      .sort({ name: 1 })
      .select('name description');

    res.json(specializations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a specialization (Admin only - can be added later)
// @route   POST /api/specializations
// @access  Private/Admin
export const createSpecialization = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: SPECIALIZATION_MESSAGES.NAME_REQUIRED });
    }

    const specialization = new Specialization({
      name,
      description
    });

    await specialization.save();
    res.status(201).json(specialization);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: SPECIALIZATION_MESSAGES.ALREADY_EXISTS });
    }
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

