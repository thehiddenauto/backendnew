const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Import storage service with fallback - using lowercase filename
let upload, uploadFile, generateFileKey, getUserStorageStats;

try {
  const storageService = require('../services/storageservice');
  upload = storageService.upload;
  uploadFile = storageService.uploadFile;
  generateFileKey = storageService.generateFileKey;
  getUserStorageStats = storageService.getUserStorageStats;
} catch (error) {
  logger.warn('Storage service not available:', error.message);
  
  // Fallback implementations
  const multer = require('multer');
  upload = multer({ storage: multer.memoryStorage() });
  
  uploadFile = async (buffer, key, mimetype, metadata) => {
    // Mock upload - return a placeholder URL
    return `https://placeholder-storage.com/${key}`;
  };
  
  generateFileKey = (userId, type, originalName) => {
    const timestamp = Date.now();
    const extension = originalName.split('.').pop();
    return `${type}/${userId}/${timestamp}.${extension}`;
  };
  
  getUserStorageStats = async (userId) => ({
    totalSize: 0,
    fileCount: 0,
    provider: 'fallback'
  });
}

// @route   POST /api/upload/avatar
// @desc    Upload user avatar
// @access  Private
router.post('/avatar', [
  authenticateToken,
  upload.single('avatar')
], async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const { buffer, mimetype, originalname } = req.file;
    
    // Validate file type
    if (!mimetype.startsWith('image/')) {
      return res.status(400).json({
        success: false,
        message: 'Only image files are allowed'
      });
    }

    // Generate file key
    const fileKey = generateFileKey(req.userId, 'avatars', originalname);
    
    // Upload to storage
    const fileUrl = await uploadFile(buffer, fileKey, mimetype, {
      userId: req.userId,
      type: 'avatar'
    });

    // Update user avatar
    await req.user.update({ avatar: fileUrl });

    logger.info(`Avatar uploaded for user ${req.userId}: ${fileKey}`);

    res.json({
      success: true,
      message: 'Avatar uploaded successfully',
      data: {
        url: fileUrl,
        key: fileKey
      }
    });

  } catch (error) {
    logger.error('Avatar upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload avatar',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Upload failed'
    });
  }
});

// @route   POST /api/upload/media
// @desc    Upload media files (images, videos, audio)
// @access  Private
router.post('/media', [
  authenticateToken,
  upload.array('files', 5) // Max 5 files
], async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const uploadPromises = req.files.map(async (file) => {
      const { buffer, mimetype, originalname, size } = file;
      
      // Generate file key
      const fileKey = generateFileKey(req.userId, 'media', originalname);
      
      try {
        // Upload to storage
        const fileUrl = await uploadFile(buffer, fileKey, mimetype, {
          userId: req.userId,
          type: 'media',
          originalName: originalname,
          size
        });

        return {
          success: true,
          originalName: originalname,
          url: fileUrl,
          key: fileKey,
          size,
          type: mimetype
        };
      } catch (uploadError) {
        logger.error(`Failed to upload ${originalname}:`, uploadError);
        return {
          success: false,
          originalName: originalname,
          error: uploadError.message
        };
      }
    });

    const results = await Promise.all(uploadPromises);

    // Log successful uploads
    const successful = results.filter(r => r.success).length;
    logger.info(`Media upload completed for user ${req.userId}: ${successful}/${results.length} files`);

    res.json({
      success: true,
      message: `Upload completed: ${successful}/${results.length} files successful`,
      data: { results }
    });

  } catch (error) {
    logger.error('Media upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload media files',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Upload failed'
    });
  }
});

// @route   GET /api/upload/storage-stats
// @desc    Get user storage statistics
// @access  Private
router.get('/storage-stats', authenticateToken, async (req, res) => {
  try {
    const stats = await getUserStorageStats(req.userId);

    res.json({
      success: true,
      data: { stats }
    });

  } catch (error) {
    logger.error('Get storage stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch storage statistics'
    });
  }
});

module.exports = router;
