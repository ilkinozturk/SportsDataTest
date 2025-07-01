// Enhanced Logger Utility - Professional logging with levels
const fs = require('fs');
const path = require('path');
const config = require('../src/config');

class Logger {
  constructor(serviceName) {
    this.serviceName = serviceName;
    this.config = config.LOGGING;
    this.logDir = path.dirname(this.config.FILE_PATH);
    this.logLevel = this.getLevelPriority(this.config.LEVEL);
    this.prettyPrint = this.config.PRETTY_PRINT;
    this.logToFile = this.config.LOG_TO_FILE;

    // Ensure log directory exists if file logging is enabled
    if (this.logToFile && !fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }

    this.logFile = this.logToFile ? path.join(
      this.logDir,
      `${serviceName}-${new Date().toISOString().split('T')[0]}.log`
    ) : null;
  }

  getLevelPriority(level) {
    const levels = {
      error: 0,
      warn: 1,
      info: 2,
      http: 3,
      debug: 4
    };
    return levels[level.toLowerCase()] || 2;
  }

  shouldLog(level) {
    const levelPriority = this.getLevelPriority(level.toLowerCase());
    return levelPriority <= this.logLevel;
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

    return this.prettyPrint 
      ? JSON.stringify(logEntry, null, 2)
      : JSON.stringify(logEntry);
  }

  writeLog(level, message, meta) {
    // Check if we should log this level
    if (!this.shouldLog(level)) {
      return;
    }

    const logMessage = this.formatMessage(level, message, meta);

    // Console output with colors
    const colors = {
      ERROR: '\x1b[31m',
      WARN: '\x1b[33m',
      INFO: '\x1b[36m',
      HTTP: '\x1b[35m',
      DEBUG: '\x1b[90m',
      SUCCESS: '\x1b[32m',
    };

    const resetColor = '\x1b[0m';
    console.log(`${colors[level] || ''}[${this.serviceName}] ${level}: ${message}${resetColor}`);

    // File output if enabled
    if (this.logToFile && this.logFile) {
      fs.appendFileSync(this.logFile, `${logMessage}\n`);
    }
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
    this.writeLog('DEBUG', message, meta);
  }

  http(message, meta = {}) {
    this.writeLog('HTTP', message, meta);
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
