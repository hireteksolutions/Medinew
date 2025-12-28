import mongoose from 'mongoose';

const timeSlotSchema = new mongoose.Schema({
  start: {
    type: String,
    required: true
  },
  end: {
    type: String,
    required: true
  },
  isAvailable: {
    type: Boolean,
    default: true
  }
}, { _id: false });

const availabilityScheduleSchema = new mongoose.Schema({
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  dayOfWeek: {
    type: String,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    required: true
  },
  timeSlots: [timeSlotSchema],
  isAvailable: {
    type: Boolean,
    default: true
  },
  isBlocked: {
    type: Boolean,
    default: false
  },
  reason: {
    type: String,
    trim: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
availabilityScheduleSchema.index({ doctorId: 1, date: 1 }, { unique: true });
availabilityScheduleSchema.index({ doctorId: 1, date: -1 });
availabilityScheduleSchema.index({ date: 1, isAvailable: 1 });

export default mongoose.model('AvailabilitySchedule', availabilityScheduleSchema);

