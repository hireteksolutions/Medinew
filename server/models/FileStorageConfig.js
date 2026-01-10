import mongoose from 'mongoose';
import { STORAGE_PROVIDERS, STORAGE_PROVIDER_VALUES } from '../constants/index.js';
import { FILE_SIZE_LIMITS } from '../constants/numeric.js';

const fileStorageConfigSchema = new mongoose.Schema({
  // Storage provider configuration
  // NOTE: LOCAL storage is NOT allowed - default removed to force explicit bucket configuration
  provider: {
    type: String,
    enum: STORAGE_PROVIDER_VALUES,
    required: true
    // NO DEFAULT - must explicitly set to bucket storage (AWS_S3, GOOGLE_CLOUD, or AZURE_BLOB)
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
  // Check for bucket configuration in environment variables FIRST
  // Priority: AWS S3 / Supabase > Google Cloud > Azure
  // Also use hardcoded values from configureSupabaseStorage script as fallback
  const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID || process.env.SUPABASE_ACCESS_KEY_ID || 'a19d2f12373e75e60d5c2b36e9bdef17';
  const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || process.env.SUPABASE_SECRET_ACCESS_KEY;
  const bucketName = process.env.AWS_S3_BUCKET_NAME || process.env.SUPABASE_BUCKET_NAME || 'medinew-document-bucket';
  const region = process.env.AWS_REGION || process.env.SUPABASE_REGION || 'ap-northeast-1';
  const endpoint = process.env.AWS_S3_ENDPOINT || process.env.SUPABASE_STORAGE_ENDPOINT || 'https://qmhaxxxhhxooxtyizmqc.storage.supabase.co/storage/v1/s3';
  
  const googleProjectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
  const googleBucketName = process.env.GOOGLE_CLOUD_BUCKET_NAME;
  const googleKeyFilename = process.env.GOOGLE_CLOUD_KEY_FILENAME;
  
  const azureAccountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
  const azureContainerName = process.env.AZURE_STORAGE_CONTAINER_NAME;
  const azureConnectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  
  // FIRST: Check if there's an existing bucket config in database (prefer active, then inactive)
  let existingBucketConfig = await this.findOne({
    isActive: true,
    provider: { $in: [STORAGE_PROVIDERS.AWS_S3, STORAGE_PROVIDERS.GOOGLE_CLOUD, STORAGE_PROVIDERS.AZURE_BLOB] }
  });
  
  if (!existingBucketConfig) {
    // Check for inactive bucket config
    existingBucketConfig = await this.findOne({
      provider: { $in: [STORAGE_PROVIDERS.AWS_S3, STORAGE_PROVIDERS.GOOGLE_CLOUD, STORAGE_PROVIDERS.AZURE_BLOB] }
    }).sort({ updatedAt: -1 });
  }
  
  let config = await this.findOne({ isActive: true });
  
  // CRITICAL: If existing config is LOCAL, IMMEDIATELY update to bucket or disable it
  if (config && config.provider === STORAGE_PROVIDERS.LOCAL) {
    console.warn('⚠️  WARNING: Found LOCAL storage config in database. This is NOT allowed!');
    console.warn('   Attempting to update to bucket storage...');
    
    // First, check if there's an existing bucket config we can reactivate
    if (existingBucketConfig && existingBucketConfig.provider === STORAGE_PROVIDERS.AWS_S3 && 
        existingBucketConfig.awsS3 && existingBucketConfig.awsS3.bucketName && 
        existingBucketConfig.awsS3.accessKeyId && existingBucketConfig.awsS3.secretAccessKey) {
      console.log('📋 Found existing bucket config in database. Reactivating it and disabling LOCAL config...');
      // Deactivate LOCAL config
      config.isActive = false;
      await config.save();
      // Reactivate bucket config
      existingBucketConfig.isActive = true;
      await existingBucketConfig.save();
      config = existingBucketConfig;
      console.log('✅ Reactivated existing bucket storage configuration (Supabase)');
    } else if (awsAccessKeyId && awsSecretAccessKey) {
      console.log('⚠️  Updating LOCAL storage to bucket storage (AWS S3/Supabase)...');
      config.provider = STORAGE_PROVIDERS.AWS_S3;
      config.awsS3 = {
        bucketName,
        region,
        accessKeyId: awsAccessKeyId,
        secretAccessKey: awsSecretAccessKey,
        endpoint: endpoint || undefined
      };
      await config.save();
      console.log('✅ Updated to bucket storage configuration (AWS S3/Supabase)');
      // Reload to ensure changes are saved
      config = await this.findOne({ isActive: true });
      // Verify reloaded config is NOT LOCAL
      if (config && config.provider === STORAGE_PROVIDERS.LOCAL) {
        console.error('❌ CRITICAL: Reloaded config is still LOCAL! Deactivating...');
        config.isActive = false;
        await config.save();
        throw new Error('Failed to update LOCAL config to bucket storage. Config is still LOCAL. Please run: npm run configure:supabase');
      }
    } else if (googleProjectId && googleBucketName) {
      console.log('⚠️  Updating LOCAL storage to bucket storage (Google Cloud)...');
      config.provider = STORAGE_PROVIDERS.GOOGLE_CLOUD;
      config.googleCloud = {
        bucketName: googleBucketName,
        projectId: googleProjectId,
        keyFilename: googleKeyFilename || undefined
      };
      await config.save();
      console.log('✅ Updated to bucket storage configuration (Google Cloud)');
      // Reload to ensure changes are saved
      config = await this.findOne({ isActive: true });
      // Verify reloaded config is NOT LOCAL
      if (config && config.provider === STORAGE_PROVIDERS.LOCAL) {
        console.error('❌ CRITICAL: Reloaded config is still LOCAL! Deactivating...');
        config.isActive = false;
        await config.save();
        throw new Error('Failed to update LOCAL config to bucket storage. Config is still LOCAL. Please run: npm run configure:supabase');
      }
    } else if (azureAccountName && azureContainerName) {
      console.log('⚠️  Updating LOCAL storage to bucket storage (Azure Blob)...');
      config.provider = STORAGE_PROVIDERS.AZURE_BLOB;
      config.azureBlob = {
        accountName: azureAccountName,
        containerName: azureContainerName,
        connectionString: azureConnectionString || undefined
      };
      await config.save();
      console.log('✅ Updated to bucket storage configuration (Azure Blob)');
      // Reload to ensure changes are saved
      config = await this.findOne({ isActive: true });
      // Verify reloaded config is NOT LOCAL
      if (config && config.provider === STORAGE_PROVIDERS.LOCAL) {
        console.error('❌ CRITICAL: Reloaded config is still LOCAL! Deactivating...');
        config.isActive = false;
        await config.save();
        throw new Error('Failed to update LOCAL config to bucket storage. Config is still LOCAL. Please run: npm run configure:supabase');
      }
    } else {
      // Existing LOCAL config but no bucket credentials - FORCE update or disable
      console.error('❌ CRITICAL ERROR: LOCAL storage config found but no bucket credentials available!');
      console.error('   Files CANNOT be stored in uploads folder. Disabling LOCAL config...');
      
      // Deactivate LOCAL config
      config.isActive = false;
      await config.save();
      
      // Now throw error to prevent any file operations
      console.error('   Required environment variables for AWS S3/Supabase:');
      console.error('     - SUPABASE_ACCESS_KEY_ID or AWS_ACCESS_KEY_ID');
      console.error('     - SUPABASE_SECRET_ACCESS_KEY or AWS_SECRET_ACCESS_KEY');
      console.error('   Optional: SUPABASE_STORAGE_ENDPOINT, SUPABASE_BUCKET_NAME, SUPABASE_REGION');
      console.error('   Please set bucket credentials in environment variables before uploading files.');
      console.error('   OR run: npm run configure:supabase (after setting SUPABASE_SECRET_ACCESS_KEY)');
      
      throw new Error('Bucket storage configuration required. LOCAL storage is disabled. Files cannot be stored in uploads folder. Please set SUPABASE_ACCESS_KEY_ID and SUPABASE_SECRET_ACCESS_KEY in environment variables or run: npm run configure:supabase');
    }
  }
  
  // FINAL CHECK: Ensure config is NOT LOCAL before returning
  if (config && config.provider === STORAGE_PROVIDERS.LOCAL) {
    console.error('❌ CRITICAL: Config is still LOCAL after update attempt!');
    console.error('   Deactivating invalid LOCAL config...');
    
    // Deactivate the LOCAL config
    config.isActive = false;
    await config.save();
    
    throw new Error('Invalid storage configuration: LOCAL storage is not allowed. The LOCAL config has been disabled. Please configure bucket storage using: npm run configure:supabase (after setting SUPABASE_SECRET_ACCESS_KEY in .env)');
  }
  
  // Verify config has valid bucket settings before returning
  if (config) {
    if (config.provider === STORAGE_PROVIDERS.AWS_S3 && (!config.awsS3 || !config.awsS3.bucketName || !config.awsS3.accessKeyId || !config.awsS3.secretAccessKey)) {
      console.error('❌ ERROR: AWS S3/Supabase config is incomplete!');
      throw new Error('Invalid bucket storage configuration. AWS S3/Supabase config is missing required fields (bucketName, accessKeyId, secretAccessKey). Please run: npm run configure:supabase');
    }
    if (config.provider === STORAGE_PROVIDERS.GOOGLE_CLOUD && (!config.googleCloud || !config.googleCloud.bucketName || !config.googleCloud.projectId)) {
      console.error('❌ ERROR: Google Cloud config is incomplete!');
      throw new Error('Invalid bucket storage configuration. Google Cloud config is missing required fields.');
    }
    if (config.provider === STORAGE_PROVIDERS.AZURE_BLOB && (!config.azureBlob || !config.azureBlob.containerName || (!config.azureBlob.accountName && !config.azureBlob.connectionString))) {
      console.error('❌ ERROR: Azure Blob config is incomplete!');
      throw new Error('Invalid bucket storage configuration. Azure Blob config is missing required fields.');
    }
  }
  
  // If no active config exists, check if we have an existing bucket config to activate
  if (!config) {
    // Check if existingBucketConfig found earlier is valid and can be activated
    if (existingBucketConfig && existingBucketConfig.provider === STORAGE_PROVIDERS.AWS_S3 && 
        existingBucketConfig.awsS3 && existingBucketConfig.awsS3.bucketName && 
        existingBucketConfig.awsS3.accessKeyId && existingBucketConfig.awsS3.secretAccessKey) {
      console.log('📋 No active config found. Activating existing bucket config from database...');
      existingBucketConfig.isActive = true;
      await existingBucketConfig.save();
      config = existingBucketConfig;
      console.log('✅ Activated existing bucket storage configuration (Supabase)');
    } else if (awsAccessKeyId && awsSecretAccessKey) {
      // Use AWS S3 (or S3-compatible like Supabase)
      config = await this.create({
        provider: STORAGE_PROVIDERS.AWS_S3,
        awsS3: {
          bucketName,
          region,
          accessKeyId: awsAccessKeyId,
          secretAccessKey: awsSecretAccessKey,
          endpoint: endpoint || undefined
        },
        maxFileSizes: {
          images: FILE_SIZE_LIMITS.IMAGE_MAX_SIZE, // 10MB
          documents: FILE_SIZE_LIMITS.DOCUMENT_MAX_SIZE, // 20MB
          videos: FILE_SIZE_LIMITS.VIDEO_MAX_SIZE || 50 * 1024 * 1024 // 50MB
        },
        allowedFormats: {
          images: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
          documents: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
          videos: ['video/mp4', 'video/mpeg', 'video/quicktime']
        }
      });
      console.log('✅ Created bucket storage configuration (AWS S3/Supabase)');
    } else if (googleProjectId && googleBucketName) {
      // Use Google Cloud Storage
      config = await this.create({
        provider: STORAGE_PROVIDERS.GOOGLE_CLOUD,
        googleCloud: {
          bucketName: googleBucketName,
          projectId: googleProjectId,
          keyFilename: googleKeyFilename || undefined
        },
        maxFileSizes: {
          images: FILE_SIZE_LIMITS.IMAGE_MAX_SIZE, // 10MB
          documents: FILE_SIZE_LIMITS.DOCUMENT_MAX_SIZE, // 20MB
          videos: FILE_SIZE_LIMITS.VIDEO_MAX_SIZE || 50 * 1024 * 1024 // 50MB
        },
        allowedFormats: {
          images: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
          documents: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
          videos: ['video/mp4', 'video/mpeg', 'video/quicktime']
        }
      });
      console.log('✅ Created bucket storage configuration (Google Cloud)');
    } else if (azureAccountName && azureContainerName) {
      // Use Azure Blob Storage
      config = await this.create({
        provider: STORAGE_PROVIDERS.AZURE_BLOB,
        azureBlob: {
          accountName: azureAccountName,
          containerName: azureContainerName,
          connectionString: azureConnectionString || undefined
        },
        maxFileSizes: {
          images: FILE_SIZE_LIMITS.IMAGE_MAX_SIZE, // 10MB
          documents: FILE_SIZE_LIMITS.DOCUMENT_MAX_SIZE, // 20MB
          videos: FILE_SIZE_LIMITS.VIDEO_MAX_SIZE || 50 * 1024 * 1024 // 50MB
        },
        allowedFormats: {
          images: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
          documents: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
          videos: ['video/mp4', 'video/mpeg', 'video/quicktime']
        }
      });
      console.log('✅ Created bucket storage configuration (Azure Blob)');
    } else {
      // No bucket credentials found - throw error to force bucket configuration
      console.error('❌ ERROR: No bucket storage credentials found in environment variables!');
      console.error('   Files cannot be uploaded to local storage. Please configure bucket storage.');
      console.error('   Required environment variables for AWS S3/Supabase:');
      console.error('     - SUPABASE_ACCESS_KEY_ID or AWS_ACCESS_KEY_ID');
      console.error('     - SUPABASE_SECRET_ACCESS_KEY or AWS_SECRET_ACCESS_KEY');
      console.error('   Optional: SUPABASE_STORAGE_ENDPOINT, SUPABASE_BUCKET_NAME, SUPABASE_REGION');
      throw new Error('Bucket storage configuration required. Please set bucket credentials in environment variables or configure storage via admin API.');
    }
    
    // After creating config, verify it's not LOCAL (should never happen, but double-check)
    if (config && config.provider === STORAGE_PROVIDERS.LOCAL) {
      console.error('❌ CRITICAL: Created config is LOCAL! This should never happen!');
      config.isActive = false;
      await config.save();
      throw new Error('Invalid storage configuration: Created config is LOCAL, which is not allowed. Please configure bucket storage.');
    }
  }
  
  // FINAL FINAL CHECK: Before returning, ensure config is valid and not LOCAL
  if (!config) {
    throw new Error('No active file storage configuration found. Please configure bucket storage.');
  }
  
  if (config.provider === STORAGE_PROVIDERS.LOCAL) {
    console.error('❌ CRITICAL: Final check - Config is LOCAL! Deactivating...');
    config.isActive = false;
    await config.save();
    throw new Error('Invalid storage configuration: Config is LOCAL, which is not allowed. Please configure bucket storage using: npm run configure:supabase');
  }
  
  return config;
};

export default mongoose.model('FileStorageConfig', fileStorageConfigSchema, 'file_storage_configs');

