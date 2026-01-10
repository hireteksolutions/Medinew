import fileStorageService from '../services/fileStorageService.js';
import virusScanService from '../services/virusScanService.js';
import File from '../models/File.js';
import { FILE_MESSAGES, AUTHZ_MESSAGES } from '../constants/messages.js';
import { RELATED_ENTITY_TYPE_VALUES } from '../constants/index.js';
import mongoose from 'mongoose';

/**
 * @desc    Upload file
 * @route   POST /api/files/upload
 * @access  Private
 */
export const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file provided' });
    }

    const { buffer, originalname, mimetype, size } = req.file;
    const userId = req.user._id;
    const { relatedEntityType, relatedEntityId, isPublic, metadata } = req.body;

    // Initialize services
    await fileStorageService.initialize();
    
    // CRITICAL: Double-check that we're not using LOCAL storage
    if (fileStorageService.config?.provider === 'local' || fileStorageService.provider?.type === 'local') {
      console.error('❌ CRITICAL: FileStorageService is using LOCAL storage!');
      return res.status(500).json({ 
        message: 'Local file storage is not allowed. Files must be uploaded to bucket storage. Please configure bucket storage (Supabase/AWS S3) using environment variables or the configureSupabaseStorage script.',
        error: 'LOCAL_STORAGE_NOT_ALLOWED'
      });
    }
    
    await virusScanService.initialize();

    // Upload file to storage
    const file = await fileStorageService.uploadFile(
      buffer,
      originalname,
      mimetype,
      userId,
      {
        relatedEntityType,
        relatedEntityId,
        isPublic: isPublic === 'true',
        ...(metadata && typeof metadata === 'string' ? JSON.parse(metadata) : metadata)
      }
    );

    // Update related entity if provided
    if (relatedEntityType && relatedEntityId) {
      // Validate relatedEntityType is in the enum
      if (!RELATED_ENTITY_TYPE_VALUES.includes(relatedEntityType)) {
        return res.status(400).json({ 
          message: `Invalid relatedEntityType: ${relatedEntityType}. Valid values are: ${RELATED_ENTITY_TYPE_VALUES.join(', ')}` 
        });
      }
      
      // Validate relatedEntityId is a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(relatedEntityId)) {
        return res.status(400).json({ 
          message: `Invalid relatedEntityId: ${relatedEntityId}. Must be a valid ObjectId.` 
        });
      }
      
      file.relatedEntity = {
        type: relatedEntityType,
        id: new mongoose.Types.ObjectId(relatedEntityId)
      };
      await file.save();
    }

    // Start virus scanning (async, non-blocking)
    virusScanService.scanFile(buffer, file._id).catch(error => {
      console.error('Virus scan error (non-blocking):', error);
    });

    // For Supabase private buckets, generate signed URL for immediate access
    // This ensures files are accessible even if bucket is private
    let signedUrl = null;
    try {
      if (file.storageProvider === 'aws-s3' || file.storageProvider === 'AWS_S3') {
        // Generate signed URL that works for both public and private Supabase buckets
        signedUrl = await fileStorageService.generateSignedUrl(file._id.toString(), 3600 * 24 * 7); // 7 days
        console.log(`✅ Generated signed URL for uploaded file: ${file.fileName}`);
      }
    } catch (signedUrlError) {
      console.warn(`⚠️  Could not generate signed URL (file may be accessible via public URL): ${signedUrlError.message}`);
      // Continue - file may still be accessible via public URL if bucket is public
    }

    res.status(201).json({
      message: FILE_MESSAGES.FILE_UPLOADED_SUCCESSFULLY || 'File uploaded successfully',
      file: {
        id: file._id,
        originalName: file.originalName,
        fileName: file.fileName,
        filePath: file.filePath, // Path stored in database (same as storageKey)
        storageKey: file.storageKey, // Key used in Supabase bucket
        fileUrl: signedUrl || file.fileUrl, // Use signed URL if available (for private buckets), otherwise public URL
        signedUrl: signedUrl, // Explicit signed URL (use this if bucket is private)
        publicUrl: file.fileUrl, // Public URL (use this if bucket is public)
        bucketName: file.bucketName, // Bucket name where file is stored
        storageProvider: file.storageProvider, // Storage provider (aws-s3 for Supabase)
        fileType: file.fileType,
        size: file.size,
        mimeType: file.mimeType,
        virusScanStatus: file.virusScanStatus,
        isPublic: file.isPublic || false
      }
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ 
      message: error.message || 'File upload failed',
      error: error.message
    });
  }
};

/**
 * @desc    Upload multiple files
 * @route   POST /api/files/upload-multiple
 * @access  Private
 */
