import multer from 'multer';
import FileStorageConfig from '../models/FileStorageConfig.js';
import { FILE_UPLOAD } from '../constants/numeric.js';

/**
 * File Validation Middleware
 * Validates file size, format, and other constraints
 */

let config = null;
let upload = null;

/**
 * Initialize multer and validation config
 */
async function initializeValidation() {
  if (!config) {
    config = await FileStorageConfig.getActiveConfig();
  }

  if (!upload) {
    // Configure multer for memory storage (for cloud uploads)
    const storage = multer.memoryStorage();
    
    upload = multer({
      storage,
      limits: {
        fileSize: Math.max(
          config.maxFileSizes.images,
          config.maxFileSizes.documents,
          config.maxFileSizes.videos || 0
        )
      },
      fileFilter: async (req, file, cb) => {
        try {
          const validationResult = await validateFile(file, config);
          if (validationResult.valid) {
            cb(null, true);
          } else {
            cb(new Error(validationResult.error), false);
          }
        } catch (error) {
          cb(error, false);
        }
      }
    });
  }

  return upload;
}

/**
 * Validate file against configuration
 */
async function validateFile(file, config) {
  const mimeType = file.mimetype;
  const fileSize = file.size;

  // Determine file category
  let category = 'other';
  let maxSize = 0;
  let allowedFormats = [];

  if (mimeType.startsWith('image/')) {
    category = 'images';
    maxSize = config.maxFileSizes.images;
    allowedFormats = config.allowedFormats.images || [];
  } else if (mimeType.includes('pdf') || mimeType.includes('document') || 
             mimeType.includes('word') || mimeType.includes('excel') || 
             mimeType.includes('msword') || mimeType.includes('spreadsheet')) {
    category = 'documents';
    maxSize = config.maxFileSizes.documents;
    allowedFormats = config.allowedFormats.documents || [];
  } else if (mimeType.startsWith('video/')) {
    category = 'videos';
    maxSize = config.maxFileSizes.videos || 50 * 1024 * 1024;
    allowedFormats = config.allowedFormats.videos || [];
  }

  // Check file size
  if (fileSize > maxSize) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(0);
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${maxSizeMB}MB for ${category}`
    };
  }

  // Check file format
  if (allowedFormats.length > 0 && !allowedFormats.includes(mimeType)) {
    return {
      valid: false,
      error: `File format ${mimeType} is not allowed. Allowed formats: ${allowedFormats.join(', ')}`
    };
  }

  // Additional validation for specific formats
  const extension = file.originalname.split('.').pop().toLowerCase();
  
  // Validate image formats
  if (category === 'images') {
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    if (!allowedExtensions.includes(extension)) {
      return {
        valid: false,
        error: `Image format .${extension} is not allowed. Allowed: ${allowedExtensions.join(', ')}`
      };
    }
  }

  // Validate document formats
  if (category === 'documents') {
    const allowedExtensions = ['pdf', 'doc', 'docx'];
    if (!allowedExtensions.includes(extension)) {
      return {
        valid: false,
        error: `Document format .${extension} is not allowed. Allowed: ${allowedExtensions.join(', ')}`
      };
    }
  }

  return { valid: true };
}

/**
 * Middleware for single file upload
 */
export const uploadSingle = async (req, res, next) => {
  try {
    const upload = await initializeValidation();
    upload.single('file')(req, res, (err) => {
      if (err) {
        return res.status(400).json({ 
          message: err.message || 'File upload failed',
          error: err.message
        });
      }
      next();
    });
  } catch (error) {
    res.status(500).json({ message: 'File validation initialization failed', error: error.message });
  }
};

/**
 * Middleware for multiple files upload
 */
export const uploadMultiple = async (req, res, next) => {
  try {
    const upload = await initializeValidation();
    const maxFiles = parseInt(req.query.maxFiles) || FILE_UPLOAD.MAX_FILES_MULTIPLE;
    
    upload.array('files', maxFiles)(req, res, (err) => {
      if (err) {
        return res.status(400).json({ 
          message: err.message || 'File upload failed',
          error: err.message
        });
      }
      next();
    });
  } catch (error) {
    res.status(500).json({ message: 'File validation initialization failed', error: error.message });
  }
};

/**
 * Middleware for specific field upload
 */
export const uploadField = (fieldName) => {
  return async (req, res, next) => {
    try {
      const upload = await initializeValidation();
      upload.single(fieldName)(req, res, (err) => {
        if (err) {
          return res.status(400).json({ 
            message: err.message || 'File upload failed',
            error: err.message
          });
        }
        next();
      });
    } catch (error) {
      res.status(500).json({ message: 'File validation initialization failed', error: error.message });
    }
  };
};

/**
 * Get file validation config
 */
export const getValidationConfig = async () => {
  if (!config) {
    config = await FileStorageConfig.getActiveConfig();
  }
  return {
    maxSizes: config.maxFileSizes,
    allowedFormats: config.allowedFormats
  };
};

