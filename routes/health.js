const express = require('express');
const router = express.Router();
const os = require('os');
const { factory: circuitBreakerFactory } = require('../utils/circuitBreaker');
const { errorTracker } = require('../utils/errorTracker');
const { getLogger } = require('../utils/winstonLogger');

const logger = getLogger('HealthCheck');

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     description: Check the health status of the API and its dependencies
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthCheck'
 *       503:
 *         description: Service is unhealthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthCheck'
 */
router.get('/', async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Check various health indicators
    const checks = await performHealthChecks();
    
    // Determine overall health status
    const status = determineHealthStatus(checks);
    
    const healthData = {
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks,
      metrics: {
        cpu: getCPUUsage(),
        memory: getMemoryUsage(),
        responseTime: Date.now() - startTime,
      },
    };
    
    // Set appropriate status code
    const statusCode = status === 'healthy' ? 200 : 503;
    
    res.status(statusCode).json(healthData);
  } catch (error) {
    logger.error('Health check failed', error);
    
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      message: error.message,
    });
  }
});

/**
 * @swagger
 * /health/detailed:
 *   get:
 *     summary: Detailed health check
 *     description: Get detailed health information including all subsystems
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Detailed health information
 */
router.get('/detailed', async (req, res) => {
  try {
    const checks = await performHealthChecks();
    const circuitBreakers = circuitBreakerFactory.getAllStatus();
    const errorStats = errorTracker.getStats();
    
    const detailedHealth = {
      status: determineHealthStatus(checks),
      timestamp: new Date().toISOString(),
      uptime: {
        seconds: process.uptime(),
        formatted: formatUptime(process.uptime()),
      },
      version: {
        app: process.env.npm_package_version || '1.0.0',
        node: process.version,
        environment: process.env.NODE_ENV || 'development',
      },
      system: {
        platform: os.platform(),
        release: os.release(),
        hostname: os.hostname(),
        cpu: {
          model: os.cpus()[0].model,
          cores: os.cpus().length,
          usage: getCPUUsage(),
        },
        memory: getMemoryUsage(),
        loadAverage: os.loadavg(),
      },
      checks,
      circuitBreakers,
      errors: {
        last24Hours: errorStats.dailyTotal,
        lastHour: errorStats.recentHour,
        errorRate: errorStats.errorRate,
        topErrors: errorStats.topErrors.slice(0, 5),
      },
      dependencies: await checkDependencies(),
    };
    
    res.json(detailedHealth);
  } catch (error) {
    logger.error('Detailed health check failed', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /health/live:
 *   get:
 *     summary: Liveness probe
 *     description: Simple liveness check for container orchestration
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is alive
 */
router.get('/live', (req, res) => {
  res.json({ status: 'alive' });
});

/**
 * @swagger
 * /health/ready:
 *   get:
 *     summary: Readiness probe
 *     description: Check if service is ready to handle requests
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is ready
 *       503:
 *         description: Service is not ready
 */
router.get('/ready', async (req, res) => {
  try {
    const checks = await performHealthChecks();
    const isReady = checks.api && checks.cache !== false; // Cache can be optional
    
    if (isReady) {
      res.json({ status: 'ready' });
    } else {
      res.status(503).json({ 
        status: 'not_ready',
        checks,
      });
    }
  } catch (error) {
    res.status(503).json({ 
      status: 'not_ready',
      error: error.message,
    });
  }
});

/**
 * Perform health checks on various components
 */
async function performHealthChecks() {
  const checks = {
    api: false,
    cache: false,
    redis: false,
    externalAPI: false,
    errorRate: false,
  };
  
  // Check API responsiveness
  try {
    // Simple check - if we got here, API is responding
    checks.api = true;
  } catch (error) {
    logger.error('API health check failed', error);
  }
  
  // Check Redis connection
  try {
    const redis = require('redis');
    const client = redis.createClient({
      url: process.env.REDIS_URL || `redis://localhost:6379`,
      socket: { connectTimeout: 1000 },
    });
    
    await client.connect();
    await client.ping();
    await client.quit();
    
    checks.redis = true;
    checks.cache = true;
  } catch (error) {
    logger.warn('Redis health check failed', error);
    // Redis is optional, so we don't fail the entire health check
    checks.cache = true; // Memory cache is available
  }
  
  // Check external API circuit breakers
  const breakers = circuitBreakerFactory.getAllStatus();
  const openBreakers = Object.values(breakers).filter(b => b.state === 'OPEN').length;
  checks.externalAPI = openBreakers === 0;
  
  // Check error rate
  const errorStats = errorTracker.getStats();
  checks.errorRate = errorStats.errorRate < 10; // Less than 10 errors per hour
  
  return checks;
}

/**
 * Check external dependencies
 */
async function checkDependencies() {
  const dependencies = [];
  
  // Check FootyStats API
  try {
    const axios = require('axios');
    const response = await axios.get('https://api.football-data-api.com/health', {
      timeout: 5000,
    });
    
    dependencies.push({
      name: 'FootyStats API',
      status: response.status === 200 ? 'healthy' : 'degraded',
      responseTime: response.headers['x-response-time'] || 'N/A',
    });
  } catch (error) {
    dependencies.push({
      name: 'FootyStats API',
      status: 'unhealthy',
      error: error.message,
    });
  }
  
  return dependencies;
}

/**
 * Determine overall health status based on checks
 */
function determineHealthStatus(checks) {
  // Critical checks that must pass
  if (!checks.api) {
    return 'unhealthy';
  }
  
  // Non-critical checks that can degrade status
  const degradedConditions = [
    !checks.redis,
    !checks.externalAPI,
    !checks.errorRate,
  ];
  
  const degradedCount = degradedConditions.filter(c => c).length;
  
  if (degradedCount === 0) {
    return 'healthy';
  } else if (degradedCount <= 2) {
    return 'degraded';
  } else {
    return 'unhealthy';
  }
}

/**
 * Get CPU usage percentage
 */
function getCPUUsage() {
  const cpus = os.cpus();
  
  let totalIdle = 0;
  let totalTick = 0;
  
  cpus.forEach(cpu => {
    for (type in cpu.times) {
      totalTick += cpu.times[type];
    }
    totalIdle += cpu.times.idle;
  });
  
  const idle = totalIdle / cpus.length;
  const total = totalTick / cpus.length;
  const usage = 100 - ~~(100 * idle / total);
  
  return {
    percentage: usage,
    loadAverage: os.loadavg()[0], // 1 minute load average
  };
}

/**
 * Get memory usage information
 */
function getMemoryUsage() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  
  const processMemory = process.memoryUsage();
  
  return {
    system: {
      total: formatBytes(totalMem),
      free: formatBytes(freeMem),
      used: formatBytes(usedMem),
      percentage: Math.round((usedMem / totalMem) * 100),
    },
    process: {
      rss: formatBytes(processMemory.rss),
      heapTotal: formatBytes(processMemory.heapTotal),
      heapUsed: formatBytes(processMemory.heapUsed),
      external: formatBytes(processMemory.external),
    },
  };
}

/**
 * Format bytes to human readable format
 */
function formatBytes(bytes) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let unitIndex = 0;
  let value = bytes;
  
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  
  return `${value.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * Format uptime to human readable format
 */
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0) parts.push(`${secs}s`);
  
  return parts.join(' ');
}

module.exports = router;