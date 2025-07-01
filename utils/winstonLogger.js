const createLogger = require('../config/winston.config');

// Create singleton instances for different services
const loggers = {};

const getLogger = (service = 'APP') => {
  if (!loggers[service]) {
    loggers[service] = createLogger(service);
  }
  return loggers[service];
};

// Helper functions for common logging patterns
const logApiCall = (logger, endpoint, params, response, duration) => {
  const logData = {
    endpoint,
    params,
    responseStatus: response?.status,
    duration: `${duration}ms`,
    success: response?.success || response?.status < 400,
  };

  if (logData.success) {
    logger.info(`API Call Success: ${endpoint}`, logData);
  } else {
    logger.warn(`API Call Failed: ${endpoint}`, logData);
  }
};

const logError = (logger, message, error, additionalData = {}) => {
  logger.error(message, {
    error: {
      message: error.message,
      stack: error.stack,
      code: error.code,
    },
    ...additionalData,
  });
};

const logPerformance = (logger, operation, duration, metadata = {}) => {
  const level = duration > 1000 ? 'warn' : 'info';
  logger[level](`Performance: ${operation}`, {
    duration: `${duration}ms`,
    slow: duration > 1000,
    ...metadata,
  });
};

const logCacheOperation = (logger, operation, key, hit, metadata = {}) => {
  logger.debug(`Cache ${operation}: ${key}`, {
    hit,
    operation,
    key,
    ...metadata,
  });
};

module.exports = {
  getLogger,
  logApiCall,
  logError,
  logPerformance,
  logCacheOperation,
};