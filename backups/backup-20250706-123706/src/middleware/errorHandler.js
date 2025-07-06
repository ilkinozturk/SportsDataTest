/**
 * Global error handling middleware
 * Catches all errors and returns consistent error responses
 */

const logger = require('../../src/utils/logger');

const errorHandler = (err, req, res, next) => {
  // Log error details
  logger.error({
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    statusCode: err.statusCode || 500,
    errorCode: err.errorCode || 'INTERNAL_ERROR',
  });

  // Default error values
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errorCode = err.errorCode || 'INTERNAL_ERROR';

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = 'Invalid input data';
  } else if (err.name === 'CastError') {
    statusCode = 400;
    errorCode = 'INVALID_ID';
    message = 'Invalid ID format';
  } else if (err.code === 'ECONNREFUSED') {
    statusCode = 503;
    errorCode = 'SERVICE_UNAVAILABLE';
    message = 'External service is unavailable';
  } else if (err.code === 'ETIMEDOUT') {
    statusCode = 504;
    errorCode = 'GATEWAY_TIMEOUT';
    message = 'Request timeout';
  }

  // In production, hide sensitive error details for non-operational errors
  if (process.env.NODE_ENV === 'production' && !err.isOperational) {
    message = 'An error occurred processing your request';
    // Log the actual error for debugging
    logger.error('Non-operational error in production:', err);
  }

  // Send error response - Frontend'in beklediği format!
  res.status(statusCode).json({
    success: false,
    error: message, // Frontend bunu bekliyor
    errorDetails: {
      code: errorCode,
      ...(process.env.NODE_ENV === 'development' && {
        stack: err.stack,
        details: err,
      }),
    },
    timestamp: new Date().toISOString(),
  });
};

// Async error wrapper to catch async errors
const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Not found handler
const notFoundHandler = (req, res, next) => {
  const message = `Cannot ${req.method} ${req.originalUrl}`;
  res.status(404).json({
    success: false,
    error: message, // Frontend'in beklediği format
    errorDetails: {
      code: 'NOT_FOUND',
      message: message,
    },
    timestamp: new Date().toISOString(),
  });
};

module.exports = {
  errorHandler,
  asyncHandler,
  notFoundHandler,
};
