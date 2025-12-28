import mongoose from 'mongoose';
import { USER_ROLES } from '../constants/index.js';

const auditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  userRole: {
    type: String,
    enum: ['patient', 'doctor', 'admin'],
    required: true,
    index: true
  },
  action: {
    type: String,
    required: true,
    index: true
  },
  entityType: {
    type: String,
    required: true,
    enum: [
      'user',
      'patient',
      'doctor',
      'appointment',
      'review',
      'message',
      'schedule',
      'medical_record',
      'audit_log',
      'system'
    ],
    index: true
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true
  },
  method: {
    type: String,
    enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    index: true
  },
  endpoint: {
    type: String,
    trim: true
  },
  ipAddress: {
    type: String,
    trim: true
  },
  userAgent: {
    type: String,
    trim: true
  },
  changes: {
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed
  },
  status: {
    type: String,
    enum: ['success', 'failure', 'error'],
    default: 'success',
    index: true
  },
  statusCode: {
    type: Number
  },
  errorMessage: {
    type: String,
    trim: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ userRole: 1, createdAt: -1 });
auditLogSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model('AuditLog', auditLogSchema);

