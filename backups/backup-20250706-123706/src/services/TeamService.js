/**
 * TeamService - Business logic layer for team operations
 * Orchestrates repository calls and applies business rules
 */

const TeamRepository = require('../repositories/TeamRepository');
const TeamStatisticsDTO = require('../dtos/TeamStatisticsDTO');
const MatchDTO = require('../dtos/MatchDTO');
const ComparisonDTO = require('../dtos/ComparisonDTO');
const config = require('../config');
const { ValidationError, NotFoundError, BadRequestError } = require('../errors/AppError');
const Logger = require('../../utils/logger');

class TeamService {
  constructor(apiKey, baseUrl, existingServices = {}) {
    // Use config values if not provided
    this.teamRepository = new TeamRepository(
      apiKey || config.API.FOOTBALL_API_KEY,
      baseUrl || config.API.FOOTBALL_API_URL
    );
    this.logger = new Logger('TeamService');
    
    // Keep existing services for compatibility
    this.fullyDynamicService = existingServices.fullyDynamicService;
    this.leagueManager = existingServices.leagueManager;
    this.schemaMapper = existingServices.schemaMapper;
    this.dataEnhancer = existingServices.dataEnhancer;
    
    // Configuration constants
    this.MAX_BATCH_SIZE = config.API.MAX_BATCH_SIZE || 10;
    this.DEFAULT_MATCH_LIMIT = config.API.DEFAULT_MATCH_LIMIT || 20;
  }

  /**
   * Get comprehensive team statistics
   * Maintains the same response structure as before
   */
  async getTeamStatistics(teamId) {
    // Validate team ID
    if (!teamId) {
      throw new ValidationError('Team ID is required');
    }

    // Convert to string for consistency
    teamId = String(teamId);
    
    if (!/^\d+$/.test(teamId)) {
      throw new ValidationError('Invalid team ID format');
    }

    try {
      this.logger.info(`Fetching comprehensive statistics for team ${teamId}`);
      
      // Fetch data in parallel for better performance
      const [teamInfo, teamStats, matches] = await Promise.all([
        this.teamRepository.findTeamById(teamId),
        this.teamRepository.findTeamStatistics(teamId).catch(() => null),
        this.teamRepository.findTeamMatches(teamId, { limit: this.DEFAULT_MATCH_LIMIT, status: 'complete' })
      ]);

      if (!teamInfo) {
        throw new NotFoundError('Team');
      }

      // Get statistics from league data or calculate from matches
      let statistics = null;
      
      if (teamStats && teamStats.stats) {
        // Use statistics from league-teams endpoint
        statistics = this.processLeagueStatistics(teamStats.stats);
      } else {
        // Calculate statistics from matches
        this.logger.info('Calculating statistics from matches');
        statistics = await this.teamRepository.calculateTeamStatistics(teamId);
      }

      // Get league position if available
      let leaguePosition = null;
      if (teamStats) {
        leaguePosition = {
          position: teamStats.position || teamStats.league_position,
          played: teamStats.played || statistics.matches,
          points: teamStats.points || statistics.points,
          goalDifference: teamStats.goal_difference || statistics.goalDifference
        };
      }

      // Get recent form
      const form = await this.teamRepository.findTeamForm(teamId, 5);

      // Build the response maintaining the original structure
      const result = {
        teamInfo: {
          id: teamInfo.id,
          name: teamInfo.name,
          logo: teamInfo.logo || teamInfo.badge_url,
          country: teamInfo.country,
          founded: teamInfo.founded,
          venue: teamInfo.venue
        },
        statistics: {
          ...statistics,
          form: form.join(''), // e.g., "WWDLW"
          // Add any additional statistics that were in the original response
          additional_info: teamStats?.stats?.additional_info || {}
        },
        leaguePosition,
        recentMatches: MatchDTO.fromArray(matches.slice(0, 5)),
        allMatches: matches.length
      };

      // Apply schema mapping if available
      if (this.schemaMapper) {
        result.statistics = this.schemaMapper.mapApiDataToSchema(result);
      }

      // Apply data enhancement if available
      if (this.dataEnhancer) {
        this.dataEnhancer.enhanceTeamData(result);
      }

      // Return using DTO to ensure consistent structure
      return TeamStatisticsDTO.fromRawData(result);
      
    } catch (error) {
      this.logger.error(`Error fetching team statistics for ${teamId}:`, error);
      
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      
      throw new Error(`Failed to fetch team statistics: ${error.message}`);
    }
  }

