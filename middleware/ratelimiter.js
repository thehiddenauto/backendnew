const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

// General rate limiter
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || 100), // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil(parseInt(process.env.RATE_LIMIT_WINDOW || 15) * 60)
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip} on ${req.originalUrl}`);
    res.status(429).json({
      success: false,
      message: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil(parseInt(process.env.RATE_LIMIT_WINDOW || 15) * 60)
    });
  }
});

// Strict rate limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 auth requests per windowMs
  skipSuccessfulRequests: true, // Don't count successful requests
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
    retryAfter: 15 * 60
  },
  handler: (req, res) => {
    logger.warn(`Auth rate limit exceeded for IP: ${req.ip} on ${req.originalUrl}`);
    res.status(429).json({
      success: false,
      message: 'Too many authentication attempts, please try again later.',
      retryAfter: 15 * 60
    });
  }
});

// Video generation rate limiter
const videoGenerationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each IP to 10 video generations per hour
  message: {
    success: false,
    message: 'Video generation rate limit exceeded. Please try again later.',
    retryAfter: 60 * 60
  },
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise use IP
    return req.userId || req.ip;
  },
  handler: (req, res) => {
    logger.warn(`Video generation rate limit exceeded for ${req.userId || req.ip}`);
    res.status(429).json({
      success: false,
      message: 'Video generation rate limit exceeded. Please upgrade your plan or try again later.',
      retryAfter: 60 * 60,
      upgrade: true
    });
  }
});

// API rate limiter for external integrations
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // limit each API key to 60 requests per minute
  message: {
    success: false,
    message: 'API rate limit exceeded',
    retryAfter: 60
  },
  keyGenerator: (req) => {
    return req.headers['x-api-key'] || req.ip;
  }
});

// Demo rate limiter (more lenient for demos)
const demoLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 3, // limit each IP to 3 demo requests per 10 minutes
  message: {
    success: false,
    message: 'Demo rate limit exceeded. Please sign up for unlimited access.',
    retryAfter: 10 * 60,
    signup: true
  },
  handler: (req, res) => {
    logger.info(`Demo rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: 'Demo rate limit exceeded. Please sign up for unlimited access.',
      retryAfter: 10 * 60,
      signup: true
    });
  }
});

// Password reset rate limiter
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 password reset requests per hour
  message: {
    success: false,
    message: 'Too many password reset attempts. Please try again later.',
    retryAfter: 60 * 60
  }
});

module.exports = {
  generalLimiter,
  authLimiter,
  videoGenerationLimiter,
  apiLimiter,
  demoLimiter,
  passwordResetLimiter
};
