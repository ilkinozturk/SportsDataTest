// Mock RedisCache
class RedisCache {
  constructor() {
    this.memoryCache = new Map();
    this.isRedisConnected = false;
    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
    };
  }

  async connect() {
    // Simulate connection
    this.isRedisConnected = true;
    return Promise.resolve();
  }

  async close() {
    this.isRedisConnected = false;
    return Promise.resolve();
  }

  isConnected() {
    return this.isRedisConnected;
  }

  async get(key) {
    const value = this.memoryCache.get(key);
    if (value) {
      this.stats.hits++;
    } else {
      this.stats.misses++;
    }
    this.stats.hitRate = this.stats.hits / (this.stats.hits + this.stats.misses);
    return value || null;
  }

  async set(key, value, ttl) {
    this.memoryCache.set(key, value);
    if (ttl) {
      setTimeout(() => {
        this.memoryCache.delete(key);
      }, ttl * 1000);
    }
    return Promise.resolve();
  }

  async delete(key) {
    this.memoryCache.delete(key);
    return Promise.resolve();
  }

  getStats() {
    return this.stats;
  }
}

module.exports = RedisCache;