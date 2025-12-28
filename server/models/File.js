import mongoose from 'mongoose';
import { STORAGE_PROVIDERS, STORAGE_PROVIDER_VALUES, FILE_TYPES, FILE_TYPE_VALUES, VIRUS_SCAN_STATUS, VIRUS_SCAN_STATUS_VALUES, RELATED_ENTITY_TYPES, RELATED_ENTITY_TYPE_VALUES } from '../constants/index.js';

const fileSchema = new mongoose.Schema({
  // File metadata
  originalName: {
    type: String,
    required: true
  },
  fileName: {
    type: String,
    required: true,
    unique: true
  },
  filePath: {
    type: String,
    required: true
  },
  fileUrl: {
    type: String,
    required: true
  },
  
  // File properties
  mimeType: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  fileType: {
    type: String,
    enum: FILE_TYPE_VALUES,
    required: true
  },
  
  // Storage information
  storageProvider: {
    type: String,
    enum: STORAGE_PROVIDER_VALUES,
    required: true
  },
  bucketName: String, // For cloud storage
  storageKey: String, // Unique key in storage
  
  // Security
  isPublic: {
    type: Boolean,
    default: false
  },
  accessToken: String, // For secure downloads
  
  // Virus scanning
  virusScanStatus: {
    type: String,
    enum: VIRUS_SCAN_STATUS_VALUES,
    default: VIRUS_SCAN_STATUS.PENDING
  },
  virusScanResult: {
    scanned: {
      type: Boolean,
      default: false
    },
    scannedAt: Date,
    threats: [{
      name: String,
      type: String
    }]
  },
  
  // File hash for integrity
  fileHash: {
    type: String,
    required: true
  },
  
  // Owner information
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Related entities
  relatedEntity: {
    type: {
      type: String,
      enum: RELATED_ENTITY_TYPE_VALUES
    },
    id: mongoose.Schema.Types.ObjectId
  },
  
  // Metadata
  metadata: mongoose.Schema.Types.Mixed,
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  deletedAt: Date
}, {
  timestamps: true
});

// Indexes
// Note: fileName already has unique index from unique: true
fileSchema.index({ uploadedBy: 1, isActive: 1 });
fileSchema.index({ fileType: 1 });
fileSchema.index({ storageProvider: 1 });
fileSchema.index({ virusScanStatus: 1 });
fileSchema.index({ 'relatedEntity.type': 1, 'relatedEntity.id': 1 });

// Virtual for file extension
fileSchema.virtual('extension').get(function() {
  return this.originalName.split('.').pop().toLowerCase();
});

// Method to check if file is safe
fileSchema.methods.isSafe = function() {
  return this.virusScanStatus === 'clean' || 
         (this.virusScanStatus === 'pending' && !this.virusScanning?.enabled);
};

export default mongoose.model('File', fileSchema, 'files');

