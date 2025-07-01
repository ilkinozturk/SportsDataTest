const { getLogger } = require('./winstonLogger');

/**
 * Circuit Breaker implementation for external API calls
 * Prevents cascading failures by stopping requests to failing services
 */
class CircuitBreaker {
  constructor(options = {}) {
    this.name = options.name || 'default';
    this.logger = getLogger(`CircuitBreaker-${this.name}`);
    
    // Configuration
    this.failureThreshold = options.failureThreshold || 5; // Number of failures before opening
    this.resetTimeout = options.resetTimeout || 60000; // 60 seconds
    this.monitoringPeriod = options.monitoringPeriod || 10000; // 10 seconds
    this.minimumRequests = options.minimumRequests || 10; // Minimum requests before opening
    this.timeout = options.timeout || 10000; // Request timeout
    
    // State
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
    this.requestCount = 0;
    this.requestsInPeriod = [];
    
    // Metrics
    this.metrics = {
      totalRequests: 0,
      totalFailures: 0,
      totalSuccesses: 0,
      totalTimeouts: 0,
      totalCircuitOpens: 0,
      lastOpenTime: null,
      lastCloseTime: null,
    };
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute(fn) {
    this.metrics.totalRequests++;
    
    // Check if circuit is open
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttemptTime) {
        const error = new Error(`Circuit breaker is OPEN for ${this.name}`);
        error.code = 'CIRCUIT_OPEN';
        error.circuitBreaker = {
          name: this.name,
          state: this.state,
          nextAttemptTime: this.nextAttemptTime,
        };
        throw error;
      }
      
      // Try half-open state
      this.state = 'HALF_OPEN';
      this.logger.info(`Circuit breaker ${this.name} entering HALF_OPEN state`);
    }
    
    try {
      // Execute with timeout
      const result = await this.executeWithTimeout(fn);
      
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  /**
   * Execute function with timeout
   */
  async executeWithTimeout(fn) {
    return new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        const error = new Error(`Request timeout after ${this.timeout}ms`);
        error.code = 'TIMEOUT';
        this.metrics.totalTimeouts++;
        reject(error);
      }, this.timeout);
      
      try {
        const result = await fn();
        clearTimeout(timeoutId);
        resolve(result);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  /**
   * Handle successful request
   */
  onSuccess() {
    this.failures = 0;
    this.successes++;
    this.metrics.totalSuccesses++;
    this.recordRequest(true);
    
    if (this.state === 'HALF_OPEN') {
      this.close();
    }
  }

  /**
   * Handle failed request
   */
  onFailure(error) {
    this.failures++;
    this.metrics.totalFailures++;
    this.lastFailureTime = Date.now();
    this.recordRequest(false);
    
    this.logger.error(`Circuit breaker ${this.name} recorded failure`, error);
    
    if (this.state === 'HALF_OPEN') {
      this.open();
    } else if (this.state === 'CLOSED' && this.shouldOpen()) {
      this.open();
    }
  }

  /**
   * Check if circuit should open
   */
  shouldOpen() {
    // Not enough requests to determine
    if (this.getRequestsInPeriod() < this.minimumRequests) {
      return false;
    }
    
    const failureRate = this.getFailureRate();
    const shouldOpen = this.failures >= this.failureThreshold || failureRate > 0.5;
    
    if (shouldOpen) {
      this.logger.warn(`Circuit breaker ${this.name} should open: failures=${this.failures}, rate=${failureRate}`);
    }
    
    return shouldOpen;
  }

  /**
   * Open the circuit
   */
  open() {
    this.state = 'OPEN';
    this.nextAttemptTime = Date.now() + this.resetTimeout;
    this.metrics.totalCircuitOpens++;
    this.metrics.lastOpenTime = new Date();
    
    this.logger.warn(`Circuit breaker ${this.name} is now OPEN. Next attempt at ${new Date(this.nextAttemptTime)}`);
  }

  /**
   * Close the circuit
   */
  close() {
    this.state = 'CLOSED';
    this.failures = 0;
    this.nextAttemptTime = null;
    this.metrics.lastCloseTime = new Date();
    
    this.logger.info(`Circuit breaker ${this.name} is now CLOSED`);
  }

  /**
   * Record request for monitoring
   */
  recordRequest(success) {
    const now = Date.now();
    this.requestsInPeriod.push({
      time: now,
      success,
    });
    
    // Clean old requests
    const cutoff = now - this.monitoringPeriod;
    this.requestsInPeriod = this.requestsInPeriod.filter(req => req.time > cutoff);
  }

  /**
   * Get number of requests in monitoring period
   */
  getRequestsInPeriod() {
    const cutoff = Date.now() - this.monitoringPeriod;
    return this.requestsInPeriod.filter(req => req.time > cutoff).length;
  }

  /**
   * Get failure rate in monitoring period
   */
  getFailureRate() {
    const requests = this.requestsInPeriod.filter(
      req => req.time > Date.now() - this.monitoringPeriod
    );
    
    if (requests.length === 0) {
      return 0;
    }
    
    const failures = requests.filter(req => !req.success).length;
    return failures / requests.length;
  }

  /**
   * Get circuit breaker status
   */
  getStatus() {
    return {
      name: this.name,
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime,
      requestsInPeriod: this.getRequestsInPeriod(),
      failureRate: this.getFailureRate(),
      metrics: this.metrics,
    };
  }

  /**
   * Reset circuit breaker
   */
  reset() {
    this.state = 'CLOSED';
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
    this.requestsInPeriod = [];
    
    this.logger.info(`Circuit breaker ${this.name} has been reset`);
  }
}

/**
 * Circuit breaker factory for managing multiple breakers
 */
class CircuitBreakerFactory {
  constructor() {
    this.breakers = new Map();
    this.logger = getLogger('CircuitBreakerFactory');
  }

  /**
   * Get or create circuit breaker
   */
  getBreaker(name, options = {}) {
    if (!this.breakers.has(name)) {
      this.breakers.set(name, new CircuitBreaker({ name, ...options }));
      this.logger.info(`Created new circuit breaker: ${name}`);
    }
    
    return this.breakers.get(name);
  }

  /**
   * Get all circuit breakers status
   */
  getAllStatus() {
    const status = {};
    
    for (const [name, breaker] of this.breakers) {
      status[name] = breaker.getStatus();
    }
    
    return status;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll() {
    for (const [name, breaker] of this.breakers) {
      breaker.reset();
    }
    
    this.logger.info('All circuit breakers have been reset');
  }

  /**
   * Reset specific circuit breaker
   */
  reset(name) {
    const breaker = this.breakers.get(name);
    if (breaker) {
      breaker.reset();
    }
  }
}

// Export singleton factory
const factory = new CircuitBreakerFactory();

module.exports = {
  CircuitBreaker,
  CircuitBreakerFactory,
  factory,
  
  // Helper function for easy use
  withCircuitBreaker: async (name, fn, options = {}) => {
    const breaker = factory.getBreaker(name, options);
    return breaker.execute(fn);
  },
};