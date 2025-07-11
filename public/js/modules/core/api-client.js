/**
 * Team Stats API Client Module
 * Centralizes all API communication with proper error handling,
 * retries, caching, and integration with State Manager and Event Bus
 *
 * Features:
 * - Centralized API configuration
 * - Automatic retries with exponential backoff
 * - Request/response interceptors
 * - Cache management
 * - Error standardization
 * - Request cancellation
 * - Progress tracking
 * - Integration with Event Bus for reactive updates
 */

(function (global) {
  'use strict';

  // Check dependencies
  if (!global.TeamStatsStateManager) {
    throw new Error('API Client requires State Manager to be loaded first');
  }

  if (!global.TeamStatsEventBus) {
    throw new Error('API Client requires Event Bus to be loaded first');
  }

  /**
   * API Client Configuration
   */
  const DEFAULT_CONFIG = global.TeamStatsConstants
    ? {
        baseURL: global.TeamStatsConstants.get('API', 'BASE_URL'),
        timeout: global.TeamStatsConstants.get('API', 'TIMEOUT'),
        retries: global.TeamStatsConstants.get('API', 'RETRY_ATTEMPTS'),
        retryDelay: global.TeamStatsConstants.get('API', 'RETRY_DELAY'),
        cacheEnabled: global.TeamStatsConstants.get('FEATURES', 'ENABLE_CACHE'),
        cacheExpiry: global.TeamStatsConstants.get('API', 'CACHE_DURATION'),
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      }
    : {
        baseURL: '/api',
        timeout: 30000,
        retries: 3,
        retryDelay: 1000,
        cacheEnabled: true,
        cacheExpiry: 5 * 60 * 1000, // 5 minutes
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        withCredentials: false,
      };

  /**
   * Cache Manager
   */
  class CacheManager {
    constructor() {
      this.cache = new Map();
      this.timers = new Map();
    }

    get(key) {
      const cached = this.cache.get(key);
      if (cached && cached.expiry > Date.now()) {
        return cached.data;
      }
      this.delete(key);
      return null;
    }

    set(key, data, expiry = DEFAULT_CONFIG.cacheExpiry) {
      // Clear existing timer
      if (this.timers.has(key)) {
        clearTimeout(this.timers.get(key));
      }

      this.cache.set(key, {
        data,
        expiry: Date.now() + expiry,
      });

      // Set auto-cleanup timer
      const timer = setTimeout(() => this.delete(key), expiry);
      this.timers.set(key, timer);
    }

    delete(key) {
      this.cache.delete(key);
      if (this.timers.has(key)) {
        clearTimeout(this.timers.get(key));
        this.timers.delete(key);
      }
    }

    clear() {
      this.timers.forEach(timer => clearTimeout(timer));
      this.cache.clear();
      this.timers.clear();
    }

    has(key) {
      const cached = this.cache.get(key);
      return cached && cached.expiry > Date.now();
    }

    getStats() {
      let validCount = 0;
      let expiredCount = 0;
      const now = Date.now();

      this.cache.forEach(value => {
        if (value.expiry > now) {
          validCount++;
        } else {
          expiredCount++;
        }
      });

      return {
        total: this.cache.size,
        valid: validCount,
        expired: expiredCount,
      };
    }
  }

  /**
   * Request Manager - Handles active requests and cancellation
   */
  class RequestManager {
    constructor() {
      this.activeRequests = new Map();
    }

    add(key, controller) {
      // Cancel existing request with same key
      if (this.activeRequests.has(key)) {
        this.cancel(key);
      }
      this.activeRequests.set(key, controller);
    }

    remove(key) {
      this.activeRequests.delete(key);
    }

    cancel(key) {
      const controller = this.activeRequests.get(key);
      if (controller) {
        controller.abort();
        this.remove(key);
      }
    }

    cancelAll() {
      this.activeRequests.forEach(controller => controller.abort());
      this.activeRequests.clear();
    }

    has(key) {
      return this.activeRequests.has(key);
    }
  }

  /**
   * Main API Client Class
   */
  class TeamStatsAPIClient {
    constructor(config = {}) {
      this.config = { ...DEFAULT_CONFIG, ...config };
      this.cache = new CacheManager();
      this.requests = new RequestManager();
      this.interceptors = {
        request: [],
        response: [],
        error: [],
      };

      // Initialize metrics
      this.metrics = {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        cachedResponses: 0,
        averageResponseTime: 0,
      };

      // Bind methods
      this.get = this.get.bind(this);
      this.post = this.post.bind(this);
      this.put = this.put.bind(this);
      this.delete = this.delete.bind(this);
    }

    /**
     * Add interceptor
     */
    addInterceptor(type, interceptor) {
      if (this.interceptors[type]) {
        this.interceptors[type].push(interceptor);
        return () => {
          const index = this.interceptors[type].indexOf(interceptor);
          if (index > -1) {
            this.interceptors[type].splice(index, 1);
          }
        };
      }
    }

    /**
     * Apply request interceptors
     */
    async _applyRequestInterceptors(config) {
      let modifiedConfig = { ...config };

      for (const interceptor of this.interceptors.request) {
        modifiedConfig = await interceptor(modifiedConfig);
      }

      return modifiedConfig;
    }

    /**
     * Apply response interceptors
     */
    async _applyResponseInterceptors(response) {
      let modifiedResponse = response;

      for (const interceptor of this.interceptors.response) {
        modifiedResponse = await interceptor(modifiedResponse);
      }

      return modifiedResponse;
    }

    /**
     * Apply error interceptors
     */
    async _applyErrorInterceptors(error) {
      let modifiedError = error;

      for (const interceptor of this.interceptors.error) {
        modifiedError = await interceptor(modifiedError);
      }

      return modifiedError;
    }

    /**
     * Build full URL
     */
    _buildURL(endpoint) {
      // Remove leading slash if present
      const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
      return `${this.config.baseURL}/${cleanEndpoint}`;
    }

    /**
     * Generate cache key
     */
    _getCacheKey(method, url, params) {
      return `${method}:${url}:${JSON.stringify(params || {})}`;
    }

    /**
     * Retry logic with exponential backoff
     */
    async _retryRequest(fn, retries = this.config.retries) {
      try {
        return await fn();
      } catch (error) {
        if (retries > 0 && this._isRetryableError(error)) {
          const delay = this.config.retryDelay * (this.config.retries - retries + 1);

          // Emit retry event
          global.TeamStatsEventBus.emit('api:retry', {
            error,
            retriesLeft: retries - 1,
            delay,
          });

          await this._delay(delay);
          return this._retryRequest(fn, retries - 1);
        }

        throw error;
      }
    }

    /**
     * Check if error is retryable
     */
    _isRetryableError(error) {
      // Network errors
      if (error.name === 'NetworkError' || error.name === 'TypeError') {
        return true;
      }

      // Timeout errors
      if (error.name === 'AbortError') {
        return false; // Don't retry cancelled requests
      }

      // HTTP status codes
      const status = error.status || error.response?.status;
      if (status) {
        // Retry on 5xx errors and specific 4xx errors
        return status >= 500 || status === 429 || status === 408;
      }

      return true;
    }

    /**
     * Delay helper
     */
    _delay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Core request method
     */
    async _request(method, endpoint, options = {}) {
      const url = this._buildURL(endpoint);
      const requestKey = `${method}:${endpoint}`;
      const cacheKey = this._getCacheKey(method, url, options.params);

      // Check cache for GET requests
      if (method === 'GET' && this.config.cacheEnabled && !options.noCache) {
        const cached = this.cache.get(cacheKey);
        if (cached) {
          this.metrics.cachedResponses++;

          // Emit cache hit event
          global.TeamStatsEventBus.emit('api:cache:hit', {
            endpoint,
            cacheKey,
          });

          return cached;
        }
      }

      // Create abort controller
      const controller = new AbortController();
      this.requests.add(requestKey, controller);

      // Build request config
      let config = {
        method,
        headers: { ...this.config.headers, ...options.headers },
        signal: controller.signal,
      };

      // Add body for POST/PUT/PATCH
      if (['POST', 'PUT', 'PATCH'].includes(method) && options.body) {
        config.body = JSON.stringify(options.body);
      }

      // Add query params
      let finalURL = url;
      if (options.params) {
        const params = new URLSearchParams(options.params);
        finalURL = `${url}?${params.toString()}`;
      }

      // Apply request interceptors
      config = await this._applyRequestInterceptors({
        ...config,
        url: finalURL,
        endpoint,
        originalOptions: options,
      });

      // Update metrics
      this.metrics.totalRequests++;
      const startTime = performance.now();

      // Emit request start event
      global.TeamStatsEventBus.emit('api:request:start', {
        method,
        endpoint,
        url: finalURL,
      });

      try {
        // Make request with retry logic
        const response = await this._retryRequest(async () => {
          const res = await fetch(finalURL, {
            ...config,
            timeout: options.timeout || this.config.timeout,
          });

          if (!res.ok) {
            const error = new Error(`HTTP Error ${res.status}: ${res.statusText}`);
            error.status = res.status;
            error.response = res;
            throw error;
          }

          return res;
        });

        // Parse response
        let data;
        const contentType = response.headers.get('content-type');

        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          data = await response.text();
        }

        // Apply response interceptors
        const finalData = await this._applyResponseInterceptors({
          data,
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          config,
          request: { method, url: finalURL },
        });

        // Cache successful GET requests
        if (method === 'GET' && this.config.cacheEnabled && !options.noCache) {
          this.cache.set(cacheKey, finalData.data || finalData, options.cacheExpiry);
        }

        // Update metrics
        this.metrics.successfulRequests++;
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        this.metrics.averageResponseTime =
          (this.metrics.averageResponseTime * (this.metrics.successfulRequests - 1) +
            responseTime) /
          this.metrics.successfulRequests;

        // Remove from active requests
        this.requests.remove(requestKey);

        // Emit success event
        global.TeamStatsEventBus.emit('api:request:success', {
          method,
          endpoint,
          url: finalURL,
          data: finalData.data || finalData,
          responseTime,
        });

        return finalData.data || finalData;
      } catch (error) {
        // Apply error interceptors
        const finalError = await this._applyErrorInterceptors({
          error,
          config,
          request: { method, url: finalURL },
        });

        // Update metrics
        this.metrics.failedRequests++;

        // Remove from active requests
        this.requests.remove(requestKey);

        // Emit error event
        global.TeamStatsEventBus.emit('api:request:error', {
          method,
          endpoint,
          url: finalURL,
          error: finalError.error || finalError,
        });

        throw finalError.error || finalError;
      }
    }

    /**
     * HTTP Methods
     */
    get(endpoint, options = {}) {
      return this._request('GET', endpoint, options);
    }

    post(endpoint, body, options = {}) {
      return this._request('POST', endpoint, { ...options, body });
    }

    put(endpoint, body, options = {}) {
      return this._request('PUT', endpoint, { ...options, body });
    }

    delete(endpoint, options = {}) {
      return this._request('DELETE', endpoint, options);
    }

    /**
     * Team Data specific methods
     */
    async getTeamData(teamId, options = {}) {
      try {
        const endpoint = global.TeamStatsConstants
          ? global.TeamStatsConstants.get('ENDPOINTS', 'TEAM_DATA')
          : 'teams/data';

        const response = await this.get(endpoint, {
          params: { teamId },
          ...options,
        });

        // Handle different response formats
        let teamData = null;

        // Check if response has success/data structure
        if (response.success && response.data) {
          teamData = response.data;

          // Store in State Manager
          if (teamData.teamInfo) {
            global.TeamStatsStateManager.setTeamData(teamData.teamInfo);
          }
          if (teamData.statistics) {
            global.TeamStatsStateManager.setStatistics(teamData.statistics);
          }
          global.TeamStatsStateManager.set('lastTeamData', teamData);

          // Emit data loaded event
          global.TeamStatsEventBus.emit('data:team:loaded', {
            teamId: teamData.teamInfo?.id || teamId,
            name: teamData.teamInfo?.name,
            data: teamData,
          });

          return teamData;
        }
        // Direct format: teamInfo and statistics at root
        else if (response.teamInfo && response.statistics) {
          teamData = response;

          // Store in State Manager
          global.TeamStatsStateManager.setTeamData(response.teamInfo);
          global.TeamStatsStateManager.setStatistics(response.statistics);
          global.TeamStatsStateManager.set('lastTeamData', response);

          // Emit data loaded event
          global.TeamStatsEventBus.emit('data:team:loaded', {
            teamId: response.teamInfo.id || teamId,
            name: response.teamInfo.name,
            data: response,
          });

          return response;
        }

        throw new Error('Invalid response format from team data API');
      } catch (error) {
        throw error;
      }
    }

    async getMatchDetails(matchId, options = {}) {
      try {
        const data = await this.get(`match/${matchId}`, options);

        // Emit match loaded event
        if (data.success && data.data) {
          global.TeamStatsEventBus.emit('data:match:loaded', {
            matchId,
            data: data.data,
          });
        }

        return data;
      } catch (error) {
        throw error;
      }
    }

    /**
     * Cancel requests
     */
    cancelRequest(endpoint) {
      const requestKey = `GET:${endpoint}`;
      this.requests.cancel(requestKey);
    }

    cancelAllRequests() {
      this.requests.cancelAll();
    }

    /**
     * Cache management
     */
    clearCache() {
      this.cache.clear();
      global.TeamStatsEventBus.emit('api:cache:cleared');
    }

    invalidateCache(pattern) {
      const keysToDelete = [];

      this.cache.cache.forEach((value, key) => {
        if (key.includes(pattern)) {
          keysToDelete.push(key);
        }
      });

      keysToDelete.forEach(key => this.cache.delete(key));

      global.TeamStatsEventBus.emit('api:cache:invalidated', {
        pattern,
        count: keysToDelete.length,
      });
    }

    /**
     * Get API metrics
     */
    getMetrics() {
      return {
        ...this.metrics,
        cache: this.cache.getStats(),
        activeRequests: this.requests.activeRequests.size,
      };
    }

    /**
     * Configuration
     */
    configure(config) {
      this.config = { ...this.config, ...config };

      global.TeamStatsEventBus.emit('api:configured', config);
    }

    /**
     * Reset client
     */
    reset() {
      this.cache.clear();
      this.requests.cancelAll();
      this.metrics = {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        cachedResponses: 0,
        averageResponseTime: 0,
      };
      this.interceptors = {
        request: [],
        response: [],
        error: [],
      };
    }
  }

  // Create singleton instance
  const apiClient = new TeamStatsAPIClient();

  // Auto-configure from State Manager if config exists
  const storedConfig = global.TeamStatsStateManager.get('apiConfig');
  if (storedConfig) {
    apiClient.configure(storedConfig);
  }

  // Set up default interceptors

  // Request interceptor - Add auth token if available
  apiClient.addInterceptor('request', async config => {
    const authToken = global.TeamStatsStateManager.get('authToken');
    if (authToken) {
      config.headers['Authorization'] = `Bearer ${authToken}`;
    }
    return config;
  });

  // Response interceptor - Handle common response format
  apiClient.addInterceptor('response', async response => {
    // If response has standard format, extract data
    if (response.data && typeof response.data === 'object') {
      if ('success' in response.data && 'data' in response.data) {
        return response.data;
      }
    }
    return response;
  });

  // Error interceptor - Standardize errors
  apiClient.addInterceptor('error', async errorInfo => {
    const { error, request } = errorInfo;

    const standardError = {
      message: error.message || 'An error occurred',
      status: error.status || 0,
      endpoint: request.url,
      method: request.method,
      timestamp: new Date().toISOString(),
    };

    // Handle specific error types
    if (error.name === 'AbortError') {
      standardError.message = 'Request was cancelled';
      standardError.type = 'CANCELLED';
    } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
      standardError.message = 'Network error - please check your connection';
      standardError.type = 'NETWORK';
    } else if (error.status >= 500) {
      standardError.message = 'Server error - please try again later';
      standardError.type = 'SERVER';
    } else if (error.status === 404) {
      standardError.message = 'Resource not found';
      standardError.type = 'NOT_FOUND';
    } else if (error.status === 401) {
      standardError.message = 'Authentication required';
      standardError.type = 'AUTH';

      // Clear auth token and emit event
      global.TeamStatsStateManager.set('authToken', null);
      global.TeamStatsEventBus.emit('auth:required');
    }

    return { error: standardError };
  });

  // Listen for state changes that affect API
  global.TeamStatsEventBus.on('state:config:changed', data => {
    if (data.key === 'apiConfig') {
      apiClient.configure(data.value);
    }
  });

  // Expose to global scope
  global.TeamStatsAPIClient = apiClient;

  // For backwards compatibility, expose direct methods
  global.TeamStatsAPI = {
    getTeamData: (teamId, options) => apiClient.getTeamData(teamId, options),
    getMatchDetails: (matchId, options) => apiClient.getMatchDetails(matchId, options),
    get: (endpoint, options) => apiClient.get(endpoint, options),
    post: (endpoint, body, options) => apiClient.post(endpoint, body, options),
    cancelAllRequests: () => apiClient.cancelAllRequests(),
    clearCache: () => apiClient.clearCache(),
  };

})(window);