  /**
   * Process statistics from league-teams endpoint
   * Maintains compatibility with existing data structure
   */
  processLeagueStatistics(stats) {
    if (!stats) return {};
    
    // Map the statistics to match the expected structure
    return {
      // Basic statistics
      matches: stats.matches_played || stats.matches || 0,
      wins: stats.wins || 0,
      draws: stats.draws || 0,
      losses: stats.losses || 0,
      points: stats.points || 0,
      
      // Goals
      goalsFor: stats.goals_for || stats.goalsFor || 0,
      goalsAgainst: stats.goals_against || stats.goalsAgainst || 0,
      goalDifference: stats.goal_difference || stats.goalDifference || 0,
      
      // Home statistics
      homeMatches: stats.home_matches || stats.homeMatches || 0,
      homeWins: stats.home_wins || stats.homeWins || 0,
      homeDraws: stats.home_draws || stats.homeDraws || 0,
      homeLosses: stats.home_losses || stats.homeLosses || 0,
      homeGoalsFor: stats.home_goals_for || stats.homeGoalsFor || 0,
      homeGoalsAgainst: stats.home_goals_against || stats.homeGoalsAgainst || 0,
      
      // Away statistics
      awayMatches: stats.away_matches || stats.awayMatches || 0,
      awayWins: stats.away_wins || stats.awayWins || 0,
      awayDraws: stats.away_draws || stats.awayDraws || 0,
      awayLosses: stats.away_losses || stats.awayLosses || 0,
      awayGoalsFor: stats.away_goals_for || stats.awayGoalsFor || 0,
      awayGoalsAgainst: stats.away_goals_against || stats.awayGoalsAgainst || 0,
      
      // Calculated statistics
      pointsPerGame: stats.ppg || stats.points_per_game || 
        (stats.matches > 0 ? (stats.points / stats.matches).toFixed(2) : 0),
      winPercentage: stats.win_percentage || 
        (stats.matches > 0 ? ((stats.wins / stats.matches) * 100).toFixed(1) : 0),
      
      // All other statistics (preserve everything)
      ...stats
    };
  }

  /**
   * Compare two teams
   */
  async compareTeams(team1Id, team2Id) {
    // Validate team IDs
    if (!team1Id || !team2Id) {
      throw new ValidationError('Both team IDs are required');
    }

    if (String(team1Id) === String(team2Id)) {
      throw new ValidationError('Cannot compare a team with itself');
    }

    try {
      this.logger.info(`Comparing teams: ${team1Id} vs ${team2Id}`);
      
      // Fetch both teams data in parallel
      const [team1Data, team2Data, h2hMatches] = await Promise.all([
        this.getTeamStatistics(team1Id),
        this.getTeamStatistics(team2Id),
        this.teamRepository.findH2HMatches(team1Id, team2Id, { limit: 10 })
          .catch(() => []) // Don't fail if H2H is not available
      ]);

      // Add H2H data to the comparison
      const team1DataWithH2H = { ...team1Data, h2hMatches };
      const team2DataWithH2H = { ...team2Data, h2hMatches };

      return ComparisonDTO.fromTeamsData(team1DataWithH2H, team2DataWithH2H);
      
    } catch (error) {
      this.logger.error(`Error comparing teams:`, error);
      
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }
      
      throw new BadRequestError(`Failed to compare teams: ${error.message}`);
    }
  }

  /**
   * Get team matches with detailed information
   */
  async getTeamMatches(teamId, options = {}) {
    if (!teamId) {
      throw new ValidationError('Team ID is required');
    }

    try {
      const matches = await this.teamRepository.findTeamMatches(teamId, options);
      return MatchDTO.fromArray(matches);
    } catch (error) {
      this.logger.error(`Error fetching team matches:`, error);
      throw error;
    }
  }

  /**
   * Get head to head matches
   */
  async getH2HMatches(team1Id, team2Id, options = {}) {
    if (!team1Id || !team2Id) {
      throw new ValidationError('Both team IDs are required');
    }

    try {
      const matches = await this.teamRepository.findH2HMatches(team1Id, team2Id, options);
      return MatchDTO.fromArray(matches);
    } catch (error) {
      this.logger.error(`Error fetching H2H matches:`, error);
      throw error;
    }
  }

  /**
   * Batch fetch multiple teams (for performance)
   */
  async getMultipleTeamsStatistics(teamIds) {
    if (!Array.isArray(teamIds) || teamIds.length === 0) {
      throw new ValidationError('Team IDs array is required');
    }

    if (teamIds.length > this.MAX_BATCH_SIZE) {
      throw new ValidationError(`Maximum ${this.MAX_BATCH_SIZE} teams can be fetched at once`);
    }

    try {
      const results = await Promise.allSettled(
        teamIds.map(id => this.getTeamStatistics(id))
      );

      return results.map((result, index) => ({
        teamId: teamIds[index],
        success: result.status === 'fulfilled',
        data: result.status === 'fulfilled' ? result.value : null,
        error: result.status === 'rejected' ? result.reason.message : null
      }));
      
    } catch (error) {
      this.logger.error(`Error fetching multiple teams:`, error);
      throw error;
    }
  }

  /**
   * Clear cache for a specific team
   */
  async clearTeamCache(teamId) {
    if (!teamId) {
      throw new ValidationError('Team ID is required');
    }

    await this.teamRepository.clearTeamCache(teamId);
    this.logger.info(`Cache cleared for team ${teamId}`);
  }

  /**
   * Get cache statistics
   */
  getCacheStatistics() {
    return this.teamRepository.cache.getStats();
  }
}

module.exports = TeamService;