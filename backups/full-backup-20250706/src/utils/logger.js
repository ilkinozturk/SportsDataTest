/**
 * Logger utility
 * Provides consistent logging across the application
 */

const winston = require('winston');
const path = require('path');

// Define log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define log colors
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

// Add colors to winston
winston.addColors(logColors);

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Define console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  levels: logLevels,
  format: logFormat,
  transports: [
    // Write all logs to console
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'production' ? logFormat : consoleFormat,
    }),
    // Write error logs to error.log
    new winston.transports.File({
      filename: path.join('logs', 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Write all logs to combined.log
    new winston.transports.File({
      filename: path.join('logs', 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
  // Don't exit on handled exceptions
  exitOnError: false,
});

// Create a stream object for Morgan middleware
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

// Add cache logging helpers
logger.cacheHit = (key, service) => {
  logger.debug(`Cache hit: ${key}`, { 
    cacheKey: key, 
    service: service || 'unknown',
    event: 'cache_hit'
  });
};

logger.cacheMiss = (key, service) => {
  logger.debug(`Cache miss: ${key}`, { 
    cacheKey: key, 
    service: service || 'unknown',
    event: 'cache_miss'
  });
};

logger.cacheSet = (key, ttl, service) => {
  logger.debug(`Cache set: ${key}`, { 
    cacheKey: key, 
    ttl: ttl,
    service: service || 'unknown',
    event: 'cache_set'
  });
};

// Add API logging helpers
logger.apiRequest = (endpoint, params, service) => {
  logger.info(`API request: ${endpoint}`, {
    endpoint,
    params,
    service: service || 'API',
    event: 'api_request'
  });
};

logger.apiResponse = (endpoint, status, duration, service) => {
  const level = status >= 400 ? 'error' : 'info';
  logger[level](`API response: ${endpoint} - ${status}`, {
    endpoint,
    status,
    duration: `${duration}ms`,
    service: service || 'API',
    event: 'api_response'
  });
};

// Add performance logging
logger.performance = (operation, duration, metadata = {}) => {
  const level = duration > 1000 ? 'warn' : 'debug';
  logger[level](`Performance: ${operation}`, {
    duration: `${duration}ms`,
    slow: duration > 1000,
    ...metadata
  });
};

module.exports = logger;