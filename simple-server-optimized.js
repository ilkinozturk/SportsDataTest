require('dotenv').config();
const express = require('express');
const compression = require('compression');
const axios = require('axios');
const moment = require('moment');
const path = require('path');
const LeagueManager = require('./utils/LeagueManager');
const footyStatsAPI = require('./services/footyStatsAPI');
const MatchesService = require('./services/matchesService');

const app = express();
const PORT = 3001;

// API Configuration from .env
const API_KEY = process.env.FOOTYSTATS_API_KEY;
const BASE_URL = process.env.FOOTYSTATS_BASE_URL;

// Initialize services
const leagueManager = new LeagueManager(API_KEY, BASE_URL);
const matchesService = new MatchesService(API_KEY, BASE_URL, leagueManager);
const TeamDataService = require('./services/teamDataService');
const teamDataService = new TeamDataService(API_KEY, BASE_URL, leagueManager);

// Swagger documentation
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
require('./routes/api-docs'); // Load API documentation

// Prometheus metrics
const { 
  httpMetricsMiddleware, 
  getMetricsHandler, 
  startMetricsCollection,
  trackTeamDataRequest,
  trackMatchDataRequest,
  trackApiCall,
  trackError
} = require('./utils/prometheusMetrics');

// Enhanced caching with Redis support
const RedisCache = require('./utils/redisCache');
const Logger = require('./utils/logger');
const logger = new Logger('Server');

// Error tracking
const { setupGlobalErrorTracking, errorTrackingMiddleware } = require('./middleware/errorTracking');
const errorTrackingRoutes = require('./routes/errorTracking');

// Initialize Redis client (optional - will fallback to memory if not available)
let redisClient = null;
if (process.env.REDIS_URL || process.env.REDIS_HOST) {
  try {
    const redis = require('redis');
    redisClient = redis.createClient({
      url:
        process.env.REDIS_URL ||
        `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`,
      socket: {
        connectTimeout: 5000,
        reconnectStrategy: retries => {
          if (retries > 3) {
            logger.warn('Redis reconnection limit reached, using memory cache only');
            return false;
          }
          return Math.min(retries * 100, 3000);
        },
      },
    });
  } catch (error) {
    logger.warn('Redis package not installed or configuration error, using memory cache only');
  }
}

// CORS Configuration
const { corsMiddleware, strictCorsMiddleware } = require('./middleware/corsConfig');

// Performance Monitoring
const {
  performanceMonitor,
  metricsHandlers,
  metricsStore,
} = require('./middleware/performanceMonitor');

// Make metricsStore globally available
global.metricsStore = metricsStore;

// Setup global error tracking
setupGlobalErrorTracking();

// Middleware
app.use(performanceMonitor());
app.use(httpMetricsMiddleware()); // Prometheus HTTP metrics
app.use(corsMiddleware);
app.use(errorTrackingMiddleware());
app.use(
  compression({
    filter: (req, res) => {
      // Compress all JSON responses
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    },
    level: 6, // Balanced compression level
    threshold: 1024, // Only compress responses larger than 1KB
  })
);
app.use(express.json());

// Rate limiting
const { rateLimiters } = require('./middleware/rateLimiter');
const generalLimiter = rateLimiters.general(redisClient);
const strictLimiter = rateLimiters.strict(redisClient);

// Apply general rate limiter to all routes
app.use('/api/', generalLimiter);

// Apply strict rate limiter to data endpoints
app.use('/api/teams/data', strictLimiter);
app.use('/api/leagues/:leagueId/teams', strictLimiter);

app.use('/utils', express.static(path.join(__dirname, 'utils')));

// Import validators
const { validators } = require('./middleware/validator');

// Initialize cache (will use Redis if available, otherwise memory)
const cache = new RedisCache(redisClient);
const CACHE_TTL = 5 * 60; // 5 minutes in seconds for Redis

// Rate limiting cache - much faster rate limiting
let requestCount = 0;
let lastRequestTime = 0;

const rateLimit = async () => {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  // Only 200ms delay instead of 1 second
  if (timeSinceLastRequest < 200) {
    await new Promise(resolve => setTimeout(resolve, 200 - timeSinceLastRequest));
  }

  lastRequestTime = Date.now();
  requestCount++;
};

