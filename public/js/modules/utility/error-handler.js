/**
 * Error Handler Module
 * Handles error management for the team stats application
 */

(function (global) {
  'use strict';

  const ErrorHandler = {
    initialized: false,
    errors: [],
    config: {
      maxErrors: 100,
      showUserNotifications: true,
      logToConsole: true,
      enableReporting: false,
    },

    init() {
      if (this.initialized) return;

      this.setupGlobalHandlers();
      this.loadConfig();

      this.initialized = true;
      console.log('[ErrorHandler] Initialized');
    },

    setupGlobalHandlers() {
      // Handle uncaught JavaScript errors
      window.addEventListener('error', event => {
        this.handleError({
          type: 'javascript',
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error: event.error,
          stack: event.error ? event.error.stack : null,
        });
      });

      // Handle unhandled promise rejections
      window.addEventListener('unhandledrejection', event => {
        this.handleError({
          type: 'promise',
          message: 'Unhandled Promise Rejection',
          reason: event.reason,
          stack: event.reason ? event.reason.stack : null,
        });
      });

      // Handle resource loading errors
      window.addEventListener(
        'error',
        event => {
          if (event.target !== window) {
            this.handleError({
              type: 'resource',
              message: `Failed to load resource: ${event.target.src || event.target.href}`,
              element: event.target.tagName,
              source: event.target.src || event.target.href,
            });
          }
        },
        true
      );
    },

    loadConfig() {
      try {
        const stored = localStorage.getItem('teamstats_error_config');
        if (stored) {
          const config = JSON.parse(stored);
          this.config = { ...this.config, ...config };
        }
      } catch (error) {
        console.warn('[ErrorHandler] Failed to load config:', error);
      }
    },

    handleError(errorInfo) {
      const error = {
        id: this.generateErrorId(),
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        ...errorInfo,
      };

      // Add to errors array
      this.errors.push(error);

      // Maintain max errors limit
      if (this.errors.length > this.config.maxErrors) {
        this.errors.shift();
      }

      // Log to console
      if (this.config.logToConsole) {
        this.logError(error);
      }

      // Log using logger if available
      if (global.TeamStatsLogger) {
        global.TeamStatsLogger.error('Error occurred', error);
      }

      // Show user notification if configured
      if (this.config.showUserNotifications && error.type !== 'resource') {
        this.showUserNotification(error);
      }

      // Report error if enabled
      if (this.config.enableReporting) {
        this.reportError(error);
      }

      // Emit error event
      if (global.TeamStatsEventBus) {
        global.TeamStatsEventBus.emit('error:occurred', error);
      }
    },

    generateErrorId() {
      return 'err_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    },

    logError(error) {
      console.group(`🚨 Error [${error.id}]`);
      console.error('Type:', error.type);
      console.error('Message:', error.message);
      console.error('Time:', error.timestamp);

      if (error.filename) {
        console.error('File:', error.filename);
        console.error('Line:', error.lineno, 'Column:', error.colno);
      }

      if (error.stack) {
        console.error('Stack:', error.stack);
      }

      if (error.reason) {
        console.error('Reason:', error.reason);
      }

      console.groupEnd();
    },

    showUserNotification(error) {
      // Create a user-friendly error message
      let message = 'An error occurred';

      switch (error.type) {
        case 'javascript':
          message = 'A JavaScript error occurred. Please try refreshing the page.';
          break;
        case 'promise':
          message = 'A network or data error occurred. Please try again.';
          break;
        case 'api':
          message = 'Failed to load data. Please check your connection and try again.';
          break;
        default:
          message = 'An unexpected error occurred. Please try refreshing the page.';
      }

      // Show notification using available methods
      if (global.TeamStatsEventBus) {
        global.TeamStatsEventBus.emit('notification:show', {
          type: 'error',
          message: message,
          duration: 5000,
        });
      } else if (this.shouldShowAlert(error)) {
        // Only show alert for critical errors to avoid spam
        alert(message);
      }
    },

    shouldShowAlert(error) {
      // Only show alerts for critical errors or the first few errors
      return error.type === 'javascript' && this.errors.length <= 3;
    },

    reportError(error) {
      // This would send error reports to a logging service
      console.log('[ErrorHandler] Reporting error:', error.id);

      // Example: Send to analytics or error tracking service
      // fetch('/api/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(error)
      // }).catch(() => {}); // Ignore reporting failures
    },

    // Manual error reporting methods
    captureError(error, context = {}) {
      this.handleError({
        type: 'manual',
        message: error.message || error.toString(),
        stack: error.stack,
        context: context,
        error: error,
      });
    },

    captureMessage(message, level = 'info', context = {}) {
      this.handleError({
        type: 'message',
        message: message,
        level: level,
        context: context,
      });
    },

    // API error helpers
    captureApiError(response, request) {
      this.handleError({
        type: 'api',
        message: `API Error: ${response.status} ${response.statusText}`,
        status: response.status,
        statusText: response.statusText,
        url: response.url,
        method: request.method,
        requestData: request.data,
      });
    },

    // Error retrieval and management
    getErrors(options = {}) {
      let filteredErrors = [...this.errors];

      // Filter by type
      if (options.type) {
        filteredErrors = filteredErrors.filter(error => error.type === options.type);
      }

      // Filter by time range
      if (options.startTime) {
        const startTime = new Date(options.startTime);
        filteredErrors = filteredErrors.filter(error => new Date(error.timestamp) >= startTime);
      }

      if (options.endTime) {
        const endTime = new Date(options.endTime);
        filteredErrors = filteredErrors.filter(error => new Date(error.timestamp) <= endTime);
      }

      // Limit results
      if (options.limit) {
        filteredErrors = filteredErrors.slice(-options.limit);
      }

      return filteredErrors;
    },

    clearErrors() {
      this.errors = [];
      console.log('[ErrorHandler] Errors cleared');
    },

    getErrorStats() {
      const stats = {
        total: this.errors.length,
        byType: {},
        byHour: {},
      };

      this.errors.forEach(error => {
        // Count by type
        stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;

        // Count by hour
        const hour = new Date(error.timestamp).getHours();
        stats.byHour[hour] = (stats.byHour[hour] || 0) + 1;
      });

      return stats;
    },

    setConfig(newConfig) {
      this.config = { ...this.config, ...newConfig };
      this.saveConfig();
    },

    saveConfig() {
      try {
        localStorage.setItem('teamstats_error_config', JSON.stringify(this.config));
      } catch (error) {
        console.warn('[ErrorHandler] Failed to save config:', error);
      }
    },
  };

  // Global registration
  global.TeamStatsErrorHandler = ErrorHandler;

  // Auto-initialize
  ErrorHandler.init();
})(window);
