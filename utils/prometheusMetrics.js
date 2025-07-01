const prometheus = require('prom-client');
const { getLogger } = require('./winstonLogger');

const logger = getLogger('PrometheusMetrics');

// Create a Registry
const register = new prometheus.Registry();

// Add default metrics (CPU, memory, etc.)
prometheus.collectDefaultMetrics({ register });

// Custom metrics
const metrics = {
  // HTTP metrics
  httpRequestDuration: new prometheus.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10], // 100ms to 10s
  }),
  
  httpRequestTotal: new prometheus.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
  }),
  
  httpRequestsInProgress: new prometheus.Gauge({
    name: 'http_requests_in_progress',
    help: 'Number of HTTP requests in progress',
    labelNames: ['method', 'route'],
  }),
  
  // API metrics
  apiCallDuration: new prometheus.Histogram({
    name: 'api_call_duration_seconds',
    help: 'Duration of external API calls in seconds',
    labelNames: ['endpoint', 'status'],
    buckets: [0.1, 0.5, 1, 2, 5, 10], // 100ms to 10s
  }),
  
  apiCallTotal: new prometheus.Counter({
    name: 'api_calls_total',
    help: 'Total number of external API calls',
    labelNames: ['endpoint', 'status'],
  }),
  
  // Cache metrics
  cacheHits: new prometheus.Counter({
    name: 'cache_hits_total',
    help: 'Total number of cache hits',
    labelNames: ['cache_type'],
  }),
  
  cacheMisses: new prometheus.Counter({
    name: 'cache_misses_total',
    help: 'Total number of cache misses',
    labelNames: ['cache_type'],
  }),
  
  cacheSize: new prometheus.Gauge({
    name: 'cache_size_bytes',
    help: 'Current cache size in bytes',
    labelNames: ['cache_type'],
  }),
  
  // Circuit breaker metrics
  circuitBreakerState: new prometheus.Gauge({
    name: 'circuit_breaker_state',
    help: 'Circuit breaker state (0=closed, 1=open, 2=half-open)',
    labelNames: ['name'],
  }),
  
  circuitBreakerFailures: new prometheus.Counter({
    name: 'circuit_breaker_failures_total',
    help: 'Total number of circuit breaker failures',
    labelNames: ['name'],
  }),
  
  // Error metrics
  errorTotal: new prometheus.Counter({
    name: 'errors_total',
    help: 'Total number of errors',
    labelNames: ['type', 'severity'],
  }),
  
  // Business metrics
  teamDataRequests: new prometheus.Counter({
    name: 'team_data_requests_total',
    help: 'Total number of team data requests',
    labelNames: ['team_id', 'status'],
  }),
  
  matchDataRequests: new prometheus.Counter({
    name: 'match_data_requests_total',
    help: 'Total number of match data requests',
    labelNames: ['type', 'status'],
  }),
  
  // Rate limiting metrics
  rateLimitHits: new prometheus.Counter({
    name: 'rate_limit_hits_total',
    help: 'Total number of rate limit hits',
    labelNames: ['endpoint'],
  }),
  
  // Database metrics (for future use)
  dbQueryDuration: new prometheus.Histogram({
    name: 'db_query_duration_seconds',
    help: 'Duration of database queries in seconds',
    labelNames: ['query_type'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1], // 1ms to 1s
  }),
  
  dbConnectionsActive: new prometheus.Gauge({
    name: 'db_connections_active',
    help: 'Number of active database connections',
  }),
};

// Register all metrics
Object.values(metrics).forEach(metric => {
  register.registerMetric(metric);
});

/**
 * Express middleware to track HTTP metrics
 */
function httpMetricsMiddleware() {
  return (req, res, next) => {
    const start = Date.now();
    
    // Normalize route for metrics (replace IDs with placeholders)
    const route = req.route?.path || req.path;
    const normalizedRoute = route
      .replace(/\/\d+/g, '/:id')
      .replace(/\/[a-f0-9-]{36}/gi, '/:uuid');
    
    // Track in-progress requests
    metrics.httpRequestsInProgress.inc({ 
      method: req.method, 
      route: normalizedRoute 
    });
    
    // Track response
    res.on('finish', () => {
      const duration = (Date.now() - start) / 1000;
      
      metrics.httpRequestDuration.observe(
        { 
          method: req.method, 
          route: normalizedRoute, 
          status_code: res.statusCode 
        },
        duration
      );
      
      metrics.httpRequestTotal.inc({ 
        method: req.method, 
        route: normalizedRoute, 
        status_code: res.statusCode 
      });
      
      metrics.httpRequestsInProgress.dec({ 
        method: req.method, 
        route: normalizedRoute 
      });
    });
    
    next();
  };
}

