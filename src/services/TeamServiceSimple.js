const teamRepository = require('../repositories/TeamRepositorySimple');
const { ValidationError, NotFoundError } = require('../errors/AppError');
const TeamStatisticsDTO = require('../dtos/TeamStatisticsDTO');
const Logger = require('../../utils/logger');

/**
 * TeamServiceSimple - Simple service layer using repository pattern
 * Business logic layer that uses the repository for data access
 */
class TeamServiceSimple {
  constructor() {
    this.repository = teamRepository;
    this.logger = new Logger('TeamServiceSimple');
  }

  /**
   * Get team statistics with validation and business logic
   */
  async getTeamStatistics(teamId) {
    // Validation
    if (!teamId) {
      throw new ValidationError('Team ID is required');
    }

    teamId = String(teamId).trim();
    
    if (!/^\d+$/.test(teamId)) {
      throw new ValidationError('Team ID must be a number');
    }

    try {
      this.logger.info(`Getting statistics for team ${teamId}`);
      
      // Use repository to get data
      const rawData = await this.repository.getTeamStatistics(teamId);
      
      // Apply business logic transformations
      const enhancedData = this.enhanceStatistics(rawData);
      
      // Return DTO
      return new TeamStatisticsDTO(enhancedData);
      
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      
      this.logger.error(`Error getting team statistics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get multiple teams in batch
   */
  async getMultipleTeamsStatistics(teamIds) {
    if (!Array.isArray(teamIds) || teamIds.length === 0) {
      throw new ValidationError('Team IDs must be a non-empty array');
    }

    // Validate all team IDs
    const validatedIds = teamIds.map(id => {
      const teamId = String(id).trim();
      if (!/^\d+$/.test(teamId)) {
        throw new ValidationError(`Invalid team ID: ${id}`);
      }
      return teamId;
    });

    // Get all teams in parallel
    const promises = validatedIds.map(id => 
      this.getTeamStatistics(id).catch(error => ({
        teamId: id,
        error: error.message,
        success: false
      }))
    );

    const results = await Promise.all(promises);
    
    return results;
  }

  /**
   * Compare two teams
   */
  async compareTeams(team1Id, team2Id) {
    if (!team1Id || !team2Id) {
      throw new ValidationError('Both team IDs are required');
    }

    if (team1Id === team2Id) {
      throw new ValidationError('Cannot compare a team with itself');
    }

    // Get both teams data
    const [team1Data, team2Data] = await Promise.all([
      this.getTeamStatistics(team1Id),
      this.getTeamStatistics(team2Id)
    ]);

    // Calculate comparison metrics
    const comparison = {
      team1: {
        id: team1Id,
        name: team1Data.teamInfo?.name,
        stats: this.extractKeyStats(team1Data)
      },
      team2: {
        id: team2Id,
        name: team2Data.teamInfo?.name,
        stats: this.extractKeyStats(team2Data)
      },
      advantages: this.calculateAdvantages(team1Data, team2Data)
    };

    return comparison;
  }

  /**
   * Clear cache for a team
   */
  async clearTeamCache(teamId) {
    if (!teamId) {
      throw new ValidationError('Team ID is required');
    }

    this.repository.clearTeamCache(teamId);
    this.logger.info(`Cache cleared for team ${teamId}`);
  }

  /**
   * Get cache statistics
   */
  getCacheStatistics() {
    return this.repository.getCacheStats();
  }

  // BUSINESS LOGIC METHODS

  /**
   * Enhance statistics with calculated fields
   */
  enhanceStatistics(data) {
    if (!data.statistics) return data;

    const stats = data.statistics;
    
    // Calculate additional metrics
    if (stats.totalMatches > 0) {
      // Performance metrics
      stats.performanceScore = this.calculatePerformanceScore(stats);
      
      // Form analysis
      stats.formAnalysis = this.analyzeForm(stats);
      
      // Trends
      stats.trends = this.calculateTrends(stats);
    }

    return data;
  }

  /**
   * Calculate team performance score
   */
  calculatePerformanceScore(stats) {
    const weights = {
      winPercentage: 0.3,
      pointsPerGame: 0.25,
      goalDifference: 0.2,
      cleanSheetPercentage: 0.15,
      bothTeamsScoredPercentage: 0.1
    };

    const score = 
      (parseFloat(stats.winPercentage) || 0) * weights.winPercentage +
      (parseFloat(stats.pointsPerGame) || 0) * 20 * weights.pointsPerGame +
      (Math.max(0, stats.goalDifference + 50) / 100) * 100 * weights.goalDifference +
      (parseFloat(stats.cleanSheetPercentage) || 0) * weights.cleanSheetPercentage +
      (100 - (parseFloat(stats.bothTeamsScoredPercentage) || 0)) * weights.bothTeamsScoredPercentage;

    return Math.round(score);
  }

  /**
   * Analyze recent form
   */
  analyzeForm(stats) {
    const recentForm = stats.recentForm || '';
    const formArray = recentForm.slice(-5).split('');
    
    const formStats = {
      wins: formArray.filter(r => r === 'w').length,
      draws: formArray.filter(r => r === 'd').length,
      losses: formArray.filter(r => r === 'l').length
    };

    const formPoints = (formStats.wins * 3) + formStats.draws;
    const maxPoints = 15;
    const formPercentage = (formPoints / maxPoints) * 100;

    return {
      recent5: formArray.join('').toUpperCase(),
      formPercentage: Math.round(formPercentage),
      trend: formPercentage > 60 ? 'good' : formPercentage > 40 ? 'average' : 'poor'
    };
  }

  /**
   * Calculate statistical trends
   */
  calculateTrends(stats) {
    return {
      goalsScored: {
        home: stats.homeGoalsForPerMatch > stats.goalsForPerMatch ? 'better_at_home' : 'better_away',
        trend: stats.goalsForPerMatch > 1.5 ? 'high_scoring' : 'low_scoring'
      },
      goalsConceded: {
        home: stats.homeGoalsAgainstPerMatch < stats.goalsAgainstPerMatch ? 'stronger_at_home' : 'weaker_at_home',
        trend: stats.goalsAgainstPerMatch < 1 ? 'strong_defense' : 'weak_defense'
      },
      overall: {
        homeAdvantage: stats.homePointsPerGame > stats.awayPointsPerGame,
        consistency: this.calculateConsistency(stats)
      }
    };
  }

  /**
   * Calculate team consistency
   */
  calculateConsistency(stats) {
    if (!stats.totalMatches) return 'unknown';
    
    const drawRate = (stats.draws / stats.totalMatches) * 100;
    
    if (drawRate > 35) return 'very_consistent';
    if (drawRate > 25) return 'consistent';
    if (drawRate > 15) return 'average';
    return 'inconsistent';
  }

  /**
   * Extract key statistics for comparison
   */
  extractKeyStats(data) {
    const stats = data.statistics || {};
    
    return {
      pointsPerGame: parseFloat(stats.pointsPerGame) || 0,
      winPercentage: parseFloat(stats.winPercentage) || 0,
      goalsPerMatch: parseFloat(stats.goalsForPerMatch) || 0,
      goalsConcededPerMatch: parseFloat(stats.goalsAgainstPerMatch) || 0,
      cleanSheetPercentage: parseFloat(stats.cleanSheetPercentage) || 0,
      over25Percentage: parseFloat(stats.over25GoalsPercentage) || 0,
      performanceScore: stats.performanceScore || 0
    };
  }

  /**
   * Calculate advantages between two teams
   */
  calculateAdvantages(team1Data, team2Data) {
    const team1Stats = this.extractKeyStats(team1Data);
    const team2Stats = this.extractKeyStats(team2Data);
    
    const advantages = {
      team1: [],
      team2: [],
      neutral: []
    };

    // Compare each metric
    Object.keys(team1Stats).forEach(key => {
      const diff = team1Stats[key] - team2Stats[key];
      const percentDiff = team2Stats[key] > 0 ? (diff / team2Stats[key]) * 100 : 100;
      
      if (Math.abs(percentDiff) < 10) {
        advantages.neutral.push({
          metric: key,
          team1Value: team1Stats[key],
          team2Value: team2Stats[key]
        });
      } else if (diff > 0) {
        advantages.team1.push({
          metric: key,
          value: team1Stats[key],
          advantage: Math.abs(percentDiff)
        });
      } else {
        advantages.team2.push({
          metric: key,
          value: team2Stats[key],
          advantage: Math.abs(percentDiff)
        });
      }
    });

    return advantages;
  }
}

module.exports = new TeamServiceSimple(); // Singleton