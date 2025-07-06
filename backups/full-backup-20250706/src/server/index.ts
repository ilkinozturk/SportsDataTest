import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { Logger } from './utils/logger';
import { FootyStatsApi } from './services/FootyStatsApi';
import { RATE_LIMITS, HTTP_STATUS } from '../shared/constants';

// Load environment variables
dotenv.config();

const logger = new Logger('Server');
const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin:
      process.env.NODE_ENV === 'production'
        ? ['https://your-domain.com']
        : ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit(RATE_LIMITS.DEFAULT);
app.use('/api', limiter);

// Body parsing
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files (for production build)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
}

// API instance
const footyStatsApi = new FootyStatsApi();

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

// API test endpoint
app.get('/api/test', async (req, res) => {
  try {
    logger.info('Testing API connection...');

    const testResult = await footyStatsApi.testConnection();
    const stats = footyStatsApi.getStats();

    return res.json({
      success: testResult.success,
      message: testResult.success ? 'API connection successful' : 'API connection failed',
      data: testResult.data,
      error: testResult.error,
      stats,
    });
  } catch (error: any) {
    logger.error('API test failed:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: error.message,
    });
  }
});

// Get leagues
app.get('/api/leagues', async (req, res) => {
  try {
    logger.info('Fetching leagues...');

    const result = await footyStatsApi.getLeagues();

    if (!result.success) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(result);
    }

    return res.json(result);
  } catch (error: any) {
    logger.error('Failed to fetch leagues:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: error.message,
    });
  }
});

// Get league teams
app.get('/api/leagues/:leagueId/teams', async (req, res) => {
  try {
    const leagueId = parseInt(req.params.leagueId);

    if (isNaN(leagueId)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Invalid league ID',
      });
    }

    logger.info(`Fetching teams for league ${leagueId}...`);

    const result = await footyStatsApi.getLeagueTeams(leagueId);

    if (!result.success) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(result);
    }

    return res.json(result);
  } catch (error: any) {
    logger.error('Failed to fetch league teams:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: error.message,
    });
  }
});

// Get league matches
app.get('/api/leagues/:leagueId/matches', async (req, res) => {
  try {
    const leagueId = parseInt(req.params.leagueId);
    const page = parseInt(req.query.page as string) || 1;
    const all = req.query.all === 'true';

    if (isNaN(leagueId)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Invalid league ID',
      });
    }

    logger.info(`Fetching matches for league ${leagueId}, page ${page}, all: ${all}`);

    const result = all
      ? await footyStatsApi.getAllLeagueMatches(leagueId)
      : await footyStatsApi.getLeagueMatches(leagueId, page);

    if (!result.success) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(result);
    }

    return res.json(result);
  } catch (error: any) {
    logger.error('Failed to fetch league matches:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: error.message,
    });
  }
});

// Get team matches
app.get('/api/teams/:teamId/matches', async (req, res) => {
  try {
    const teamId = parseInt(req.params.teamId);
    const limit = parseInt(req.query.limit as string) || 10;

    if (isNaN(teamId)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Invalid team ID',
      });
    }

    logger.info(`Fetching ${limit} recent matches for team ${teamId}...`);

    const result = await footyStatsApi.getTeamRecentMatches(teamId, limit);

    if (!result.success) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(result);
    }

    return res.json(result);
  } catch (error: any) {
    logger.error('Failed to fetch team matches:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: error.message,
    });
  }
});

// Get head-to-head matches
app.get('/api/teams/:team1Id/vs/:team2Id', async (req, res) => {
  try {
    const team1Id = parseInt(req.params.team1Id);
    const team2Id = parseInt(req.params.team2Id);

    if (isNaN(team1Id) || isNaN(team2Id)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Invalid team IDs',
      });
    }

    logger.info(`Fetching head-to-head matches between teams ${team1Id} and ${team2Id}...`);

    const result = await footyStatsApi.getHeadToHeadMatches(team1Id, team2Id);

    if (!result.success) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(result);
    }

    return res.json(result);
  } catch (error: any) {
    logger.error('Failed to fetch head-to-head matches:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: error.message,
    });
  }
});

// Get today's matches
app.get('/api/matches/today', async (req, res) => {
  try {
    logger.info("Fetching today's matches...");

    const result = await footyStatsApi.getTodaysMatches();

    if (!result.success) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(result);
    }

    return res.json(result);
  } catch (error: any) {
    logger.error("Failed to fetch today's matches:", error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: error.message,
    });
  }
});

// Get upcoming matches
app.get('/api/matches/upcoming', async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 7;

    logger.info(`Fetching upcoming matches for ${days} days...`);

    const result = await footyStatsApi.getUpcomingMatches(days);

    if (!result.success) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(result);
    }

    return res.json(result);
  } catch (error: any) {
    logger.error('Failed to fetch upcoming matches:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: error.message,
    });
  }
});

// API stats
app.get('/api/stats', (req, res) => {
  const stats = footyStatsApi.getStats();
  res.json({
    success: true,
    data: {
      ...stats,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString(),
    },
  });
});

// Serve React app (production)
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', error);

  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(HTTP_STATUS.NOT_FOUND).json({
    success: false,
    error: 'Endpoint not found',
  });
});

// Start server
const server = app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🔑 API Key configured: ${!!process.env.FOOTYSTATS_API_KEY}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

export default app;
