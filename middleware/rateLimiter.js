// Advanced Rate Limiting Middleware
const rateLimit = require('express-rate-limit');
// RedisStore is optional - only use if available
let RedisStore;
try {
  RedisStore = require('rate-limit-redis').default || require('rate-limit-redis');
} catch (error) {
  // Redis store not available, will use memory store
}
const Logger = require('../utils/logger');

const logger = new Logger('RateLimiter');

/**
 * Create rate limiter with Redis store (falls back to memory if Redis unavailable)
 */
function createRateLimiter(options = {}) {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100, // limit each IP to 100 requests per windowMs
    message = 'Too many requests from this IP, please try again later.',
    standardHeaders = true,
    legacyHeaders = false,
    keyGenerator = req => req.ip,
    handler = null,
    redisClient = null,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    skip = null,
  } = options;

  // Store configuration
  let store;

  // Try to use Redis if client provided and RedisStore is available
  if (redisClient && redisClient.isReady && RedisStore) {
    try {
      store = new RedisStore({
        client: redisClient,
        prefix: 'rl:',
        sendCommand: (...args) => redisClient.sendCommand(args),
      });
      logger.success('Rate limiter using Redis store');
    } catch (error) {
      logger.warn('Failed to initialize Redis store for rate limiter, using memory', error);
    }
  } else if (!RedisStore) {
    logger.info('Rate limiter using memory store (Redis store package not installed)');
  }

  const limiter = rateLimit({
    windowMs,
    max,
    message,
    standardHeaders,
    legacyHeaders,
    store,
    keyGenerator,
    skipSuccessfulRequests,
    skipFailedRequests,
    skip:
      skip ||
      (req => {
        const ip = req.ip || req.connection?.remoteAddress || '127.0.0.1';

        // Skip rate limiting in development mode
        if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
          return true;
        }

        // Skip for localhost
        if (ip === '::1' || ip === '::ffff:127.0.0.1' || ip === '127.0.0.1') {
          return true;
        }

        return false;
      }),
    handler:
      handler ||
      ((req, res) => {
        logger.warn(`Rate limit exceeded for IP: ${req.ip}`, {
          ip: req.ip,
          path: req.path,
          userAgent: req.get('user-agent'),
        });

        res.status(429).json({
          success: false,
          error: {
            message,
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: res.getHeader('Retry-After'),
          },
        });
      }),
  });

  return limiter;
}

/**
 * Create different rate limiters for different routes
 */
const rateLimiters = {
  // General API rate limiter
  general: redisClient =>
    createRateLimiter({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 300, // Increased from 100
      message: 'Too many API requests, please try again later.',
      redisClient,
    }),

  // Strict rate limiter for data endpoints
  strict: redisClient =>
    createRateLimiter({
      windowMs: 5 * 60 * 1000, // 5 minutes
      max: 100, // Increased from 20
      message: 'Too many data requests, please try again later.',
      redisClient,
      skipSuccessfulRequests: false,
    }),

  // Auth endpoints rate limiter
  auth: redisClient =>
    createRateLimiter({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5,
      message: 'Too many authentication attempts, please try again later.',
      redisClient,
      skipSuccessfulRequests: false,
    }),

  // Public endpoints rate limiter (more lenient)
  public: redisClient =>
    createRateLimiter({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 200,
      message: 'Too many requests, please slow down.',
      redisClient,
      skipFailedRequests: true,
    }),

  // Create custom rate limiter
  custom: options => createRateLimiter(options),
};

/**
 * IP-based rate limiter with whitelist
 */
function createIPBasedLimiter(options = {}) {
  const { whitelist = [], blacklist = [], ...rateLimitOptions } = options;

  return createRateLimiter({
    ...rateLimitOptions,
    keyGenerator: req => {
      const ip = req.ip || req.connection.remoteAddress;

      // Check whitelist
      if (whitelist.includes(ip)) {
        return `whitelist_${ip}`;
      }

      // Check blacklist
      if (blacklist.includes(ip)) {
        return `blacklist_${ip}`;
      }

      return ip;
    },
    skip: req => {
      const ip = req.ip || req.connection.remoteAddress;

      // Skip rate limiting in development mode
      if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
        return true;
      }

      // Skip rate limiting for whitelisted IPs
      if (whitelist.includes(ip)) {
        logger.debug(`Skipping rate limit for whitelisted IP: ${ip}`);
        return true;
      }

      // Skip for health check requests (for monitoring)
      if (req.path === '/api/health' && req.headers['x-health-check'] === 'true') {
        return true;
      }

      // Skip for localhost in any case
      if (ip === '::1' || ip === '::ffff:127.0.0.1' || ip === '127.0.0.1') {
        return true;
      }

      return false;
    },
    handler: (req, res) => {
      const ip = req.ip || req.connection.remoteAddress;

      // Immediate block for blacklisted IPs
      if (blacklist.includes(ip)) {
        logger.error(`Blocked blacklisted IP: ${ip}`);
        return res.status(403).json({
          success: false,
          error: {
            message: 'Access denied',
            code: 'IP_BLACKLISTED',
          },
        });
      }

      // Default rate limit handler
      logger.warn(`Rate limit exceeded for IP: ${ip}`);
      res.status(429).json({
        success: false,
        error: {
          message: 'Too many requests from this IP',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: res.getHeader('Retry-After'),
        },
      });
    },
  });
}

module.exports = {
  createRateLimiter,
  rateLimiters,
  createIPBasedLimiter,
};
