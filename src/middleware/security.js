/**
 * Security middleware configuration
 * Provides comprehensive security headers and protection
 */

const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const logger = require('../utils/logger');

// Rate limiter configuration
const createRateLimiter = (options = {}) => {
  const defaultOptions = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        path: req.path,
        userAgent: req.get('user-agent')
      });
      res.status(429).json({
        success: false,
        error: options.message || 'Too many requests from this IP, please try again later.',
        errorDetails: {
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: req.rateLimit.resetTime
        }
      });
    }
  };

  return rateLimit({ ...defaultOptions, ...options });
};

// General rate limiter
const generalLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // 100 requests per 15 minutes
});

// Strict rate limiter for sensitive endpoints
const strictLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per 15 minutes
  message: 'Too many requests to this endpoint, please try again later.'
});

// Auth rate limiter
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per 15 minutes
  skipSuccessfulRequests: true, // Don't count successful requests
  message: 'Too many authentication attempts, please try again later.'
});

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);
    
    // Check if origin is allowed
    const allowedOrigins = (process.env.CORS_ORIGINS || '*').split(',');
    
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn('CORS blocked request', { origin, allowedOrigins });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  maxAge: 86400 // 24 hours
};

// Helmet configuration
const helmetConfig = helmet({
  contentSecurityPolicy: false, // Temporarily disabled for development
  crossOriginEmbedderPolicy: false, // May need to disable for some API integrations
});

// MongoDB injection protection
const mongoSanitizeConfig = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    logger.warn('Mongo injection attempt detected', {
      ip: req.ip,
      path: req.path,
      key: key
    });
  }
});

// XSS Protection middleware
const xssProtection = (req, res, next) => {
  // Set additional XSS protection headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
};

// Security headers middleware
const securityHeaders = (req, res, next) => {
  // Remove sensitive headers
  res.removeHeader('X-Powered-By');
  
  // Add security headers
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  next();
};

// Log security events
const securityLogger = (req, res, next) => {
  // Log suspicious patterns
  const suspiciousPatterns = [
    /\.\.\//,  // Directory traversal
    /<script/i, // XSS attempts
    /union.*select/i, // SQL injection
    /\$where/i, // MongoDB injection
  ];
  
  const url = req.url + (req.body ? JSON.stringify(req.body) : '');
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(url)) {
      logger.warn('Suspicious request detected', {
        ip: req.ip,
        method: req.method,
        url: req.url,
        pattern: pattern.toString(),
        userAgent: req.get('user-agent')
      });
      break;
    }
  }
  
  next();
};

module.exports = {
  helmet: helmetConfig,
  cors: cors(corsOptions),
  limiter: generalLimiter,
  strictLimiter,
  authLimiter,
  mongoSanitize: mongoSanitizeConfig,
  xssProtection,
  securityHeaders,
  securityLogger,
  createRateLimiter
};