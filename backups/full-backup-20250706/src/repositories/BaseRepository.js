const axios = require('axios');
const config = require('../config');
const { ExternalAPIError } = require('../errors/AppError');

class BaseRepository {
  constructor() {
    this.apiKey = config.API.FOOTBALL_API_KEY;
    this.baseUrl = config.API.FOOTBALL_API_URL;
    this.cache = new Map(); // Basit memory cache
  }
  
  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await axios({
        url,
        method: options.method || 'GET',
        headers: {
          'X-Auth-Token': this.apiKey,
          ...options.headers
        },
        params: options.params,
        timeout: 10000 // 10 seconds
      });
      
      return response.data;
    } catch (error) {
      // API error handling
      if (error.response) {
        const message = `API Error: ${error.response.status} - ${error.response.statusText}`;
        throw new ExternalAPIError(message, error);
      }
      throw new ExternalAPIError('Network error', error);
    }
  }
  
  getCacheKey(...args) {
    return args.join(':');
  }
  
  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && cached.expiry > Date.now()) {
      console.log(`Cache hit: ${key}`);
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }
  
  setCache(key, data, ttlMinutes = 30) {
    this.cache.set(key, {
      data,
      expiry: Date.now() + (ttlMinutes * 60 * 1000)
    });
  }
}

module.exports = BaseRepository;