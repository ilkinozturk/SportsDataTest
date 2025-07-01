/**
 * TeamRepository - Handles all team data access
 * Implements caching and API communication
 */

const axios = require('axios');
const cache = require('../cache/CacheManager');
const config = require('../config');
const { ExternalAPIError, NotFoundError } = require('../errors/AppError');
const ITeamRepository = require('./interfaces/ITeamRepository');
const Logger = require('../../utils/logger');

class TeamRepository extends ITeamRepository {
  constructor(apiKey, baseUrl) {
    super();
    this.apiKey = apiKey || config.API.FOOTBALL_API_KEY;
    this.baseUrl = baseUrl || config.API.FOOTBALL_API_URL;
    this.cache = cache;
    this.logger = new Logger('TeamRepository');
    
    // Cache TTL configurations from config
    this.TTL = {
      team: config.CACHE.TEAM_DATA_TTL,
      matches: config.CACHE.MATCH_DATA_TTL,
      statistics: config.CACHE.STATISTICS_TTL,
      live: config.CACHE.LIVE_DATA_TTL || 60000  // 1 minute default
    };
    
    // API timeout configuration
    this.timeout = config.API.TIMEOUT;
  }

  /**
   * Find team by ID with caching
   */
  async findTeamById(teamId) {
    const cacheKey = `team:${teamId}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      this.logger.info(`Cache hit for team ${teamId}`);
      return cached;
    }

    try {
      this.logger.info(`Fetching team data for ID: ${teamId}`);
      
      // Using the existing FootyStats API structure
      const url = `${this.baseUrl}/team?key=${this.apiKey}&team_id=${teamId}`;
      
      const response = await axios.get(url, {
        timeout: this.timeout,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'TeamDataService/1.0'
        }
      });

      if (response.data && response.data.data) {
        const teamData = response.data.data;
        this.cache.set(cacheKey, teamData, this.TTL.team);
        return teamData;
      }
      
      throw new NotFoundError('Team');
      
    } catch (error) {
      this.logger.error(`Error fetching team ${teamId}:`, error.message);
      
      if (error.response?.status === 404) {
        throw new NotFoundError('Team');
      }
      
      throw new ExternalAPIError(`Failed to fetch team data: ${error.message}`);
    }
  }

  /**
   * Find team matches with filtering options
   */
  async findTeamMatches(teamId, options = {}) {
    const { limit = 15, status = 'complete', from, to } = options;
    const cacheKey = `matches:${teamId}:${limit}:${status}:${from || 'all'}:${to || 'all'}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      this.logger.info(`Cache hit for team ${teamId} matches`);
      return cached;
    }

    try {
      // Build query parameters
      const params = new URLSearchParams({
        key: this.apiKey,
        team_id: teamId
      });

      if (limit) params.append('limit', limit);
      if (status) params.append('status', status);
      if (from) params.append('from', from);
      if (to) params.append('to', to);

      const url = `${this.baseUrl}/matches?${params.toString()}`;
      
      const response = await axios.get(url, {
        timeout: this.timeout,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'TeamDataService/1.0'
        }
      });

      const matches = response.data?.data || [];
      
      // Cache based on status
      const ttl = status === 'incomplete' ? this.TTL.live : this.TTL.matches;
      this.cache.set(cacheKey, matches, ttl);
      
