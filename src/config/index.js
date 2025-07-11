/**
 * Application Configuration
 * Centralized configuration management with validation
 */

const Joi = require('joi');
const secureConfig = require('./secure-config');

// Load environment variables securely
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

// Configuration schema definition
const configSchema = Joi.object({
  // Environment
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'staging')
    .default('development'),
  
  // Server
  PORT: Joi.number()
    .port()
    .default(3001),
  
  // API Configuration
  API: Joi.object({
    FOOTBALL_API_KEY: Joi.string().required()
      .description('FootyStats API key - required for all API calls'),
    FOOTBALL_API_URL: Joi.string().uri()
      .default('https://api.footystats.org/v1')
      .description('Base URL for FootyStats API'),
    TIMEOUT: Joi.number()
      .min(1000)
      .max(60000)
      .default(15000)
      .description('API request timeout in milliseconds'),
    RETRY_ATTEMPTS: Joi.number()
      .min(0)
      .max(5)
      .default(3),
    RETRY_DELAY: Joi.number()
      .min(100)
      .max(5000)
      .default(1000),
    DEFAULT_MATCH_LIMIT: Joi.number()
      .min(5)
      .max(100)
      .default(20),
    DEFAULT_H2H_LIMIT: Joi.number()
      .min(5)
      .max(50)
      .default(10),
    MAX_BATCH_SIZE: Joi.number()
      .min(1)
      .max(50)
      .default(10),
    MIN_REQUEST_DELAY: Joi.number()
      .min(10)
      .max(2000)
      .default(50)
      .description('Minimum delay between API requests in milliseconds for high-traffic system'),
    DEFAULT_MATCH_LIMIT: Joi.number()
      .min(1)
      .max(100)
      .default(20)
      .description('Default limit for match queries'),
    DEFAULT_H2H_LIMIT: Joi.number()
      .min(1)
      .max(50)
      .default(10)
      .description('Default limit for head-to-head queries'),
    MIN_REQUEST_DELAY: Joi.number()
      .min(0)
      .max(1000)
      .default(50)
      .description('Minimum delay between API requests in milliseconds')
  }),
  
  // Rate Limiting
  RATE_LIMIT: Joi.object({
    WINDOW_MS: Joi.number()
      .min(1000)
      .default(60 * 1000) // 1 minute
      .description('Rate limit window in milliseconds'),
    MAX_REQUESTS: Joi.number()
      .min(1)
      .default(1000)
      .description('Maximum requests per window for high-traffic system'),
    SKIP_SUCCESSFUL_REQUESTS: Joi.boolean()
      .default(false),
    SKIP_FAILED_REQUESTS: Joi.boolean()
      .default(false)
  }),
  
  // Cache Configuration
  CACHE: Joi.object({
    DEFAULT_TTL: Joi.number()
      .min(0)
      .default(3600000) // 1 hour in ms
      .description('Default cache TTL in milliseconds'),
    TEAM_DATA_TTL: Joi.number()
      .min(0)
      .default(7200000) // 2 hours
      .description('Team data cache TTL'),
    MATCH_DATA_TTL: Joi.number()
      .min(0)
      .default(1800000) // 30 minutes
      .description('Match data cache TTL'),
    STATISTICS_TTL: Joi.number()
      .min(0)
      .default(900000) // 15 minutes
      .description('Statistics cache TTL'),
    MAX_SIZE: Joi.number()
      .min(100)
      .max(10000)
      .default(1000)
      .description('Maximum cache entries'),
    ENABLE_CACHE: Joi.boolean()
      .default(true),
    CLEANUP_INTERVAL: Joi.number()
      .min(60000)
      .max(3600000)
      .default(300000)
      .description('Cache cleanup interval in milliseconds'),
    LIVE_DATA_TTL: Joi.number()
      .min(10000)
      .max(300000)
      .default(60000)
      .description('Live data cache TTL')
  }),
  
  // Redis Configuration (optional)
  REDIS: Joi.object({
    ENABLED: Joi.boolean()
      .default(false),
    URL: Joi.string()
      .uri({ scheme: ['redis', 'rediss'] })
      .when('ENABLED', {
        is: true,
        then: Joi.required()
      }),
    HOST: Joi.string()
      .hostname()
      .default('localhost'),
    PORT: Joi.number()
      .port()
      .default(6379),
    PASSWORD: Joi.string()
      .allow('', null),
    DB: Joi.number()
      .min(0)
      .max(15)
      .default(0),
    CONNECTION_TIMEOUT: Joi.number()
      .default(5000),
    MAX_RETRY_ATTEMPTS: Joi.number()
      .min(0)
      .max(10)
      .default(3),
    RETRY_DELAY_BASE: Joi.number()
      .min(50)
      .max(1000)
      .default(100),
    MAX_RETRY_DELAY: Joi.number()
      .min(1000)
      .max(30000)
      .default(3000),
    MAX_RETRY_ATTEMPTS: Joi.number()
      .min(0)
      .max(10)
      .default(3),
    RETRY_DELAY_BASE: Joi.number()
      .min(10)
      .max(1000)
      .default(100),
    MAX_RETRY_DELAY: Joi.number()
      .min(100)
      .max(10000)
      .default(3000)
  }),
  
  // Logging Configuration
  LOGGING: Joi.object({
    LEVEL: Joi.string()
      .valid('error', 'warn', 'info', 'http', 'debug')
      .default('info'),
    PRETTY_PRINT: Joi.boolean()
      .default(true),
    LOG_TO_FILE: Joi.boolean()
      .default(false),
    FILE_PATH: Joi.string()
      .default('./logs/app.log'),
    MAX_FILE_SIZE: Joi.string()
      .pattern(/^\d+[kmg]?b?$/i)
      .default('10mb'),
    MAX_FILES: Joi.number()
      .min(1)
      .max(30)
      .default(5)
  }),
  
  // CORS Configuration
  CORS: Joi.object({
    ENABLED: Joi.boolean()
      .default(true),
    ORIGINS: Joi.alternatives()
      .try(
        Joi.string(),
        Joi.array().items(Joi.string())
      )
      .default('*'),
    CREDENTIALS: Joi.boolean()
      .default(true),
    MAX_AGE: Joi.number()
      .default(86400) // 24 hours
  }),
  
  // Security
  SECURITY: Joi.object({
    HELMET_ENABLED: Joi.boolean()
      .default(true),
    TRUST_PROXY: Joi.boolean()
      .default(false),
    SESSION_SECRET: Joi.string()
      .min(32)
      .default('change-this-secret-in-production')
  }),
  
  // Monitoring
  MONITORING: Joi.object({
    PROMETHEUS_ENABLED: Joi.boolean()
      .default(true),
    METRICS_PATH: Joi.string()
      .default('/metrics'),
    COLLECT_DEFAULT_METRICS: Joi.boolean()
      .default(true),
    HEALTH_CHECK_PATH: Joi.string()
      .default('/health'),
    METRICS_COLLECTION_INTERVAL: Joi.number()
      .min(1000)
      .max(60000)
      .default(10000)
      .description('Metrics collection interval in milliseconds')
  }),
  
  // Compression Configuration
  COMPRESSION: Joi.object({
    ENABLED: Joi.boolean()
      .default(true),
    LEVEL: Joi.number()
      .min(-1)
      .max(9)
      .default(6)
      .description('Compression level (-1 = default, 0 = no compression, 9 = max)'),
    THRESHOLD: Joi.number()
      .min(0)
      .default(1024)
      .description('Minimum response size in bytes to compress'),
    MEMORY_LEVEL: Joi.number()
      .min(1)
      .max(9)
      .default(8)
      .description('Memory level for compression')
  })
}).unknown(false); // Don't allow unknown keys