export const uploadMultipleFiles = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files provided' });
    }

    const userId = req.user._id;
    const { relatedEntityType, relatedEntityId, isPublic } = req.body;

    // Initialize services
    await fileStorageService.initialize();
    await virusScanService.initialize();

    const uploadedFiles = [];

    // Upload all files
    for (const fileData of req.files) {
      try {
        const file = await fileStorageService.uploadFile(
          fileData.buffer,
          fileData.originalname,
          fileData.mimetype,
          userId,
          {
            relatedEntityType,
            relatedEntityId,
            isPublic: isPublic === 'true'
          }
        );

        // Update related entity if provided
        if (relatedEntityType && relatedEntityId) {
          // Validate relatedEntityType is in the enum
          if (!RELATED_ENTITY_TYPE_VALUES.includes(relatedEntityType)) {
            console.error(`Invalid relatedEntityType: ${relatedEntityType} for file ${file._id}`);
            continue; // Skip this file and continue with others
          }
          
          // Validate relatedEntityId is a valid ObjectId
          if (!mongoose.Types.ObjectId.isValid(relatedEntityId)) {
            console.error(`Invalid relatedEntityId: ${relatedEntityId} for file ${file._id}`);
            continue; // Skip this file and continue with others
          }
          
          file.relatedEntity = {
            type: relatedEntityType,
            id: new mongoose.Types.ObjectId(relatedEntityId)
          };
          await file.save();
        }

        // Start virus scanning (async, non-blocking)
        virusScanService.scanFile(fileData.buffer, file._id).catch(error => {
          console.error('Virus scan error (non-blocking):', error);
        });

        uploadedFiles.push({
          id: file._id,
          originalName: file.originalName,
          fileName: file.fileName,
          fileUrl: file.fileUrl,
          fileType: file.fileType,
          size: file.size,
          mimeType: file.mimeType,
          virusScanStatus: file.virusScanStatus
        });
      } catch (error) {
        console.error(`Error uploading file ${fileData.originalname}:`, error);
        // Continue with other files
      }
    }

    res.status(201).json({
      message: `Successfully uploaded ${uploadedFiles.length} file(s)`,
      files: uploadedFiles,
      count: uploadedFiles.length
    });
  } catch (error) {
    console.error('Multiple file upload error:', error);
    res.status(500).json({ 
      message: error.message || 'File upload failed',
      error: error.message
    });
  }
};

/**
 * @desc    Download file
 * @route   GET /api/files/:id/download
 * @access  Private
 */
export const downloadFile = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    await fileStorageService.initialize();

    const { buffer, file } = await fileStorageService.downloadFile(id, userId);

    // Check virus scan status
    if (file.virusScanStatus === 'infected') {
      return res.status(403).json({ 
        message: 'File is infected and cannot be downloaded',
        virusScanStatus: file.virusScanStatus
      });
    }

    // Set headers
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
    res.setHeader('Content-Length', buffer.length);

    res.send(buffer);
  } catch (error) {
    console.error('File download error:', error);
    
    // Check for specific error types
    if (error.message === 'File not found') {
      return res.status(404).json({ 
        message: 'File not found',
        error: error.message
      });
    }
    
    if (error.message === 'Access denied' || error.message?.includes('403') || error.$metadata?.httpStatusCode === 403) {
      return res.status(403).json({ 
        message: 'Access denied. File may be private. Try using signed URL endpoint instead.',
        error: error.message
      });
    }
    
    return res.status(500).json({ 
      message: error.message || 'File download failed',
      error: error.message
    });
  }
};

/**
 * @desc    Download file by path/storageKey
 * @route   GET /api/files/download-by-path
 * @access  Private
 */
export const downloadFileByPath = async (req, res) => {
  try {
    const { path: storageKey, fileId } = req.query;
    const userId = req.user._id;

    if (!storageKey && !fileId) {
      return res.status(400).json({ message: 'Either path or fileId parameter is required' });
    }

    await fileStorageService.initialize();

    let file;
    let buffer;

    if (fileId) {
      // If fileId provided, get file from database and download by its storageKey
      file = await File.findById(fileId);
      if (!file || !file.isActive) {
        return res.status(404).json({ message: 'File not found' });
      }

      // Check access permissions
      if (!file.isPublic && file.uploadedBy.toString() !== userId.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }

      // Check virus scan status
      if (file.virusScanStatus === 'infected') {
        return res.status(403).json({ 
          message: 'File is infected and cannot be downloaded',
          virusScanStatus: file.virusScanStatus
        });
      }

      // Download using storageKey from database
      buffer = await fileStorageService.downloadFileByPath(file.storageKey, file.storageProvider);
    } else {
      // If only path provided, need to find file by storageKey first
      file = await File.findOne({ storageKey, isActive: true });
      
      if (!file) {
        return res.status(404).json({ message: 'File not found with the provided path' });
      }

      // Check access permissions
      if (!file.isPublic && file.uploadedBy.toString() !== userId.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }

      // Check virus scan status
      if (file.virusScanStatus === 'infected') {
        return res.status(403).json({ 
          message: 'File is infected and cannot be downloaded',
          virusScanStatus: file.virusScanStatus
        });
      }

      // Download using provided path
      buffer = await fileStorageService.downloadFileByPath(storageKey, file.storageProvider);
    }

    // Set headers
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
    res.setHeader('Content-Length', buffer.length);

    res.send(buffer);
  } catch (error) {
    console.error('File download by path error:', error);
    res.status(error.message === 'File not found' ? 404 : 
               error.message === 'Access denied' ? 403 : 500).json({ 
      message: error.message || 'File download failed',
      error: error.message
    });
  }
};

