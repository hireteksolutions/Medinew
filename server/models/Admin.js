import mongoose from 'mongoose';

const adminSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  // Two-level approval system
  firstApproval: {
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedAt: Date,
    isApproved: {
      type: Boolean,
      default: false
    }
  },
  secondApproval: {
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedAt: Date,
    isApproved: {
      type: Boolean,
      default: false
    }
  },
  // Overall approval status (both must be true)
  isFullyApproved: {
    type: Boolean,
    default: false
  },
  // Rejection
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rejectedAt: Date,
  rejectionReason: String,
  isRejected: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Method to check if admin is fully approved
adminSchema.methods.isApproved = function() {
  return this.isFullyApproved && 
         this.firstApproval.isApproved && 
         this.secondApproval.isApproved &&
         !this.isRejected;
};

// Index for better query performance
adminSchema.index({ userId: 1 });
adminSchema.index({ isFullyApproved: 1 });
adminSchema.index({ isRejected: 1 });

export default mongoose.model('Admin', adminSchema, 'admins');

