require('dotenv').config({ path: '/mnt/d/SportsData.Ai/.env' });
const express = require('express');
const compression = require('compression');
const axios = require('axios');
const moment = require('moment');
const path = require('path');
const config = require('./src/config');
const Logger = require('./utils/logger');
const LeagueManager = require('./utils/LeagueManager');
const footyStatsAPI = require('./services/footyStatsAPI');
const MatchesService = require('./services/matchesService');
const MatchDetailsService = require('./services/MatchDetailsService');

const app = express();
const logger = new Logger('Server');

// Initialize services
const leagueManager = new LeagueManager(config.API.FOOTBALL_API_KEY, config.API.FOOTBALL_API_URL);
const matchesService = new MatchesService(config.API.FOOTBALL_API_KEY, config.API.FOOTBALL_API_URL, leagueManager);
const matchDetailsService = new MatchDetailsService(config.API.FOOTBALL_API_KEY, config.API.FOOTBALL_API_URL);
const TeamDataService = require('./services/teamDataService');
const teamDataService = new TeamDataService(config.API.FOOTBALL_API_KEY, config.API.FOOTBALL_API_URL, leagueManager);
const H2HService = require('./services/H2HService');
const h2hService = new H2HService(footyStatsAPI, matchesService);

// Make teamDataService available to H2HService
h2hService.teamDataService = teamDataService;

// Initialize Repository Pattern
const teamRepository = require('./src/repositories/TeamRepositorySimple');
teamRepository.setTeamDataService(teamDataService);

// Initialize new service layer
const TeamService = require('./src/services/TeamService');
const teamService = new TeamService(config.API.FOOTBALL_API_KEY, config.API.FOOTBALL_API_URL, {
  fullyDynamicService: teamDataService.fullyDynamicService,
  leagueManager: leagueManager,
  schemaMapper: teamDataService.schemaMapper,
  dataEnhancer: teamDataService.dataEnhancer
});

// Swagger documentation
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
require('./routes/api-docs'); // Load API documentation

// Prometheus metrics
const { 
  httpMetricsMiddleware, 
  getMetricsHandler, 
  startMetricsCollection
} = require('./utils/prometheusMetrics');

// Enhanced caching with Redis support
const RedisCache = require('./utils/redisCache');

// Error tracking
const { setupGlobalErrorTracking, errorTrackingMiddleware } = require('./middleware/errorTracking');
const errorTrackingRoutes = require('./routes/errorTracking');

// Professional error handling
const { ValidationError, NotFoundError, ExternalAPIError } = require('./src/errors/AppError');
const { errorHandler, asyncHandler, notFoundHandler } = require('./src/middleware/errorHandler');

// Routes
const teamRoutes = require('./src/routes/teamRoutes');

// Initialize Redis client (optional - will fallback to memory if not available)
let redisClient = null;
if (config.REDIS.ENABLED && (config.REDIS.URL || config.REDIS.HOST)) {
  try {
    const redis = require('redis');
    redisClient = redis.createClient({
      url:
        config.REDIS.URL ||
        `redis://${config.REDIS.HOST}:${config.REDIS.PORT}`,
      password: config.REDIS.PASSWORD || undefined,
      database: config.REDIS.DB,
      socket: {
        connectTimeout: config.REDIS.CONNECTION_TIMEOUT,
        reconnectStrategy: retries => {
          if (retries > config.REDIS.MAX_RETRY_ATTEMPTS) {
            logger.warn('Redis reconnection limit reached, using memory cache only');
            return false;
          }
          return Math.min(retries * config.REDIS.RETRY_DELAY_BASE, config.REDIS.MAX_RETRY_DELAY);
        },
      },
    });
  } catch (error) {
    logger.warn('Redis package not installed or configuration error, using memory cache only');
  }
}


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

// Security middleware
const security = require('./src/middleware/security');

// Apply security middleware
app.use(security.helmet);
app.use(security.securityHeaders);
app.use(security.xssProtection);
app.use(security.securityLogger);
app.use(security.mongoSanitize);

