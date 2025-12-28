import mongoose from 'mongoose';
import { DOCUMENT_TYPES, DOCUMENT_TYPE_VALUES } from '../constants/index.js';

const medicalRecordSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  },
  documentType: {
    type: String,
    enum: DOCUMENT_TYPE_VALUES,
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  fileUrl: {
    type: String,
    required: true
  },
  description: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

export default mongoose.model('MedicalRecord', medicalRecordSchema, 'medical-records');

