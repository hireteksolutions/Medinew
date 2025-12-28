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
    await this.initializeProvider();
  }

  /**
   * Initialize the storage provider based on configuration
   */
  async initializeProvider() {
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
        this.provider = await this.initLocal();
        break;
    }
  }

  /**
   * Initialize AWS S3 provider
   */
  async initAWS() {
    try {
      const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = await import('@aws-sdk/client-s3');
      
      const s3Client = new S3Client({
        region: this.config.awsS3.region || 'us-east-1',
        credentials: {
          accessKeyId: this.config.awsS3.accessKeyId,
          secretAccessKey: this.config.awsS3.secretAccessKey
        },
        ...(this.config.awsS3.endpoint && { endpoint: this.config.awsS3.endpoint })
      });

      return {
        type: 'aws-s3',
        client: s3Client,
        bucket: this.config.awsS3.bucketName
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
   */
  async initLocal() {
    const uploadPath = this.config.local.uploadPath || path.join(__dirname, '../../uploads');
    
    // Ensure upload directory exists
    try {
      await fs.mkdir(uploadPath, { recursive: true });
      await fs.mkdir(path.join(uploadPath, 'images'), { recursive: true });
      await fs.mkdir(path.join(uploadPath, 'documents'), { recursive: true });
      await fs.mkdir(path.join(uploadPath, 'videos'), { recursive: true });
    } catch (error) {
      console.error('Failed to create upload directories:', error);
    }

    return {
      type: 'local',
      uploadPath,
      publicUrl: this.config.local.publicUrl || '/uploads'
    };
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

    switch (this.provider.type) {
      case 'aws-s3':
        ({ filePath, fileUrl, storageKey } = await this.uploadToS3(buffer, fileName, mimeType, fileType));
        break;
      case 'google-cloud':
        ({ filePath, fileUrl, storageKey } = await this.uploadToGCS(buffer, fileName, mimeType, fileType));
        break;
      case 'azure-blob':
        ({ filePath, fileUrl, storageKey } = await this.uploadToAzure(buffer, fileName, mimeType, fileType));
        break;
      case 'local':
      default:
        ({ filePath, fileUrl, storageKey } = await this.uploadToLocal(buffer, fileName, fileType));
        break;
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
   * Upload to AWS S3
   */
  async uploadToS3(buffer, fileName, mimeType, fileType) {
    const { PutObjectCommand } = await import('@aws-sdk/client-s3');
    const key = `${fileType}s/${fileName}`;

    await this.provider.client.send(new PutObjectCommand({
      Bucket: this.provider.bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      ACL: 'private'
    }));

    // Generate S3 URL - handle different region formats
    const region = this.config.awsS3.region || AWS_DEFAULTS.DEFAULT_REGION;
    let fileUrl;
    
    if (region === 'us-east-1') {
      // us-east-1 uses different URL format (no region in URL)
      fileUrl = `https://${this.provider.bucket}.s3.amazonaws.com/${key}`;
    } else {
      // Other regions include region in URL
      fileUrl = `https://${this.provider.bucket}.s3.${region}.amazonaws.com/${key}`;
    }
    
    // Use custom endpoint if provided
    if (this.config.awsS3.endpoint) {
      fileUrl = `${this.config.awsS3.endpoint}/${this.provider.bucket}/${key}`;
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
   */
  async uploadToLocal(buffer, fileName, fileType) {
    const uploadPath = this.provider.uploadPath;
    const subDir = fileType === 'image' ? 'images' : fileType === 'document' ? 'documents' : 'videos';
    const filePath = path.join(uploadPath, subDir, fileName);
    
    await fs.writeFile(filePath, buffer);

    const fileUrl = `${this.provider.publicUrl}/${subDir}/${fileName}`;
    
    return {
      filePath,
      fileUrl,
      storageKey: `${subDir}/${fileName}`
    };
  }

  /**
   * Download file from storage
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

    let buffer;

    switch (file.storageProvider) {
      case 'aws-s3':
        buffer = await this.downloadFromS3(file.storageKey);
        break;
      case 'google-cloud':
        buffer = await this.downloadFromGCS(file.storageKey);
        break;
      case 'azure-blob':
        buffer = await this.downloadFromAzure(file.storageKey);
        break;
      case 'local':
      default:
        buffer = await this.downloadFromLocal(file.filePath);
        break;
    }

    return {
      buffer,
      file
    };
  }

  /**
   * Download from AWS S3
   */
  async downloadFromS3(key) {
    const { GetObjectCommand } = await import('@aws-sdk/client-s3');
    const response = await this.provider.client.send(new GetObjectCommand({
      Bucket: this.provider.bucket,
      Key: key
    }));
    return Buffer.from(await response.Body.transformToByteArray());
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
   */
  async downloadFromLocal(filePath) {
    return await fs.readFile(filePath);
  }

  /**
   * Delete file from storage
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

    // Delete from storage
    switch (file.storageProvider) {
      case 'aws-s3':
        await this.deleteFromS3(file.storageKey);
        break;
      case 'google-cloud':
        await this.deleteFromGCS(file.storageKey);
        break;
      case 'azure-blob':
        await this.deleteFromAzure(file.storageKey);
        break;
      case 'local':
      default:
        await this.deleteFromLocal(file.filePath);
        break;
    }

    // Soft delete in database
    file.isActive = false;
    file.deletedAt = new Date();
    await file.save();

    return file;
  }

  /**
   * Delete from AWS S3
   */
  async deleteFromS3(key) {
    const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
    await this.provider.client.send(new DeleteObjectCommand({
      Bucket: this.provider.bucket,
      Key: key
    }));
  }

  /**
   * Delete from Google Cloud Storage
   */
  async deleteFromGCS(key) {
    const file = this.provider.bucket.file(key);
    await file.delete();
  }

  /**
   * Delete from Azure Blob Storage
   */
  async deleteFromAzure(key) {
    const containerClient = this.provider.client.getContainerClient(this.provider.container);
    const blockBlobClient = containerClient.getBlockBlobClient(key);
    await blockBlobClient.delete();
  }

  /**
   * Delete from Local storage
   */
  async deleteFromLocal(filePath) {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.error('Failed to delete local file:', error);
    }
  }
}

// Export singleton instance
const fileStorageService = new FileStorageService();
export default fileStorageService;

