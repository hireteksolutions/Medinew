import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
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
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Ensure one review per appointment
reviewSchema.index({ appointmentId: 1 }, { unique: true });
reviewSchema.index({ doctorId: 1, createdAt: -1 });
reviewSchema.index({ doctorId: 1 });

export default mongoose.model('Review', reviewSchema);

