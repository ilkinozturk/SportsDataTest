/**
 * Goals Conceded Comparison Module
 * Calculates and displays goals conceded comparison between teams
 * Uses venue-specific data (home team's home stats vs away team's away stats)
 */

import { TeamStatisticsExtractor } from '../../services/TeamStatisticsExtractor.js';

export class GoalsConcededComparison {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.attachEventListeners();
  }

  attachEventListeners() {
    // Listen for team stats data
    this.eventBus.on('team-stats-loaded', teamData => {
      if (teamData && teamData.homeTeam && teamData.awayTeam) {
        const comparison = this.processGoalsConcededComparison(teamData);
        this.eventBus.emit('goals-conceded-comparison-calculated', comparison);
      }
    });
  }

  /**
   * Process goals conceded comparison data
   * @param {Object} teamData - Contains home and away team data
   * @returns {Object} Processed comparison data
   */
  processGoalsConcededComparison(teamData) {
    const { homeTeam, awayTeam } = teamData;

    // Get raw team data (not just stats)
    const homeTeamRaw = this.getRawTeamData(homeTeam);
    const awayTeamRaw = this.getRawTeamData(awayTeam);

    // Use modular extraction
    const homeStats = this.extractGoalsConcededStatsFromRaw(homeTeamRaw, 'home');
    const awayStats = this.extractGoalsConcededStatsFromRaw(awayTeamRaw, 'away');

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
      additional_info: team.additional_info || {}
    };
  }

  /**
   * Extract goals conceded statistics from raw team data
   * @param {Object} rawTeamData - Raw team data
   * @param {string} venue - 'home' or 'away'
   * @returns {Object} Extracted statistics
   */
  extractGoalsConcededStatsFromRaw(rawTeamData, venue) {
    // Use TeamStatisticsExtractor for modular data extraction
    const concededStats = TeamStatisticsExtractor.extractGoalsConcededStats(rawTeamData, venue);
    const overPercentages = TeamStatisticsExtractor.extractConcededOverPercentages(rawTeamData, venue);
    const csFts = TeamStatisticsExtractor.extractCSandFTSPercentages(rawTeamData, venue);

    return {
      goalsConcededPerMatch: concededStats.goalsConcededPerMatch,
      totalGoalsConceded: concededStats.totalGoalsConceded,
      firstHalfConcededAvg: concededStats.firstHalfConcededAvg,
      secondHalfConcededAvg: concededStats.secondHalfConcededAvg,
      over05Conceded: parseInt(overPercentages.over05, 10),
      over15Conceded: parseInt(overPercentages.over15, 10),
      over25Conceded: parseInt(overPercentages.over25, 10),
      over35Conceded: parseInt(overPercentages.over35, 10),
      cleanSheetPercentage: csFts.cleanSheetPercentage,
    };
  }

}

export default GoalsConcededComparison;