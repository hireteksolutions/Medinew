import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ContactInfo from '../models/ContactInfo.js';

dotenv.config();

const contactInfoData = {
  address: '123 Medical Street, Health City, HC 12345',
  phone: '+1 (555) 123-4567',
  email: 'contact@medinew.com',
  officeHours: {
    weekdays: 'Monday - Friday: 9:00 AM - 5:00 PM',
    weekend: 'Saturday: 9:00 AM - 1:00 PM'
  },
  socialMedia: {
    facebook: 'https://facebook.com/medinew',
    twitter: 'https://twitter.com/medinew',
    instagram: 'https://instagram.com/medinew',
    linkedin: 'https://linkedin.com/company/medinew'
  }
};

const seedContactInfo = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/medinew');
    console.log('MongoDB connected');

    // Check if contact info already exists
    const existing = await ContactInfo.findOne({ isActive: true });
    
    if (existing) {
      // Update existing contact info
      Object.keys(contactInfoData).forEach(key => {
        if (typeof contactInfoData[key] === 'object' && !Array.isArray(contactInfoData[key])) {
          existing[key] = { ...existing[key], ...contactInfoData[key] };
        } else {
          existing[key] = contactInfoData[key];
        }
      });
      await existing.save();
      console.log('Updated existing contact info');
    } else {
      // Create new contact info
      await ContactInfo.create(contactInfoData);
      console.log('Created contact info');
    }

    console.log('Contact info seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding contact info:', error);
    process.exit(1);
  }
};

seedContactInfo();