// Middleware
app.use(performanceMonitor());
app.use(httpMetricsMiddleware()); // Prometheus HTTP metrics
// Simple CORS for development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});
app.use(security.cors); // Use security CORS instead of corsMiddleware
app.use(errorTrackingMiddleware());
// Apply compression middleware if enabled
if (config.COMPRESSION.ENABLED) {
  app.use(
    compression({
      filter: (req, res) => {
        // Compress all JSON responses
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
      },
      level: config.COMPRESSION.LEVEL,
      threshold: config.COMPRESSION.THRESHOLD,
      memLevel: config.COMPRESSION.MEMORY_LEVEL,
    })
  );
}
app.use(express.json());

// Apply general rate limiter to all API routes
app.use('/api/', security.limiter);

// Apply strict rate limiter to sensitive data endpoints
app.use('/api/teams/data', security.strictLimiter);
app.use('/api/leagues/:leagueId/teams', security.strictLimiter);
app.use('/api/teams/:teamId/matches', security.strictLimiter);

// Apply auth limiter to authentication endpoints (if any)
// app.use('/api/auth/', security.authLimiter);

app.use('/utils', express.static(path.join(__dirname, 'utils')));


// Initialize cache (will use Redis if available, otherwise memory)
const cache = new RedisCache(redisClient);
const CACHE_TTL = Math.floor(config.CACHE.DEFAULT_TTL / 1000); // Convert ms to seconds for Redis

// Rate limiting cache - much faster rate limiting
let requestCount = 0;
let lastRequestTime = 0;

