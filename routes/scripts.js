const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { models } = require('../config/database');
const { authenticateToken, requirePlan } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Import with lowercase filename to match actual file
let generateScript, getScriptSuggestions;
try {
  const scriptService = require('../services/scriptservice');
  generateScript = scriptService.generateScript;
  getScriptSuggestions = scriptService.getScriptSuggestions;
} catch (error) {
  logger.warn('Script service not available:', error.message);
  // Fallback functions
  generateScript = async (prompt, options) => ({
    title: `${prompt.substring(0, 20)}... Script`,
    content: `This is a generated script based on: ${prompt}`,
    wordCount: 50,
    estimatedDuration: 30,
    metadata: { fallback: true }
  });
  getScriptSuggestions = async () => [
    'Create a marketing video script',
    'Write an educational content script',
    'Generate a social media post script'
  ];
}

// @route   GET /api/scripts
// @desc    Get user's scripts
// @access  Private
router.get('/', [
  authenticateToken,
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('category').optional().isString(),
  query('search').optional().isString()
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
    const { category, search } = req.query;

    const whereClause = { userId: req.userId };
    if (category) whereClause.category = category;
    
    // Handle search with proper Sequelize operators
    if (search) {
      const { Op } = require('sequelize');
      whereClause[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { content: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows: scripts } = await models.Script.findAndCountAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    const totalPages = Math.ceil(count / limit);

    res.json({
      success: true,
      data: {
        scripts,
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
    logger.error('Get scripts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch scripts',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   GET /api/scripts/:id
// @desc    Get single script
// @access  Private
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const script = await models.Script.findOne({
      where: { 
        id: req.params.id,
        userId: req.userId 
      }
    });

    if (!script) {
      return res.status(404).json({
        success: false,
        message: 'Script not found'
      });
    }

    res.json({
      success: true,
      data: { script }
    });

  } catch (error) {
    logger.error('Get script error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch script'
    });
  }
});

// @route   POST /api/scripts/generate
// @desc    Generate new script
// @access  Private
router.post('/generate', [
  authenticateToken,
  body('prompt').trim().isLength({ min: 5, max: 500 }).withMessage('Prompt must be 5-500 characters'),
  body('title').optional().trim().isLength({ min: 1, max: 200 }),
  body('tone').optional().isIn(['professional', 'casual', 'humorous', 'dramatic']),
  body('category').optional().isString(),
  body('targetAudience').optional().isString()
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

    const { prompt, title, tone, category, targetAudience } = req.body;

    // Generate script using AI service
    const generatedScript = await generateScript(prompt, {
      tone,
      category,
      targetAudience
    });
    
    // Save to database
    const savedScript = await models.Script.create({
      title: title || generatedScript.title,
      content: generatedScript.content,
      prompt,
      tone: tone || 'professional',
      targetAudience,
      category: category || 'general',
      wordCount: generatedScript.wordCount,
      duration: generatedScript.estimatedDuration,
      userId: req.userId,
      metadata: generatedScript.metadata || {}
    });

    logger.info(`Script generated for user ${req.userId}: ${savedScript.id}`);

    res.status(201).json({
      success: true,
      message: 'Script generated successfully',
      data: { script: savedScript }
    });

  } catch (error) {
    logger.error('Generate script error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate script',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Script generation failed'
    });
  }
});

// @route   GET /api/scripts/templates
// @desc    Get script templates
// @access  Public
router.get('/templates', async (req, res) => {
  try {
    const suggestions = await getScriptSuggestions('general', 'professional', 'general');

    const templates = [
      {
        id: 'marketing-1',
        title: 'Product Launch Script',
        category: 'marketing',
        description: 'Template for announcing new products',
        content: suggestions[0] || 'Introduce your amazing new product...'
      },
      {
        id: 'social-1',
        title: 'Social Media Hook',
        category: 'social',
        description: 'Engaging social media content',
        content: suggestions[1] || 'Create engaging social content...'
      },
      {
        id: 'education-1',
        title: 'Tutorial Script',
        category: 'education',
        description: 'Educational content template',
        content: suggestions[2] || 'Explain your topic clearly...'
      }
    ];

    res.json({
      success: true,
      data: { templates }
    });

  } catch (error) {
    logger.error('Get templates error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch templates'
    });
  }
});

module.exports = router;
