import mongoose from 'mongoose';

const masterRoleSchema = new mongoose.Schema({
  roleName: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    index: true
  },
  displayName: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  permissions: [{
    type: String,
    trim: true
  }],
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isSystem: {
    type: Boolean,
    default: false
  },
  priority: {
    type: Number,
    default: 0,
    index: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
masterRoleSchema.index({ roleName: 1 }, { unique: true });
masterRoleSchema.index({ isActive: 1, priority: -1 });
masterRoleSchema.index({ isSystem: 1 });

// Prevent deletion of system roles
masterRoleSchema.pre('deleteOne', { document: true, query: false }, async function() {
  if (this.isSystem) {
    throw new Error('Cannot delete system roles');
  }
});

export default mongoose.model('MasterRole', masterRoleSchema);

