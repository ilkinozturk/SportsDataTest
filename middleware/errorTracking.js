// Error Tracking Middleware
const { errorTracker } = require('../utils/errorTracker');
const Logger = require('../utils/logger');

const logger = new Logger('ErrorTrackingMiddleware');

/**
 * Express error tracking middleware
 * Should be placed before the main error handler
 */
function errorTrackingMiddleware() {
  return async (err, req, res, next) => {
    try {
      // Extract context information
      const context = {
        source: 'express-middleware',
        endpoint: req.originalUrl || req.url,
        method: req.method,
        userAgent: req.get('User-Agent'),
        ip: req.ip || req.connection?.remoteAddress,
        requestId: req.id || req.headers['x-request-id'],
        userId: req.user?.id || req.session?.userId,
        body: req.method === 'POST' ? req.body : undefined,
        query: req.query,
        params: req.params,
        headers: {
          'content-type': req.get('Content-Type'),
          authorization: req.get('Authorization') ? '[REDACTED]' : undefined,
          'x-forwarded-for': req.get('X-Forwarded-For'),
        },
        tags: ['express', 'middleware'],
        extra: {
          stack: err.stack,
          statusCode: err.statusCode || err.status || 500,
        },
      };

      // Track the error
      const errorId = await errorTracker.trackError(err, context);

      // Add error ID to response headers for debugging
      if (!res.headersSent) {
        res.setHeader('X-Error-ID', errorId);
      }

      // Add error ID to request for use in error handler
      req.errorId = errorId;
    } catch (trackingError) {
      logger.error('Failed to track error', trackingError);
    }

    // Continue to next error handler
    next(err);
  };
}

/**
 * Async error wrapper for route handlers
 */
function asyncErrorHandler(fn) {
  return async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (error) {
      // Add context for better tracking
      error.source = 'route-handler';
      error.endpoint = req.originalUrl || req.url;
      next(error);
    }
  };
}

/**
 * Manual error tracking for use in try-catch blocks
 */
async function trackError(error, context = {}) {
  try {
    return await errorTracker.trackError(error, {
      source: 'manual-tracking',
      ...context,
    });
  } catch (trackingError) {
    logger.error('Failed to manually track error', trackingError);
    return null;
  }
}

/**
 * Track API errors specifically
 */
async function trackApiError(error, apiContext = {}) {
  const context = {
    source: 'api-call',
    tags: ['api', 'external'],
    extra: {
      apiEndpoint: apiContext.endpoint,
      apiMethod: apiContext.method,
      apiParams: apiContext.params,
      apiResponse: apiContext.response,
    },
    ...apiContext,
  };

  return await trackError(error, context);
}

/**
 * Track database errors
 */
async function trackDatabaseError(error, dbContext = {}) {
  const context = {
    source: 'database',
    tags: ['database', 'sql'],
    severity: 'critical',
    extra: {
      query: dbContext.query,
      table: dbContext.table,
      operation: dbContext.operation,
    },
    ...dbContext,
  };

  return await trackError(error, context);
}

/**
 * Track validation errors
 */
async function trackValidationError(error, validationContext = {}) {
  const context = {
    source: 'validation',
    tags: ['validation', 'input'],
    severity: 'warning',
    extra: {
      field: validationContext.field,
      value: validationContext.value,
      rule: validationContext.rule,
    },
    ...validationContext,
  };

  return await trackError(error, context);
}

/**
 * Global unhandled error tracking
 */
function setupGlobalErrorTracking() {
  // Handle uncaught exceptions
  process.on('uncaughtException', async error => {
    logger.error('Uncaught Exception', error);
    console.error('UNCAUGHT EXCEPTION DETAILS:', error.message, error.stack);

    await trackError(error, {
      source: 'uncaught-exception',
      severity: 'critical',
      tags: ['uncaught', 'exception', 'critical'],
    });

    // Give some time to log the error before exiting
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', async (reason, promise) => {
    logger.error('Unhandled Promise Rejection', { reason, promise });

    const error = reason instanceof Error ? reason : new Error(String(reason));

    await trackError(error, {
      source: 'unhandled-rejection',
      severity: 'critical',
      tags: ['unhandled', 'promise', 'rejection', 'critical'],
      extra: {
        promise: promise.toString(),
      },
    });
  });

  // Handle warning events
  process.on('warning', async warning => {
    logger.warn('Process Warning', warning);

    await trackError(warning, {
      source: 'process-warning',
      severity: 'warning',
      tags: ['warning', 'process'],
    });
  });

  logger.info('Global error tracking setup completed');
}

module.exports = {
  errorTrackingMiddleware,
  asyncErrorHandler,
  trackError,
  trackApiError,
  trackDatabaseError,
  trackValidationError,
  setupGlobalErrorTracking,
};
