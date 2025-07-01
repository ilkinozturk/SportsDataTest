// Error Tracking API Routes
const express = require('express');
const { errorTracker } = require('../utils/errorTracker');
const { asyncErrorHandler } = require('../middleware/errorTracking');

const router = express.Router();

/**
 * Get error statistics
 */
router.get(
  '/stats',
  asyncErrorHandler(async (req, res) => {
    const stats = errorTracker.getStats();

    res.json({
      success: true,
      stats,
    });
  })
);

/**
 * Get errors with filters
 */
router.get(
  '/errors',
  asyncErrorHandler(async (req, res) => {
    const { severity, source, since, fingerprint, limit = 50 } = req.query;

    const filters = {
      severity,
      source,
      since,
      fingerprint,
      limit: parseInt(limit),
    };

    // Remove undefined values
    Object.keys(filters).forEach(key => {
      if (filters[key] === undefined) {
        delete filters[key];
      }
    });

    const errors = errorTracker.getErrors(filters);

    res.json({
      success: true,
      count: errors.length,
      filters,
      errors,
    });
  })
);

/**
 * Get specific error by ID
 */
router.get(
  '/errors/:errorId',
  asyncErrorHandler(async (req, res) => {
    const { errorId } = req.params;

    const error = errorTracker.getError(errorId);

    if (!error) {
      return res.status(404).json({
        success: false,
        error: 'Error not found',
      });
    }

    res.json({
      success: true,
      error,
    });
  })
);

/**
 * Get critical errors
 */
router.get(
  '/critical',
  asyncErrorHandler(async (req, res) => {
    const errors = errorTracker.getErrors({ severity: 'critical' });

    res.json({
      success: true,
      count: errors.length,
      errors,
    });
  })
);

/**
 * Export errors to file
 */
router.post(
  '/export',
  asyncErrorHandler(async (req, res) => {
    const { filename } = req.body;

    const exportPath = await errorTracker.exportErrors(filename);

    res.json({
      success: true,
      message: 'Errors exported successfully',
      file: exportPath,
    });
  })
);

/**
 * Test error tracking (development only)
 */
router.post(
  '/test',
  asyncErrorHandler(async (req, res) => {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        error: 'Test endpoint not available in production',
      });
    }

    const { type = 'test', message = 'Test error', severity = 'error' } = req.body;

    const testError = new Error(message);
    testError.name = type;

    const errorId = await errorTracker.trackError(testError, {
      source: 'test-endpoint',
      severity,
      tags: ['test', 'manual'],
      extra: req.body,
    });

    res.json({
      success: true,
      message: 'Test error tracked successfully',
      errorId,
    });
  })
);

/**
 * Get error trends (hourly data for last 24 hours)
 */
router.get(
  '/trends',
  asyncErrorHandler(async (req, res) => {
    const now = Date.now();
    const trends = [];

    // Get hourly data for last 24 hours
    for (let i = 23; i >= 0; i--) {
      const hourStart = now - i * 60 * 60 * 1000;
      const hourEnd = hourStart + 60 * 60 * 1000;

      const hourlyErrors = errorTracker
        .getErrors({
          since: new Date(hourStart).toISOString(),
          limit: 1000,
        })
        .filter(err => new Date(err.timestamp).getTime() < hourEnd);

      const severityCount = hourlyErrors.reduce((acc, err) => {
        acc[err.severity] = (acc[err.severity] || 0) + 1;
        return acc;
      }, {});

      trends.push({
        hour: new Date(hourStart).toISOString(),
        total: hourlyErrors.length,
        bySeverity: severityCount,
      });
    }

    res.json({
      success: true,
      trends,
    });
  })
);

/**
 * Health check for error tracking system
 */
router.get(
  '/health',
  asyncErrorHandler(async (req, res) => {
    const stats = errorTracker.getStats();
    const isHealthy = stats.errorRate < 10; // Less than 10 errors per hour

    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      errorRate: stats.errorRate,
      totalErrors: stats.total,
      criticalErrors: stats.critical,
      uptime: stats.uptime,
    });
  })
);

module.exports = router;
