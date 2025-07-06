const express = require('express');
const router = express.Router();
const os = require('os');

// Simple async handler wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Enhanced Health Check and Monitoring Routes
 */

// Comprehensive health check
router.get('/', asyncHandler(async (req, res) => {
  const startTime = process.hrtime();
  
  // Get memory usage
  const memoryUsage = process.memoryUsage();
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  
  // Get CPU usage
  const cpuUsage = process.cpuUsage();
  const loadAverage = os.loadavg();
  
  // Calculate uptime
  const uptime = process.uptime();
  const systemUptime = os.uptime();
  
  // Get cache stats if available
  let cacheStats = null;
  try {
    const teamRepository = require('../repositories/TeamRepositorySimple');
    cacheStats = teamRepository.getCacheStats();
  } catch (e) {
    // Cache not available
  }
  
  // Check external dependencies
  const dependencies = {
    api: await checkApiHealth(),
    cache: cacheStats ? 'healthy' : 'not configured',
    database: 'not applicable' // No DB in this project
  };
  
  // Overall health status
  const isHealthy = dependencies.api === 'healthy';
  const status = isHealthy ? 'UP' : 'DOWN';
  
  // Calculate response time
  const [seconds, nanoseconds] = process.hrtime(startTime);
  const responseTime = seconds * 1000 + nanoseconds / 1000000;
  
  res.status(isHealthy ? 200 : 503).json({
    status,
    timestamp: new Date().toISOString(),
    uptime: {
      process: uptime,
      system: systemUptime,
      formatted: formatUptime(uptime)
    },
    memory: {
      process: {
        rss: formatBytes(memoryUsage.rss),
        heapTotal: formatBytes(memoryUsage.heapTotal),
        heapUsed: formatBytes(memoryUsage.heapUsed),
        external: formatBytes(memoryUsage.external),
        percentUsed: ((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100).toFixed(2) + '%'
      },
      system: {
        total: formatBytes(totalMemory),
        free: formatBytes(freeMemory),
        used: formatBytes(totalMemory - freeMemory),
        percentUsed: (((totalMemory - freeMemory) / totalMemory) * 100).toFixed(2) + '%'
      }
    },
    cpu: {
      usage: cpuUsage,
      loadAverage: {
        '1m': loadAverage[0].toFixed(2),
        '5m': loadAverage[1].toFixed(2),
        '15m': loadAverage[2].toFixed(2)
      },
      cores: os.cpus().length
    },
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      env: process.env.NODE_ENV || 'development',
      pid: process.pid
    },
    dependencies,
    responseTime: responseTime.toFixed(2) + 'ms',
    version: '1.0.0' // require('../../package.json').version
  });
}));

// Simplified health check for load balancers
router.get('/ping', (req, res) => {
  res.status(200).send('pong');
});

// Liveness probe (is the service alive?)
router.get('/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString()
  });
});

// Readiness probe (is the service ready to accept traffic?)
router.get('/ready', asyncHandler(async (req, res) => {
  const isReady = await checkApiHealth() === 'healthy';
  
  res.status(isReady ? 200 : 503).json({
    ready: isReady,
    timestamp: new Date().toISOString()
  });
}));

// Detailed metrics endpoint
router.get('/metrics', asyncHandler(async (req, res) => {
  let cacheStats = { totalHits: 0, totalMisses: 0, size: 0 };
  
  try {
    const teamRepository = require('../repositories/TeamRepositorySimple');
    if (teamRepository.getCacheStats) {
      cacheStats = teamRepository.getCacheStats();
    }
  } catch (e) {
    // Repository not available
  }
  
  // Get rate limit stats
  const rateLimitStats = getRateLimitStats();
  
  // Memory metrics
  const memoryUsage = process.memoryUsage();
  
  res.json({
    timestamp: new Date().toISOString(),
    cache: {
      stats: cacheStats,
      hitRate: cacheStats.totalHits > 0 
        ? ((cacheStats.totalHits / (cacheStats.totalHits + cacheStats.totalMisses)) * 100).toFixed(2) + '%'
        : '0%',
      size: cacheStats.size,
      maxSize: cacheStats.maxSize || 'unlimited'
    },
    api: {
      status: 'monitoring metrics collection in progress'
    },
    rateLimit: rateLimitStats,
    memory: {
      used: formatBytes(memoryUsage.heapUsed),
      total: formatBytes(memoryUsage.heapTotal),
      percentUsed: ((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100).toFixed(2) + '%'
    },
    performance: {
      uptime: process.uptime(),
      eventLoopDelay: 0
    }
  });
}));

// Application info endpoint
router.get('/info', (req, res) => {
  // const packageJson = require('../../package.json');
  
  res.json({
    name: 'sportsdata-ai',
    version: '1.0.0',
    description: 'Football statistics API',
    nodeVersion: process.version,
    npmVersion: process.env.npm_version,
    environment: process.env.NODE_ENV || 'development',
    uptime: formatUptime(process.uptime()),
    startTime: new Date(Date.now() - process.uptime() * 1000).toISOString()
  });
});

// Helper functions
async function checkApiHealth() {
  try {
    const config = require('../config/index');
    const axios = require('axios');
    
    // Try to make a simple API call
    const response = await axios.get(`${config.API.FOOTBALL_API_URL}/api/?key=${config.API.FOOTBALL_API_KEY}&action=get_leagues`, {
      timeout: 5000
    });
    
    return response.status === 200 ? 'healthy' : 'unhealthy';
  } catch (error) {
    return 'unhealthy';
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
  
  return parts.join(' ');
}

function getRateLimitStats() {
  // This would need to be implemented based on your rate limiter
  return {
    windowMs: 900000, // 15 minutes
    maxRequests: 100,
    message: 'Rate limit statistics'
  };
}

function getEventLoopDelay() {
  // Simplified event loop delay measurement
  return 0; // Would need proper implementation with perf_hooks
}

function getGCStats() {
  // Would need to use v8 module for real GC stats
  return {
    message: 'GC statistics not available'
  };
}

module.exports = router;