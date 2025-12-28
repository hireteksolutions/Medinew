import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  uploadFile,
  uploadMultipleFiles,
  downloadFile,
  getFileInfo,
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

// File management routes
router.get('/', getUserFiles);
router.get('/:id', getFileInfo);
router.get('/:id/download', downloadFile);
router.delete('/:id', deleteFile);

export default router;

