/**
 * Migration script to fix invalid paymentStatus values in appointments
 * Run this once to update existing data: node server/scripts/fixPaymentStatus.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Appointment from '../models/Appointment.js';
import { PAYMENT_STATUSES } from '../constants/index.js';

dotenv.config();

const fixPaymentStatus = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/medinew');
    console.log('Connected to database');

    // Find all appointments with invalid paymentStatus
    const appointments = await Appointment.find({
      paymentStatus: { $nin: Object.values(PAYMENT_STATUSES) }
    });

    console.log(`Found ${appointments.length} appointments with invalid paymentStatus`);

    // Update 'paid' to 'completed'
    const result = await Appointment.updateMany(
      { paymentStatus: 'paid' },
      { $set: { paymentStatus: PAYMENT_STATUSES.COMPLETED } }
    );

    console.log(`Updated ${result.modifiedCount} appointments from 'paid' to 'completed'`);

    // Check for any other invalid values
    const remainingInvalid = await Appointment.find({
      paymentStatus: { $nin: Object.values(PAYMENT_STATUSES) }
    });

    if (remainingInvalid.length > 0) {
      console.log(`Warning: ${remainingInvalid.length} appointments still have invalid paymentStatus:`);
      const invalidValues = [...new Set(remainingInvalid.map(apt => apt.paymentStatus))];
      console.log('Invalid values:', invalidValues);
      
      // Set invalid values to 'pending' (default)
      await Appointment.updateMany(
        { paymentStatus: { $nin: Object.values(PAYMENT_STATUSES) } },
        { $set: { paymentStatus: PAYMENT_STATUSES.PENDING } }
      );
      console.log('Set all remaining invalid paymentStatus to "pending"');
    }

    console.log('Migration completed successfully');
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

fixPaymentStatus();

