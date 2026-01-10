import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import FileStorageConfig from '../models/FileStorageConfig.js';
import File from '../models/File.js';
import { STORAGE_PROVIDERS } from '../constants/index.js';
import { CRYPTO, STRING_LIMITS, AWS_DEFAULTS } from '../constants/numeric.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Base File Storage Service
 * Supports multiple storage providers: Local, AWS S3, Google Cloud Storage, Azure Blob
 */
class FileStorageService {
  constructor() {
    this.config = null;
    this.provider = null;
  }

  /**
   * Initialize the service with active configuration
   */
  async initialize() {
    this.config = await FileStorageConfig.getActiveConfig();
    
    // CRITICAL: Ensure config is NOT LOCAL before proceeding
    if (!this.config) {
      throw new Error('File storage configuration not found. Please configure bucket storage.');
    }
    
    if (this.config.provider === STORAGE_PROVIDERS.LOCAL) {
      console.error('❌ CRITICAL ERROR: FileStorageConfig returned LOCAL storage!');
      console.error('   This should never happen. FileStorageConfig.getActiveConfig() should prevent this.');
      throw new Error('Local file storage is not allowed. Configuration returned LOCAL storage. Please configure bucket storage (Supabase/AWS S3/Google Cloud/Azure) in environment variables or via admin API.');
    }
    
    await this.initializeProvider();
    
    // FINAL VERIFICATION: Ensure provider is initialized correctly
    if (!this.provider) {
      throw new Error('File storage provider not initialized. Please check your bucket storage configuration.');
    }
    
    if (this.provider.type === 'local') {
      console.error('❌ CRITICAL ERROR: Provider initialized as LOCAL!');
      throw new Error('Local file storage is not allowed. Provider was initialized as LOCAL. Please configure bucket storage.');
    }
    
    console.log(`✅ File storage service initialized with provider: ${this.config.provider} (type: ${this.provider.type})`);
  }

  /**
   * Initialize the storage provider based on configuration
   */
  async initializeProvider() {
    // Prevent LOCAL storage - always require bucket storage
    if (this.config.provider === STORAGE_PROVIDERS.LOCAL) {
      console.error('❌ ERROR: Cannot use LOCAL storage! Bucket storage is required.');
      throw new Error('Local file storage is not allowed. Please configure bucket storage (Supabase/AWS S3/Google Cloud/Azure) in environment variables or via admin API.');
    }

    switch (this.config.provider) {
      case STORAGE_PROVIDERS.AWS_S3:
        this.provider = await this.initAWS();
        break;
      case STORAGE_PROVIDERS.GOOGLE_CLOUD:
        this.provider = await this.initGoogleCloud();
        break;
      case STORAGE_PROVIDERS.AZURE_BLOB:
        this.provider = await this.initAzure();
        break;
      case STORAGE_PROVIDERS.LOCAL:
      default:
        // This should never be reached due to check above, but throw error just in case
        throw new Error('Local file storage is not allowed. Please configure bucket storage.');
    }
  }

  /**
   * Initialize AWS S3 provider (also supports S3-compatible services like Supabase)
   */
  async initAWS() {
    try {
      const { S3Client } = await import('@aws-sdk/client-s3');
      
      const s3Config = {
        region: this.config.awsS3.region || 'us-east-1',
        credentials: {
          accessKeyId: this.config.awsS3.accessKeyId,
          secretAccessKey: this.config.awsS3.secretAccessKey
        }
      };

      // For S3-compatible services (like Supabase), add custom endpoint
      if (this.config.awsS3.endpoint) {
        s3Config.endpoint = this.config.awsS3.endpoint;
        // Force path style for S3-compatible services
        s3Config.forcePathStyle = true;
      }

      const s3Client = new S3Client(s3Config);

      return {
        type: 'aws-s3',
        client: s3Client,
        bucket: this.config.awsS3.bucketName,
        endpoint: this.config.awsS3.endpoint,
        region: this.config.awsS3.region
      };
    } catch (error) {
      console.error('AWS S3 initialization failed:', error);
      throw new Error('AWS S3 configuration error');
    }
  }

