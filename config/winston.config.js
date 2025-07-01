const winston = require('winston');
require('winston-daily-rotate-file');
const path = require('path');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Tell winston about our colors
winston.addColors(colors);

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Define console format (pretty print for development)
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, service, ...metadata }) => {
    let msg = `${timestamp} [${service || 'APP'}] ${level}: ${message}`;
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
  })
);

// Create the logger
const createLogger = (service = 'APP') => {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  // File transports
  const fileRotateTransport = new winston.transports.DailyRotateFile({
    filename: path.join(__dirname, '..', 'logs', `${service}-%DATE%.log`),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    format,
    level: 'info',
  });

  const errorFileRotateTransport = new winston.transports.DailyRotateFile({
    filename: path.join(__dirname, '..', 'logs', `${service}-error-%DATE%.log`),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '30d',
    format,
    level: 'error',
  });

  // Console transport
  const consoleTransport = new winston.transports.Console({
    format: consoleFormat,
    level: isDevelopment ? 'debug' : 'info',
  });

  const logger = winston.createLogger({
    level: isDevelopment ? 'debug' : 'info',
    levels,
    format,
    defaultMeta: { service },
    transports: [fileRotateTransport, errorFileRotateTransport],
  });

  // Add console transport in development
  if (isDevelopment) {
    logger.add(consoleTransport);
  }

  // Create a stream object for Morgan
  logger.stream = {
    write: (message) => {
      logger.http(message.trim());
    },
  };

  return logger;
};

// Export logger factory
module.exports = createLogger;