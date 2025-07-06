const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const { AppError, ValidationError, NotFoundError, ExternalAPIError } = require('../errors/AppError');
const logger = require('../utils/logger');

/**
 * Test routes for error handling
 * Only available in development mode
 */

// Test various error types
router.get('/error/validation', asyncHandler(async (req, res, next) => {
  logger.info('Testing validation error');
  throw new ValidationError('This is a test validation error');
}));

router.get('/error/not-found', asyncHandler(async (req, res, next) => {
  logger.info('Testing not found error');
  throw new NotFoundError('Test Resource');
}));

router.get('/error/api', asyncHandler(async (req, res, next) => {
  logger.info('Testing external API error');
  throw new ExternalAPIError('External API is down for testing');
}));

router.get('/error/generic', asyncHandler(async (req, res, next) => {
  logger.info('Testing generic error');
  throw new Error('This is a generic error for testing');
}));

router.get('/error/app', asyncHandler(async (req, res, next) => {
  logger.info('Testing app error');
  throw new AppError('This is a custom app error', 418, 'TEAPOT_ERROR');
}));

// Test async error
router.get('/error/async', asyncHandler(async (req, res, next) => {
  logger.info('Testing async error');
  await new Promise(resolve => setTimeout(resolve, 100));
  throw new Error('Async operation failed');
}));

// Test performance logging
router.get('/test/performance', asyncHandler(async (req, res, next) => {
  const start = Date.now();
  
  // Simulate slow operation
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  const duration = Date.now() - start;
  logger.performance('Test slow operation', duration);
  
  res.json({
    success: true,
    message: 'Performance test completed',
    duration: `${duration}ms`
  });
}));

// Test cache logging
router.get('/test/cache', asyncHandler(async (req, res, next) => {
  const cacheKey = 'test-key';
  
  // Simulate cache miss
  logger.cacheMiss(cacheKey, 'TestService');
  
  // Simulate cache set
  logger.cacheSet(cacheKey, 300, 'TestService');
  
  // Simulate cache hit
  logger.cacheHit(cacheKey, 'TestService');
  
  res.json({
    success: true,
    message: 'Cache logging test completed'
  });
}));

// Test API logging
router.get('/test/api-log', asyncHandler(async (req, res, next) => {
  const endpoint = '/test-endpoint';
  const params = { id: 123, filter: 'test' };
  
  logger.apiRequest(endpoint, params, 'TestService');
  
  // Simulate API call
  const start = Date.now();
  await new Promise(resolve => setTimeout(resolve, 200));
  const duration = Date.now() - start;
  
  logger.apiResponse(endpoint, 200, duration, 'TestService');
  
  res.json({
    success: true,
    message: 'API logging test completed'
  });
}));

// Test successful operation
router.get('/test/success', asyncHandler(async (req, res, next) => {
  logger.info('Successful test operation', {
    user: req.ip,
    action: 'test_success'
  });
  
  res.json({
    success: true,
    message: 'Test successful',
    timestamp: new Date().toISOString()
  });
}));

module.exports = router;