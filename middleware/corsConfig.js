// CORS Configuration Middleware
const cors = require('cors');
const Logger = require('../utils/logger');
const logger = new Logger('CORS');

/**
 * Allowed origins for different environments
 */
const getAllowedOrigins = () => {
  const env = process.env.NODE_ENV || 'development';

  // Base allowed origins
  const baseOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5000',
    'http://localhost:5173', // Vite
    'http://localhost:8080',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:5000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:8080',
  ];

  // Production origins (add your production domains)
  const productionOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
    : [];

  // Development allows more origins
  if (env === 'development') {
    return [
      ...baseOrigins,
      ...productionOrigins,
      'http://localhost:*',
      'http://127.0.0.1:*',
      'https://localhost:*',
      'https://127.0.0.1:*',
    ];
  }

  // Production only allows specific origins
  return [...baseOrigins, ...productionOrigins];
};

/**
 * CORS options configuration
 */
const corsOptions = {
  // Dynamic origin validation
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }

    const allowedOrigins = getAllowedOrigins();
    const env = process.env.NODE_ENV || 'development';

    // Check if origin is in allowed list
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      // Handle wildcard ports in development
      if (env === 'development' && allowedOrigin.includes(':*')) {
        const baseUrl = allowedOrigin.replace(':*', '');
        return origin.startsWith(baseUrl);
      }
      return origin === allowedOrigin;
    });

    if (isAllowed) {
      logger.debug(`CORS: Allowed origin ${origin}`);
      callback(null, true);
    } else {
      logger.warn(`CORS: Blocked origin ${origin}`, {
        origin,
        allowedOrigins: env === 'production' ? '[hidden]' : allowedOrigins,
      });
      callback(new Error('Not allowed by CORS'));
    }
  },

  // Allowed methods
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],

  // Allowed headers
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'X-API-Key',
    'X-Session-ID',
    'X-Client-Version',
  ],

  // Exposed headers (headers that the browser is allowed to access)
  exposedHeaders: [
    'X-Total-Count',
    'X-Page-Count',
    'X-Current-Page',
    'X-Per-Page',
    'X-Rate-Limit-Limit',
    'X-Rate-Limit-Remaining',
    'X-Rate-Limit-Reset',
  ],

  // Allow credentials (cookies, authorization headers)
  credentials: true,

  // Max age for preflight requests cache (24 hours)
  maxAge: 86400,

  // Success status for legacy browsers
  optionsSuccessStatus: 200,
};

/**
 * Create CORS middleware with custom options
 */
function createCorsMiddleware(customOptions = {}) {
  const mergedOptions = {
    ...corsOptions,
    ...customOptions,
  };

  return cors(mergedOptions);
}

/**
 * Strict CORS for sensitive endpoints
 */
const strictCorsOptions = {
  ...corsOptions,
  origin: (origin, callback) => {
    // Only allow specific production origins for sensitive endpoints
    const strictOrigins = process.env.STRICT_ORIGINS
      ? process.env.STRICT_ORIGINS.split(',').map(o => o.trim())
      : [];

    if (!origin && process.env.NODE_ENV === 'production') {
      // Reject requests with no origin in production for strict endpoints
      return callback(new Error('Origin required for this endpoint'));
    }

    if (!origin || strictOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`Strict CORS: Blocked origin ${origin} from sensitive endpoint`);
      callback(new Error('Not allowed by strict CORS policy'));
    }
  },
};

// Pre-configured middleware instances
const corsMiddleware = createCorsMiddleware();
const strictCorsMiddleware = createCorsMiddleware(strictCorsOptions);

module.exports = {
  corsMiddleware,
  strictCorsMiddleware,
  createCorsMiddleware,
  corsOptions,
  getAllowedOrigins,
};
