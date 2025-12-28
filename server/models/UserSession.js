import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { CRYPTO } from '../constants/numeric.js';

const userSessionSchema = new mongoose.Schema({
  // Relations
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Session identity
  sessionId: {
    type: String,
    required: true,
    unique: true
  },
  refreshTokenHash: {
    type: String,
    required: true
  },

  // Device & environment
  device: {
    name: {
      type: String,
      default: 'Unknown Device'
    },
    type: {
      type: String,
      enum: ['web', 'mobile', 'tablet'],
      default: 'web'
    },
    os: {
      type: String,
      default: 'Unknown'
    },
    browser: {
      type: String,
      default: 'Unknown'
    }
  },

  // Network
  ipAddress: {
    type: String,
    required: true
  },
  location: {
    country: {
      type: String,
      default: 'Unknown'
    },
    city: {
      type: String,
      default: 'Unknown'
    }
  },

  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  isRevoked: {
    type: Boolean,
    default: false
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastActivityAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true
  }
}, {
  timestamps: true
});

// Indexes
// Note: sessionId already has unique index from unique: true
userSessionSchema.index({ userId: 1 });
userSessionSchema.index({ refreshTokenHash: 1 });
// TTL index - automatically deletes expired sessions
userSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Method to hash refresh token
userSessionSchema.statics.hashRefreshToken = async function(refreshToken) {
  const salt = await bcrypt.genSalt(CRYPTO.BCRYPT_SALT_ROUNDS);
  return await bcrypt.hash(refreshToken, salt);
};

// Method to compare refresh token
userSessionSchema.methods.compareRefreshToken = async function(refreshToken) {
  return await bcrypt.compare(refreshToken, this.refreshTokenHash);
};

// Method to update last activity
userSessionSchema.methods.updateActivity = async function() {
  this.lastActivityAt = new Date();
  await this.save();
};

export default mongoose.model('UserSession', userSessionSchema, 'user_sessions');

