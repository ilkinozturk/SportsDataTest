// Error Tracking System - Sentry Alternative
const Logger = require('./logger');
const fs = require('fs').promises;
const path = require('path');

class ErrorTracker {
  constructor(options = {}) {
    this.logger = new Logger('ErrorTracker');
    this.options = {
      maxErrorsInMemory: options.maxErrorsInMemory || 100,
      errorLogFile: options.errorLogFile || 'error-tracking.log',
      enableNotifications: options.enableNotifications || false,
      criticalErrorThreshold: options.criticalErrorThreshold || 5, // per minute
      ...options,
    };

    this.errors = [];
    this.errorCounts = new Map();
    this.criticalErrors = [];
    this.startTime = Date.now();

    // Initialize error log directory
    this.logDir = path.join(__dirname, '..', 'logs');
    this.errorLogPath = path.join(this.logDir, this.options.errorLogFile);

    this.ensureLogDirectory();

    // Cleanup old errors every hour
    setInterval(() => this.cleanup(), 60 * 60 * 1000);
  }

  async ensureLogDirectory() {
    try {
      await fs.mkdir(this.logDir, { recursive: true });
    } catch (error) {
      this.logger.error('Failed to create log directory', error);
    }
  }

  /**
   * Track an error
   */
  async trackError(error, context = {}) {
    const errorInfo = this.formatError(error, context);

    // Add to in-memory storage
    this.errors.unshift(errorInfo);

    // Maintain memory limit
    if (this.errors.length > this.options.maxErrorsInMemory) {
      this.errors.pop();
    }

    // Update error counts
    const errorKey = this.getErrorKey(error);
    const currentCount = this.errorCounts.get(errorKey) || 0;
    this.errorCounts.set(errorKey, currentCount + 1);

    // Check for critical errors
    if (errorInfo.severity === 'critical') {
      this.criticalErrors.unshift(errorInfo);
      if (this.criticalErrors.length > 20) {
        this.criticalErrors.pop();
      }
      await this.handleCriticalError(errorInfo);
    }

    // Log to file
    await this.logErrorToFile(errorInfo);

    // Log to console
    this.logger.error('Error tracked', {
      id: errorInfo.id,
      message: errorInfo.message,
      severity: errorInfo.severity,
      source: errorInfo.source,
    });

    return errorInfo.id;
  }

  /**
   * Format error information
   */
  formatError(error, context = {}) {
    return {
      id: this.generateErrorId(),
      timestamp: new Date().toISOString(),
      message: error.message || 'Unknown error',
      stack: error.stack || '',
      name: error.name || 'Error',
      code: error.code || error.statusCode || null,
      severity: this.determineSeverity(error, context),
      source: context.source || 'unknown',
      endpoint: context.endpoint || null,
      userId: context.userId || null,
      userAgent: context.userAgent || null,
      ip: context.ip || null,
      requestId: context.requestId || null,
      environment: process.env.NODE_ENV || 'development',
      version: process.env.APP_VERSION || '1.0.0',
      tags: context.tags || [],
      extra: context.extra || {},
      fingerprint: this.generateFingerprint(error),
    };
  }

  /**
   * Determine error severity
   */
  determineSeverity(error, context = {}) {
    // Custom severity from context
    if (context.severity) {
      return context.severity;
    }

    // Database errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return 'critical';
    }

    // HTTP errors
    if (error.statusCode >= 500) {
      return 'critical';
    } else if (error.statusCode >= 400) {
      return 'warning';
    }

    // System errors
    if (error.code === 'ENOENT' || error.code === 'EACCES') {
      return 'error';
    }

    // Validation errors
    if (error.name === 'ValidationError') {
      return 'warning';
    }

