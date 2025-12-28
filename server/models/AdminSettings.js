import mongoose from 'mongoose';

const adminSettingsSchema = new mongoose.Schema({
  // Session settings
  sessionTimeout: {
    type: Number, // in minutes
    required: true,
    default: 30, // 30 minutes default
    min: 1, // Minimum 1 minute
    max: 10080 // Maximum 7 days (in minutes)
  },
  
  // Access token expiration (short-lived token)
  accessTokenExpiration: {
    type: Number, // in minutes
    required: true,
    default: 15, // 15 minutes default
    min: 1, // Minimum 1 minute
    max: 1440 // Maximum 24 hours (in minutes)
  },
  
  // Refresh token expiration (long-lived token)
  refreshTokenExpiration: {
    type: Number, // in days
    required: true,
    default: 30, // 30 days default
    min: 1, // Minimum 1 day
    max: 365 // Maximum 1 year
  },

  // Metadata
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Ensure only one settings document exists
adminSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    // Create default settings
    settings = await this.create({
      sessionTimeout: 30,
      accessTokenExpiration: 15,
      refreshTokenExpiration: 30,
      updatedBy: new mongoose.Types.ObjectId() // System user (will be updated when admin changes)
    });
  }
  return settings;
};

// Update settings
adminSettingsSchema.statics.updateSettings = async function(updates, updatedBy) {
  const settings = await this.getSettings();
  
  // Update fields if provided
  if (updates.sessionTimeout !== undefined) {
    settings.sessionTimeout = updates.sessionTimeout;
  }
  if (updates.accessTokenExpiration !== undefined) {
    settings.accessTokenExpiration = updates.accessTokenExpiration;
  }
  if (updates.refreshTokenExpiration !== undefined) {
    settings.refreshTokenExpiration = updates.refreshTokenExpiration;
  }
  
  settings.updatedBy = updatedBy;
  settings.lastUpdated = new Date();
  
  await settings.save();
  return settings;
};

export default mongoose.model('AdminSettings', adminSettingsSchema, 'admin_settings');