/**
 * @desc    Get signed URL for file download (direct access from bucket)
 * @route   GET /api/files/:id/signed-url
 * @access  Private
 */
export const getSignedUrl = async (req, res) => {
  try {
    const { id } = req.params;
    const { expiresIn = 3600 } = req.query; // Default 1 hour
    const userId = req.user._id;

    const file = await File.findById(id);
    if (!file || !file.isActive) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Check access permissions
    if (!file.isPublic && file.uploadedBy.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check virus scan status
    if (file.virusScanStatus === 'infected') {
      return res.status(403).json({ 
        message: 'File is infected and cannot be accessed',
        virusScanStatus: file.virusScanStatus
      });
    }

    await fileStorageService.initialize();
    const signedUrl = await fileStorageService.generateSignedUrl(id, parseInt(expiresIn));

    res.json({
      signedUrl,
      expiresIn: parseInt(expiresIn),
      file: {
        id: file._id,
        originalName: file.originalName,
        fileName: file.fileName,
        filePath: file.filePath,
        storageKey: file.storageKey,
        fileUrl: file.fileUrl
      }
    });
  } catch (error) {
    console.error('Get signed URL error:', error);
    res.status(500).json({ 
      message: error.message || 'Failed to generate signed URL',
      error: error.message
    });
  }
};

/**
 * @desc    Get file info
 * @route   GET /api/files/:id
 * @access  Private
 */
export const getFileInfo = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const file = await File.findById(id);
    if (!file || !file.isActive) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Check access
    if (!file.isPublic && file.uploadedBy.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({
      id: file._id,
      originalName: file.originalName,
      fileName: file.fileName,
      filePath: file.filePath, // Path stored in database
      storageKey: file.storageKey, // Key used in bucket (same as path)
      fileUrl: file.fileUrl,
      bucketName: file.bucketName,
      storageProvider: file.storageProvider,
      fileType: file.fileType,
      size: file.size,
      mimeType: file.mimeType,
      virusScanStatus: file.virusScanStatus,
      virusScanResult: file.virusScanResult,
      uploadedAt: file.createdAt,
      relatedEntity: file.relatedEntity
    });
  } catch (error) {
    console.error('Get file info error:', error);
    res.status(500).json({ 
      message: error.message || 'Failed to get file info',
      error: error.message
    });
  }
};

/**
 * @desc    Delete file
 * @route   DELETE /api/files/:id
 * @access  Private
 */
export const deleteFile = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    await fileStorageService.initialize();

    const file = await fileStorageService.deleteFile(id, userId);

    res.json({
      message: FILE_MESSAGES.FILE_DELETED_SUCCESSFULLY || 'File deleted successfully',
      file: {
        id: file._id,
        originalName: file.originalName
      }
    });
  } catch (error) {
    console.error('File delete error:', error);
    res.status(error.message === 'File not found' ? 404 : 
               error.message === 'Access denied' ? 403 : 500).json({ 
      message: error.message || 'File deletion failed',
      error: error.message
    });
  }
};

/**
 * @desc    Get user's files
 * @route   GET /api/files
 * @access  Private
 */
export const getUserFiles = async (req, res) => {
  try {
    const userId = req.user._id;
    const { fileType, relatedEntityType, page = 1, limit = 10 } = req.query;

    const query = {
      uploadedBy: userId,
      isActive: true
    };

    if (fileType) {
      query.fileType = fileType;
    }

    if (relatedEntityType) {
      query['relatedEntity.type'] = relatedEntityType;
    }

    const files = await File.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .select('-fileHash -accessToken');

    const total = await File.countDocuments(query);

    res.json({
      files,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get user files error:', error);
    res.status(500).json({ 
      message: error.message || 'Failed to get files',
      error: error.message
    });
  }
};

