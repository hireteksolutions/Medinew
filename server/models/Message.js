import mongoose from 'mongoose';
import { MESSAGE_STATUSES, MESSAGE_STATUS_VALUES, MESSAGE_PRIORITIES, MESSAGE_PRIORITY_VALUES, CONTACT_PREFERENCES, CONTACT_PREFERENCE_VALUES } from '../constants/index.js';

const messageSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  specialization: {
    type: String,
    trim: true
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  symptomsDuration: {
    type: String,
    trim: true
  },
  priority: {
    type: String,
    enum: MESSAGE_PRIORITY_VALUES,
    default: MESSAGE_PRIORITIES.MEDIUM
  },
  status: {
    type: String,
    enum: MESSAGE_STATUS_VALUES,
    default: MESSAGE_STATUSES.PENDING
  },
  attachments: [{
    fileName: {
      type: String,
      required: true
    },
    fileUrl: {
      type: String,
      required: true
    },
    fileType: {
      type: String,
      trim: true
    },
    fileSize: Number
  }],
  contactPreference: {
    type: String,
    enum: CONTACT_PREFERENCE_VALUES,
    default: CONTACT_PREFERENCES.IN_APP
  },
  response: {
    message: {
      type: String,
      trim: true
    },
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    respondedAt: Date,
    attachments: [{
      fileName: {
        type: String,
        required: true
      },
      fileUrl: {
        type: String,
        required: true
      },
      fileType: {
        type: String,
        trim: true
      },
      fileSize: Number
    }]
  },
  readAt: Date
}, {
  timestamps: true
});

// Indexes for better query performance
messageSchema.index({ patientId: 1, createdAt: -1 });
messageSchema.index({ doctorId: 1, status: 1, createdAt: -1 });
messageSchema.index({ status: 1, priority: 1 });
messageSchema.index({ specialization: 1 });

export default mongoose.model('Message', messageSchema);

