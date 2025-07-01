/**
 * CacheManager - Simple in-memory cache with TTL support
 * Provides caching functionality for API responses
 */

const config = require('../config');

class CacheManager {
  constructor() {
    this.cache = new Map();
    this.ttl = config.CACHE.DEFAULT_TTL;
    this.maxSize = config.CACHE.MAX_SIZE;
    this.hits = 0;
    this.misses = 0;
    this.enabled = config.CACHE.ENABLE_CACHE;
    
    // Start periodic cleanup if cache is enabled
    if (this.enabled) {
      this.startCleanupInterval();
    }
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {any} Cached value or null
   */
  get(key) {
    if (!this.enabled) {
      return null;
    }
    
    const item = this.cache.get(key);
    
    if (!item) {
      this.misses++;
      return null;
    }
    
    // Check if expired
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }
    
    this.hits++;
    item.accessCount++;
    item.lastAccessed = Date.now();
    return item.value;
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in milliseconds
   */
  set(key, value, ttl = this.ttl) {
    if (!this.enabled) {
      return;
    }
    
    // Check cache size limit
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }
    
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttl,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      accessCount: 0
    });
  }

  /**
   * Delete specific key from cache
   * @param {string} key - Cache key
   */
  delete(key) {
    return this.cache.delete(key);
  }

  /**
   * Check if key exists and is not expired
   * @param {string} key - Cache key
   * @returns {boolean}
   */
  has(key) {
    if (!this.enabled) {
      return false;
    }
    
    const item = this.cache.get(key);
    if (!item) return false;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this.cache.clear();
    this.resetStats();
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: this.hits > 0 ? (this.hits / (this.hits + this.misses) * 100).toFixed(2) + '%' : '0%',
      maxSize: this.maxSize
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Cleanup expired entries
   */
  cleanup() {
    const now = Date.now();
    let deletedCount = 0;
    
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
        deletedCount++;
      }
    }
    
    if (deletedCount > 0) {
      console.log(`[CacheManager] Cleaned up ${deletedCount} expired entries`);
    }
  }

  /**
   * Evict least recently used item
   */
  evictLRU() {
    let lruKey = null;
    let lruTime = Date.now();
    
    for (const [key, item] of this.cache.entries()) {
      if (item.lastAccessed < lruTime) {
        lruTime = item.lastAccessed;
        lruKey = key;
      }
    }
    
    if (lruKey) {
      this.cache.delete(lruKey);
      console.log(`[CacheManager] Evicted LRU key: ${lruKey}`);
    }
  }

  /**
   * Start periodic cleanup interval
   */
  startCleanupInterval() {
    // Run cleanup every 5 minutes
    const cleanupInterval = config.CACHE.CLEANUP_INTERVAL || 300000;
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, cleanupInterval);
  }

  /**
   * Stop cleanup interval
   */
  stopCleanupInterval() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  /**
   * Get all keys matching a pattern
   * @param {string} pattern - Pattern to match (supports * wildcard)
   * @returns {Array} Matching keys
   */
  keys(pattern) {
    const keys = Array.from(this.cache.keys());
    
    if (!pattern) return keys;
    
    // Convert pattern to regex
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return keys.filter(key => regex.test(key));
  }

  /**
   * Delete all keys matching a pattern
   * @param {string} pattern - Pattern to match
   * @returns {number} Number of deleted keys
   */
  deletePattern(pattern) {
    const keysToDelete = this.keys(pattern);
    keysToDelete.forEach(key => this.cache.delete(key));
    return keysToDelete.length;
  }
}

// Export singleton instance
module.exports = new CacheManager();