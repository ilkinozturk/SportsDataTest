/**
 * Service-related type definitions
 */

import { TeamInfo, TeamStatistics, Match, ApiRequestOptions } from './api.types';
import { TeamData } from './team.types';

// Logger types
export interface LoggerOptions {
  service?: string;
  level?: 'info' | 'warn' | 'error' | 'debug' | 'success';
  timestamp?: boolean;
  colors?: boolean;
}

export interface LogEntry {
  level: string;
  message: string;
  service?: string;
  timestamp: Date;
  metadata?: any;
  error?: Error;
}

// Cache types
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl?: number;
  tags?: string[];
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  evictions: number;
}

// Service interfaces
export interface ITeamDataService {
  getTeamData(teamId: string | number): Promise<TeamData | null>;
  clearCache(): void;
}

export interface ILeagueResolver {
  resolveLeagueInfo(teamStats: any, seasonId?: string | number): Promise<any>;
  getLeagueSeasonId(leagueId: string | number): Promise<string | number | null>;
  clearCache(): void;
}

export interface IMatchesFetcher {
  getTeamMatches(teamId: string | number, seasonId: string | number): Promise<Match[]>;
  clearCache(): void;
}

export interface IStatisticsProcessor {
  processStatistics(apiStats: any, matches?: Match[], teamId?: string | number): TeamStatistics;
}

export interface IValidator {
  validateTeamId(teamId: any): string;
  validateSeasonId(seasonId: any): string;
  validateApiResponse(response: any): boolean;
  sanitizeInput(input: any): any;
}

// Error types
export enum ErrorCode {
  INVALID_TEAM_ID = 'INVALID_TEAM_ID',
  TEAM_NOT_FOUND = 'TEAM_NOT_FOUND',
  API_ERROR = 'API_ERROR',
  RATE_LIMIT = 'RATE_LIMIT',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  CACHE_ERROR = 'CACHE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export class ServiceError extends Error {
  code: ErrorCode;
  statusCode?: number;
  details?: any;

  constructor(message: string, code: ErrorCode, statusCode?: number, details?: any) {
    super(message);
    this.name = 'ServiceError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

// Monitoring types
export interface PerformanceMetrics {
  endpoint: string;
  method: string;
  duration: number;
  statusCode: number;
  timestamp: Date;
  success: boolean;
  error?: string;
}

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  timestamp: Date;
  services: {
    api: boolean;
    cache: boolean;
    database?: boolean;
  };
  metrics?: {
    cpu: number;
    memory: number;
    requestRate: number;
    errorRate: number;
  };
}

// Circuit breaker types
export interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeout: number;
  monitoringPeriod: number;
  minimumRequests: number;
}

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

export interface CircuitBreakerState {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime?: Date;
  nextAttemptTime?: Date;
}