import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  uploadFile,
  uploadMultipleFiles,
  downloadFile,
  downloadFileByPath,
  getFileInfo,
  getSignedUrl,
  deleteFile,
  getUserFiles
} from '../controllers/fileController.js';
import { uploadSingle, uploadMultiple } from '../middleware/fileValidation.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Upload routes
router.post('/upload', uploadSingle, uploadFile);
router.post('/upload-multiple', uploadMultiple, uploadMultipleFiles);

// Download routes (order matters - specific routes before parameterized routes)
router.get('/download-by-path', downloadFileByPath); // Must be before /:id routes
router.get('/:id/signed-url', getSignedUrl); // Must be before /:id/download
router.get('/:id/download', downloadFile);

// File management routes
router.get('/', getUserFiles);
router.get('/:id', getFileInfo);
router.delete('/:id', deleteFile);

export default router;