const rateLimit = async () => {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  // Rate limiting delay based on config
  const minDelay = config.API.MIN_REQUEST_DELAY;
  if (timeSinceLastRequest < minDelay) {
    await new Promise(resolve => setTimeout(resolve, minDelay - timeSinceLastRequest));
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
    const response = await axios.get(`${config.API.FOOTBALL_API_URL}${endpoint}`, {
      params: { key: config.API.FOOTBALL_API_KEY, ...params },
      timeout: config.API.TIMEOUT,
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
      const apiDuration = 100; // Default error duration
      global.metricsStore.recordApiCall(apiDuration, false);
    }

    // Track API error
    const { trackApiError } = require('./middleware/errorTracking');
    await trackApiError(error, {
      endpoint,
      params,
      method: 'GET',
      baseUrl: config.API.FOOTBALL_API_URL,
    });

    throw error;
  }
};

// Format match data
const formatMatch = match => ({
  id: match.id || `${match.homeTeam?.id || match.homeID}-${match.awayTeam?.id || match.awayID}-${match.timestamp || match.date_unix}`,
  homeTeam: {
    id: match.homeTeam?.id || match.homeID || match.home_id,
    name: match.homeTeam?.name || match.home_name || 'Unknown Home',
    logo: match.homeTeam?.logo || match.home_image,
  },
  awayTeam: {
    id: match.awayTeam?.id || match.awayID || match.away_id,
    name: match.awayTeam?.name || match.away_name || 'Unknown Away',
    logo: match.awayTeam?.logo || match.away_image,
  },
  league: {
    id: match.league?.id || match.competition_id || match.league_id,
    name: match.league?.name || match.competition?.name || match.league_name || 'Unknown League',
    logo: match.league?.logo || match.competition?.logo || match.league_logo,
  },
  date: match.date || (match.date_unix ? moment.unix(match.date_unix).format('YYYY-MM-DD') : ''),
  time: match.time || (match.date_unix ? moment.unix(match.date_unix).format('HH:mm') : (match.date ? moment(match.date).format('HH:mm') : '')),
  status: match.status || 'scheduled',
  homeScore: match.homeTeam?.goals || match.homeGoalCount || match.home_scored || 0,
  awayScore: match.awayTeam?.goals || match.awayGoalCount || match.away_scored || 0,
  stats: match.team_a_stats || match.stats || {},
  winProbability: match.winProbability,
  btts: match.btts || match.btts_percentage,
  over25: match.over25 || match.over_25_percentage,
  odds: match.odds || {},
  fixtureType: match.fixture_type || 'league',
});

// Routes

// Basic health check endpoint (replaced by comprehensive monitoring routes)
// app.get('/health', (req, res) => {
//   res.json({
//     status: 'ok',
//     timestamp: new Date().toISOString(),
//     cache_size: cache.size,
//     request_count: requestCount,
//   });
// });

// Clear matches cache
app.delete('/api/matches/cache', async (req, res) => {
  try {
    matchesService.clearCache();
    res.json({
      success: true,
      message: 'Matches cache cleared'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
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

// Team endpoints - NEW MODULAR APPROACH
app.use('/api/teams', teamRoutes);

// Test routes (only in development)
if (config.NODE_ENV === 'development') {
  const testRoutes = require('./src/routes/testRoutes');
  app.use('/api/test', testRoutes);
}

// Health check endpoints - using new comprehensive monitoring routes
try {
  const monitoringRoutes = require('./src/routes/monitoringRoutes');
  const healthPath = config.MONITORING.HEALTH_CHECK_PATH || '/health';
  console.log(`[Server] INFO: Mounting monitoring routes at ${healthPath}`);
  app.use(healthPath, monitoringRoutes);
} catch (error) {
  console.error('[Server] ERROR: Failed to load monitoring routes:', error.message);
}

// Also keep the old health routes for backward compatibility at /api/health
const healthRoutes = require('./routes/health');
app.use('/api/health', healthRoutes);

// Test integration endpoint for core modules
app.post('/api/test/integration', express.json(), (req, res) => {
  const testApiEndpoint = require('./test-api-endpoint.js');
  // Execute the test endpoint handler
  testApiEndpoint(req, res);
});

// Prometheus metrics endpoint
app.get(config.MONITORING.METRICS_PATH, getMetricsHandler());

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

// Get matches for today (without date parameter)
app.get('/api/matches/date', asyncHandler(async (req, res, next) => {
  const today = moment().format('YYYY-MM-DD');
  const { timezone } = req.query;
  
  logger.info(`Fetching today's matches: ${today} (timezone: ${timezone || 'UTC'})`);

  try {
    const matchesResult = await matchesService.getMatchesByDate(today);
    const matches = matchesResult.matches || [];
    
    logger.info(`Found ${matches.length} matches for ${today}`);
    
    // Debug first match to see the structure
    if (matches.length > 0) {
      logger.info('First match structure:', {
        homeTeam: matches[0].homeTeam,
        awayTeam: matches[0].awayTeam,
        league: matches[0].league
      });
    }

    res.json({
      success: true,
      count: matches.length,
      date: today,
      matches: matches.map(formatMatch),
    });
  } catch (error) {
    logger.error('Error fetching today matches', error);
    
    // Handle external API errors specifically
    if (error.message.includes('API') || error.response?.status >= 500) {
      throw new ExternalAPIError('Football data service is temporarily unavailable');
    }
    
    throw error;
  }
}));

// Get matches for specific date
app.get('/api/matches/date/:date', asyncHandler(async (req, res, next) => {
  const { date } = req.params;
  
  // Validate date format
  if (!moment(date, 'YYYY-MM-DD', true).isValid()) {
    throw new ValidationError('Invalid date format. Use YYYY-MM-DD');
  }
  
  logger.info(`Fetching matches for date: ${date}`);

  try {
    const matchesResult = await matchesService.getMatchesByDate(date);
    const matches = matchesResult.matches || [];
    
    logger.info(`Found ${matches.length} matches for ${date}`);

    res.json({
      success: true,
      count: matches.length,
      date,
      matches: matches.map(formatMatch),
    });
  } catch (error) {
    logger.error('Error fetching matches by date', error);
    
    // Handle external API errors specifically
    if (error.message.includes('API') || error.response?.status >= 500) {
      throw new ExternalAPIError('Football data service is temporarily unavailable');
    }
    
    throw error;
  }
}));

// Get matches for date range
app.get('/api/matches/range', async (req, res) => {
  try {
    // Support both naming conventions
    const from = req.query.from || req.query.startDate;
    const to = req.query.to || req.query.endDate;

    if (!from || !to) {
      return res.status(400).json({
        success: false,
        error: 'Both "from/startDate" and "to/endDate" dates are required',
      });
    }

    logger.info(`Fetching matches from ${from} to ${to}`);

    const result = await matchesService.getMatchesForDateRange(from, to);
    const matches = result.matches || [];

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

// Get matches for specific team - TEMPORARY FIX
app.get('/api/teams/:teamId/matches', asyncHandler(async (req, res, next) => {
  const { teamId } = req.params;
  const { from, to, limit, status } = req.query;

  logger.info(`[Matches API] Fetching matches for team: ${teamId} - RETURNING EMPTY ARRAY (teamService not available)`);

  // Temporary fix - return empty matches array
  const matches = [];

  res.json({
    success: true,
    teamId,
    count: 0,
    data: matches,  // Changed from 'matches' to 'data' to match expected format
    message: 'Matches service temporarily unavailable'
  });
}));

// Get H2H matches
app.get('/api/matches/h2h/:team1/:team2', asyncHandler(async (req, res, next) => {
  const { team1, team2 } = req.params;
  const { limit } = req.query;

  // Validate team IDs
  if (!team1 || !team2) {
    throw new ValidationError('Both team IDs are required');
  }
  
  if (team1 === team2) {
    throw new ValidationError('Team IDs must be different');
  }
  
  // Validate limit if provided
  const parsedLimit = limit ? parseInt(limit) : config.API.DEFAULT_H2H_LIMIT;
  if (limit && (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100)) {
    throw new ValidationError('Limit must be a number between 1 and 100');
  }

  logger.info(`[Service Layer] Fetching H2H matches: ${team1} vs ${team2}`);

  const matches = await teamService.getH2HMatches(team1, team2, { limit: parsedLimit });

  res.json({
    success: true,
    team1,
    team2,
    count: matches.length,
    matches: matches, // Already formatted by DTO
  });
}));

// Get match details with H2H
app.get('/api/matches/:matchId/details', asyncHandler(async (req, res, next) => {
  const { matchId } = req.params;
  
  // Validate match ID
  if (!matchId) {
    throw new ValidationError('Match ID is required');
  }
  
  logger.info(`[Match Details] Fetching details for match: ${matchId}`);
  
  try {
    // Get match details from the service
    const matchDetails = await matchDetailsService.getMatchDetails(matchId);
    
    if (!matchDetails) {
      throw new NotFoundError('Match not found');
    }
    
    // Enhance with additional team data if available
    if (matchDetails.homeTeam && matchDetails.homeTeam.id) {
      try {
        const homeTeamData = await teamService.getTeamData(matchDetails.homeTeam.id);
        if (homeTeamData && homeTeamData.statistics) {
          // Add home PPG from team statistics
          matchDetails.homeTeam.homePPG = homeTeamData.statistics.homePPG || 
                                          homeTeamData.statistics.ppg_home || 
                                          homeTeamData.statistics.homePointsPerGame ||
                                          homeTeamData.statistics.PPG_overall_home ||
                                          null;
          // Add home form if not already present
          if (!matchDetails.homeTeam.homeForm && homeTeamData.statistics.homeForm) {
            matchDetails.homeTeam.homeForm = homeTeamData.statistics.homeForm;
          }
        }
      } catch (error) {
        logger.warn(`Failed to fetch home team data: ${error.message}`);
      }
    }
    
    if (matchDetails.awayTeam && matchDetails.awayTeam.id) {
      try {
        const awayTeamData = await teamService.getTeamData(matchDetails.awayTeam.id);
        if (awayTeamData && awayTeamData.statistics) {
          // Add away PPG from team statistics
          matchDetails.awayTeam.awayPPG = awayTeamData.statistics.awayPPG || 
                                          awayTeamData.statistics.ppg_away || 
                                          awayTeamData.statistics.awayPointsPerGame ||
                                          awayTeamData.statistics.PPG_overall_away ||
                                          null;
          // Add away form if not already present
          if (!matchDetails.awayTeam.awayForm && awayTeamData.statistics.awayForm) {
            matchDetails.awayTeam.awayForm = awayTeamData.statistics.awayForm;
          }
        }
      } catch (error) {
        logger.warn(`Failed to fetch away team data: ${error.message}`);
      }
    }
    
    // H2H data comes directly from the match details API
    let h2hData = null;
    
    if (matchDetails.h2h) {
      // Process H2H data from API
      const apiH2h = matchDetails.h2h;
      
      // Log if previous_matches_ids exists
      if (apiH2h.previous_matches_ids) {
        logger.info(`📊 API returned previous_matches_ids with ${apiH2h.previous_matches_ids.length} matches`);
      } else {
        logger.info(`❌ API did not return previous_matches_ids field`);
      }
      
      h2hData = {
        summary: {
          homeWins: apiH2h.previous_matches_results?.team_a_wins || 0,
          awayWins: apiH2h.previous_matches_results?.team_b_wins || 0,
          draws: apiH2h.previous_matches_results?.draw || 0,
          totalMatches: apiH2h.previous_matches_results?.totalMatches || 0
        },
        matches: [], // Will be populated below
        betting_stats: apiH2h.betting_stats || {},
        team_a_id: matchDetails.homeTeam?.id || apiH2h.team_a_id,
        team_b_id: matchDetails.awayTeam?.id || apiH2h.team_b_id,
        previous_matches_ids: apiH2h.previous_matches_ids || null
      };
      
      // Check if we have previous_matches_ids from API
      if (apiH2h.previous_matches_ids && apiH2h.previous_matches_ids.length > 0) {
        // Use previous_matches_ids directly
        h2hData.matches = apiH2h.previous_matches_ids;
        logger.info(`✅ Using ${apiH2h.previous_matches_ids.length} H2H matches from previous_matches_ids`);
        
        // Add team names to H2H data for display
        h2hData.teamNames = {
          teamA: matchDetails.homeTeam?.name || 'Home Team',
          teamB: matchDetails.awayTeam?.name || 'Away Team'
        };
      } else if (h2hService && h2hData.summary.totalMatches > 0) {
        // Fallback: Try to get H2H matches from team histories
        try {
          logger.info(`Fetching H2H match details for ${h2hData.summary.totalMatches} known matches`);
          const homeId = matchDetails.homeTeam?.id || apiH2h.team_a_id;
          const awayId = matchDetails.awayTeam?.id || apiH2h.team_b_id;
          
          if (homeId && awayId) {
            // Use H2H service to get full match data
            const h2hMatches = await h2hService.getH2HMatches(homeId, awayId, { limit: 10 });
            h2hData.matches = h2hMatches;
            logger.info(`✅ Fetched ${h2hMatches.length} H2H matches with details`);
          }
        } catch (error) {
          logger.warn(`Failed to fetch H2H match details: ${error.message}`);
          // Keep empty matches array if fetch fails
        }
      }
      
      logger.info(`H2H data from API: ${h2hData.summary.totalMatches} matches found`);
    } else {
      // Fallback to empty H2H data
      h2hData = {
        summary: {
          homeWins: 0,
          awayWins: 0,
          draws: 0,
          totalMatches: 0
        },
        matches: []
      };
      logger.warn('No H2H data in API response');
    }
    
    // Combine match details with H2H data
    const responseData = {
      ...matchDetails,
      h2h: h2hData,
      statistics: {
        home: matchDetails.stats || {},
        away: matchDetails.stats || {}
      }
    };
    
    // Debug log to check if teamNames is included
    if (h2hData && h2hData.teamNames) {
      logger.info(`✅ H2H teamNames included: ${JSON.stringify(h2hData.teamNames)}`);
    } else {
      logger.warn(`❌ H2H teamNames missing in response`);
    }
    
    res.json({
      success: true,
      data: responseData
    });
    
  } catch (error) {
    logger.error(`Error fetching match details: ${error.message}`);
    
    // Handle external API errors
    if (error.message.includes('API') || error.response?.status >= 500) {
      throw new ExternalAPIError('Match details service is temporarily unavailable');
    }
    
    throw error;
  }
}));

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

// Old route: Get team data with statistics - NOW USING REPOSITORY PATTERN
app.get('/api/teams/data', asyncHandler(async (req, res, next) => {
  const teamId = req.query.teamId;
  
  logger.info(`[Repository Pattern] Fetching team data for ID: ${teamId}`);

  try {
    // Use repository pattern with caching
    const data = await teamRepository.getTeamStatistics(teamId);
    
    // Keep debug log for development
    if (config.isDevelopment()) {
      logger.debug('Repository Pattern Response:', {
        hasData: !!data,
        hasStatistics: !!data?.statistics,
        teamName: data?.teamInfo?.name,
        cacheStats: teamRepository.getCacheStats()
      });
    }

    res.json({
      success: true,
      data: data,
    });
  } catch (error) {
    logger.error('Error fetching team data:', error);
    
    // Fallback to direct teamDataService if repository fails
    try {
      const data = await teamDataService.getTeamData(teamId);
      res.json({
        success: true,
        data: data,
      });
    } catch (fallbackError) {
      throw error; // Throw original error
    }
  }
}));

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

// Team comparison endpoint - NOW USING SERVICE LAYER
app.get('/api/teams/compare', asyncHandler(async (req, res, next) => {
  const { team1, team2 } = req.query;
  
  logger.info(`[Service Layer] Comparing teams: ${team1} vs ${team2}`);
  
  // Use the new TeamService
  const comparison = await teamService.compareTeams(team1, team2);
  
  res.json({
    success: true,
    data: comparison
  });
}));

// Batch fetch multiple teams - NEW ENDPOINT
app.post('/api/teams/batch', asyncHandler(async (req, res, next) => {
  const { teamIds } = req.body;
  
  logger.info(`[Service Layer] Batch fetching ${teamIds?.length || 0} teams`);
  
  const results = await teamService.getMultipleTeamsStatistics(teamIds);
  
  res.json({
    success: true,
    count: results.length,
    data: results
  });
}));

// Clear team cache - NEW ENDPOINT
app.delete('/api/teams/:teamId/cache', asyncHandler(async (req, res, next) => {
  const { teamId } = req.params;
  
  logger.info(`[Service Layer] Clearing cache for team ${teamId}`);
  
  await teamService.clearTeamCache(teamId);
  
  res.json({
    success: true,
    message: `Cache cleared for team ${teamId}`
  });
}));

// Get cache statistics - NEW ENDPOINT
app.get('/api/cache/stats', asyncHandler(async (req, res, next) => {
  const serviceStats = teamService.getCacheStatistics();
  const repositoryStats = teamRepository.getCacheStats();
  
  res.json({
    success: true,
    data: {
      service: serviceStats,
      repository: repositoryStats
    }
  });
}));

// Clear repository cache for a team - NEW ENDPOINT
app.delete('/api/repository/teams/:teamId/cache', asyncHandler(async (req, res, next) => {
  const { teamId } = req.params;
  
  logger.info(`[Repository] Clearing cache for team ${teamId}`);
  
  teamRepository.clearTeamCache(teamId);
  
  res.json({
    success: true,
    message: `Repository cache cleared for team ${teamId}`
  });
}));

// Force correct MIME type for JavaScript files
app.use('*.js', (req, res, next) => {
  res.setHeader('Content-Type', 'text/javascript');
  next();
});

// Serve static files with proper MIME types
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'text/javascript');
    }
  }
}));
app.use(express.static(path.join(__dirname), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'text/javascript');
    }
  }
}));

// 404 handler - must be before error handler
app.use(notFoundHandler);

// Global error handling middleware - must be last
app.use(errorHandler);

// Start server
app.listen(config.PORT, () => {
  logger.success('FullyDynamicTeamService initialized');
  logger.success('UniversalMappingService: FullyDynamicTeamService entegre edildi');
  const host = process.env.HOST || 'localhost';
  logger.success(`OPTIMIZED Server running on http://${host}:${config.PORT}`);
  
  // Start Prometheus metrics collection
  if (config.MONITORING.PROMETHEUS_ENABLED) {
    startMetricsCollection(config.MONITORING.METRICS_COLLECTION_INTERVAL);
    logger.info(`Prometheus metrics collection started (interval: ${config.MONITORING.METRICS_COLLECTION_INTERVAL}ms)`);
  }
  logger.info('Using chosen leagues from FootyStats API');
  logger.info(`API Key configured: ${!!config.API.FOOTBALL_API_KEY}`);
  logger.info(`Environment: ${config.NODE_ENV}`);
  logger.info(`Cache enabled: ${config.CACHE.ENABLE_CACHE}`);
  logger.info(`Redis enabled: ${config.REDIS.ENABLED}`);
  logger.info('Features: Parallel processing, Configurable rate limiting');
});
