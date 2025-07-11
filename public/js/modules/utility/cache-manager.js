/**
 * Cache Manager Module
 * Handles caching functionality for the team stats application
 */

(function (global) {
  'use strict';

  const CacheManager = {
    initialized: false,
    cache: new Map(),
    config: {
      defaultTTL: 5 * 60 * 1000, // 5 minutes
      maxSize: 100,
      storageKey: 'teamstats_cache',
    },

    init() {
      if (this.initialized) return;

      this.loadFromStorage();
      this.setupCleanup();

      this.initialized = true;
    },

    set(key, value, ttl = this.config.defaultTTL) {
      const item = {
        value,
        timestamp: Date.now(),
        ttl,
      };

      this.cache.set(key, item);

      // Check size limit
      if (this.cache.size > this.config.maxSize) {
        this.evictOldest();
      }

      this.saveToStorage();
    },

    get(key) {
      const item = this.cache.get(key);

      if (!item) {
        return null;
      }

      // Check if expired
      if (this.isExpired(item)) {
        this.cache.delete(key);
        this.saveToStorage();
        return null;
      }

      return item.value;
    },

    has(key) {
      const item = this.cache.get(key);
      return item && !this.isExpired(item);
    },

    delete(key) {
      const deleted = this.cache.delete(key);
      if (deleted) {
        this.saveToStorage();
      }
      return deleted;
    },

    clear() {
      this.cache.clear();
      this.saveToStorage();
    },

    isExpired(item) {
      if (!item.ttl) return false;
      return Date.now() - item.timestamp > item.ttl;
    },

    evictOldest() {
      let oldestKey = null;
      let oldestTime = Date.now();

      for (const [key, item] of this.cache) {
        if (item.timestamp < oldestTime) {
          oldestTime = item.timestamp;
          oldestKey = key;
        }
      }

      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    },

    cleanup() {
      const now = Date.now();
      const expired = [];

      for (const [key, item] of this.cache) {
        if (this.isExpired(item)) {
          expired.push(key);
        }
      }

      expired.forEach(key => this.cache.delete(key));

      if (expired.length > 0) {
        this.saveToStorage();
      }
    },

    setupCleanup() {
      // Clean up expired items every minute
      setInterval(() => {
        this.cleanup();
      }, 60 * 1000);
    },

    saveToStorage() {
      try {
        const serialized = JSON.stringify(Array.from(this.cache.entries()));
        localStorage.setItem(this.config.storageKey, serialized);
      } catch (error) {
      }
    },

    loadFromStorage() {
      try {
        const stored = localStorage.getItem(this.config.storageKey);
        if (stored) {
          const entries = JSON.parse(stored);
          this.cache = new Map(entries);

          // Clean up expired items on load
          this.cleanup();
        }
      } catch (error) {
        this.cache = new Map();
      }
    },

    getStats() {
      const now = Date.now();
      let validItems = 0;
      let expiredItems = 0;

      for (const [key, item] of this.cache) {
        if (this.isExpired(item)) {
          expiredItems++;
        } else {
          validItems++;
        }
      }

      return {
        totalItems: this.cache.size,
        validItems,
        expiredItems,
        maxSize: this.config.maxSize,
      };
    },

    // Utility methods for common cache patterns
    getOrSet(key, factory, ttl) {
      let value = this.get(key);

      if (value === null) {
        if (typeof factory === 'function') {
          value = factory();
        } else {
          value = factory;
        }
        this.set(key, value, ttl);
      }

      return value;
    },

    async getOrSetAsync(key, asyncFactory, ttl) {
      let value = this.get(key);

      if (value === null) {
        value = await asyncFactory();
        this.set(key, value, ttl);
      }

      return value;
    },
  };

  // Global registration
  global.TeamStatsCacheManager = CacheManager;

  // Auto-initialize
  CacheManager.init();
})(window);