  /**
   * Initialize Google Cloud Storage provider
   */
  async initGoogleCloud() {
    try {
      const { Storage } = await import('@google-cloud/storage');
      
      const storage = new Storage({
        projectId: this.config.googleCloud.projectId,
        ...(this.config.googleCloud.keyFilename && { keyFilename: this.config.googleCloud.keyFilename }),
        ...(this.config.googleCloud.credentials && { credentials: this.config.googleCloud.credentials })
      });

      return {
        type: 'google-cloud',
        client: storage,
        bucket: storage.bucket(this.config.googleCloud.bucketName)
      };
    } catch (error) {
      console.error('Google Cloud Storage initialization failed:', error);
      throw new Error('Google Cloud Storage configuration error');
    }
  }

  /**
   * Initialize Azure Blob Storage provider
   */
  async initAzure() {
    try {
      const { BlobServiceClient } = await import('@azure/storage-blob');
      
      const blobServiceClient = this.config.azureBlob.connectionString
        ? BlobServiceClient.fromConnectionString(this.config.azureBlob.connectionString)
        : new BlobServiceClient(
            `https://${this.config.azureBlob.accountName}.blob.core.windows.net`,
            new (await import('@azure/identity')).DefaultAzureCredential()
          );

      return {
        type: 'azure-blob',
        client: blobServiceClient,
        container: this.config.azureBlob.containerName
      };
    } catch (error) {
      console.error('Azure Blob Storage initialization failed:', error);
      throw new Error('Azure Blob Storage configuration error');
    }
  }

  /**
   * Initialize Local storage provider
   * NOTE: This method should NEVER be called as we require bucket storage.
   * It throws an error to prevent accidental local storage usage.
   */
  async initLocal() {
    console.error('❌ ERROR: Attempted to initialize local storage!');
    console.error('   Files must be stored in bucket storage (Supabase/AWS S3/Google Cloud/Azure).');
    console.error('   Current config provider:', this.config?.provider);
    throw new Error('Local file storage is not allowed. Files must be stored in bucket storage. Please configure bucket storage credentials in environment variables or via admin API.');
  }

