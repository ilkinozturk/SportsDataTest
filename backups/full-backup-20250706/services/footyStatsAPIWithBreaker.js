const axios = require('axios');
const { withCircuitBreaker } = require('../utils/circuitBreaker');
const { getLogger } = require('../utils/winstonLogger');

/**
 * FootyStats API client with Circuit Breaker protection
 */
class FootyStatsAPIWithBreaker {
  constructor(apiKey, baseUrl) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.logger = getLogger('FootyStatsAPI');
    
    // Circuit breaker configuration for different endpoints
    this.breakerConfigs = {
      team: {
        failureThreshold: 3,
        resetTimeout: 30000, // 30 seconds
        timeout: 5000, // 5 seconds
      },
      matches: {
        failureThreshold: 5,
        resetTimeout: 60000, // 60 seconds
        timeout: 10000, // 10 seconds
      },
      standings: {
        failureThreshold: 3,
        resetTimeout: 45000, // 45 seconds
        timeout: 8000, // 8 seconds
      },
      default: {
        failureThreshold: 5,
        resetTimeout: 60000, // 60 seconds
        timeout: 10000, // 10 seconds
      },
    };
  }

  /**
   * Make API request with circuit breaker protection
   */
  async request(endpoint, params = {}, breakerName = 'default') {
    const url = `${this.baseUrl}${endpoint}`;
    const config = this.breakerConfigs[breakerName] || this.breakerConfigs.default;
    
    return withCircuitBreaker(
      `footystats-${breakerName}`,
      async () => {
        const startTime = Date.now();
        
        try {
          const response = await axios.get(url, {
            params: {
              key: this.apiKey,
              ...params,
            },
            timeout: config.timeout,
          });
          
          const duration = Date.now() - startTime;
          
          this.logger.info(`API call successful: ${endpoint}`, {
            endpoint,
            duration: `${duration}ms`,
            status: response.status,
          });
          
          if (response.data && response.data.success === false) {
            throw new Error(response.data.error || 'API returned error');
          }
          
          return response.data;
        } catch (error) {
          const duration = Date.now() - startTime;
          
          // Log different error types
          if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
            this.logger.error(`API timeout: ${endpoint}`, {
              endpoint,
              duration: `${duration}ms`,
              timeout: config.timeout,
            });
          } else if (error.response) {
            this.logger.error(`API error: ${endpoint}`, {
              endpoint,
              status: error.response.status,
              message: error.response.data?.error || error.message,
              duration: `${duration}ms`,
            });
          } else {
            this.logger.error(`Network error: ${endpoint}`, {
              endpoint,
              message: error.message,
              code: error.code,
              duration: `${duration}ms`,
            });
          }
          
          throw error;
        }
      },
      config
    );
  }

  /**
   * Get team data
   */
  async getTeam(teamId) {
    return this.request(`/team/${teamId}`, {}, 'team');
  }

  /**
   * Get team matches
   */
  async getTeamMatches(teamId, params = {}) {
    return this.request(`/fixtures/team/${teamId}`, params, 'matches');
  }

  /**
   * Get league standings
   */
  async getStandings(leagueId, seasonId) {
    return this.request(
      `/league-table`,
      { league_id: leagueId, season_id: seasonId },
      'standings'
    );
  }

  /**
   * Get matches by date
   */
  async getMatchesByDate(date) {
    return this.request(`/matches/date/${date}`, {}, 'matches');
  }

  /**
   * Get today's matches
   */
  async getTodayMatches() {
    return this.request('/matches/today', {}, 'matches');
  }

  /**
   * Get live matches
   */
  async getLiveMatches() {
    return this.request('/matches/live', {}, 'matches');
  }

  /**
   * Get league teams
   */
  async getLeagueTeams(leagueId, seasonId) {
    return this.request(
      `/league-teams`,
      { 
        league_id: leagueId,
        season_id: seasonId,
        include_stats: 'true',
      },
      'team'
    );
  }

  /**
   * Get head-to-head matches
   */
  async getH2HMatches(team1Id, team2Id, limit = 10) {
    return this.request(
      `/fixtures/h2h/${team1Id}/${team2Id}`,
      { limit },
      'matches'
    );
  }

  /**
   * Get league matches
   */
  async getLeagueMatches(leagueId, params = {}) {
    return this.request(
      `/fixtures/league/${leagueId}`,
      params,
      'matches'
    );
  }

  /**
   * Batch request with circuit breaker
   * Execute multiple requests with individual circuit breakers
   */
  async batchRequest(requests) {
    const results = await Promise.allSettled(
      requests.map(({ endpoint, params, breakerName }) =>
        this.request(endpoint, params, breakerName)
      )
    );
    
    return results.map((result, index) => ({
      ...requests[index],
      status: result.status,
      data: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? result.reason : null,
    }));
  }
}

module.exports = FootyStatsAPIWithBreaker;