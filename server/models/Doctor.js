import mongoose from 'mongoose';
import { DAYS_OF_WEEK, DAY_OF_WEEK_VALUES, DATE_CONSTANTS } from '../constants/index.js';
import { VALIDATION_MESSAGES } from '../constants/messages.js';

const timeSlotSchema = new mongoose.Schema({
  start: String, // Format: "HH:MM"
  end: String,
  isAvailable: {
    type: Boolean,
    default: true
  }
});

const availabilitySchema = new mongoose.Schema({
  day: {
    type: String,
    enum: DAY_OF_WEEK_VALUES
  },
  timeSlots: [timeSlotSchema],
  isAvailable: {
    type: Boolean,
    default: true
  }
});

const doctorSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  specialization: {
    type: String,
    required: [true, VALIDATION_MESSAGES.PROVIDE_SPECIALIZATION],
    trim: true
  },
  licenseNumber: {
    type: String,
    required: [true, VALIDATION_MESSAGES.PROVIDE_LICENSE_NUMBER],
    unique: true,
    trim: true
  },
  education: [{
    degree: String,
    institution: String,
    year: Number
  }],
  experience: {
    type: Number,
    default: 0
  },
  consultationFee: {
    type: Number,
    required: [true, VALIDATION_MESSAGES.PROVIDE_CONSULTATION_FEE],
    default: 0
  },
  languages: [{
    type: String
  }],
  biography: {
    type: String,
    trim: true
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalReviews: {
    type: Number,
    default: 0
  },
  availability: [availabilitySchema],
  consultationDuration: {
    type: Number,
    default: DATE_CONSTANTS.DEFAULT_CONSULTATION_DURATION // minutes
  },
  consultationType: {
    type: [{
      type: String,
      enum: ['online', 'offline', 'both']
    }],
    default: ['both']
  },
  isApproved: {
    type: Boolean,
    default: false
  },
  blockedDates: [{
    type: Date
  }],
  certifications: [{
    name: String,
    issuingOrganization: String,
    issueDate: Date,
    expiryDate: Date,
    certificateUrl: String,
    certificateNumber: String
  }],
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for better query performance
// Note: userId and licenseNumber already have unique indexes from unique: true
doctorSchema.index({ specialization: 1 });
doctorSchema.index({ isApproved: 1 });

export default mongoose.model('Doctor', doctorSchema);

