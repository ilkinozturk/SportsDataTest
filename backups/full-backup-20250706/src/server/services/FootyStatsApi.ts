import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { FootyStatsApiResponse, League, Team, Match, ApiResponse } from '../../shared/types';
import { API_ENDPOINTS, CACHE_TTL, ERROR_MESSAGES, WORKING_LEAGUES } from '../../shared/constants';
import { Logger } from '../utils/logger';
import { CacheService } from './CacheService';

export class FootyStatsApi {
  private client: AxiosInstance;
  private cache: CacheService;
  private logger: Logger;
  private apiKey: string;
  private baseUrl: string;
  private requestCount: number = 0;
  private lastRequestTime: number = 0;
  private rateLimitDelay: number = 1000; // 1 second between requests

  constructor() {
    this.apiKey = process.env.FOOTYSTATS_API_KEY!;
    this.baseUrl = process.env.FOOTYSTATS_BASE_URL!;
    this.cache = new CacheService();
    this.logger = new Logger('FootyStatsApi');

    if (!this.apiKey) {
      throw new Error('FOOTYSTATS_API_KEY environment variable is required');
    }

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'FootyStats-Prediction-Engine/1.0',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor for rate limiting
    this.client.interceptors.request.use(async config => {
      await this.rateLimit();

      // Add API key to all requests
      config.params = {
        ...config.params,
        key: this.apiKey,
      };

      this.logger.debug(`API Request: ${config.method?.toUpperCase()} ${config.url}`, {
        params: config.params,
        requestCount: ++this.requestCount,
      });

      return config;
    });

    // Response interceptor for logging and error handling
    this.client.interceptors.response.use(
      response => {
        this.logger.debug(`API Response: ${response.status}`, {
          url: response.config.url,
          dataSize: JSON.stringify(response.data).length,
        });
        return response;
      },
      error => {
        this.logger.error('API Error:', {
          url: error.config?.url,
          status: error.response?.status,
          message: error.message,
          data: error.response?.data,
        });
        throw error;
      }
    );
  }

  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.rateLimitDelay) {
      const waitTime = this.rateLimitDelay - timeSinceLastRequest;
      this.logger.debug(`Rate limiting: waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  private async request<T>(endpoint: string, params: any = {}): Promise<ApiResponse<T>> {
    try {
      const cacheKey = `${endpoint}_${JSON.stringify(params)}`;

      // Check cache first
      const cachedData = await this.cache.get<T>(cacheKey);
      if (cachedData) {
        this.logger.debug(`Cache hit: ${cacheKey}`);
        return { success: true, data: cachedData };
      }

      const response: AxiosResponse<FootyStatsApiResponse> = await this.client.get(endpoint, {
        params,
      });

      if (!response.data.success) {
        throw new Error(`API returned success: false`);
      }

      // Cache the result
      await this.cache.set(cacheKey, response.data.data, CACHE_TTL.MEDIUM);

      return {
        success: true,
        data: response.data.data,
      };
    } catch (error: any) {
      this.logger.error(`API request failed for ${endpoint}:`, error);

      if (error.response?.status === 429) {
        return { success: false, error: ERROR_MESSAGES.RATE_LIMIT_EXCEEDED };
      }

      if (error.response?.status === 401) {
        return { success: false, error: ERROR_MESSAGES.INVALID_API_KEY };
      }

      if (error.response?.status === 417) {
        return {
          success: false,
          error:
            'League not activated in subscription. Please activate in FootyStats dashboard and wait 1 hour.',
        };
      }

      return {
        success: false,
        error: error.message || 'Unknown API error',
      };
    }
  }

  /**
   * Get all available leagues
   */
  async getLeagues(): Promise<ApiResponse<League[]>> {
    this.logger.info('Fetching leagues list');
    return this.request<League[]>(API_ENDPOINTS.LEAGUES);
  }

  /**
   * Get teams for a specific league
   */
  async getLeagueTeams(leagueId: number): Promise<ApiResponse<Team[]>> {
    this.logger.info(`Fetching teams for league ${leagueId}`);
    return this.request<Team[]>(API_ENDPOINTS.LEAGUE_TEAMS, { league_id: leagueId });
  }

  /**
   * Get matches for a specific league
   */
  async getLeagueMatches(leagueId: number, page: number = 1): Promise<ApiResponse<Match[]>> {
    this.logger.info(`Fetching matches for league ${leagueId}, page ${page}`);
    return this.request<Match[]>(API_ENDPOINTS.LEAGUE_MATCHES, {
      league_id: leagueId,
      page: page,
    });
  }

  /**
   * Get all matches for a specific league (all pages)
   */
  async getAllLeagueMatches(leagueId: number): Promise<ApiResponse<Match[]>> {
    this.logger.info(`Fetching all matches for league ${leagueId}`);

    const allMatches: Match[] = [];
    let page = 1;
    let hasMorePages = true;

    while (hasMorePages) {
      const response = await this.getLeagueMatches(leagueId, page);

      if (!response.success || !response.data) {
        return response;
      }

      allMatches.push(...response.data);

      // Check if there are more pages (this logic may need adjustment based on actual API response)
      if (response.data.length < 50) {
        // Assuming 50 items per page
        hasMorePages = false;
      } else {
        page++;
      }

      // Safety check to prevent infinite loops
      if (page > 20) {
        this.logger.warn(`Stopping pagination at page ${page} for league ${leagueId}`);
        break;
      }
    }

    return {
      success: true,
      data: allMatches,
    };
  }

  /**
   * Get matches for a specific team
   */
  async getTeamMatches(teamId: number): Promise<ApiResponse<Match[]>> {
    this.logger.info(`Fetching matches for team ${teamId}`);
    return this.request<Match[]>(API_ENDPOINTS.TEAM_MATCHES, { team_id: teamId });
  }

  /**
   * Get recent matches for a team (limited number)
   */
  async getTeamRecentMatches(teamId: number, limit: number = 10): Promise<ApiResponse<Match[]>> {
    this.logger.info(`Fetching ${limit} recent matches for team ${teamId}`);

    const response = await this.getTeamMatches(teamId);

    if (!response.success || !response.data) {
      return response;
    }

    // Sort by date (most recent first) and limit
    const recentMatches = response.data
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit);

    return {
      success: true,
      data: recentMatches,
    };
  }

  /**
   * Get head-to-head matches between two teams
   */
  async getHeadToHeadMatches(team1Id: number, team2Id: number): Promise<ApiResponse<Match[]>> {
    this.logger.info(`Fetching head-to-head matches between teams ${team1Id} and ${team2Id}`);

    // Get matches for both teams
    const team1Matches = await this.getTeamMatches(team1Id);
    const team2Matches = await this.getTeamMatches(team2Id);

    if (!team1Matches.success || !team2Matches.success) {
      return { success: false, error: 'Failed to fetch team matches' };
    }

    // Find common matches
    const h2hMatches = team1Matches.data!.filter(match1 =>
      team2Matches.data!.some(match2 => match1.id === match2.id)
    );

    return {
      success: true,
      data: h2hMatches.slice(0, 10), // Last 10 H2H matches
    };
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<ApiResponse<any>> {
    this.logger.info('Testing API connection');

    try {
      const response = await this.client.get(API_ENDPOINTS.LEAGUES, {
        params: { key: 'example' }, // Use example key for testing
      });

      return {
        success: true,
        data: { message: 'API connection successful', status: response.status },
      };
    } catch (error: any) {
      return {
        success: false,
        error: `API connection failed: ${error.message}`,
      };
    }
  }

  /**
   * Get API usage statistics
   */
  getStats() {
    return {
      requestCount: this.requestCount,
      lastRequestTime: this.lastRequestTime,
      rateLimitDelay: this.rateLimitDelay,
      baseUrl: this.baseUrl,
      hasApiKey: !!this.apiKey,
    };
  }

  /**
   * Get today's matches across all major leagues
   */
  async getTodaysMatches(): Promise<ApiResponse<Match[]>> {
    this.logger.info("Fetching today's matches from major leagues");

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format

    try {
      // Get matches from working leagues (those activated in subscription)
      const workingLeagueIds = Object.values(WORKING_LEAGUES).slice(0, 10); // Use first 10 working leagues
      const allMatches: Match[] = [];

      for (const leagueId of workingLeagueIds) {
        const leagueMatches = await this.getLeagueMatches(leagueId);

        if (leagueMatches.success && leagueMatches.data) {
          // Filter matches for today
          const todayMatches = leagueMatches.data.filter(match => {
            if (!match.date) return false;
            const matchDate = new Date(match.date).toISOString().split('T')[0];
            return matchDate === todayStr;
          });

          allMatches.push(...todayMatches);
        }
      }

      // Sort by date/time
      allMatches.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      this.logger.info(`Found ${allMatches.length} matches for today`);

      return {
        success: true,
        data: allMatches,
      };
    } catch (error: any) {
      this.logger.error("Failed to fetch today's matches:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get upcoming matches (next 7 days)
   */
  async getUpcomingMatches(days: number = 7): Promise<ApiResponse<Match[]>> {
    this.logger.info(`Fetching upcoming matches for next ${days} days`);

    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + days);

    try {
      const workingLeagueIds = Object.values(WORKING_LEAGUES).slice(0, 10); // Use first 10 working leagues
      const allMatches: Match[] = [];

      for (const leagueId of workingLeagueIds) {
        const leagueMatches = await this.getLeagueMatches(leagueId);

        if (leagueMatches.success && leagueMatches.data) {
          // Filter matches for upcoming days
          const upcomingMatches = leagueMatches.data.filter(match => {
            if (!match.date) return false;
            const matchDate = new Date(match.date);
            return matchDate >= now && matchDate <= futureDate;
          });

          allMatches.push(...upcomingMatches);
        }
      }

      // Sort by date/time
      allMatches.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      this.logger.info(`Found ${allMatches.length} upcoming matches`);

      return {
        success: true,
        data: allMatches,
      };
    } catch (error: any) {
      this.logger.error('Failed to fetch upcoming matches:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Clear cache for fresh data
   */
  async clearCache(): Promise<void> {
    await this.cache.clear();
    this.logger.info('API cache cleared');
  }
}