      return matches;
      
    } catch (error) {
      this.logger.error(`Error fetching matches for team ${teamId}:`, error.message);
      throw new ExternalAPIError(`Failed to fetch matches: ${error.message}`);
    }
  }

  /**
   * Find team statistics from the league-teams endpoint
   */
  async findTeamStatistics(teamId) {
    const cacheKey = `statistics:${teamId}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      this.logger.info(`Cache hit for team ${teamId} statistics`);
      return cached;
    }

    try {
      // First, get team info to find their league
      const teamInfo = await this.findTeamById(teamId);
      
      if (!teamInfo || !teamInfo.competitions) {
        throw new NotFoundError('Team competitions');
      }

      // Get the first competition/league
      const leagueId = teamInfo.competitions[0]?.id;
      
      if (!leagueId) {
        throw new NotFoundError('Team league');
      }

      // Fetch league teams with statistics
      const url = `${this.baseUrl}/league-teams?key=${this.apiKey}&league_id=${leagueId}&include=stats`;
      
      const response = await axios.get(url, {
        timeout: this.timeout,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'TeamDataService/1.0'
        }
      });

      // Find our team in the league data
      const teams = response.data?.data || [];
      const teamStats = teams.find(t => String(t.id) === String(teamId));
      
      if (!teamStats) {
        throw new NotFoundError('Team statistics');
      }

      this.cache.set(cacheKey, teamStats, this.TTL.statistics);
      return teamStats;
      
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      
      this.logger.error(`Error fetching statistics for team ${teamId}:`, error.message);
      throw new ExternalAPIError(`Failed to fetch team statistics: ${error.message}`);
    }
  }

  /**
   * Calculate team statistics from matches
   * This maintains the existing logic from TeamDataService
   */
  async calculateTeamStatistics(teamId) {
    try {
      // Get matches
      const matches = await this.findTeamMatches(teamId, {
        limit: 50,
        status: 'complete'
      });

      // Initialize statistics
      const stats = {
        matches: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        homeMatches: 0,
        homeWins: 0,
        homeDraws: 0,
        homeLosses: 0,
        homeGoalsFor: 0,
        homeGoalsAgainst: 0,
        awayMatches: 0,
        awayWins: 0,
        awayDraws: 0,
        awayLosses: 0,
        awayGoalsFor: 0,
        awayGoalsAgainst: 0
      };

      // Calculate statistics from matches
      matches.forEach(match => {
        const isHome = String(match.home_team_id) === String(teamId);
        const goalsFor = isHome ? match.home_score : match.away_score;
        const goalsAgainst = isHome ? match.away_score : match.home_score;
        
        stats.matches++;
        stats.goalsFor += goalsFor || 0;
        stats.goalsAgainst += goalsAgainst || 0;

        if (goalsFor > goalsAgainst) {
          stats.wins++;
        } else if (goalsFor === goalsAgainst) {
          stats.draws++;
        } else {
          stats.losses++;
        }

        if (isHome) {
          stats.homeMatches++;
          stats.homeGoalsFor += goalsFor || 0;
          stats.homeGoalsAgainst += goalsAgainst || 0;
          
          if (goalsFor > goalsAgainst) {
            stats.homeWins++;
          } else if (goalsFor === goalsAgainst) {
            stats.homeDraws++;
          } else {
            stats.homeLosses++;
          }
        } else {
          stats.awayMatches++;
          stats.awayGoalsFor += goalsFor || 0;
          stats.awayGoalsAgainst += goalsAgainst || 0;
          
          if (goalsFor > goalsAgainst) {
            stats.awayWins++;
          } else if (goalsFor === goalsAgainst) {
            stats.awayDraws++;
          } else {
            stats.awayLosses++;
          }
        }
      });

      // Calculate additional statistics
      stats.points = (stats.wins * 3) + stats.draws;
      stats.goalDifference = stats.goalsFor - stats.goalsAgainst;
      stats.pointsPerGame = stats.matches > 0 ? (stats.points / stats.matches).toFixed(2) : 0;
      stats.winPercentage = stats.matches > 0 ? ((stats.wins / stats.matches) * 100).toFixed(1) : 0;

      return stats;
      
    } catch (error) {
      this.logger.error(`Error calculating statistics for team ${teamId}:`, error.message);
      throw error;
    }
  }

  /**
   * Find head to head matches between two teams
   */
  async findH2HMatches(team1Id, team2Id, options = {}) {
    const { limit = 10 } = options;
    const cacheKey = `h2h:${team1Id}:${team2Id}:${limit}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const url = `${this.baseUrl}/matches?key=${this.apiKey}&team_id=${team1Id}&team_id2=${team2Id}&limit=${limit}`;
      
      const response = await axios.get(url, {
        timeout: this.timeout,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'TeamDataService/1.0'
        }
      });

      const matches = response.data?.data || [];
      this.cache.set(cacheKey, matches, this.TTL.matches);
      
      return matches;
      
    } catch (error) {
      this.logger.error(`Error fetching H2H matches:`, error.message);
      throw new ExternalAPIError(`Failed to fetch H2H matches: ${error.message}`);
    }
  }

  /**
   * Find team by name
   */
  async findTeamByName(teamName) {
    // This would require a search endpoint or iterating through leagues
    // For now, throw not implemented
    throw new Error('findTeamByName not implemented - use team ID instead');
  }

  /**
   * Find teams by league
   */
  async findTeamsByLeague(leagueId) {
    const cacheKey = `league:teams:${leagueId}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const url = `${this.baseUrl}/league-teams?key=${this.apiKey}&league_id=${leagueId}`;
      
      const response = await axios.get(url, {
        timeout: this.timeout,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'TeamDataService/1.0'
        }
      });

      const teams = response.data?.data || [];
      this.cache.set(cacheKey, teams, this.TTL.team);
      
      return teams;
      
    } catch (error) {
      this.logger.error(`Error fetching teams for league ${leagueId}:`, error.message);
      throw new ExternalAPIError(`Failed to fetch league teams: ${error.message}`);
    }
  }

  /**
   * Find team form (last N matches)
   */
  async findTeamForm(teamId, matchCount = 5) {
    const matches = await this.findTeamMatches(teamId, {
      limit: matchCount,
      status: 'complete'
    });

    return matches.map(match => {
      const isHome = String(match.home_team_id) === String(teamId);
      const goalsFor = isHome ? match.home_score : match.away_score;
      const goalsAgainst = isHome ? match.away_score : match.home_score;
      
      if (goalsFor > goalsAgainst) return 'W';
      if (goalsFor === goalsAgainst) return 'D';
      return 'L';
    });
  }

  /**
   * Clear team cache
   */
  async clearTeamCache(teamId) {
    const patterns = [
      `team:${teamId}`,
      `matches:${teamId}:*`,
      `statistics:${teamId}`,
      `h2h:${teamId}:*`,
      `h2h:*:${teamId}:*`
    ];

    let totalDeleted = 0;
    patterns.forEach(pattern => {
      totalDeleted += this.cache.deletePattern(pattern);
    });

    this.logger.info(`Cleared ${totalDeleted} cache entries for team ${teamId}`);
  }
}

module.exports = TeamRepository;