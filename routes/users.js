const express = require('express');
const { body, validationResult } = require('express-validator');
const { models } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { uploadFile, generateFileKey } = require('../services/storageService');
const logger = require('../utils/logger');

const router = express.Router();

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await models.User.findByPk(req.userId, {
      include: [{
        model: models.Subscription,
        as: 'subscription'
      }],
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get usage statistics
    const currentUsage = await models.Usage.getMonthlyUsage(req.userId);
    const videoStats = await models.Video.getStatsByUser(req.userId);

    res.json({
      success: true,
      data: {
        user: user.toJSON(),
        subscription: user.subscription?.toJSON(),
        usage: currentUsage,
        stats: videoStats
      }
    });

  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', [
  authenticateToken,
  body('firstName').optional().trim().isLength({ min: 1, max: 50 }),
  body('lastName').optional().trim().isLength({ min: 1, max: 50 }),
  body('email').optional().isEmail().normalizeEmail()
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

    const { firstName, lastName, email } = req.body;
    const user = req.user;

    // Check if email is already taken by another user
    if (email && email !== user.email) {
      const existingUser = await models.User.findByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'Email is already taken'
        });
      }
    }

    // Update user
    const updates = {};
    if (firstName !== undefined) updates.firstName = firstName;
    if (lastName !== undefined) updates.lastName = lastName;
    if (email !== undefined) updates.email = email;

    await user.update(updates);

    logger.info(`User profile updated: ${user.id}`);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: user.toJSON() }
    });

  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   PUT /api/users/password
// @desc    Change user password
// @access  Private
router.put('/password', [
  authenticateToken,
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
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

    const { currentPassword, newPassword } = req.body;
    const user = req.user;

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    logger.info(`Password changed for user: ${user.id}`);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   POST /api/users/avatar
// @desc    Upload user avatar
// @access  Private
router.post('/avatar', authenticateToken, async (req, res) => {
  try {
    // This would typically use multer middleware for file upload
    // For now, we'll accept a base64 image or URL
    const { avatar } = req.body;

    if (!avatar) {
      return res.status(400).json({
        success: false,
        message: 'Avatar data is required'
      });
    }

    // In a real implementation, you would:
    // 1. Validate the image
    // 2. Resize/compress it
    // 3. Upload to storage
    // 4. Save the URL to user profile

    await req.user.update({ avatar });

    logger.info(`Avatar updated for user: ${req.userId}`);

    res.json({
      success: true,
      message: 'Avatar updated successfully',
      data: { avatar }
    });

  } catch (error) {
    logger.error('Upload avatar error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload avatar',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   GET /api/users/dashboard
// @desc    Get dashboard data
// @access  Private
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const user = req.user;

    // Get recent videos
    const recentVideos = await models.Video.findByUser(req.userId, {
      limit: 5,
      include: [{
        model: models.Script,
        as: 'script',
        attributes: ['id', 'title']
      }]
    });

    // Get video statistics
    const videoStats = await models.Video.getStatsByUser(req.userId);

    // Get current month usage
    const currentUsage = await models.Usage.getMonthlyUsage(req.userId);

    // Get subscription info
    const subscription = await models.Subscription.findOne({
      where: { userId: req.userId }
    });

    // Calculate usage percentages
    const features = subscription ? subscription.getFeatures() : { videosPerMonth: 3 };
    const videoUsage = currentUsage.find(u => u.type === 'video_generation');
    const videosUsed = videoUsage ? videoUsage.amount : 0;
    const videoUsagePercent = features.videosPerMonth === -1 ? 0 : 
      Math.round((videosUsed / features.videosPerMonth) * 100);

    const dashboardData = {
      user: user.toJSON(),
      subscription: subscription?.toJSON(),
      stats: {
        ...videoStats,
        videosThisMonth: videosUsed,
        videoUsagePercent,
        planLimit: features.videosPerMonth
      },
      recentVideos,
      quickActions: [
        {
          title: 'Generate Video',
          description: 'Create a new AI-powered video',
          action: 'generate_video',
          icon: 'video',
          available: user.canGenerateVideo()
        },
        {
          title: 'Write Script',
          description: 'Generate AI script for your video',
          action: 'generate_script',
          icon: 'script',
          available: true
        },
        {
          title: 'Browse Templates',
          description: 'Explore video and script templates',
          action: 'browse_templates',
          icon: 'templates',
          available: true
        }
      ]
    };

    res.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    logger.error('Get dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   DELETE /api/users/account
// @desc    Delete user account
// @access  Private
router.delete('/account', [
  authenticateToken,
  body('password').notEmpty().withMessage('Password confirmation required'),
  body('confirmation').equals('DELETE').withMessage('Type DELETE to confirm')
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

    const { password } = req.body;
    const user = req.user;

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Incorrect password'
      });
    }

    // Cancel subscription if exists
    const subscription = await models.Subscription.findOne({
      where: { userId: user.id }
    });

    if (subscription && subscription.stripeSubscriptionId) {
      // In a real implementation, cancel Stripe subscription here
      logger.info(`Should cancel Stripe subscription: ${subscription.stripeSubscriptionId}`);
    }

    // Delete user (cascade will handle related records)
    await user.destroy();

    logger.info(`User account deleted: ${user.id}`);

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });

  } catch (error) {
    logger.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete account',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;
