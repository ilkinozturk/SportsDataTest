/**
 * Goals Comparison Module
 * Calculates and displays goals comparison between teams
 * Uses venue-specific data (home team's home stats vs away team's away stats)
 */

import { TeamStatisticsExtractor } from '../../services/TeamStatisticsExtractor.js';

export class GoalsComparison {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.attachEventListeners();
  }

  attachEventListeners() {
    // Listen for team stats data
    this.eventBus.on('team-stats-loaded', teamData => {
      if (teamData && teamData.homeTeam && teamData.awayTeam) {
        const comparison = this.processGoalsComparison(teamData);
        this.eventBus.emit('goals-comparison-calculated', comparison);
      }
    });
  }

  /**
   * Process goals comparison data
   * @param {Object} teamData - Contains home and away team data
   * @returns {Object} Processed comparison data
   */
  processGoalsComparison(teamData) {
    const { homeTeam, awayTeam } = teamData;

    // Get raw team data (not just stats)
    const homeTeamRaw = this.getRawTeamData(homeTeam);
    const awayTeamRaw = this.getRawTeamData(awayTeam);

    // Use TeamStatisticsExtractor to extract data from raw API response
    const homeStats = this.extractGoalsStatsFromRaw(homeTeamRaw, 'home');
    const awayStats = this.extractGoalsStatsFromRaw(awayTeamRaw, 'away');

    return {
      homeTeam: {
        name: homeTeam.name,
        logo: homeTeam.logo,
        stats: homeStats,
      },
      awayTeam: {
        name: awayTeam.name,
        logo: awayTeam.logo,
        stats: awayStats,
      },
    };
  }

  /**
   * Get raw team data structure
   * @param {Object} team - Team data from team-stats-loaded event
   * @returns {Object} Raw team data structure
   */
  getRawTeamData(team) {
    // Return structure that matches API response
    return {
      statistics: team.stats || {},
      additional_info: team.additional_info || {},
    };
  }

  /**
   * Extract goals statistics from raw team data
   * @param {Object} rawTeamData - Raw team data
   * @param {string} venue - 'home' or 'away'
   * @returns {Object} Extracted statistics
   */
  extractGoalsStatsFromRaw(rawTeamData, venue) {
    // Use TeamStatisticsExtractor for data extraction
    const goalsStats = TeamStatisticsExtractor.extractGoalsScoredStats(rawTeamData, venue);
    const overPercentages = TeamStatisticsExtractor.extractScoredOverPercentages(
      rawTeamData,
      venue
    );
    const csFts = TeamStatisticsExtractor.extractCSandFTSPercentages(rawTeamData, venue);

    return {
      goalsPerMatch: goalsStats.goalsPerMatch,
      totalGoals: goalsStats.totalGoals,
      firstHalfAvg: goalsStats.firstHalfAvg,
      secondHalfAvg: goalsStats.secondHalfAvg,
      over05: parseInt(overPercentages.over05, 10),
      over15: parseInt(overPercentages.over15, 10),
      over25: parseInt(overPercentages.over25, 10),
      over35: parseInt(overPercentages.over35, 10),
      failedToScore: csFts.failedToScorePercentage,
    };
  }
}

export default GoalsComparison;