// Helper function to make API requests with cache
const makeApiRequest = async (endpoint, params = {}) => {
  const cacheKey = `${endpoint}-${JSON.stringify(params)}`;

  // Check cache first
  const cached = await cache.get(cacheKey);
  if (cached) {
    logger.info(`Cache hit: ${endpoint}`, { params });
    return cached;
  }

  try {
    await rateLimit();

    logger.info(`API Request #${requestCount}: ${endpoint}`, { params });

    const apiStartTime = Date.now();
    const response = await axios.get(`${BASE_URL}${endpoint}`, {
      params: { key: API_KEY, ...params },
      timeout: 5000, // Reduced timeout
    });
    const apiDuration = Date.now() - apiStartTime;

    logger.info(`API Response: ${response.status}`, { endpoint, params, duration: apiDuration });

    // Record API call metrics
    if (global.metricsStore) {
      global.metricsStore.recordApiCall(apiDuration, true);
    }

    // Cache the response
    await cache.set(cacheKey, response.data, CACHE_TTL);

    return response.data;
  } catch (error) {
    logger.error(`API Error: ${error.message}`, error);

    // Record failed API call
    if (global.metricsStore) {
      const apiDuration = Date.now() - apiStartTime;
      global.metricsStore.recordApiCall(apiDuration, false);
    }

    // Track API error
    const { trackApiError } = require('./middleware/errorTracking');
    await trackApiError(error, {
      endpoint,
      params,
      method: 'GET',
      baseUrl: BASE_URL,
    });

    throw error;
  }
};

// Format match data
const formatMatch = match => ({
  id:
    match.id ||
    `${match.homeID || match.home_id}-${match.awayID || match.away_id}-${match.date_unix}`,
  homeTeam: {
    id: match.homeID || match.home_id,
    name: match.home_name || match.homeTeam?.name || 'Unknown Home',
    logo: match.home_image || match.homeTeam?.logo,
  },
  awayTeam: {
    id: match.awayID || match.away_id,
    name: match.away_name || match.awayTeam?.name || 'Unknown Away',
    logo: match.away_image || match.awayTeam?.logo,
  },
  league: {
    id: match.competition_id || match.league_id,
    name: match.competition?.name || match.league_name || 'Unknown League',
    logo: match.competition?.logo || match.league_logo,
  },
  date: match.date || moment.unix(match.date_unix).format('YYYY-MM-DD'),
  time: match.time || moment.unix(match.date_unix).format('HH:mm'),
  status: match.status || 'scheduled',
  homeScore: match.homeGoalCount || match.home_scored || 0,
  awayScore: match.awayGoalCount || match.away_scored || 0,
  stats: match.team_a_stats || match.stats || {},
  winProbability: match.winProbability,
  btts: match.btts || match.btts_percentage,
  over25: match.over25 || match.over_25_percentage,
  odds: match.odds || {},
  fixtureType: match.fixture_type || 'league',
});

// Routes

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    cache_size: cache.size,
    request_count: requestCount,
  });
});

// Get today's matches
app.get('/api/matches/today', async (req, res) => {
  try {
    logger.info("Fetching today's matches...");
    const matches = await matchesService.getTodaysMatches();

    res.json({
      success: true,
      count: matches.length,
      date: new Date().toISOString().split('T')[0],
      matches: matches.map(formatMatch),
    });
  } catch (error) {
    logger.error("Error fetching today's matches", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  const cacheHealth = await cache.healthCheck();

  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    cache: cacheHealth,
  });
});

// Metrics endpoints
app.get('/api/metrics', metricsHandlers.getMetrics);
app.get('/api/metrics/summary', metricsHandlers.getSummary);
app.get('/api/metrics/health', metricsHandlers.healthCheck);

// Error tracking endpoints
app.use('/api/errors', errorTrackingRoutes);

// Health check endpoints
const healthRoutes = require('./routes/health');
app.use('/health', healthRoutes);

// Prometheus metrics endpoint
app.get('/metrics', getMetricsHandler());

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'SportsData.AI API Documentation',
}));

