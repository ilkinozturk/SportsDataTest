// Cache Management Utilities

class CacheManager {
  constructor(defaultTTL = 15 * 60 * 1000) {
    // 15 minutes default
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
  }

  /**
   * Get item from cache
   * @param {string} key - Cache key
   * @returns {any|null} Cached value or null if expired/not found
   */
  get(key) {
    const item = this.cache.get(key);

    if (!item) {
      return null;
    }

    // Check if expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  /**
   * Set item in cache
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   * @param {number} ttl - Time to live in milliseconds
   */
  set(key, data, ttl = null) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    });
  }

  /**
   * Check if key exists and is not expired
   * @param {string} key - Cache key
   * @returns {boolean} True if exists and valid
   */
  has(key) {
    return this.get(key) !== null;
  }

  /**
   * Delete item from cache
   * @param {string} key - Cache key
   * @returns {boolean} True if deleted
   */
  delete(key) {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Get cache size
   * @returns {number} Number of items in cache
   */
  size() {
    return this.cache.size;
  }

  /**
   * Clean expired items
   * @returns {number} Number of items cleaned
   */
  cleanExpired() {
    let cleaned = 0;
    const now = Date.now();

    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Get cache stats
   * @returns {object} Cache statistics
   */
  getStats() {
    const now = Date.now();
    let expired = 0;
    let totalSize = 0;

    for (const [_key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        expired++;
      }
      // Rough size estimation
      totalSize += JSON.stringify(item.data).length;
    }

    return {
      totalItems: this.cache.size,
      expiredItems: expired,
      activeItems: this.cache.size - expired,
      approximateSize: `${(totalSize / 1024).toFixed(2)} KB`,
    };
  }
}

module.exports = CacheManager;
