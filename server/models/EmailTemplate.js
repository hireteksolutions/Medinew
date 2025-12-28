import mongoose from 'mongoose';

const emailTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  body: {
    type: String,
    required: true
  },
  description: {
    type: String,
    trim: true
  },
  variables: [{
    type: String,
    trim: true
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  category: {
    type: String,
    enum: ['appointment', 'auth', 'notification', 'system'],
    default: 'system'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

emailTemplateSchema.index({ name: 1 }, { unique: true });
emailTemplateSchema.index({ category: 1, isActive: 1 });

export default mongoose.model('EmailTemplate', emailTemplateSchema);

