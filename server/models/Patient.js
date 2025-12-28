import mongoose from 'mongoose';
import { BLOOD_GROUPS, BLOOD_GROUP_VALUES } from '../constants/index.js';

const patientSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  bloodGroup: {
    type: String,
    enum: BLOOD_GROUP_VALUES
  },
  allergies: [{
    type: String,
    trim: true
  }],
  medicalHistory: [{
    condition: {
      type: String,
      trim: true
    },
    diagnosisDate: Date,
    notes: {
      type: String,
      trim: true
    }
  }],
  currentMedications: [{
    name: {
      type: String,
      trim: true,
      required: true
    },
    dosage: {
      type: String,
      trim: true
    },
    frequency: {
      type: String,
      trim: true
    },
    startDate: Date,
    prescribedBy: {
      type: String,
      trim: true
    }
  }],
  chronicConditions: [{
    condition: {
      type: String,
      trim: true,
      required: true
    },
    diagnosisDate: Date,
    severity: {
      type: String,
      enum: ['mild', 'moderate', 'severe'],
      default: 'moderate'
    },
    notes: {
      type: String,
      trim: true
    }
  }],
  previousSurgeries: [{
    surgeryType: {
      type: String,
      trim: true,
      required: true
    },
    date: Date,
    hospital: {
      type: String,
      trim: true
    },
    surgeon: {
      type: String,
      trim: true
    },
    notes: {
      type: String,
      trim: true
    }
  }],
  emergencyContact: {
    name: {
      type: String,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    relation: {
      type: String,
      trim: true
    }
  },
  insuranceInfo: {
    provider: {
      type: String,
      trim: true
    },
    policyNumber: {
      type: String,
      trim: true
    },
    groupNumber: {
      type: String,
      trim: true
    },
    expiryDate: Date
  },
  favoriteDoctors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor'
  }]
}, {
  timestamps: true
});

// Indexes for better query performance
// Note: userId already has unique index from unique: true
patientSchema.index({ 'emergencyContact.phone': 1 });

export default mongoose.model('Patient', patientSchema);