  /**
   * Generate unique file name
   */
  generateFileName(originalName, userId) {
    const ext = path.extname(originalName);
    const baseName = path.basename(originalName, ext);
    const timestamp = Date.now();
    const random = crypto.randomBytes(CRYPTO.RANDOM_BYTES_LENGTH).toString('hex');
    const sanitizedBase = baseName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, STRING_LIMITS.FILENAME_BASE_MAX);
    return `${userId}_${timestamp}_${random}_${sanitizedBase}${ext}`;
  }

  /**
   * Calculate file hash
   */
  async calculateFileHash(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Determine file type from mime type
   */
  getFileType(mimeType) {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('word') || mimeType.includes('excel')) {
      return 'document';
    }
    return 'other';
  }

  /**
   * Upload file to storage
   */
  async uploadFile(buffer, originalName, mimeType, userId, metadata = {}) {
    if (!this.config) {
      await this.initialize();
    }

    const fileType = this.getFileType(mimeType);
    const fileName = this.generateFileName(originalName, userId);
    const fileHash = await this.calculateFileHash(buffer);

    let filePath, fileUrl, storageKey;

    // CRITICAL: Ensure provider is initialized
    if (!this.provider) {
      throw new Error('File storage provider not initialized. Please check your bucket storage configuration.');
    }

    // CRITICAL: Ensure we're not using LOCAL storage - multiple checks
    if (this.config.provider === STORAGE_PROVIDERS.LOCAL || 
        this.config.provider === 'local' || 
        this.provider.type === 'local' || 
        this.provider.type === STORAGE_PROVIDERS.LOCAL) {
      console.error('❌ CRITICAL: Attempted upload with LOCAL storage!');
      console.error('   Config provider:', this.config.provider);
      console.error('   Provider type:', this.provider.type);
      throw new Error('Local file storage is not allowed. Files must be uploaded to bucket storage. Please configure bucket storage credentials in environment variables or run: npm run configure:supabase');
    }

    switch (this.provider.type) {
      case 'aws-s3':
        ({ filePath, fileUrl, storageKey } = await this.uploadToS3(buffer, fileName, mimeType, fileType, metadata));
        break;
      case 'google-cloud':
        ({ filePath, fileUrl, storageKey } = await this.uploadToGCS(buffer, fileName, mimeType, fileType));
        break;
      case 'azure-blob':
        ({ filePath, fileUrl, storageKey } = await this.uploadToAzure(buffer, fileName, mimeType, fileType));
        break;
      case 'local':
      case STORAGE_PROVIDERS.LOCAL:
      default:
        // This should never be reached due to checks above, but throw error just in case
        console.error('❌ CRITICAL: Reached LOCAL case in switch statement!');
        console.error('   Provider type:', this.provider.type);
        console.error('   Config provider:', this.config.provider);
        throw new Error('Local file storage is not allowed. Files must be uploaded to bucket storage. This should never happen - please check your configuration.');
    }

    // Save file metadata to database
    const file = await File.create({
      originalName,
      fileName,
      filePath,
      fileUrl,
      mimeType,
      size: buffer.length,
      fileType,
      storageProvider: this.config.provider,
      bucketName: this.provider.bucket || this.provider.container,
      storageKey,
      fileHash,
      uploadedBy: userId,
      metadata,
      isPublic: metadata.isPublic || false
    });

    return file;
  }

  /**
   * Upload to AWS S3 (or S3-compatible service like Supabase)
   */
  async uploadToS3(buffer, fileName, mimeType, fileType, metadata = {}) {
    const { PutObjectCommand } = await import('@aws-sdk/client-s3');
    const key = `${fileType}s/${fileName}`;

    // Determine ACL: use 'public-read' if metadata.isPublic is true, otherwise 'private'
    // For profile images and public content, use 'public-read' so files are accessible via URL
    // NOTE: For Supabase, even with ACL 'public-read', the bucket itself must be public for public URLs to work
    const acl = metadata.isPublic === true ? 'public-read' : 'private';

    const putCommand = {
      Bucket: this.provider.bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType
    };

    // For Supabase Storage S3-compatible API:
    // - If bucket is PUBLIC: ACL 'public-read' makes files accessible via public URL
    // - If bucket is PRIVATE: ACL is ignored, must use signed URLs
    // Try to set ACL for public files - works if bucket supports it
    if (metadata.isPublic === true) {
      // For public files (like profile images), set ACL 'public-read'
      // This works if bucket is public, otherwise we'll use signed URLs
      putCommand.ACL = 'public-read';
    }
    // For private files, don't set ACL (will use signed URLs)

    await this.provider.client.send(new PutObjectCommand(putCommand));
    
    console.log(`✅ Uploaded to S3/Supabase bucket: ${this.provider.bucket}/${key} (isPublic: ${metadata.isPublic || false}, ACL: ${putCommand.ACL || 'not set'})`);

    // Generate file URL
    let fileUrl;
    
    // If custom endpoint is provided (Supabase or other S3-compatible), use it
    if (this.provider.endpoint) {
      // Check if this is Supabase Storage (endpoint contains 'storage.supabase.co' or 'supabase.co')
      const endpointUrl = new URL(this.provider.endpoint);
      
      if (endpointUrl.hostname.includes('supabase.co')) {
        // For Supabase Storage:
        // - S3 API endpoint: https://xxx.storage.supabase.co/storage/v1/s3 (for API calls)
        // - Public URL format: https://[project-ref].supabase.co/storage/v1/object/public/[bucket]/[key]
        // Extract project ref from hostname
        // Hostname format: [project-ref].storage.supabase.co or [project-ref].supabase.co
        let projectRef;
        if (endpointUrl.hostname.includes('.storage.supabase.co')) {
          projectRef = endpointUrl.hostname.split('.storage.supabase.co')[0];
        } else if (endpointUrl.hostname.includes('.supabase.co')) {
          projectRef = endpointUrl.hostname.split('.supabase.co')[0];
        } else {
          // Fallback: take first part before first dot
          projectRef = endpointUrl.hostname.split('.')[0];
        }
        
        console.log(`🔗 Generating Supabase URL for project: ${projectRef}, bucket: ${this.provider.bucket}, key: ${key}`);
        
        // For Supabase, public files use: https://[project-ref].supabase.co/storage/v1/object/public/[bucket]/[key]
        // NOTE: The bucket must be public in Supabase settings for this URL to work
        // If bucket is private, files will need signed URLs (use generateSignedUrl method)
        fileUrl = `https://${projectRef}.supabase.co/storage/v1/object/public/${this.provider.bucket}/${key}`;
        
        console.log(`✅ Generated Supabase public URL: ${fileUrl}`);
      } else {
        // Other S3-compatible services: use endpoint directly
        fileUrl = `${this.provider.endpoint}/${this.provider.bucket}/${key}`;
      }
    } else {
      // Standard AWS S3 URL generation
      const region = this.provider.region || AWS_DEFAULTS.DEFAULT_REGION;
      
      if (region === 'us-east-1') {
        // us-east-1 uses different URL format (no region in URL)
        fileUrl = `https://${this.provider.bucket}.s3.amazonaws.com/${key}`;
      } else {
        // Other regions include region in URL
        fileUrl = `https://${this.provider.bucket}.s3.${region}.amazonaws.com/${key}`;
      }
    }
    
    return {
      filePath: key,
      fileUrl: this.config.cdn?.enabled ? `${this.config.cdn.url}/${key}` : fileUrl,
      storageKey: key
    };
  }

  /**
   * Upload to Google Cloud Storage
   */
  async uploadToGCS(buffer, fileName, mimeType, fileType) {
    const key = `${fileType}s/${fileName}`;
    const file = this.provider.bucket.file(key);

    await file.save(buffer, {
      contentType: mimeType,
      metadata: {
        cacheControl: 'public, max-age=31536000'
      }
    });

    await file.makePrivate(); // Make private by default

    const fileUrl = `https://storage.googleapis.com/${this.config.googleCloud.bucketName}/${key}`;
    
    return {
      filePath: key,
      fileUrl: this.config.cdn?.enabled ? `${this.config.cdn.url}/${key}` : fileUrl,
      storageKey: key
    };
  }

  /**
   * Upload to Azure Blob Storage
   */
  async uploadToAzure(buffer, fileName, mimeType, fileType) {
    const containerClient = this.provider.client.getContainerClient(this.provider.container);
    const key = `${fileType}s/${fileName}`;
    const blockBlobClient = containerClient.getBlockBlobClient(key);

    await blockBlobClient.upload(buffer, buffer.length, {
      blobHTTPHeaders: { blobContentType: mimeType }
    });

    const fileUrl = blockBlobClient.url;
    
    return {
      filePath: key,
      fileUrl: this.config.cdn?.enabled ? `${this.config.cdn.url}/${key}` : fileUrl,
      storageKey: key
    };
  }

  /**
   * Upload to Local storage
   * NOTE: This method should NEVER be called as we require bucket storage.
   * It throws an error to prevent accidental local storage usage.
   */
  async uploadToLocal(buffer, fileName, fileType) {
    console.error('❌ ERROR: Attempted to upload to local storage!');
    console.error('   Files must be stored in bucket storage (Supabase/AWS S3/Google Cloud/Azure).');
    console.error('   Current provider:', this.config?.provider);
    throw new Error('Local file storage is not allowed. Files must be uploaded to bucket storage. Please configure bucket storage credentials in environment variables.');
  }

  /**
   * Download file from storage by file ID
   */
  async downloadFile(fileId, userId = null) {
    const file = await File.findById(fileId);
    if (!file || !file.isActive) {
      throw new Error('File not found');
    }

    // Check access permissions
    if (!file.isPublic && file.uploadedBy.toString() !== userId?.toString()) {
      throw new Error('Access denied');
    }

    // Download using storageKey (path in bucket)
    const buffer = await this.downloadFileByPath(file.storageKey, file.storageProvider);

    return {
      buffer,
      file
    };
  }

  /**
   * Download file from storage by path/storageKey
   * This allows downloading files directly using the stored path in database
   * The storageKey is the path/key used in the bucket (e.g., "images/filename.jpg")
   */
  async downloadFileByPath(storageKey, storageProvider = null) {
    if (!this.config) {
      await this.initialize();
    }

    // If storageProvider not provided, use configured provider
    const provider = storageProvider || this.config.provider;
    
    // Ensure provider is initialized
    if (!this.provider || this.provider.type !== provider) {
      await this.initializeProvider();
    }

    let buffer;

    switch (provider) {
      case 'aws-s3':
      case STORAGE_PROVIDERS.AWS_S3:
        buffer = await this.downloadFromS3(storageKey);
        break;
      case 'google-cloud':
      case STORAGE_PROVIDERS.GOOGLE_CLOUD:
        buffer = await this.downloadFromGCS(storageKey);
        break;
      case 'azure-blob':
      case STORAGE_PROVIDERS.AZURE_BLOB:
        buffer = await this.downloadFromAzure(storageKey);
        break;
      case 'local':
      case STORAGE_PROVIDERS.LOCAL:
      default:
        // Local storage not allowed - throw error
        throw new Error('Local file storage is not allowed. Files must be stored in bucket storage.');
    }

    return buffer;
  }

  /**
   * Generate signed URL for file download (for Supabase/S3 bucket files)
   * This allows direct access to files without going through the API
   */
  async generateSignedUrl(fileId, expiresIn = 3600) {
    const file = await File.findById(fileId);
    if (!file || !file.isActive) {
      throw new Error('File not found');
    }

    if (!this.config) {
      await this.initialize();
    }

    switch (file.storageProvider) {
      case 'aws-s3':
      case STORAGE_PROVIDERS.AWS_S3:
        return await this.generateS3SignedUrl(file.storageKey, expiresIn);
      case 'google-cloud':
      case STORAGE_PROVIDERS.GOOGLE_CLOUD:
        return await this.generateGCSSignedUrl(file.storageKey, expiresIn);
      case 'azure-blob':
      case STORAGE_PROVIDERS.AZURE_BLOB:
        return await this.generateAzureSignedUrl(file.storageKey, expiresIn);
      default:
        // For local storage, return the fileUrl
        return file.fileUrl;
    }
  }

  /**
   * Download from AWS S3 (or S3-compatible service like Supabase)
   */
  async downloadFromS3(key) {
    if (!this.provider || !this.provider.client) {
      throw new Error('Storage provider not initialized. Cannot download file from bucket.');
    }

    if (!key) {
      throw new Error('Storage key is required to download file from bucket.');
    }

    try {
      const { GetObjectCommand } = await import('@aws-sdk/client-s3');
      
      const command = new GetObjectCommand({
        Bucket: this.provider.bucket,
        Key: key
      });
      
      const response = await this.provider.client.send(command);
      
      // Convert stream to buffer
      const buffer = Buffer.from(await response.Body.transformToByteArray());
      console.log(`✅ Downloaded from S3/Supabase bucket: ${this.provider.bucket}/${key} (${buffer.length} bytes)`);
      
      return buffer;
    } catch (error) {
      console.error(`❌ Failed to download from S3/Supabase bucket: ${this.provider.bucket}/${key}`, error);
      
      // Check for specific error types
      const statusCode = error.$metadata?.httpStatusCode || error.statusCode || error.code;
      const errorCode = error.Code || error.code;
      
      if (statusCode === 404 || errorCode === 'NoSuchKey' || error.name === 'NoSuchKey') {
        throw new Error('File not found in bucket');
      } else if (statusCode === 403 || errorCode === 'AccessDenied' || errorCode === 'Forbidden' || error.name === 'Forbidden') {
        console.error(`❌ 403 Forbidden: File is private in bucket. Bucket: ${this.provider.bucket}, Key: ${key}`);
        console.error(`   For private buckets, use signed URLs: /api/files/${key}/signed-url`);
        throw new Error('Access denied (403). File is private and bucket may be private. Use signed URL endpoint instead: GET /api/files/:id/signed-url');
      }
      
      throw new Error(`Failed to download file from bucket: ${error.message || error.name || 'Unknown error'}`);
    }
  }

  /**
   * Download from Google Cloud Storage
   */
  async downloadFromGCS(key) {
    const file = this.provider.bucket.file(key);
    const [buffer] = await file.download();
    return buffer;
  }

  /**
   * Download from Azure Blob Storage
   */
  async downloadFromAzure(key) {
    const containerClient = this.provider.client.getContainerClient(this.provider.container);
    const blockBlobClient = containerClient.getBlockBlobClient(key);
    const downloadResponse = await blockBlobClient.download(0);
    const chunks = [];
    for await (const chunk of downloadResponse.readableStreamBody) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }

  /**
   * Download from Local storage
   * NOTE: This method should NEVER be called as we require bucket storage.
   * It throws an error to prevent accidental local storage usage.
   */
  async downloadFromLocal(filePath) {
    console.error('❌ ERROR: Attempted to download from local storage!');
    console.error('   Files must be stored in bucket storage (Supabase/AWS S3/Google Cloud/Azure).');
    throw new Error('Local file storage is not allowed. Files must be stored in bucket storage.');
  }

  /**
   * Generate signed URL for S3/Supabase bucket
   */
  async generateS3SignedUrl(key, expiresIn = 3600) {
    if (!this.provider || !this.provider.client) {
      throw new Error('Storage provider not initialized. Cannot generate signed URL.');
    }

    if (!key) {
      throw new Error('Storage key is required to generate signed URL.');
    }

    try {
      const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
      const { GetObjectCommand } = await import('@aws-sdk/client-s3');

      const command = new GetObjectCommand({
        Bucket: this.provider.bucket,
        Key: key
      });

      // Generate signed URL that works for both AWS S3 and Supabase
      const signedUrl = await getSignedUrl(this.provider.client, command, { 
        expiresIn 
      });
      
      console.log(`✅ Generated signed URL for: ${this.provider.bucket}/${key} (expires in ${expiresIn}s)`);
      return signedUrl;
    } catch (error) {
      console.error(`❌ Failed to generate signed URL for: ${this.provider.bucket}/${key}`, error);
      throw new Error(`Failed to generate signed URL: ${error.message}`);
    }
  }

  /**
   * Generate signed URL for Google Cloud Storage
   */
  async generateGCSSignedUrl(key, expiresIn = 3600) {
    const file = this.provider.bucket.file(key);
    const [signedUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + expiresIn * 1000
    });
    return signedUrl;
  }

  /**
   * Generate signed URL for Azure Blob Storage
   */
  async generateAzureSignedUrl(key, expiresIn = 3600) {
    const containerClient = this.provider.client.getContainerClient(this.provider.container);
    const blockBlobClient = containerClient.getBlockBlobClient(key);
    const startDate = new Date();
    const expiryDate = new Date(startDate);
    expiryDate.setSeconds(expiryDate.getSeconds() + expiresIn);

    const sasUrl = await blockBlobClient.generateSasUrl({
      permissions: 'r', // read permission
      expiresOn: expiryDate
    });
    return sasUrl;
  }

  /**
   * Delete file from storage and database
   */
  async deleteFile(fileId, userId) {
    const file = await File.findById(fileId);
    if (!file) {
      throw new Error('File not found');
    }

    // Check ownership
    if (file.uploadedBy.toString() !== userId.toString()) {
      throw new Error('Access denied');
    }

    // Ensure service is initialized
    if (!this.config || !this.provider) {
      await this.initialize();
    }

    // CRITICAL: Ensure we're not using LOCAL storage
    if (file.storageProvider === STORAGE_PROVIDERS.LOCAL || file.storageProvider === 'local') {
      console.error('❌ ERROR: Attempted to delete file from LOCAL storage!');
      throw new Error('Local file storage is not allowed. Files must be stored in bucket storage.');
    }

    // Verify storage provider matches config
    if (this.config.provider !== file.storageProvider && 
        !(this.config.provider === STORAGE_PROVIDERS.AWS_S3 && file.storageProvider === 'aws-s3')) {
      console.warn(`⚠️  Storage provider mismatch: config=${this.config.provider}, file=${file.storageProvider}`);
    }

    // Delete from bucket storage FIRST (before soft-deleting in database)
    // This ensures if bucket deletion fails, the database record remains intact
    try {
      console.log(`🗑️  Deleting file from bucket: ${file.storageKey} (provider: ${file.storageProvider})`);
      
      switch (file.storageProvider) {
        case 'aws-s3':
        case STORAGE_PROVIDERS.AWS_S3:
          await this.deleteFromS3(file.storageKey);
          console.log(`✅ Successfully deleted file from S3/Supabase bucket: ${file.storageKey}`);
          break;
        case 'google-cloud':
        case STORAGE_PROVIDERS.GOOGLE_CLOUD:
          await this.deleteFromGCS(file.storageKey);
          console.log(`✅ Successfully deleted file from Google Cloud Storage: ${file.storageKey}`);
          break;
        case 'azure-blob':
        case STORAGE_PROVIDERS.AZURE_BLOB:
          await this.deleteFromAzure(file.storageKey);
          console.log(`✅ Successfully deleted file from Azure Blob Storage: ${file.storageKey}`);
          break;
        case 'local':
        case STORAGE_PROVIDERS.LOCAL:
        default:
          // Local storage not allowed - throw error
          console.error('❌ ERROR: Invalid storage provider for deletion:', file.storageProvider);
          throw new Error('Local file storage is not allowed. Files must be stored in bucket storage.');
      }
    } catch (error) {
      console.error(`❌ Error deleting file from bucket: ${file.storageKey}`, error);
      // Re-throw error so database is not soft-deleted if bucket deletion fails
      throw new Error(`Failed to delete file from bucket: ${error.message}`);
    }

    // Only soft delete in database AFTER successful bucket deletion
    file.isActive = false;
    file.deletedAt = new Date();
    await file.save();
    
    console.log(`✅ File marked as deleted in database: ${file._id}`);

    return file;
  }

  /**
   * Delete from AWS S3 (or S3-compatible service like Supabase)
   */
  async deleteFromS3(key) {
    if (!this.provider || !this.provider.client) {
      throw new Error('Storage provider not initialized. Cannot delete file from bucket.');
    }

    if (!key) {
      throw new Error('Storage key is required to delete file from bucket.');
    }

    try {
      const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
      
      const command = new DeleteObjectCommand({
        Bucket: this.provider.bucket,
        Key: key
      });
      
      const response = await this.provider.client.send(command);
      console.log(`✅ Deleted from S3/Supabase bucket: ${this.provider.bucket}/${key}`, response);
      
      return response;
    } catch (error) {
      console.error(`❌ Failed to delete from S3/Supabase bucket: ${this.provider.bucket}/${key}`, error);
      throw new Error(`Bucket deletion failed: ${error.message}`);
    }
  }

  /**
   * Delete from Google Cloud Storage
   */
  async deleteFromGCS(key) {
    if (!this.provider || !this.provider.bucket) {
      throw new Error('Storage provider not initialized. Cannot delete file from bucket.');
    }

    if (!key) {
      throw new Error('Storage key is required to delete file from bucket.');
    }

    try {
      const file = this.provider.bucket.file(key);
      await file.delete();
      console.log(`✅ Deleted from Google Cloud Storage: ${key}`);
    } catch (error) {
      console.error(`❌ Failed to delete from Google Cloud Storage: ${key}`, error);
      throw new Error(`Bucket deletion failed: ${error.message}`);
    }
  }

  /**
   * Delete from Azure Blob Storage
   */
  async deleteFromAzure(key) {
    if (!this.provider || !this.provider.client || !this.provider.container) {
      throw new Error('Storage provider not initialized. Cannot delete file from bucket.');
    }

    if (!key) {
      throw new Error('Storage key is required to delete file from bucket.');
    }

    try {
      const containerClient = this.provider.client.getContainerClient(this.provider.container);
      const blockBlobClient = containerClient.getBlockBlobClient(key);
      await blockBlobClient.delete();
      console.log(`✅ Deleted from Azure Blob Storage: ${this.provider.container}/${key}`);
    } catch (error) {
      console.error(`❌ Failed to delete from Azure Blob Storage: ${this.provider.container}/${key}`, error);
      throw new Error(`Bucket deletion failed: ${error.message}`);
    }
  }

  /**
   * Delete from Local storage
   * NOTE: This method should NEVER be called as we require bucket storage.
   * It throws an error to prevent accidental local storage usage.
   */
  async deleteFromLocal(filePath) {
    console.error('❌ ERROR: Attempted to delete from local storage!');
    console.error('   Files must be stored in bucket storage (Supabase/AWS S3/Google Cloud/Azure).');
    throw new Error('Local file storage is not allowed. Files must be stored in bucket storage.');
  }
}

// Export singleton instance
const fileStorageService = new FileStorageService();
export default fileStorageService;

