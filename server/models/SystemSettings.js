import mongoose from 'mongoose';

const systemSettingsSchema = new mongoose.Schema({
  // General Settings
  systemName: {
    type: String,
    default: 'MediNew'
  },
  systemEmail: {
    type: String,
    default: 'admin@medinew.com'
  },
  
  // Appointment Settings
  appointmentSlotDuration: {
    type: Number,
    default: 30, // minutes
    min: 15,
    max: 120
  },
  advanceBookingDays: {
    type: Number,
    default: 30,
    min: 1,
    max: 365
  },
  cancellationHours: {
    type: Number,
    default: 24, // hours before appointment
    min: 1
  },
  
  // Notification Settings
  enableNotifications: {
    type: Boolean,
    default: true
  },
  enableEmail: {
    type: Boolean,
    default: true
  },
  enableSMS: {
    type: Boolean,
    default: false
  },
  
  // Pricing Settings
  minConsultationFee: {
    type: Number,
    default: 100,
    min: 0
  },
  maxConsultationFee: {
    type: Number,
    default: 5000,
    min: 0
  },
  
  // Email Settings
  smtpHost: String,
  smtpPort: Number,
  smtpUser: String,
  smtpPassword: String,
  smtpSecure: {
    type: Boolean,
    default: true
  },
  
  // SMS Settings
  smsProvider: String,
  smsApiKey: String,
  smsApiSecret: String,
  
  // Other Settings
  timezone: {
    type: String,
    default: 'Asia/Kolkata'
  },
  currency: {
    type: String,
    default: 'INR'
  },
  dateFormat: {
    type: String,
    default: 'DD/MM/YYYY'
  },
  
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Ensure only one settings document exists
systemSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

export default mongoose.model('SystemSettings', systemSettingsSchema);