    // Default
    return 'error';
  }

  /**
   * Generate unique error ID
   */
  generateErrorId() {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate error fingerprint for grouping
   */
  generateFingerprint(error) {
    const key = `${error.name}:${error.message}`.toLowerCase();
    return require('crypto').createHash('md5').update(key).digest('hex').substr(0, 8);
  }

  /**
   * Get error grouping key
   */
  getErrorKey(error) {
    return `${error.name}:${error.message}`;
  }

  /**
   * Handle critical errors
   */
  async handleCriticalError(errorInfo) {
    // Check for critical error threshold
    const recentCriticalErrors = this.criticalErrors.filter(
      err => Date.now() - new Date(err.timestamp).getTime() < 60000 // Last minute
    );

    if (recentCriticalErrors.length >= this.options.criticalErrorThreshold) {
      this.logger.error('CRITICAL ERROR THRESHOLD EXCEEDED', {
        count: recentCriticalErrors.length,
        threshold: this.options.criticalErrorThreshold,
      });

      // Send notification if enabled
      if (this.options.enableNotifications) {
        await this.sendNotification('CRITICAL_THRESHOLD', {
          errorCount: recentCriticalErrors.length,
          threshold: this.options.criticalErrorThreshold,
          latestError: errorInfo,
        });
      }
    }
  }

  /**
   * Log error to file
   */
  async logErrorToFile(errorInfo) {
    try {
      const logEntry = `${JSON.stringify(errorInfo)}\n`;
      await fs.appendFile(this.errorLogPath, logEntry);
    } catch (error) {
      this.logger.error('Failed to log error to file', error);
    }
  }

  /**
   * Send notification (webhook, email, etc.)
   */
  async sendNotification(type, data) {
    try {
      // Implement your notification logic here
      // Example: Webhook, email, Slack, Discord, etc.

      if (process.env.ERROR_WEBHOOK_URL) {
        const axios = require('axios');
        await axios.post(process.env.ERROR_WEBHOOK_URL, {
          type,
          data,
          timestamp: new Date().toISOString(),
        });
      }

      this.logger.info('Error notification sent', { type, data });
    } catch (error) {
      this.logger.error('Failed to send notification', error);
    }
  }

  /**
   * Get error statistics
   */
  getStats() {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    const recentErrors = this.errors.filter(err => new Date(err.timestamp).getTime() > oneHourAgo);

    const dailyErrors = this.errors.filter(err => new Date(err.timestamp).getTime() > oneDayAgo);

    const errorsBySeverity = this.errors.reduce((acc, err) => {
      acc[err.severity] = (acc[err.severity] || 0) + 1;
      return acc;
    }, {});

    const topErrors = Array.from(this.errorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([error, count]) => ({ error, count }));

    return {
      total: this.errors.length,
      recentHour: recentErrors.length,
      dailyTotal: dailyErrors.length,
      critical: this.criticalErrors.length,
      bySeverity: errorsBySeverity,
      topErrors,
      uptime: now - this.startTime,
      errorRate: dailyErrors.length / 24, // errors per hour average
    };
  }

  /**
   * Get errors with filters
   */
  getErrors(filters = {}) {
    let filteredErrors = [...this.errors];

    // Filter by severity
    if (filters.severity) {
      filteredErrors = filteredErrors.filter(err => err.severity === filters.severity);
    }

    // Filter by source
    if (filters.source) {
      filteredErrors = filteredErrors.filter(err => err.source === filters.source);
    }

    // Filter by time range
    if (filters.since) {
      const sinceTime = new Date(filters.since).getTime();
      filteredErrors = filteredErrors.filter(err => new Date(err.timestamp).getTime() >= sinceTime);
    }

    // Filter by fingerprint (grouped errors)
    if (filters.fingerprint) {
      filteredErrors = filteredErrors.filter(err => err.fingerprint === filters.fingerprint);
    }

    // Limit results
    const limit = filters.limit || 50;
    return filteredErrors.slice(0, limit);
  }

  /**
   * Get error by ID
   */
  getError(errorId) {
    return this.errors.find(err => err.id === errorId);
  }

  /**
   * Clear old errors from memory
   */
  cleanup() {
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    // Remove old errors from memory
    this.errors = this.errors.filter(err => new Date(err.timestamp).getTime() > oneWeekAgo);

    // Remove old critical errors
    this.criticalErrors = this.criticalErrors.filter(
      err => new Date(err.timestamp).getTime() > oneWeekAgo
    );

    // Clear old error counts
    this.errorCounts.clear();

    this.logger.info('Error tracker cleanup completed', {
      errorsInMemory: this.errors.length,
      criticalErrors: this.criticalErrors.length,
    });
  }

  /**
   * Export errors to JSON file
   */
  async exportErrors(filename = null) {
    try {
      const exportFile = filename || `errors_export_${Date.now()}.json`;
      const exportPath = path.join(this.logDir, exportFile);

      const exportData = {
        exportTime: new Date().toISOString(),
        stats: this.getStats(),
        errors: this.errors,
        criticalErrors: this.criticalErrors,
      };

      await fs.writeFile(exportPath, JSON.stringify(exportData, null, 2));

      this.logger.info('Errors exported successfully', {
        file: exportPath,
        errorCount: this.errors.length,
      });

      return exportPath;
    } catch (error) {
      this.logger.error('Failed to export errors', error);
      throw error;
    }
  }
}

// Singleton instance
const errorTracker = new ErrorTracker({
  maxErrorsInMemory: 200,
  enableNotifications: process.env.NODE_ENV === 'production',
  criticalErrorThreshold: 10,
});

module.exports = {
  ErrorTracker,
  errorTracker,
};
