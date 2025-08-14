const jwt = require('jsonwebtoken');
const { models } = require('../config/database');
const logger = require('../utils/logger');

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user
    const user = await models.User.findByPk(decoded.userId, {
      include: [{
        model: models.Subscription,
        as: 'subscription'
      }]
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is disabled'
      });
    }

    // Attach user to request
    req.user = user;
    req.userId = user.id;
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }

    logger.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

// Optional authentication - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await models.User.findByPk(decoded.userId, {
        include: [{
          model: models.Subscription,
          as: 'subscription'
        }]
      });

      if (user && user.isActive) {
        req.user = user;
        req.userId = user.id;
      }
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

// Check if user has required plan
const requirePlan = (requiredPlans) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userPlan = req.user.plan;
    const plans = Array.isArray(requiredPlans) ? requiredPlans : [requiredPlans];

    if (!plans.includes(userPlan)) {
      return res.status(403).json({
        success: false,
        message: `This feature requires ${plans.join(' or ')} plan`,
        upgrade: true
      });
    }

    next();
  };
};

// Check usage limits
const checkUsageLimit = (usageType) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const subscription = req.user.subscription;
      if (!subscription) {
        return res.status(403).json({
          success: false,
          message: 'No active subscription found'
        });
      }

      const features = subscription.getFeatures();
      let limit;

      switch (usageType) {
        case 'video_generation':
          limit = features.videosPerMonth;
          break;
        default:
          limit = -1; // Unlimited
      }

      if (limit === -1) {
        return next(); // Unlimited
      }

      const usage = await models.Usage.checkLimit(req.user.id, usageType, limit);
      
      if (!usage.canUse) {
        return res.status(403).json({
          success: false,
          message: `Usage limit exceeded. You have used ${usage.current}/${usage.limit} for this month.`,
          usage,
          upgrade: true
        });
      }

      req.usage = usage;
      next();
    } catch (error) {
      logger.error('Usage check error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check usage limits'
      });
    }
  };
};

module.exports = {
  authenticateToken,
  optionalAuth,
  requirePlan,
  checkUsageLimit
};
