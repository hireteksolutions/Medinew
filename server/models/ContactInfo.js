import mongoose from 'mongoose';

const contactInfoSchema = new mongoose.Schema({
  address: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
  },
  officeHours: {
    weekdays: {
      type: String,
      default: 'Monday - Friday: 9:00 AM - 5:00 PM'
    },
    weekend: {
      type: String,
      default: 'Saturday: 9:00 AM - 1:00 PM'
    }
  },
  socialMedia: {
    facebook: {
      type: String,
      default: ''
    },
    twitter: {
      type: String,
      default: ''
    },
    instagram: {
      type: String,
      default: ''
    },
    linkedin: {
      type: String,
      default: ''
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Ensure only one contact info document exists
contactInfoSchema.statics.getContactInfo = async function() {
  let contactInfo = await this.findOne({ isActive: true });
  if (!contactInfo) {
    contactInfo = await this.create({
      address: '123 Medical Street, Health City, HC 12345',
      phone: '+1 (555) 123-4567',
      email: 'contact@medinew.com'
    });
  }
  return contactInfo;
};

export default mongoose.model('ContactInfo', contactInfoSchema, 'contact-info');

