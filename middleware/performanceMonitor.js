// Performance Monitoring Middleware
const Logger = require('../utils/logger');
const logger = new Logger('PerformanceMonitor');
const os = require('os');
const process = require('process');

/**
 * Performance metrics storage
 */
class MetricsStore {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        byEndpoint: {},
        byStatusCode: {},
        byMethod: {},
      },
      performance: {
        responseTimes: [],
        averageResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        slowestEndpoints: [],
      },
      system: {
        cpuUsage: [],
        memoryUsage: [],
        uptime: 0,
        startTime: Date.now(),
      },
      api: {
        externalApiCalls: 0,
        apiResponseTimes: [],
        apiErrors: 0,
        cacheHits: 0,
        cacheMisses: 0,
      },
    };

    // Start system monitoring
    this.startSystemMonitoring();
  }

  /**
   * Start monitoring system resources
   */
  startSystemMonitoring() {
    // Monitor every 30 seconds
    setInterval(() => {
      // CPU Usage
      const cpus = os.cpus();
      let totalIdle = 0;
      let totalTick = 0;

      cpus.forEach(cpu => {
        for (const type in cpu.times) {
          totalTick += cpu.times[type];
        }
        totalIdle += cpu.times.idle;
      });

      const cpuUsage = 100 - ~~((100 * totalIdle) / totalTick);
      this.metrics.system.cpuUsage.push({
        timestamp: Date.now(),
        usage: cpuUsage,
      });

      // Keep only last 100 measurements
      if (this.metrics.system.cpuUsage.length > 100) {
        this.metrics.system.cpuUsage.shift();
      }

      // Memory Usage
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;
      const memUsagePercent = (usedMem / totalMem) * 100;

      this.metrics.system.memoryUsage.push({
        timestamp: Date.now(),
        usage: memUsagePercent,
        used: usedMem,
        total: totalMem,
      });

      // Keep only last 100 measurements
      if (this.metrics.system.memoryUsage.length > 100) {
        this.metrics.system.memoryUsage.shift();
      }

      // Update uptime
      this.metrics.system.uptime = process.uptime();
    }, 30000);
  }

  /**
   * Record a request
   */
  recordRequest(endpoint, method, statusCode, responseTime) {
    this.metrics.requests.total++;

    if (statusCode >= 200 && statusCode < 400) {
      this.metrics.requests.successful++;
    } else {
      this.metrics.requests.failed++;
    }

    // By endpoint
    if (!this.metrics.requests.byEndpoint[endpoint]) {
      this.metrics.requests.byEndpoint[endpoint] = {
        count: 0,
        totalTime: 0,
        averageTime: 0,
        errors: 0,
      };
    }

    this.metrics.requests.byEndpoint[endpoint].count++;
    this.metrics.requests.byEndpoint[endpoint].totalTime += responseTime;
    this.metrics.requests.byEndpoint[endpoint].averageTime =
      this.metrics.requests.byEndpoint[endpoint].totalTime /
      this.metrics.requests.byEndpoint[endpoint].count;

    if (statusCode >= 400) {
      this.metrics.requests.byEndpoint[endpoint].errors++;
    }

    // By status code
    if (!this.metrics.requests.byStatusCode[statusCode]) {
      this.metrics.requests.byStatusCode[statusCode] = 0;
    }
    this.metrics.requests.byStatusCode[statusCode]++;

    // By method
    if (!this.metrics.requests.byMethod[method]) {
      this.metrics.requests.byMethod[method] = 0;
    }
    this.metrics.requests.byMethod[method]++;

    // Response times
    this.metrics.performance.responseTimes.push(responseTime);

    // Keep only last 1000 response times
    if (this.metrics.performance.responseTimes.length > 1000) {
      this.metrics.performance.responseTimes.shift();
    }

    // Update performance metrics
    this.updatePerformanceMetrics();
  }

  /**
   * Update performance metrics
   */
  updatePerformanceMetrics() {
    const times = this.metrics.performance.responseTimes;
    if (times.length === 0) {
      return;
    }

    // Calculate average
    const sum = times.reduce((a, b) => a + b, 0);
    this.metrics.performance.averageResponseTime = sum / times.length;

    // Calculate percentiles
    const sorted = [...times].sort((a, b) => a - b);
    const p95Index = Math.floor(sorted.length * 0.95);
    const p99Index = Math.floor(sorted.length * 0.99);

    this.metrics.performance.p95ResponseTime = sorted[p95Index] || 0;
    this.metrics.performance.p99ResponseTime = sorted[p99Index] || 0;

    // Update slowest endpoints
    this.metrics.performance.slowestEndpoints = Object.entries(this.metrics.requests.byEndpoint)
      .map(([endpoint, data]) => ({
        endpoint,
        averageTime: data.averageTime,
        count: data.count,
      }))
      .sort((a, b) => b.averageTime - a.averageTime)
      .slice(0, 10);
  }

  /**
   * Record API call
   */
  recordApiCall(duration, success = true) {
    this.metrics.api.externalApiCalls++;
    this.metrics.api.apiResponseTimes.push(duration);

    if (!success) {
      this.metrics.api.apiErrors++;
    }

    // Keep only last 100 API response times
    if (this.metrics.api.apiResponseTimes.length > 100) {
      this.metrics.api.apiResponseTimes.shift();
    }
  }

  /**
   * Record cache hit/miss
   */
  recordCacheHit() {
    this.metrics.api.cacheHits++;
  }

  recordCacheMiss() {
    this.metrics.api.cacheMisses++;
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    const processMemory = process.memoryUsage();

    return {
      ...this.metrics,
      system: {
        ...this.metrics.system,
        process: {
          memoryUsage: {
            rss: processMemory.rss,
            heapTotal: processMemory.heapTotal,
            heapUsed: processMemory.heapUsed,
            external: processMemory.external,
          },
          pid: process.pid,
          version: process.version,
          uptime: process.uptime(),
        },
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get summary metrics
   */
  getSummary() {
    const cacheTotal = this.metrics.api.cacheHits + this.metrics.api.cacheMisses;
    const cacheHitRate = cacheTotal > 0 ? (this.metrics.api.cacheHits / cacheTotal) * 100 : 0;

    return {
      requests: {
        total: this.metrics.requests.total,
        successRate:
          this.metrics.requests.total > 0
            ? (this.metrics.requests.successful / this.metrics.requests.total) * 100
            : 0,
        errorRate:
          this.metrics.requests.total > 0
            ? (this.metrics.requests.failed / this.metrics.requests.total) * 100
            : 0,
      },
      performance: {
        averageResponseTime: Math.round(this.metrics.performance.averageResponseTime),
        p95ResponseTime: Math.round(this.metrics.performance.p95ResponseTime),
        p99ResponseTime: Math.round(this.metrics.performance.p99ResponseTime),
      },
      cache: {
        hitRate: Math.round(cacheHitRate),
        hits: this.metrics.api.cacheHits,
        misses: this.metrics.api.cacheMisses,
      },
      system: {
        cpuUsage:
          this.metrics.system.cpuUsage.length > 0
            ? Math.round(
                this.metrics.system.cpuUsage[this.metrics.system.cpuUsage.length - 1].usage
              )
            : 0,
        memoryUsage:
          this.metrics.system.memoryUsage.length > 0
            ? Math.round(
                this.metrics.system.memoryUsage[this.metrics.system.memoryUsage.length - 1].usage
              )
            : 0,
        uptime: Math.round(this.metrics.system.uptime),
      },
    };
  }
}

// Singleton instance
const metricsStore = new MetricsStore();

/**
 * Performance monitoring middleware
 */
function performanceMonitor() {
  return (req, res, next) => {
    const startTime = Date.now();

    // Capture original end function
    const originalEnd = res.end;

    // Override end function
    res.end = function (...args) {
      const duration = Date.now() - startTime;
      const endpoint = req.route ? req.route.path : req.path;

      // Record metrics
      metricsStore.recordRequest(endpoint, req.method, res.statusCode, duration);

      // Log slow requests
      if (duration > 1000) {
        logger.warn(`Slow request detected`, {
          endpoint,
          method: req.method,
          duration: `${duration}ms`,
          statusCode: res.statusCode,
        });
      }

      // Add response time header (only if headers not sent yet)
      if (!res.headersSent) {
        res.setHeader('X-Response-Time', `${duration}ms`);
      }

      // Call original end
      originalEnd.apply(res, args);
    };

    next();
  };
}

/**
 * Metrics endpoint handlers
 */
const metricsHandlers = {
  // Get full metrics
  getMetrics: (req, res) => {
    res.json({
      success: true,
      metrics: metricsStore.getMetrics(),
    });
  },

  // Get summary metrics
  getSummary: (req, res) => {
    res.json({
      success: true,
      summary: metricsStore.getSummary(),
    });
  },

  // Health check with metrics
  healthCheck: (req, res) => {
    const summary = metricsStore.getSummary();
    const isHealthy =
      summary.system.cpuUsage < 90 &&
      summary.system.memoryUsage < 90 &&
      summary.requests.errorRate < 10;

    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      uptime: summary.system.uptime,
      metrics: summary,
    });
  },
};

module.exports = {
  performanceMonitor,
  metricsStore,
  metricsHandlers,
};
