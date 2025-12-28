import mongoose from 'mongoose';
import { STORAGE_PROVIDERS, STORAGE_PROVIDER_VALUES } from '../constants/index.js';
import { FILE_SIZE_LIMITS } from '../constants/numeric.js';

const fileStorageConfigSchema = new mongoose.Schema({
  // Storage provider configuration
  provider: {
    type: String,
    enum: STORAGE_PROVIDER_VALUES,
    default: STORAGE_PROVIDERS.LOCAL,
    required: true
  },
  
  // Provider-specific settings
  awsS3: {
    bucketName: String,
    region: String,
    accessKeyId: String,
    secretAccessKey: String,
    endpoint: String // Optional custom endpoint
  },
  
  googleCloud: {
    bucketName: String,
    projectId: String,
    keyFilename: String, // Path to service account key file
    credentials: mongoose.Schema.Types.Mixed // JSON credentials
  },
  
  azureBlob: {
    accountName: String,
    accountKey: String,
    containerName: String,
    connectionString: String
  },
  
  // Local storage settings
  local: {
    uploadPath: {
      type: String,
      default: './uploads'
    },
    publicUrl: {
      type: String,
      default: '/uploads'
    }
  },
  
  // File size limits (in bytes)
  maxFileSizes: {
    images: {
      type: Number,
      default: FILE_SIZE_LIMITS.IMAGE_MAX_SIZE,
      required: true
    },
    documents: {
      type: Number,
      default: FILE_SIZE_LIMITS.DOCUMENT_MAX_SIZE,
      required: true
    },
    videos: {
      type: Number,
      default: FILE_SIZE_LIMITS.VIDEO_MAX_SIZE
    }
  },
  
  // Allowed file formats
  allowedFormats: {
    images: [{
      type: String,
      enum: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    }],
    documents: [{
      type: String,
      enum: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
    }],
    videos: [{
      type: String,
      enum: ['video/mp4', 'video/mpeg', 'video/quicktime']
    }]
  },
  
  // Virus scanning configuration
  virusScanning: {
    enabled: {
      type: Boolean,
      default: false
    },
    provider: {
      type: String,
      enum: ['clamav', 'cloudmersive', 'virustotal'],
      default: 'clamav'
    },
    apiKey: String, // For cloud-based scanning services
    endpoint: String // For custom ClamAV server
  },
  
  // CDN configuration (optional)
  cdn: {
    enabled: {
      type: Boolean,
      default: false
    },
    url: String
  },
  
  // Security settings
  security: {
    generateUniqueNames: {
      type: Boolean,
      default: true
    },
    encryptFiles: {
      type: Boolean,
      default: false
    },
    requireAuthForDownload: {
      type: Boolean,
      default: true
    }
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
fileStorageConfigSchema.index({ provider: 1, isActive: 1 });

// Static method to get active configuration
fileStorageConfigSchema.statics.getActiveConfig = async function() {
  let config = await this.findOne({ isActive: true });
  if (!config) {
    // Create default local configuration
    config = await this.create({
      provider: STORAGE_PROVIDERS.LOCAL,
      maxFileSizes: {
        images: FILE_SIZE_LIMITS.IMAGE_MAX_SIZE,
        documents: FILE_SIZE_LIMITS.DOCUMENT_MAX_SIZE
      },
      allowedFormats: {
        images: ['image/jpeg', 'image/jpg', 'image/png'],
        documents: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
      }
    });
  }
  return config;
};

export default mongoose.model('FileStorageConfig', fileStorageConfigSchema, 'file_storage_configs');

