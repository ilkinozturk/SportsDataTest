// Global Error Handler Middleware
const Logger = require('../utils/logger');
const { trackError } = require('./errorTracking');
const logger = new Logger('ErrorHandler');

class AppError extends Error {
  constructor(message, statusCode, errorCode = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Async error wrapper
const asyncHandler = fn => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Global error handler middleware
const errorHandler = async (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  logger.error(`${req.method} ${req.originalUrl} - ${error.message}`, err);

  // Track error if not already tracked by middleware
  if (!req.errorId) {
    try {
      req.errorId = await trackError(err, {
        source: 'error-handler',
        endpoint: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });
    } catch (trackingError) {
      logger.error('Failed to track error in error handler', trackingError);
    }
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Invalid ID format';
    error = new AppError(message, 400, 'INVALID_ID');
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = new AppError(message, 400, 'DUPLICATE_VALUE');
  }

  // API rate limit error
  if (err.response && err.response.status === 429) {
    const message = 'API rate limit exceeded. Please try again later.';
    error = new AppError(message, 429, 'RATE_LIMIT_EXCEEDED');
  }

  // API authentication error
  if (err.response && err.response.status === 401) {
    const message = 'API authentication failed. Please check your API key.';
    error = new AppError(message, 401, 'AUTH_FAILED');
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: {
      message: error.message || 'Server Error',
      code: error.errorCode || 'SERVER_ERROR',
      errorId: req.errorId || null,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
};

// 404 handler
const notFound = (req, res, next) => {
  const message = `Route not found: ${req.originalUrl}`;
  const error = new AppError(message, 404, 'ROUTE_NOT_FOUND');
  next(error);
};

module.exports = {
  AppError,
  asyncHandler,
  errorHandler,
  notFound,
};
