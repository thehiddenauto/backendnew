const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { models } = require('../config/database');
const { authenticateToken, checkUsageLimit } = require('../middleware/auth');
const { generateVideo } = require('../services/videoService');
const { uploadToS3 } = require('../services/storageService');
const logger = require('../utils/logger');

const router = express.Router();

// @route   GET /api/videos
// @desc    Get user's videos
// @access  Private
router.get('/', [
  authenticateToken,
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['pending', 'processing', 'completed', 'failed']),
  query('category').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const { status, category } = req.query;

    const whereClause = { userId: req.userId };
    if (status) whereClause.status = status;
    if (category) whereClause.category = category;

    const { count, rows: videos } = await models.Video.findAndCountAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      include: [{
        model: models.Script,
        as: 'script',
        attributes: ['id', 'title', 'content']
      }]
    });

    const totalPages = Math.ceil(count / limit);

    res.json({
      success: true,
      data: {
        videos,
        pagination: {
          page,
          limit,
          total: count,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    logger.error('Get videos error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch videos',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   GET /api/videos/:id
// @desc    Get single video
// @access  Private
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const video = await models.Video.findOne({
      where: { 
        id: req.params.id,
        userId: req.userId 
      },
      include: [{
        model: models.Script,
        as: 'script'
      }, {
        model: models.User,
        as: 'user',
        attributes: ['firstName', 'lastName', 'avatar']
      }]
    });

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    // Increment view count
    await video.incrementView();

    res.json({
      success: true,
      data: { video }
    });

  } catch (error) {
    logger.error('Get video error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch video',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   POST /api/videos/generate
// @desc    Generate a new video
// @access  Private
router.post('/generate', [
  authenticateToken,
  checkUsageLimit('video_generation'),
  body('prompt').trim().isLength({ min: 10, max: 2000 }).withMessage('Prompt must be 10-2000 characters'),
  body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Title is required'),
  body('style').optional().isString(),
  body('mood').optional().isString(),
  body('category').optional().isString(),
  body('duration').optional().isInt({ min: 5, max: 600 }),
  body('resolution').optional().isIn(['1280x720', '1920x1080', '3840x2160']),
  body('scriptId').optional().isUUID()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      prompt,
      title,
      description,
      style,
      mood,
      category,
      duration = 30,
      resolution = '1920x1080',
      scriptId
    } = req.body;

    // Check if user can generate video
    if (!req.user.canGenerateVideo()) {
      return res.status(403).json({
        success: false,
        message: 'Video generation limit exceeded for your plan',
        upgrade: true
      });
    }

    // Create video record
    const video = await models.Video.create({
      title,
      description,
      prompt,
      style,
      mood,
      category,
      duration,
      resolution,
      status: 'pending',
      userId: req.userId,
      scriptId
    });

    // Record usage
    await models.Usage.recordUsage(req.userId, 'video_generation', 1, {
      videoId: video.id,
      prompt: prompt.substring(0, 100)
    });

    // Update user video count
    await req.user.incrementVideoCount();

    // Start video generation (async)
    generateVideo(video.id).catch(error => {
      logger.error('Video generation failed:', error);
    });

    // Emit real-time update
    const io = req.app.get('io');
    io.to(`user-${req.userId}`).emit('video_generation_started', {
      videoId: video.id,
      status: 'pending'
    });

    logger.info(`Video generation started for user ${req.userId}: ${video.id}`);

    res.status(201).json({
      success: true,
      message: 'Video generation started',
      data: { video }
    });

  } catch (error) {
    logger.error('Video generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start video generation',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   PUT /api/videos/:id
// @desc    Update video details
// @access  Private
router.put('/:id', [
  authenticateToken,
  body('title').optional().trim().isLength({ min: 1, max: 200 }),
  body('description').optional().trim().isLength({ max: 1000 }),
  body('category').optional().isString(),
  body('tags').optional().isArray(),
  body('isPublic').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const video = await models.Video.findOne({
      where: { 
        id: req.params.id,
        userId: req.userId 
      }
    });

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    const allowedUpdates = ['title', 'description', 'category', 'tags', 'isPublic'];
    const updates = {};
    
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    await video.update(updates);

    res.json({
      success: true,
      message: 'Video updated successfully',
      data: { video }
    });

  } catch (error) {
    logger.error('Update video error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update video',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   DELETE /api/videos/:id
// @desc    Delete video
// @access  Private
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const video = await models.Video.findOne({
      where: { 
        id: req.params.id,
        userId: req.userId 
      }
    });

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    // Delete video file from storage if exists
    if (video.videoUrl) {
      try {
        // Extract key from URL and delete from S3
        const urlParts = video.videoUrl.split('/');
        const key = urlParts[urlParts.length - 1];
        // Delete file logic here
      } catch (deleteError) {
        logger.warn('Failed to delete video file:', deleteError);
      }
    }

    await video.destroy();

    logger.info(`Video deleted: ${video.id} by user ${req.userId}`);

    res.json({
      success: true,
      message: 'Video deleted successfully'
    });

  } catch (error) {
    logger.error('Delete video error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete video',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   POST /api/videos/:id/like
// @desc    Toggle like on video
// @access  Private
router.post('/:id/like', authenticateToken, async (req, res) => {
  try {
    const video = await models.Video.findByPk(req.params.id);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    await video.toggleLike();

    res.json({
      success: true,
      message: 'Video liked',
      data: { likes: video.likes }
    });

  } catch (error) {
    logger.error('Like video error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to like video',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   GET /api/videos/public/trending
// @desc    Get trending public videos
// @access  Public
router.get('/public/trending', [
  query('limit').optional().isInt({ min: 1, max: 50 })
], async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;

    const videos = await models.Video.findPublicVideos(limit);

    res.json({
      success: true,
      data: { videos }
    });

  } catch (error) {
    logger.error('Get trending videos error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trending videos',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   GET /api/videos/stats
// @desc    Get user video statistics
// @access  Private
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    const stats = await models.Video.getStatsByUser(req.userId);

    res.json({
      success: true,
      data: { stats }
    });

  } catch (error) {
    logger.error('Get video stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch video statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;
