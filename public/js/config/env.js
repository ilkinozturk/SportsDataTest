/**
 * Environment-based configuration
 * Provides different settings for development, staging, and production
 */

// Detect environment
const getEnvironment = () => {
  // Check if we're in a browser environment
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;

    // Development environments
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('.local')) {
      return 'development';
    }

    // Staging environments
    if (hostname.includes('staging') || hostname.includes('test') || hostname.includes('qa')) {
      return 'staging';
    }

    // Production by default
    return 'production';
  }

  // Node.js environment
  return process.env.NODE_ENV || 'development';
};

// Environment configurations
const ENV_CONFIGS = {
  development: {
    // API Configuration
    API_URL: 'http://localhost:3005/api',
    API_TIMEOUT: 30000, // 30 seconds
    API_RETRY_ATTEMPTS: 3,
    API_RETRY_DELAY: 1000, // 1 second
    API_RATE_LIMIT_DELAY: 1500, // 1.5 seconds between calls to avoid 429

    // Feature Flags
    ENABLE_DEBUG: true,
    ENABLE_PERFORMANCE_MONITOR: true,
    ENABLE_ERROR_REPORTING: true,
    ENABLE_ANALYTICS: false,
    ENABLE_CACHE: true,
    ENABLE_MOCK_DATA: true,

    // Performance Settings
    DEBOUNCE_DELAY: 150,
    THROTTLE_DELAY: 50,
    LAZY_LOAD_OFFSET: '100px',
    VIRTUAL_SCROLL_BUFFER: 5,

    // Cache Settings
    CACHE_TTL: 300000, // 5 minutes
    CACHE_MAX_SIZE: 100, // max items

    // Logging
    LOG_LEVEL: 'debug',
    LOG_TO_CONSOLE: true,
    LOG_TO_SERVER: false,

    // UI Settings
    SHOW_DEV_TOOLS: true,
    SHOW_PERFORMANCE_DASHBOARD: true,
    ENABLE_HOT_RELOAD: true,

    // Error Handling
    SHOW_ERROR_DETAILS: true,
    REPORT_ERRORS: false,
    ERROR_ENDPOINT: null,
  },

  staging: {
    // API Configuration
    API_URL: 'https://staging-api.yourdomain.com',
    API_TIMEOUT: 20000, // 20 seconds
    API_RETRY_ATTEMPTS: 2,
    API_RETRY_DELAY: 2000, // 2 seconds
    API_RATE_LIMIT_DELAY: 2000, // 2 seconds for staging

    // Feature Flags
    ENABLE_DEBUG: true,
    ENABLE_PERFORMANCE_MONITOR: true,
    ENABLE_ERROR_REPORTING: true,
    ENABLE_ANALYTICS: true,
    ENABLE_CACHE: true,
    ENABLE_MOCK_DATA: false,

    // Performance Settings
    DEBOUNCE_DELAY: 200,
    THROTTLE_DELAY: 100,
    LAZY_LOAD_OFFSET: '200px',
    VIRTUAL_SCROLL_BUFFER: 3,

    // Cache Settings
    CACHE_TTL: 600000, // 10 minutes
    CACHE_MAX_SIZE: 200,

    // Logging
    LOG_LEVEL: 'info',
    LOG_TO_CONSOLE: true,
    LOG_TO_SERVER: true,

    // UI Settings
    SHOW_DEV_TOOLS: true,
    SHOW_PERFORMANCE_DASHBOARD: false,
    ENABLE_HOT_RELOAD: false,

    // Error Handling
    SHOW_ERROR_DETAILS: false,
    REPORT_ERRORS: true,
    ERROR_ENDPOINT: 'https://staging-api.yourdomain.com/errors',
  },

  production: {
    // API Configuration
    API_URL: 'https://api.yourdomain.com',
    API_TIMEOUT: 15000, // 15 seconds
    API_RETRY_ATTEMPTS: 1,
    API_RETRY_DELAY: 3000, // 3 seconds
    API_RATE_LIMIT_DELAY: 2500, // 2.5 seconds for production

    // Feature Flags
    ENABLE_DEBUG: false,
    ENABLE_PERFORMANCE_MONITOR: false,
    ENABLE_ERROR_REPORTING: true,
    ENABLE_ANALYTICS: true,
    ENABLE_CACHE: true,
    ENABLE_MOCK_DATA: false,

    // Performance Settings
    DEBOUNCE_DELAY: 250,
    THROTTLE_DELAY: 150,
    LAZY_LOAD_OFFSET: '300px',
    VIRTUAL_SCROLL_BUFFER: 2,

    // Cache Settings
    CACHE_TTL: 1800000, // 30 minutes
    CACHE_MAX_SIZE: 500,

    // Logging
    LOG_LEVEL: 'error',
    LOG_TO_CONSOLE: false,
    LOG_TO_SERVER: true,

    // UI Settings
    SHOW_DEV_TOOLS: false,
    SHOW_PERFORMANCE_DASHBOARD: false,
    ENABLE_HOT_RELOAD: false,

    // Error Handling
    SHOW_ERROR_DETAILS: false,
    REPORT_ERRORS: true,
    ERROR_ENDPOINT: 'https://api.yourdomain.com/errors',
  },
};

