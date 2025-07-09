/**
 * Goals Conceded Comparison Module
 * Calculates and displays goals conceded comparison between teams
 * Uses venue-specific data (home team's home stats vs away team's away stats)
 */

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

    // Extract stats directly from team data which already has processed statistics
    const homeStats = this.extractGoalsConcededStatsFromTeam(homeTeam, 'home');
    const awayStats = this.extractGoalsConcededStatsFromTeam(awayTeam, 'away');

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
   * Extract goals conceded statistics directly from team data
   * @param {Object} team - Team data from team-stats-loaded event
   * @param {string} venue - 'home' or 'away'
   * @returns {Object} Extracted statistics
   */
  extractGoalsConcededStatsFromTeam(team, venue) {
    const stats = team.stats || {};

    // Extract the already processed data based on venue
    let result = {};

    if (venue === 'home') {
      result = {
        concededPerMatch:
          stats.homeConcededPerMatch ||
          stats.homeGoalsAgainstPerMatch ||
          stats.concededPerMatch ||
          stats.goalsAgainstPerMatch ||
          '0.00',
        goalsAgainstPerMatch:
          stats.homeGoalsAgainstPerMatch || stats.goalsAgainstPerMatch || '0.00',
        totalGoalsConceded:
          stats.homeGoalsConceded || stats.totalGoalsConceded || stats.goalsConceded || 0,
        firstHalfConcededAvg:
          stats.homeFirstHalfConcededAvg || stats.firstHalfConcededAvg || '0.00',
        secondHalfConcededAvg:
          stats.homeSecondHalfConcededAvg || stats.secondHalfConcededAvg || '0.00',
        over05Conceded: parseInt(stats.homeOver05Conceded || stats.over05Conceded || 0, 10),
        over15Conceded: parseInt(stats.homeOver15Conceded || stats.over15Conceded || 0, 10),
        over25Conceded: parseInt(stats.homeOver25Conceded || stats.over25Conceded || 0, 10),
        over35Conceded: parseInt(stats.homeOver35Conceded || stats.over35Conceded || 0, 10),
        cleanSheetPercentage: stats.homeCleanSheetPercentage || stats.cleanSheetPercentage || '0',
        firstHalfCleanSheet:
          stats.homeFirstHalfCleanSheet || stats.firstHalfCleanSheetPercentage_home || '0',
        secondHalfCleanSheet:
          stats.homeSecondHalfCleanSheet || stats.secondHalfCleanSheetPercentage_home || '0',
      };
    } else {
      result = {
        concededPerMatch:
          stats.awayConcededPerMatch ||
          stats.awayGoalsAgainstPerMatch ||
          stats.concededPerMatch ||
          stats.goalsAgainstPerMatch ||
          '0.00',
        goalsAgainstPerMatch:
          stats.awayGoalsAgainstPerMatch || stats.goalsAgainstPerMatch || '0.00',
        totalGoalsConceded:
          stats.awayGoalsConceded || stats.totalGoalsConceded || stats.goalsConceded || 0,
        firstHalfConcededAvg:
          stats.awayFirstHalfConcededAvg || stats.firstHalfConcededAvg || '0.00',
        secondHalfConcededAvg:
          stats.awaySecondHalfConcededAvg || stats.secondHalfConcededAvg || '0.00',
        over05Conceded: parseInt(stats.awayOver05Conceded || stats.over05Conceded || 0, 10),
        over15Conceded: parseInt(stats.awayOver15Conceded || stats.over15Conceded || 0, 10),
        over25Conceded: parseInt(stats.awayOver25Conceded || stats.over25Conceded || 0, 10),
        over35Conceded: parseInt(stats.awayOver35Conceded || stats.over35Conceded || 0, 10),
        cleanSheetPercentage: stats.awayCleanSheetPercentage || stats.cleanSheetPercentage || '0',
        firstHalfCleanSheet:
          stats.awayFirstHalfCleanSheet || stats.firstHalfCleanSheetPercentage_away || '0',
        secondHalfCleanSheet:
          stats.awaySecondHalfCleanSheet || stats.secondHalfCleanSheetPercentage_away || '0',
      };
    }

    return result;
  }
}

export default GoalsConcededComparison;
