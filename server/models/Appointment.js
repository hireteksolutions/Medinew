import mongoose from 'mongoose';
import { APPOINTMENT_STATUSES, APPOINTMENT_STATUS_VALUES, PAYMENT_STATUSES, PAYMENT_STATUS_VALUES, DEFAULT_APPOINTMENT_STATUS, DEFAULT_PAYMENT_STATUS } from '../constants/index.js';

const appointmentSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  appointmentDate: {
    type: Date,
    required: true
  },
  timeSlot: {
    start: String,
    end: String
  },
  status: {
    type: String,
    enum: APPOINTMENT_STATUS_VALUES,
    default: DEFAULT_APPOINTMENT_STATUS
  },
  reasonForVisit: {
    type: String,
    trim: true
  },
  symptoms: {
    type: String,
    trim: true
  },
  diagnosis: {
    type: String,
    trim: true
  },
  prescription: {
    medications: [{
      name: String,
      dosage: String,
      frequency: String,
      duration: String
    }],
    notes: String
  },
  paymentStatus: {
    type: String,
    enum: PAYMENT_STATUS_VALUES,
    default: DEFAULT_PAYMENT_STATUS
  },
  consultationFee: {
    type: Number,
    required: true
  },
  appointmentNumber: {
    type: String,
    unique: true
  }
}, {
  timestamps: true
});

// Generate appointment number before saving
appointmentSchema.pre('save', async function(next) {
  if (!this.appointmentNumber) {
    const count = await mongoose.model('Appointment').countDocuments();
    this.appointmentNumber = `APT-${Date.now()}-${count + 1}`;
  }
  next();
});

// Indexes for better query performance
appointmentSchema.index({ doctorId: 1, appointmentDate: 1 });
appointmentSchema.index({ doctorId: 1, status: 1 });
appointmentSchema.index({ patientId: 1, appointmentDate: -1 });
appointmentSchema.index({ doctorId: 1, createdAt: -1 });
appointmentSchema.index({ appointmentDate: 1, status: 1 });
appointmentSchema.index({ doctorId: 1, patientId: 1 });
appointmentSchema.index({ doctorId: 1, status: 1, paymentStatus: 1 });

export default mongoose.model('Appointment', appointmentSchema);

