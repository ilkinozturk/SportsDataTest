const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for console output
const consoleFormat = winston.format.printf(({ level, message, timestamp, service, ...metadata }) => {
  let msg = `${timestamp} [${service || 'App'}] ${level}: ${message}`;
  
  // Add metadata if present
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  
  return msg;
});

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'SportsData.AI' },
  transports: [
    // Console transport with colors
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({
          format: 'HH:mm:ss'
        }),
        consoleFormat
      )
    }),
    // Error log file
    new winston.transports.File({ 
      filename: path.join(logsDir, 'error.log'), 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }),
    // Combined log file
    new winston.transports.File({ 
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 10,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  ],
  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.File({ 
      filename: path.join(logsDir, 'exceptions.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ],
  // Handle unhandled promise rejections
  rejectionHandlers: [
    new winston.transports.File({ 
      filename: path.join(logsDir, 'rejections.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// Create child logger for different services
logger.createServiceLogger = (serviceName) => {
  return logger.child({ service: serviceName });
};

// Add cache logging helpers
logger.cacheHit = (key, service) => {
  logger.debug('Cache hit', { 
    cacheKey: key, 
    service: service || 'unknown',
    event: 'cache_hit'
  });
};

logger.cacheMiss = (key, service) => {
  logger.debug('Cache miss', { 
    cacheKey: key, 
    service: service || 'unknown',
    event: 'cache_miss'
  });
};

logger.cacheSet = (key, ttl, service) => {
  logger.debug('Cache set', { 
    cacheKey: key, 
    ttl: ttl,
    service: service || 'unknown',
    event: 'cache_set'
  });
};

// Add API logging helpers
logger.apiRequest = (endpoint, params, service) => {
  logger.info('API request initiated', {
    endpoint,
    params,
    service: service || 'API',
    event: 'api_request'
  });
};

logger.apiResponse = (endpoint, status, duration, service) => {
  const level = status >= 400 ? 'error' : 'info';
  logger[level]('API response received', {
    endpoint,
    status,
    duration: `${duration}ms`,
    service: service || 'API',
    event: 'api_response'
  });
};

// Add performance logging
logger.performance = (operation, duration, metadata = {}) => {
  const level = duration > 1000 ? 'warn' : 'info';
  logger[level](`Performance: ${operation}`, {
    duration: `${duration}ms`,
    slow: duration > 1000,
    ...metadata
  });
};

module.exports = logger;