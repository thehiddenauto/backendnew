const logger = require('../utils/logger');

// Custom error classes
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message) {
    super(message, 400);
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401);
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409);
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded') {
    super(message, 429);
  }
}

class ExternalServiceError extends AppError {
  constructor(message = 'External service error') {
    super(message, 502);
  }
}

// Handle different types of errors
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new ValidationError(message);
};

const handleDuplicateFieldsDB = (err) => {
  const value = err.errmsg?.match(/(["'])(\\?.)*?\1/)?.[0] || 'duplicate value';
  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new ValidationError(message);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors || {}).map(el => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new ValidationError(message);
};

const handleJWTError = () =>
  new AuthenticationError('Invalid token. Please log in again!');

const handleJWTExpiredError = () =>
  new AuthenticationError('Your token has expired! Please log in again.');

const handleSequelizeValidationError = (err) => {
  const errors = err.errors?.map(e => e.message) || ['Validation error'];
  const message = `Validation error: ${errors.join(', ')}`;
  return new ValidationError(message);
};

const handleSequelizeUniqueConstraintError = (err) => {
  const field = err.errors?.[0]?.path || 'field';
  const message = `${field} already exists. Please use a different value.`;
  return new ConflictError(message);
};

const handleSequelizeForeignKeyConstraintError = (err) => {
  const message = 'Invalid reference to related resource';
  return new ValidationError(message);
};

const handleSequelizeConnectionError = (err) => {
  const message = 'Database connection failed';
  return new ExternalServiceError(message);
};

// Send error response in development
const sendErrorDev = (err, req, res) => {
  // Log the error
  logger.error('Error:', {
    error: err,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  return res.status(err.statusCode).json({
    success: false,
    error: err,
    message: err.message,
    stack: err.stack,
    request: {
      url: req.originalUrl,
      method: req.method,
      headers: req.headers,
      body: req.body
    }
  });
};

// Send error response in production
const sendErrorProd = (err, req, res) => {
  // Log the error
  logger.error('Production Error:', {
    message: err.message,
    statusCode: err.statusCode,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userId: req.userId
  });

  // Operational, trusted error: send message to client
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message
    });
  }

  // Programming or other unknown error: don't leak error details
  // Send generic message
  return res.status(500).json({
    success: false,
    message: 'Something went wrong! Please try again later.'
  });
};

// Main error handling middleware
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else {
    let error = { ...err };
    error.message = err.message;

    // Handle specific error types
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();
    
    // Sequelize errors
    if (error.name === 'SequelizeValidationError') error = handleSequelizeValidationError(error);
    if (error.name === 'SequelizeUniqueConstraintError') error = handleSequelizeUniqueConstraintError(error);
    if (error.name === 'SequelizeForeignKeyConstraintError') error = handleSequelizeForeignKeyConstraintError(error);
    if (error.name === 'SequelizeConnectionError') error = handleSequelizeConnectionError(error);

    sendErrorProd(error, req, res);
  }
};

// Async error wrapper
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

// 404 handler for undefined routes
const notFound = (req, res, next) => {
  const err = new NotFoundError(`Can't find ${req.originalUrl} on this server!`);
  next(err);
};

module.exports = {
  errorHandler,
  catchAsync,
  notFound,
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ExternalServiceError
};