// Build configuration object from environment variables
const envConfig = {
  NODE_ENV: process.env.NODE_ENV,
  PORT: parseInt(process.env.PORT, 10),
  
  API: {
    FOOTBALL_API_KEY: process.env.FOOTYSTATS_API_KEY || process.env.FOOTBALL_API_KEY,
    FOOTBALL_API_URL: process.env.FOOTYSTATS_BASE_URL || process.env.FOOTBALL_API_URL,
    TIMEOUT: parseInt(process.env.API_TIMEOUT, 10),
    RETRY_ATTEMPTS: parseInt(process.env.API_RETRY_ATTEMPTS, 10),
    RETRY_DELAY: parseInt(process.env.API_RETRY_DELAY, 10),
    DEFAULT_MATCH_LIMIT: parseInt(process.env.API_DEFAULT_MATCH_LIMIT, 10),
    DEFAULT_H2H_LIMIT: parseInt(process.env.API_DEFAULT_H2H_LIMIT, 10),
    MAX_BATCH_SIZE: parseInt(process.env.API_MAX_BATCH_SIZE, 10),
    MIN_REQUEST_DELAY: parseInt(process.env.API_MIN_REQUEST_DELAY, 10)
  },
  
  RATE_LIMIT: {
    WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10),
    MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10),
    SKIP_SUCCESSFUL_REQUESTS: process.env.RATE_LIMIT_SKIP_SUCCESSFUL === 'true',
    SKIP_FAILED_REQUESTS: process.env.RATE_LIMIT_SKIP_FAILED === 'true'
  },
  
  CACHE: {
    DEFAULT_TTL: parseInt(process.env.CACHE_DEFAULT_TTL, 10),
    TEAM_DATA_TTL: parseInt(process.env.CACHE_TEAM_DATA_TTL, 10),
    MATCH_DATA_TTL: parseInt(process.env.CACHE_MATCH_DATA_TTL, 10),
    STATISTICS_TTL: parseInt(process.env.CACHE_STATISTICS_TTL, 10),
    MAX_SIZE: parseInt(process.env.CACHE_MAX_SIZE, 10),
    ENABLE_CACHE: process.env.CACHE_ENABLED !== 'false',
    CLEANUP_INTERVAL: parseInt(process.env.CACHE_CLEANUP_INTERVAL, 10),
    LIVE_DATA_TTL: parseInt(process.env.CACHE_LIVE_DATA_TTL, 10)
  },
  
  REDIS: {
    ENABLED: process.env.REDIS_ENABLED === 'true',
    URL: process.env.REDIS_URL,
    HOST: process.env.REDIS_HOST,
    PORT: parseInt(process.env.REDIS_PORT, 10),
    PASSWORD: process.env.REDIS_PASSWORD,
    DB: parseInt(process.env.REDIS_DB, 10),
    CONNECTION_TIMEOUT: parseInt(process.env.REDIS_CONNECTION_TIMEOUT, 10),
    MAX_RETRY_ATTEMPTS: parseInt(process.env.REDIS_MAX_RETRY_ATTEMPTS, 10),
    RETRY_DELAY_BASE: parseInt(process.env.REDIS_RETRY_DELAY_BASE, 10),
    MAX_RETRY_DELAY: parseInt(process.env.REDIS_MAX_RETRY_DELAY, 10)
  },
  
  LOGGING: {
    LEVEL: process.env.LOG_LEVEL,
    PRETTY_PRINT: process.env.LOG_PRETTY_PRINT !== 'false',
    LOG_TO_FILE: process.env.LOG_TO_FILE === 'true',
    FILE_PATH: process.env.LOG_FILE_PATH,
    MAX_FILE_SIZE: process.env.LOG_MAX_FILE_SIZE,
    MAX_FILES: parseInt(process.env.LOG_MAX_FILES, 10)
  },
  
  CORS: {
    ENABLED: process.env.CORS_ENABLED !== 'false',
    ORIGINS: process.env.CORS_ORIGINS ? 
      (process.env.CORS_ORIGINS.includes(',') ? 
        process.env.CORS_ORIGINS.split(',').map(o => o.trim()) : 
        process.env.CORS_ORIGINS) : undefined,
    CREDENTIALS: process.env.CORS_CREDENTIALS !== 'false',
    MAX_AGE: parseInt(process.env.CORS_MAX_AGE, 10)
  },
  
  SECURITY: {
    HELMET_ENABLED: process.env.HELMET_ENABLED !== 'false',
    TRUST_PROXY: process.env.TRUST_PROXY === 'true',
    SESSION_SECRET: process.env.SESSION_SECRET
  },
  
  MONITORING: {
    PROMETHEUS_ENABLED: process.env.PROMETHEUS_ENABLED !== 'false',
    METRICS_PATH: process.env.METRICS_PATH,
    COLLECT_DEFAULT_METRICS: process.env.COLLECT_DEFAULT_METRICS !== 'false',
    HEALTH_CHECK_PATH: process.env.HEALTH_CHECK_PATH,
    METRICS_COLLECTION_INTERVAL: parseInt(process.env.METRICS_COLLECTION_INTERVAL, 10)
  },
  
  COMPRESSION: {
    ENABLED: process.env.COMPRESSION_ENABLED !== 'false',
    LEVEL: parseInt(process.env.COMPRESSION_LEVEL, 10),
    THRESHOLD: parseInt(process.env.COMPRESSION_THRESHOLD, 10),
    MEMORY_LEVEL: parseInt(process.env.COMPRESSION_MEMORY_LEVEL, 10)
  }
};

// Validate configuration
const { error, value: validatedConfig } = configSchema.validate(envConfig, {
  abortEarly: false,
  stripUnknown: true
});

if (error) {
  const errorMessage = error.details
    .map(detail => `  - ${detail.message}`)
    .join('\n');
  
  console.error('Configuration validation failed:\n' + errorMessage);
  process.exit(1);
}

// Add helper methods
validatedConfig.isDevelopment = () => validatedConfig.NODE_ENV === 'development';
validatedConfig.isProduction = () => validatedConfig.NODE_ENV === 'production';
validatedConfig.isTest = () => validatedConfig.NODE_ENV === 'test';

// Log configuration in development
if (validatedConfig.isDevelopment()) {
  console.log('Configuration loaded:', {
    NODE_ENV: validatedConfig.NODE_ENV,
    PORT: validatedConfig.PORT,
    API_URL: validatedConfig.API.FOOTBALL_API_URL,
    CACHE_ENABLED: validatedConfig.CACHE.ENABLE_CACHE,
    REDIS_ENABLED: validatedConfig.REDIS.ENABLED,
    LOG_LEVEL: validatedConfig.LOGGING.LEVEL
  });
}

module.exports = validatedConfig;