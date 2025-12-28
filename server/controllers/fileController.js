import fileStorageService from '../services/fileStorageService.js';
import virusScanService from '../services/virusScanService.js';
import File from '../models/File.js';
import { FILE_MESSAGES, AUTHZ_MESSAGES } from '../constants/messages.js';

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
      file.relatedEntity = {
        type: relatedEntityType,
        id: relatedEntityId
      };
      await file.save();
    }

    // Start virus scanning (async, non-blocking)
    virusScanService.scanFile(buffer, file._id).catch(error => {
      console.error('Virus scan error (non-blocking):', error);
    });

    res.status(201).json({
      message: FILE_MESSAGES.FILE_UPLOADED_SUCCESSFULLY || 'File uploaded successfully',
      file: {
        id: file._id,
        originalName: file.originalName,
        fileName: file.fileName,
        fileUrl: file.fileUrl,
        fileType: file.fileType,
        size: file.size,
        mimeType: file.mimeType,
        virusScanStatus: file.virusScanStatus
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
          file.relatedEntity = {
            type: relatedEntityType,
            id: relatedEntityId
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
    res.status(error.message === 'File not found' ? 404 : 
               error.message === 'Access denied' ? 403 : 500).json({ 
      message: error.message || 'File download failed',
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
      fileUrl: file.fileUrl,
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
    const { fileType, relatedEntityType, page = PAGINATION.DEFAULT_PAGE, limit = PAGINATION.DEFAULT_LIMIT } = req.query;

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

