import FileStorageConfig from '../models/FileStorageConfig.js';
import fileStorageService from '../services/fileStorageService.js';

/**
 * @desc    Get file storage configuration
 * @route   GET /api/admin/file-storage/config
 * @access  Private/Admin
 */
export const getConfig = async (req, res) => {
  try {
    const config = await FileStorageConfig.getActiveConfig();
    
    // Don't expose sensitive credentials
    const safeConfig = {
      ...config.toObject(),
      awsS3: config.awsS3 ? {
        bucketName: config.awsS3.bucketName,
        region: config.awsS3.region,
        endpoint: config.awsS3.endpoint
      } : null,
      googleCloud: config.googleCloud ? {
        bucketName: config.googleCloud.bucketName,
        projectId: config.googleCloud.projectId
      } : null,
      azureBlob: config.azureBlob ? {
        accountName: config.azureBlob.accountName,
        containerName: config.azureBlob.containerName
      } : null,
      maxFileSizes: config.maxFileSizes,
      allowedFormats: config.allowedFormats,
      virusScanning: {
        enabled: config.virusScanning.enabled,
        provider: config.virusScanning.provider
      },
      security: config.security,
      isActive: config.isActive
    };

    res.json(safeConfig);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Update file storage configuration
 * @route   PUT /api/admin/file-storage/config
 * @access  Private/Admin
 */
export const updateConfig = async (req, res) => {
  try {
    const {
      provider,
      awsS3,
      googleCloud,
      azureBlob,
      local,
      maxFileSizes,
      allowedFormats,
      virusScanning,
      cdn,
      security
    } = req.body;

    let config = await FileStorageConfig.findOne({ isActive: true });
    
    if (!config) {
      config = new FileStorageConfig();
    }

    // Update provider
    if (provider) {
      config.provider = provider;
    }

    // Update provider-specific configs
    if (awsS3) {
      config.awsS3 = { ...config.awsS3, ...awsS3 };
    }

    if (googleCloud) {
      config.googleCloud = { ...config.googleCloud, ...googleCloud };
    }

    if (azureBlob) {
      config.azureBlob = { ...config.azureBlob, ...azureBlob };
    }

    if (local) {
      config.local = { ...config.local, ...local };
    }

    // Update file size limits
    if (maxFileSizes) {
      config.maxFileSizes = { ...config.maxFileSizes, ...maxFileSizes };
    }

    // Update allowed formats
    if (allowedFormats) {
      config.allowedFormats = { ...config.allowedFormats, ...allowedFormats };
    }

    // Update virus scanning
    if (virusScanning) {
      config.virusScanning = { ...config.virusScanning, ...virusScanning };
    }

    // Update CDN
    if (cdn) {
      config.cdn = { ...config.cdn, ...cdn };
    }

    // Update security
    if (security) {
      config.security = { ...config.security, ...security };
    }

    await config.save();

    // Reinitialize file storage service with new config
    await fileStorageService.initialize();

    res.json({
      message: 'File storage configuration updated successfully',
      config: {
        provider: config.provider,
        maxFileSizes: config.maxFileSizes,
        allowedFormats: config.allowedFormats,
        virusScanning: {
          enabled: config.virusScanning.enabled,
          provider: config.virusScanning.provider
        }
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Test storage connection
 * @route   POST /api/admin/file-storage/test
 * @access  Private/Admin
 */
export const testConnection = async (req, res) => {
  try {
    await fileStorageService.initialize();
    
    // Try to upload a small test file
    const testBuffer = Buffer.from('test file content');
    const testFile = await fileStorageService.uploadFile(
      testBuffer,
      'test.txt',
      'text/plain',
      req.user._id,
      { isPublic: false }
    );

    // Try to download it
    await fileStorageService.downloadFile(testFile._id, req.user._id);

    // Delete test file
    await fileStorageService.deleteFile(testFile._id, req.user._id);

    res.json({
      message: 'Storage connection test successful',
      provider: fileStorageService.config.provider
    });
  } catch (error) {
    res.status(500).json({
      message: 'Storage connection test failed',
      error: error.message
    });
  }
};

