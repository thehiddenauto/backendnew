const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { upload, uploadFile, generateFileKey, getUserStorageStats } = require('../services/storageService');
const logger = require('../utils/logger');

const router = express.Router();

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

// @route   POST /api/upload/video-thumbnail
// @desc    Upload video thumbnail
// @access  Private
router.post('/video-thumbnail', [
  authenticateToken,
  upload.single('thumbnail')
], async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No thumbnail uploaded'
      });
    }

    const { buffer, mimetype, originalname } = req.file;
    
    // Validate file type
    if (!mimetype.startsWith('image/')) {
      return res.status(400).json({
        success: false,
        message: 'Only image files are allowed for thumbnails'
      });
    }

    // Generate file key
    const fileKey = generateFileKey(req.userId, 'thumbnails', originalname);
    
    // Upload to storage
    const fileUrl = await uploadFile(buffer, fileKey, mimetype, {
      userId: req.userId,
      type: 'thumbnail'
    });

    logger.info(`Thumbnail uploaded for user ${req.userId}: ${fileKey}`);

    res.json({
      success: true,
      message: 'Thumbnail uploaded successfully',
      data: {
        url: fileUrl,
        key: fileKey
      }
    });

  } catch (error) {
    logger.error('Thumbnail upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload thumbnail'
    });
  }
});

module.exports = router;
