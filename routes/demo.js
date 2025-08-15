const express = require('express');
const { body, validationResult } = require('express-validator');
const logger = require('../utils/logger');

const router = express.Router();

// Import services with fallbacks - using lowercase filenames
let generateDemoVideo, generateDemoScript;

try {
  const videoService = require('../services/videoservice');
  generateDemoVideo = videoService.generateDemoVideo;
} catch (error) {
  logger.warn('Video service not available for demo:', error.message);
  generateDemoVideo = async (prompt, options = {}) => ({
    title: 'Demo AI Video',
    url: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
    thumbnail: 'https://via.placeholder.com/1280x720/4F46E5/FFFFFF?text=Demo+Video',
    description: 'This is a demo video generated with AI',
    prompt,
    status: 'completed',
    isDemo: true,
    ...options
  });
}

try {
  const scriptService = require('../services/scriptservice');
  generateDemoScript = scriptService.generateDemoScript;
} catch (error) {
  logger.warn('Script service not available for demo:', error.message);
  generateDemoScript = async (prompt, options = {}) => ({
    title: `Demo Script: ${prompt.substring(0, 30)}...`,
    content: `This is a demo script based on your prompt: "${prompt}". In a real scenario, our AI would generate a complete, customized script tailored to your specific needs and audience.`,
    tone: options.tone || 'professional',
    wordCount: 50,
    estimatedDuration: 30,
    isDemo: true,
    limitations: ['Limited to demo content', 'Full features available with signup']
  });
}

// @route   POST /api/demo/generate-video
// @desc    Generate demo video (no authentication required)
// @access  Public
router.post('/generate-video', [
  body('prompt').trim().isLength({ min: 10, max: 500 }).withMessage('Prompt must be 10-500 characters'),
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

    const { prompt, email } = req.body;

    logger.info(`Demo video requested: ${prompt.substring(0, 50)}...`);

    // Generate demo video
    const demoVideo = await generateDemoVideo(prompt, {
      style: 'professional',
      mood: 'engaging',
      duration: 30
    });

    // If email provided, we could save lead for marketing
    if (email) {
      logger.info(`Demo lead captured: ${email}`);
    }

    res.json({
      success: true,
      message: 'Demo video generated successfully',
      data: {
        video: demoVideo,
        isDemo: true,
        limitations: [
          'Demo videos are limited to 30 seconds',
          'Watermarked content',
          'Basic AI processing'
        ]
      }
    });

  } catch (error) {
    logger.error('Demo video generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate demo video',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Demo service temporarily unavailable'
    });
  }
});

// @route   POST /api/demo/generate-script
// @desc    Generate demo script (no authentication required)
// @access  Public
router.post('/generate-script', [
  body('prompt').trim().isLength({ min: 5, max: 200 }).withMessage('Prompt must be 5-200 characters'),
  body('tone').optional().isIn(['professional', 'casual', 'humorous', 'dramatic']),
  body('targetAudience').optional().isString(),
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

    const { prompt, tone = 'professional', targetAudience, email } = req.body;

    logger.info(`Demo script requested: ${prompt.substring(0, 50)}...`);

    // Generate demo script
    const demoScript = await generateDemoScript(prompt, {
      tone,
      targetAudience,
      maxWords: 100 // Limit for demo
    });

    // If email provided, save lead
    if (email) {
      logger.info(`Demo lead captured: ${email}`);
    }

    res.json({
      success: true,
      message: 'Demo script generated successfully',
      data: {
        script: demoScript,
        isDemo: true,
        limitations: [
          'Demo scripts are limited to 100 words',
          'Basic AI processing only',
          'Limited customization options'
        ]
      }
    });

  } catch (error) {
    logger.error('Demo script generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate demo script',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Demo service temporarily unavailable'
    });
  }
});

// @route   GET /api/demo/showcase
// @desc    Get showcase videos for homepage
// @access  Public
router.get('/showcase', async (req, res) => {
  try {
    const showcaseVideos = [
      {
        id: 'showcase-1',
        title: 'AI Product Demo',
        description: 'Professional product demonstration created with AI',
        videoUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
        thumbnailUrl: 'https://via.placeholder.com/1280x720/4F46E5/FFFFFF?text=AI+Product+Demo',
        duration: 30,
        category: 'marketing',
        tags: ['product', 'demo', 'ai'],
        stats: {
          views: 12500,
          likes: 890
        }
      },
      {
        id: 'showcase-2',
        title: 'Social Media Campaign',
        description: 'Engaging social media content generated with AI',
        videoUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_2mb.mp4',
        thumbnailUrl: 'https://via.placeholder.com/1280x720/7C3AED/FFFFFF?text=Social+Media',
        duration: 25,
        category: 'social',
        tags: ['social', 'marketing', 'viral'],
        stats: {
          views: 8900,
          likes: 672
        }
      },
      {
        id: 'showcase-3',
        title: 'Educational Tutorial',
        description: 'Clear and concise educational content powered by AI',
        videoUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1920x1080_1mb.mp4',
        thumbnailUrl: 'https://via.placeholder.com/1920x1080/059669/FFFFFF?text=Educational',
        duration: 45,
        category: 'education',
        tags: ['education', 'tutorial', 'learning'],
        stats: {
          views: 15600,
          likes: 1200
        }
      }
    ];

    res.json({
      success: true,
      data: {
        videos: showcaseVideos,
        totalShowcase: showcaseVideos.length
      }
    });

  } catch (error) {
    logger.error('Get showcase error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch showcase videos'
    });
  }
});

// @route   GET /api/demo/features
// @desc    Get demo features and capabilities
// @access  Public
router.get('/features', (req, res) => {
  try {
    const features = {
      videoGeneration: {
        name: 'AI Video Generation',
        description: 'Create stunning videos from text prompts using advanced AI',
        capabilities: [
          'Text-to-video generation',
          'Multiple video styles',
          'Customizable mood and tone',
          'Professional quality output'
        ]
      },
      scriptGeneration: {
        name: 'AI Script Writing',
        description: 'Generate compelling video scripts with AI assistance',
        capabilities: [
          'Context-aware script generation',
          'Multiple tone options',
          'Target audience optimization',
          'Structure templates'
        ]
      }
    };

    res.json({
      success: true,
      data: { features }
    });

  } catch (error) {
    logger.error('Get features error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch features'
    });
  }
});

module.exports = router;
