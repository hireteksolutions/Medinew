import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      'availability_schedule',
      'appointment',
      'review_rating',
      'message',
      'audit_log',
      'system',
      'doctor_approval',
      'doctor_rejection',
      'appointment_confirmed',
      'appointment_cancelled',
      'appointment_rescheduled',
      'doctor_unavailable',
      'appointment_needs_rescheduling',
      'new_review',
      'new_message',
      'schedule_updated'
    ],
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  relatedEntityType: {
    type: String,
    enum: ['appointment', 'review', 'message', 'schedule', 'audit', 'doctor', 'patient', 'system']
  },
  relatedEntityId: {
    type: mongoose.Schema.Types.ObjectId
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
    index: true
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  readAt: {
    type: Date
  },
  actionUrl: {
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
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, type: 1, createdAt: -1 });
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ priority: 1, isRead: 1 });

export default mongoose.model('Notification', notificationSchema);

