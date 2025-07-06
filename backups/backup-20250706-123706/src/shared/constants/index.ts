// Shared constants for the application

export const API_ENDPOINTS = {
  LEAGUES: '/league-list',
  LEAGUE_MATCHES: '/league-matches',
  LEAGUE_TEAMS: '/league-teams',
  TEAM_MATCHES: '/get-team-matches',
  PREDICTIONS: '/predictions',
  STATS: '/stats',
} as const;

export const PREDICTION_ALGORITHMS = {
  FORM_ANALYSIS: 'form_analysis',
  HEAD_TO_HEAD: 'head_to_head',
  HOME_ADVANTAGE: 'home_advantage',
  GOAL_TRENDS: 'goal_trends',
  LEAGUE_POSITION: 'league_position',
  RECENT_PERFORMANCE: 'recent_performance',
} as const;

export const ALGORITHM_WEIGHTS = {
  [PREDICTION_ALGORITHMS.FORM_ANALYSIS]: 0.25,
  [PREDICTION_ALGORITHMS.HEAD_TO_HEAD]: 0.2,
  [PREDICTION_ALGORITHMS.HOME_ADVANTAGE]: 0.15,
  [PREDICTION_ALGORITHMS.GOAL_TRENDS]: 0.15,
  [PREDICTION_ALGORITHMS.LEAGUE_POSITION]: 0.15,
  [PREDICTION_ALGORITHMS.RECENT_PERFORMANCE]: 0.1,
} as const;

export const MATCH_STATUS = {
  SCHEDULED: 'scheduled',
  LIVE: 'live',
  FINISHED: 'finished',
  POSTPONED: 'postponed',
} as const;

export const RESULT_TYPES = {
  HOME_WIN: 'home',
  DRAW: 'draw',
  AWAY_WIN: 'away',
} as const;

export const CONFIDENCE_LEVELS = {
  VERY_LOW: 0.0,
  LOW: 0.3,
  MEDIUM: 0.5,
  HIGH: 0.7,
  VERY_HIGH: 0.9,
} as const;

export const CACHE_KEYS = {
  LEAGUES: 'leagues',
  TEAMS: 'teams',
  MATCHES: 'matches',
  PREDICTIONS: 'predictions',
  STATS: 'stats',
  FORM: 'form',
} as const;

export const CACHE_TTL = {
  SHORT: 5 * 60, // 5 minutes
  MEDIUM: 30 * 60, // 30 minutes
  LONG: 2 * 60 * 60, // 2 hours
  VERY_LONG: 24 * 60 * 60, // 24 hours
} as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export const RATE_LIMITS = {
  DEFAULT: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  },
  API: {
    windowMs: 60 * 1000, // 1 minute
    max: 60, // limit each IP to 60 requests per minute
  },
} as const;

// Import discovered active leagues
import { ALL_ACTIVE_LEAGUES, DISCOVERED_ACTIVE_LEAGUES } from './discovered-leagues';

// FootyStats Season IDs - CONFIRMED WORKING LEAGUES
// These are leagues that are activated in the current subscription
// Updated through systematic API discovery on 2025-06-25
export const WORKING_LEAGUES = ALL_ACTIVE_LEAGUES;

// Major European leagues (available in subscription but NOT activated)
// To use these, activate them in FootyStats dashboard and wait 1 hour
export const MAJOR_EUROPEAN_LEAGUES = {
  PREMIER_LEAGUE: 12325, // England Premier League 2024-25
  LA_LIGA: 12316, // Spain La Liga 2024-25
  BUNDESLIGA: 12529, // Germany Bundesliga 2024-25
  SERIE_A: 12530, // Italy Serie A 2024-25
  LIGUE_1: 12337, // France Ligue 1 2024-25
  CHAMPIONS_LEAGUE: 12321, // UEFA Champions League 2024-25
  EUROPA_LEAGUE: 12327, // UEFA Europa League 2024-25
} as const;

// Deprecated - use WORKING_LEAGUES instead
export const MAJOR_LEAGUES = {
  PREMIER_LEAGUE: 1625, // ❌ Not activated in subscription
  LA_LIGA: 1398, // ❌ Not activated in subscription
  BUNDESLIGA: 1635, // ❌ Not activated in subscription
  SERIE_A: 1269, // ❌ Not activated in subscription
  LIGUE_1: 1423, // ❌ Not activated in subscription
  CHAMPIONS_LEAGUE: 1001, // ❌ Not activated in subscription
  EUROPA_LEAGUE: 1002, // ❌ Not activated in subscription
} as const;

export const PREDICTION_TYPES = {
  MATCH_RESULT: 'match_result',
  OVER_UNDER: 'over_under',
  BOTH_TEAMS_SCORE: 'both_teams_score',
  CORRECT_SCORE: 'correct_score',
  CLEAN_SHEET: 'clean_sheet',
} as const;

export const ANALYSIS_PERIODS = {
  LAST_5_MATCHES: 5,
  LAST_10_MATCHES: 10,
  SEASON: 38, // Typical season length
  HOME_SEASON: 19,
  AWAY_SEASON: 19,
} as const;

export const GOAL_THRESHOLDS = {
  OVER_05: 0.5,
  OVER_15: 1.5,
  OVER_25: 2.5,
  OVER_35: 3.5,
  OVER_45: 4.5,
} as const;

export const HOME_ADVANTAGE_FACTOR = 0.1; // 10% boost for home teams

export const DEFAULT_CONFIG = {
  FORM_MATCHES_LIMIT: 5,
  HISTORICAL_MATCHES_LIMIT: 10,
  CONFIDENCE_THRESHOLD: 0.65,
  PREDICTION_CACHE_TTL: 30 * 60, // 30 minutes
  DATA_CACHE_TTL: 5 * 60, // 5 minutes
} as const;

export const ERROR_MESSAGES = {
  INVALID_API_KEY: 'Invalid API key provided',
  RATE_LIMIT_EXCEEDED: 'Rate limit exceeded. Please try again later.',
  MATCH_NOT_FOUND: 'Match not found',
  TEAM_NOT_FOUND: 'Team not found',
  LEAGUE_NOT_FOUND: 'League not found',
  INSUFFICIENT_DATA: 'Insufficient data for prediction',
  PREDICTION_FAILED: 'Failed to generate prediction',
  INVALID_REQUEST: 'Invalid request parameters',
} as const;
