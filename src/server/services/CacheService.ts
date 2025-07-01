import { CacheItem } from '../../shared/types';
import { Logger } from '../utils/logger';

export class CacheService {
  private cache: Map<string, CacheItem<any>>;
  private logger: Logger;

  constructor() {
    this.cache = new Map();
    this.logger = new Logger('CacheService');

    // Clean expired items every 5 minutes
    setInterval(() => this.cleanExpired(), 5 * 60 * 1000);
  }

  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key);

    if (!item) {
      return null;
    }

    const now = Date.now();
    const isExpired = now - item.timestamp > item.ttl * 1000;

    if (isExpired) {
      this.cache.delete(key);
      this.logger.debug(`Cache expired: ${key}`);
      return null;
    }

    this.logger.debug(`Cache hit: ${key}`);
    return item.data;
  }

  async set<T>(key: string, data: T, ttlSeconds: number = 300): Promise<void> {
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds,
    };

    this.cache.set(key, item);
    this.logger.debug(`Cache set: ${key} (TTL: ${ttlSeconds}s)`);
  }

  async delete(key: string): Promise<boolean> {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.logger.debug(`Cache deleted: ${key}`);
    }
    return deleted;
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.logger.info('Cache cleared');
  }

  private cleanExpired(): void {
    const now = Date.now();
    let expiredCount = 0;

    for (const [key, item] of this.cache.entries()) {
      const isExpired = now - item.timestamp > item.ttl * 1000;
      if (isExpired) {
        this.cache.delete(key);
        expiredCount++;
      }
    }

    if (expiredCount > 0) {
      this.logger.debug(`Cleaned ${expiredCount} expired cache items`);
    }
  }

  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}