/**
 * Track API call metrics
 */
function trackApiCall(endpoint, status, duration) {
  const durationInSeconds = duration / 1000;
  
  metrics.apiCallDuration.observe(
    { endpoint, status },
    durationInSeconds
  );
  
  metrics.apiCallTotal.inc({ endpoint, status });
}

/**
 * Track cache metrics
 */
function trackCacheHit(cacheType) {
  metrics.cacheHits.inc({ cache_type: cacheType });
}

function trackCacheMiss(cacheType) {
  metrics.cacheMisses.inc({ cache_type: cacheType });
}

function updateCacheSize(cacheType, sizeInBytes) {
  metrics.cacheSize.set({ cache_type: cacheType }, sizeInBytes);
}

/**
 * Track circuit breaker metrics
 */
function updateCircuitBreakerState(name, state) {
  const stateValue = {
    'CLOSED': 0,
    'OPEN': 1,
    'HALF_OPEN': 2,
  }[state] || 0;
  
  metrics.circuitBreakerState.set({ name }, stateValue);
}

function trackCircuitBreakerFailure(name) {
  metrics.circuitBreakerFailures.inc({ name });
}

/**
 * Track error metrics
 */
function trackError(type, severity = 'error') {
  metrics.errorTotal.inc({ type, severity });
}

/**
 * Track business metrics
 */
function trackTeamDataRequest(teamId, status) {
  metrics.teamDataRequests.inc({ 
    team_id: teamId.toString(), 
    status 
  });
}

function trackMatchDataRequest(type, status) {
  metrics.matchDataRequests.inc({ type, status });
}

/**
 * Track rate limit hits
 */
function trackRateLimitHit(endpoint) {
  metrics.rateLimitHits.inc({ endpoint });
}

/**
 * Track database metrics
 */
function trackDbQuery(queryType, duration) {
  const durationInSeconds = duration / 1000;
  metrics.dbQueryDuration.observe({ query_type: queryType }, durationInSeconds);
}

function updateDbConnections(count) {
  metrics.dbConnectionsActive.set(count);
}

/**
 * Get metrics endpoint handler
 */
function getMetricsHandler() {
  return async (req, res) => {
    try {
      res.set('Content-Type', register.contentType);
      const metrics = await register.metrics();
      res.end(metrics);
    } catch (error) {
      logger.error('Error generating metrics', error);
      res.status(500).end();
    }
  };
}

/**
 * Update circuit breaker metrics from factory
 */
function updateCircuitBreakerMetrics(circuitBreakerFactory) {
  const breakers = circuitBreakerFactory.getAllStatus();
  
  Object.entries(breakers).forEach(([name, status]) => {
    updateCircuitBreakerState(name, status.state);
    
    // Update failure count if changed
    if (status.metrics.totalFailures > 0) {
      // Note: This is a gauge, not a counter, so we set the value
      metrics.circuitBreakerState.set(
        { name }, 
        status.metrics.totalFailures
      );
    }
  });
}

/**
 * Create a metrics collection interval
 */
function startMetricsCollection(interval = 10000) {
  setInterval(() => {
    try {
      // Update circuit breaker metrics
      const { factory } = require('./circuitBreaker');
      updateCircuitBreakerMetrics(factory);
      
      // Update cache metrics
      // This would need to be implemented based on your cache implementation
      
      logger.debug('Metrics collection completed');
    } catch (error) {
      logger.error('Error collecting metrics', error);
    }
  }, interval);
}

module.exports = {
  register,
  metrics,
  httpMetricsMiddleware,
  trackApiCall,
  trackCacheHit,
  trackCacheMiss,
  updateCacheSize,
  updateCircuitBreakerState,
  trackCircuitBreakerFailure,
  trackError,
  trackTeamDataRequest,
  trackMatchDataRequest,
  trackRateLimitHit,
  trackDbQuery,
  updateDbConnections,
  getMetricsHandler,
  startMetricsCollection,
};