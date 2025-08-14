const express = require('express');
const { body, validationResult } = require('express-validator');
const { generateDemoVideo } = require('../services/videoService');
const { generateDemoScript } = require('../services/scriptService');
const logger = require('../utils/logger');

const router = express.Router();

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
      // Save email for marketing purposes
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
      },
      {
        id: 'showcase-4',
        title: 'Brand Storytelling',
        description: 'Compelling brand story created with AI technology',
        videoUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_5mb.mp4',
        thumbnailUrl: 'https://via.placeholder.com/1280x720/DC2626/FFFFFF?text=Brand+Story',
        duration: 60,
        category: 'branding',
        tags: ['brand', 'story', 'emotional'],
        stats: {
          views: 22000,
          likes: 1800
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
      message: 'Failed to fetch showcase videos',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Service temporarily unavailable'
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
          'Multiple video styles (cinematic, cartoon, realistic)',
          'Customizable mood and tone',
          'Professional quality output',
          'Multiple resolution options'
        ],
        limitations: {
          demo: ['30-second limit', 'Watermarked'],
          free: ['3 videos/month', '30-second limit'],
          paid: ['Unlimited videos', 'Up to 10 minutes', 'No watermark']
        }
      },
      scriptGeneration: {
        name: 'AI Script Writing',
        description: 'Generate compelling video scripts with AI assistance',
        capabilities: [
          'Context-aware script generation',
          'Multiple tone options',
          'Target audience optimization',
          'Structure templates',
          'SEO-friendly content'
        ],
        limitations: {
          demo: ['100 words max', 'Basic templates'],
          free: ['3 scripts/month', '500 words max'],
          paid: ['Unlimited scripts', 'Advanced templates', 'Brand voice']
        }
      },
      customization: {
        name: 'Video Customization',
        description: 'Personalize your videos with advanced options',
        capabilities: [
          'Custom branding',
          'Color schemes',
          'Font selection',
          'Logo integration',
          'Music and sound effects'
        ],
        limitations: {
          demo: ['Limited options'],
          free: ['Basic customization'],
          paid: ['Full customization', 'Brand kits', 'Asset library']
        }
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

// @route   GET /api/demo/pricing
// @desc    Get pricing information for demo
// @access  Public
router.get('/pricing', (req, res) => {
  try {
    const pricing = {
      plans: [
        {
          name: 'Free',
          price: 0,
          interval: 'forever',
          features: [
            '3 videos per month',
            '30-second video limit',
            'Basic AI scripts',
            'Standard quality',
            'Influencore watermark'
          ],
          limitations: [
            'Limited customization',
            'No priority support',
            'Basic analytics'
          ],
          cta: 'Get Started Free',
          popular: false
        },
        {
          name: 'Starter',
          price: 29,
          interval: 'month',
          features: [
            '25 videos per month',
            'Up to 3 minutes per video',
            'Advanced AI scripts',
            'HD quality (1080p)',
            'No watermark',
            'Basic customization',
            'Email support'
          ],
          limitations: [
            'Limited brand assets',
            'Standard processing'
          ],
          cta: 'Start Free Trial',
          popular: true
        },
        {
          name: 'Pro',
          price: 99,
          interval: 'month',
          features: [
            '100 videos per month',
            'Up to 10 minutes per video',
            'Premium AI scripts',
            '4K quality available',
            'Full customization',
            'Brand kit integration',
            'Priority processing',
            'Analytics dashboard',
            'Priority support'
          ],
          limitations: [],
          cta: 'Start Free Trial',
          popular: false
        },
        {
          name: 'Enterprise',
          price: 299,
          interval: 'month',
          features: [
            'Unlimited videos',
            'Unlimited duration',
            'Custom AI models',
            'White-label solution',
            'API access',
            'Custom integrations',
            'Dedicated support',
            'Advanced analytics',
            'Team collaboration'
          ],
          limitations: [],
          cta: 'Contact Sales',
          popular: false
        }
      ],
      faq: [
        {
          question: 'Can I cancel anytime?',
          answer: 'Yes, you can cancel your subscription at any time. You\'ll continue to have access until the end of your billing period.'
        },
        {
          question: 'Do you offer refunds?',
          answer: 'We offer a 14-day money-back guarantee for all paid plans if you\'re not satisfied with our service.'
        },
        {
          question: 'What payment methods do you accept?',
          answer: 'We accept all major credit cards, PayPal, and wire transfers for enterprise plans.'
        }
      ]
    };

    res.json({
      success: true,
      data: pricing
    });

  } catch (error) {
    logger.error('Get pricing error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pricing information'
    });
  }
});

// @route   POST /api/demo/contact
// @desc    Handle demo contact form
// @access  Public
router.post('/contact', [
  body('name').trim().isLength({ min: 1 }).withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('message').trim().isLength({ min: 10 }).withMessage('Message must be at least 10 characters'),
  body('type').optional().isIn(['demo', 'sales', 'support', 'partnership'])
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

    const { name, email, message, type = 'demo' } = req.body;

    // Log the contact request
    logger.info(`Demo contact request from ${name} (${email}): ${type}`);

    // In a real implementation, you would:
    // 1. Save to database
    // 2. Send email notification to sales team
    // 3. Add to CRM system
    // 4. Send auto-response to user

    res.json({
      success: true,
      message: 'Thank you for your interest! We\'ll get back to you within 24 hours.',
      data: {
        contactId: `demo_${Date.now()}`,
        estimatedResponse: '24 hours'
      }
    });

  } catch (error) {
    logger.error('Demo contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process contact request'
    });
  }
});

module.exports = router;
