// Redis Cache Wrapper with Fallback to In-Memory Cache
const CacheManager = require('./cacheManager');
const Logger = require('./logger');

class RedisCache {
  constructor(redisClient = null, fallbackTTL = 15 * 60 * 1000) {
    this.logger = new Logger('RedisCache');
    this.redisClient = redisClient;
    this.isRedisConnected = false;
    this.fallbackCache = new CacheManager(fallbackTTL);

    // Initialize Redis if client provided
    if (this.redisClient) {
      this.initializeRedis();
    } else {
      this.logger.warn('Redis client not provided, using in-memory cache only');
    }
  }

  async initializeRedis() {
    try {
      // Check if Redis is already connected
      if (this.redisClient.isReady) {
        this.isRedisConnected = true;
        this.logger.success('Redis already connected');
        return;
      }

      // Set up event listeners
      this.redisClient.on('connect', () => {
        this.isRedisConnected = true;
        this.logger.success('Redis connected successfully');
      });

      this.redisClient.on('error', err => {
        this.logger.error('Redis connection error', err);
        this.isRedisConnected = false;
      });

      this.redisClient.on('end', () => {
        this.isRedisConnected = false;
        this.logger.warn('Redis connection closed');
      });

      // Connect to Redis
      await this.redisClient.connect();
    } catch (error) {
      this.logger.error('Failed to initialize Redis', error);
      this.isRedisConnected = false;
    }
  }

  /**
   * Get value from cache (Redis first, then fallback)
   */
  async get(key) {
    try {
      // Try Redis first if connected
      if (this.isRedisConnected && this.redisClient) {
        const value = await this.redisClient.get(key);
        if (value) {
          this.logger.debug(`Cache hit (Redis): ${key}`);
          // Record cache hit if metrics available
          if (global.metricsStore) {
            global.metricsStore.recordCacheHit();
          }
          return JSON.parse(value);
        }
      }

      // Fallback to in-memory cache
      const fallbackValue = this.fallbackCache.get(key);
      if (fallbackValue) {
        this.logger.debug(`Cache hit (Memory): ${key}`);
        // Record cache hit if metrics available
        if (global.metricsStore) {
          global.metricsStore.recordCacheHit();
        }
        return fallbackValue;
      }

      this.logger.debug(`Cache miss: ${key}`);
      // Record cache miss if metrics available
      if (global.metricsStore) {
        global.metricsStore.recordCacheMiss();
      }
      return null;
    } catch (error) {
      this.logger.error(`Error getting cache key ${key}`, error);
      // Try fallback on Redis error
      return this.fallbackCache.get(key);
    }
  }

  /**
   * Set value in cache (both Redis and fallback)
   */
  async set(key, value, ttlSeconds = 900) {
    try {
      const serializedValue = JSON.stringify(value);

      // Set in Redis if connected
      if (this.isRedisConnected && this.redisClient) {
        await this.redisClient.setEx(key, ttlSeconds, serializedValue);
        this.logger.debug(`Cache set (Redis): ${key}, TTL: ${ttlSeconds}s`);
      }

      // Always set in fallback cache too
      this.fallbackCache.set(key, value, ttlSeconds * 1000);

      return true;
    } catch (error) {
      this.logger.error(`Error setting cache key ${key}`, error);
      // Ensure it's at least in fallback cache
      this.fallbackCache.set(key, value, ttlSeconds * 1000);
      return false;
    }
  }

  /**
   * Delete key from cache
   */
  async del(key) {
    try {
      // Delete from Redis if connected
      if (this.isRedisConnected && this.redisClient) {
        await this.redisClient.del(key);
      }

      // Always delete from fallback too
      this.fallbackCache.delete(key);

      this.logger.debug(`Cache deleted: ${key}`);
      return true;
    } catch (error) {
      this.logger.error(`Error deleting cache key ${key}`, error);
      this.fallbackCache.delete(key);
      return false;
    }
  }

  /**
   * Clear all cache
   */
  async clear() {
    try {
      // Clear Redis if connected
      if (this.isRedisConnected && this.redisClient) {
        await this.redisClient.flushDb();
        this.logger.info('Redis cache cleared');
      }

      // Always clear fallback
      this.fallbackCache.clear();

      return true;
    } catch (error) {
      this.logger.error('Error clearing cache', error);
      this.fallbackCache.clear();
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    const stats = {
      redisConnected: this.isRedisConnected,
      memoryCache: this.fallbackCache.getStats(),
    };

    if (this.isRedisConnected && this.redisClient) {
      try {
        const info = await this.redisClient.info('memory');
        stats.redis = {
          memory: info,
          dbSize: await this.redisClient.dbSize(),
        };
      } catch (error) {
        this.logger.error('Error getting Redis stats', error);
      }
    }

    return stats;
  }

  /**
   * Health check
   */
  async healthCheck() {
    const health = {
      status: 'healthy',
      redis: false,
      memory: true,
    };

    if (this.redisClient) {
      try {
        await this.redisClient.ping();
        health.redis = true;
      } catch (error) {
        health.status = 'degraded';
        this.logger.warn('Redis health check failed', error);
      }
    }

    return health;
  }
}

module.exports = RedisCache;
