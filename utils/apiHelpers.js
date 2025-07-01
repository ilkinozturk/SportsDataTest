// API Helper Utilities

const axios = require('axios');
const Logger = require('./logger');

class APIHelpers {
  constructor(apiKey, baseUrl) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.logger = new Logger('APIHelpers');
    this.requestCount = 0;
    this.lastRequestTime = 0;
    this.rateLimit = 200; // milliseconds between requests
  }

  /**
   * Apply rate limiting
   */
  async applyRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.rateLimit) {
      const waitTime = this.rateLimit - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
    this.requestCount++;
  }

  /**
   * Make API request with retry logic
   * @param {string} endpoint - API endpoint
   * @param {object} params - Query parameters
   * @param {object} options - Request options
   * @returns {Promise<any>} API response data
   */
  async makeRequest(endpoint, params = {}, options = {}) {
    const { retries = 3, timeout = 30000 } = options;
    let lastError;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await this.applyRateLimit();

        const startTime = Date.now();
        const url = `${this.baseUrl}${endpoint}`;

        const response = await axios({
          method: 'GET',
          url,
          params: {
            key: this.apiKey,
            ...params,
          },
          timeout,
          headers: {
            'User-Agent': 'SportsData.AI/1.0',
            Accept: 'application/json',
            ...options.headers,
          },
        });

        const duration = Date.now() - startTime;

        // Log successful API call
        this.logger.apiCall(endpoint, params, response.data, duration);

        if (response.data.success === false) {
          throw new Error(response.data.error || 'API returned success: false');
        }

        return response.data;
      } catch (error) {
        lastError = error;

        // Log error
        this.logger.error(`API request failed (attempt ${attempt}/${retries}): ${endpoint}`, error);

        // Don't retry on certain errors
        if (error.response) {
          const status = error.response.status;
          if (status === 401 || status === 403 || status === 404) {
            throw error; // Don't retry auth or not found errors
          }
        }

        // Wait before retry (exponential backoff)
        if (attempt < retries) {
          const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    throw lastError;
  }

  /**
   * Batch API requests with concurrency control
   * @param {Array} requests - Array of {endpoint, params} objects
   * @param {number} concurrency - Max concurrent requests
   * @returns {Promise<Array>} Array of responses
   */
  async batchRequests(requests, concurrency = 3) {
    const results = [];
    const errors = [];

    // Process in chunks
    for (let i = 0; i < requests.length; i += concurrency) {
      const chunk = requests.slice(i, i + concurrency);

      const chunkResults = await Promise.allSettled(
        chunk.map(req => this.makeRequest(req.endpoint, req.params))
      );

      chunkResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results[i + index] = result.value;
        } else {
          errors[i + index] = result.reason;
          results[i + index] = null;
        }
      });
    }

    if (errors.length > 0) {
      this.logger.warn(`Batch requests completed with ${errors.length} errors`, { errors });
    }

    return results;
  }

  /**
   * Get request statistics
   * @returns {object} Request statistics
   */
  getStats() {
    return {
      totalRequests: this.requestCount,
      averageRateMs: this.rateLimit,
      lastRequestTime: this.lastRequestTime ? new Date(this.lastRequestTime).toISOString() : null,
    };
  }
}

module.exports = APIHelpers;