// Get current environment
const CURRENT_ENV = getEnvironment();

// Export configuration
const ENV = ENV_CONFIGS[CURRENT_ENV];

// Add environment name
ENV.ENVIRONMENT = CURRENT_ENV;

// Add version from webpack DefinePlugin if available
ENV.VERSION = (typeof process !== 'undefined' && process.env?.VERSION) || '1.0.0';

// Helper functions
ENV.isDevelopment = () => CURRENT_ENV === 'development';
ENV.isStaging = () => CURRENT_ENV === 'staging';
ENV.isProduction = () => CURRENT_ENV === 'production';

// Feature flag helpers
ENV.isEnabled = feature => {
  const key = `ENABLE_${feature.toUpperCase().replace(/-/g, '_')}`;
  return ENV[key] === true;
};

// API helpers
ENV.getApiUrl = endpoint => {
  const baseUrl = ENV.API_URL.replace(/\/$/, '');
  const cleanEndpoint = endpoint.replace(/^\//, '');
  return `${baseUrl}/${cleanEndpoint}`;
};

// Cache key helpers
ENV.getCacheKey = key => {
  return `${ENV.ENVIRONMENT}_${ENV.VERSION}_${key}`;
};

// Log helper
ENV.log = (level, message, ...args) => {
  const levels = ['debug', 'info', 'warn', 'error'];
  const currentLevelIndex = levels.indexOf(ENV.LOG_LEVEL);
  const messageLevelIndex = levels.indexOf(level);

  if (messageLevelIndex >= currentLevelIndex && ENV.LOG_TO_CONSOLE) {
    console[level](message, ...args);
  }

  if (ENV.LOG_TO_SERVER && messageLevelIndex >= levels.indexOf('warn')) {
    // Send to server (implement as needed)
    // logToServer(level, message, args);
  }
};

// Error reporting helper
ENV.reportError = (error, context = {}) => {
  if (!ENV.REPORT_ERRORS || !ENV.ERROR_ENDPOINT) return;

  const errorData = {
    message: error.message,
    stack: error.stack,
    context,
    environment: CURRENT_ENV,
    version: ENV.VERSION,
    timestamp: new Date().toISOString(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A',
    url: typeof window !== 'undefined' ? window.location.href : 'N/A',
  };

  // Send error to endpoint using API Client
  if (window.TeamStatsAPIClient) {
    TeamStatsAPIClient.post(ENV.ERROR_ENDPOINT, errorData).catch(err => {
      console.error('Failed to report error:', err);
    });
  }
};

// Performance helper
ENV.measure = async (name, fn) => {
  if (!ENV.ENABLE_PERFORMANCE_MONITOR) {
    return await fn();
  }

  const start = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - start;
    ENV.log('debug', `Performance: ${name} took ${duration.toFixed(2)}ms`);
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    ENV.log('error', `Performance: ${name} failed after ${duration.toFixed(2)}ms`, error);
    throw error;
  }
};

// Make available globally for non-module scripts
if (typeof window !== 'undefined') {
  window.ENV = ENV;
}

// Export for module environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ENV;
}
