// Enhanced Logger Utility - Professional logging with levels
const fs = require('fs');
const path = require('path');

class Logger {
  constructor(serviceName) {
    this.serviceName = serviceName;
    this.logDir = path.join(__dirname, '..', 'logs');

    // Ensure log directory exists
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }

    this.logFile = path.join(
      this.logDir,
      `${serviceName}-${new Date().toISOString().split('T')[0]}.log`
    );
  }

  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      service: this.serviceName,
      message,
      ...meta,
    };

    return JSON.stringify(logEntry);
  }

  writeLog(level, message, meta) {
    const logMessage = this.formatMessage(level, message, meta);

    // Console output with colors
    const colors = {
      ERROR: '\x1b[31m',
      WARN: '\x1b[33m',
      INFO: '\x1b[36m',
      DEBUG: '\x1b[90m',
      SUCCESS: '\x1b[32m',
    };

    const resetColor = '\x1b[0m';
    console.log(`${colors[level] || ''}[${this.serviceName}] ${level}: ${message}${resetColor}`);

    // File output
    fs.appendFileSync(this.logFile, `${logMessage}\n`);
  }

  error(message, error = null) {
    const meta = error
      ? {
          error: {
            message: error.message,
            stack: error.stack,
            code: error.code,
          },
        }
      : {};

    this.writeLog('ERROR', message, meta);
  }

  warn(message, meta = {}) {
    this.writeLog('WARN', message, meta);
  }

  info(message, meta = {}) {
    this.writeLog('INFO', message, meta);
  }

  debug(message, meta = {}) {
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG) {
      this.writeLog('DEBUG', message, meta);
    }
  }

  success(message, meta = {}) {
    this.writeLog('SUCCESS', message, meta);
  }

  // API çağrıları için özel log
  apiCall(endpoint, params, response, duration) {
    this.writeLog('INFO', `API Call: ${endpoint}`, {
      endpoint,
      params,
      responseStatus: response?.status,
      duration: `${duration}ms`,
      success: response?.success || false,
    });
  }
}

module.exports = Logger;
