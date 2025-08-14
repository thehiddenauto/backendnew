const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { models } = require('../config/database');
const { authenticateToken, requirePlan } = require('../middleware/auth');
const { generateScript, getScriptSuggestions } = require('../services/scriptService');
const logger = require('../utils/logger');

const router = express.Router();

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