// API Documentation JSON endpoint
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Get matches for specific date
app.get('/api/matches/date/:date', async (req, res) => {
  try {
    const { date } = req.params;
    logger.info(`Fetching matches for date: ${date}`);

    const matches = await matchesService.getMatchesByDate(date);

    res.json({
      success: true,
      count: matches.length,
      date,
      matches: matches.map(formatMatch),
    });
  } catch (error) {
    logger.error('Error fetching matches by date', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get matches for date range
app.get('/api/matches/range', async (req, res) => {
  try {
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({
        success: false,
        error: 'Both "from" and "to" dates are required',
      });
    }

    logger.info(`Fetching matches from ${from} to ${to}`);

    const matches = await matchesService.getMatchesInRange(from, to);

    res.json({
      success: true,
      count: matches.length,
      dateRange: { from, to },
      matches: matches.map(formatMatch),
    });
  } catch (error) {
    logger.error('Error fetching matches in range', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get matches for specific team
app.get('/api/teams/:teamId/matches', async (req, res) => {
  try {
    const { teamId } = req.params;
    const { from, to, limit } = req.query;

    logger.info(`Fetching matches for team: ${teamId}`);

    const matches = await matchesService.getTeamMatches(teamId, {
      from,
      to,
      limit: limit ? parseInt(limit) : undefined,
    });

    res.json({
      success: true,
      teamId,
      count: matches.length,
      matches: matches.map(formatMatch),
    });
  } catch (error) {
    logger.error('Error fetching team matches', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get H2H matches
app.get('/api/matches/h2h/:team1/:team2', async (req, res) => {
  try {
    const { team1, team2 } = req.params;
    const { limit } = req.query;

    logger.info(`Fetching H2H matches: ${team1} vs ${team2}`);

    const matches = await matchesService.getH2HMatches(team1, team2, {
      limit: limit ? parseInt(limit) : 10,
    });

    res.json({
      success: true,
      team1,
      team2,
      count: matches.length,
      matches: matches.map(formatMatch),
    });
  } catch (error) {
    logger.error('Error fetching H2H matches', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get league standings
app.get('/api/leagues/:leagueId/standings', async (req, res) => {
  try {
    const { leagueId } = req.params;
    logger.info(`Fetching standings for league: ${leagueId}`);

    const seasonId = await leagueManager.getCurrentSeasonId(leagueId);

    if (!seasonId) {
      return res.status(404).json({
        success: false,
        error: 'Season not found for league',
      });
    }

    const standings = await makeApiRequest(`/league-table`, {
      season_id: seasonId,
    });

    res.json({
      success: true,
      leagueId,
      seasonId,
      standings: standings.data || [],
    });
  } catch (error) {
    logger.error('Error fetching standings', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// New route: Get team data with statistics
app.get('/api/teams/data', validators.teamData, async (req, res) => {
  try {
    const teamId = req.validated.teamId;

    logger.info(`Fetching team data for ID: ${teamId}`);

    const teamData = await teamDataService.getTeamData(teamId);
    
    // DEBUG: Check what's being returned
    console.log('[DEBUG] API endpoint - teamData statistics check:', {
      hasStatistics: !!teamData.statistics,
      cards1H_AVG: teamData.statistics?.cards1H_AVG,
      cards1H_AVG_overall: teamData.statistics?.cards1H_AVG_overall,
      cardsAverage: teamData.statistics?.cardsAverage,
      cardsTotal: teamData.statistics?.cardsTotal
    });

    res.json({
      success: true,
      data: teamData,
    });
  } catch (error) {
    logger.error('Error fetching team data', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get live matches
app.get('/api/matches/live', async (req, res) => {
  try {
    logger.info('Fetching live matches...');
    const matches = await matchesService.getLiveMatches();

    res.json({
      success: true,
      count: matches.length,
      matches: matches.map(formatMatch),
    });
  } catch (error) {
    logger.error('Error fetching live matches', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get league matches
app.get('/api/leagues/:leagueId/matches', async (req, res) => {
  try {
    const { leagueId } = req.params;
    const { date, from, to, status } = req.query;

    logger.info(`Fetching matches for league: ${leagueId}`);

    const matches = await matchesService.getLeagueMatches(leagueId, {
      date,
      from,
      to,
      status,
    });

    res.json({
      success: true,
      leagueId,
      count: matches.length,
      matches: matches.map(formatMatch),
    });
  } catch (error) {
    logger.error('Error fetching league matches', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Serve static files
app.use(express.static(path.join(__dirname)));

// Error handling middleware - must be last
const { errorHandler, notFound } = require('./middleware/errorHandler');
app.use(notFound);
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.success('FullyDynamicTeamService initialized');
  logger.success('UniversalMappingService: FullyDynamicTeamService entegre edildi');
  logger.success(`OPTIMIZED Server running on http://localhost:${PORT}`);
  
  // Start Prometheus metrics collection
  startMetricsCollection(10000); // Collect metrics every 10 seconds
  logger.info('Prometheus metrics collection started');
  logger.info('Using chosen leagues from FootyStats API');
  logger.info(`API Key configured: ${!!API_KEY}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info('Features: Cache enabled, Parallel processing, Faster rate limiting');
});
