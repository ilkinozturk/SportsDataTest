/**
 * Goals Comparison Module
 * Calculates and displays goals comparison between teams
 * Uses venue-specific data (home team's home stats vs away team's away stats)
 */

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


    // Extract statistics from API response
    const homeStats = this.extractGoalsStats(homeTeam, 'home');
    const awayStats = this.extractGoalsStats(awayTeam, 'away');

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
   * Extract goals statistics for a team
   * @param {Object} team - Team data object
   * @param {string} venue - 'home' or 'away'
   * @returns {Object} Extracted statistics
   */
  extractGoalsStats(team, venue) {
    const stats = team.stats || {};


    // Get venue-specific data
    const goalsPerMatch =
      venue === 'home'
        ? stats.homeGoalsPerMatch || stats.goalsPerMatch || 0
        : stats.awayGoalsPerMatch || stats.goalsPerMatch || 0;

    const totalGoals =
      venue === 'home'
        ? stats.homeGoalsScored || stats.goalsScored || 0
        : stats.awayGoalsScored || stats.goalsScored || 0;

    // Extract first half and second half data from stats (already processed in match-details-data.js)
    const firstHalfAvg = this.extractHalfTimeAverage(stats, venue, 'first');
    const secondHalfAvg = this.extractHalfTimeAverage(stats, venue, 'second');


    // Extract over/under percentages from stats
    const overUnder = this.extractOverUnderStats(stats, venue);

    // Extract failed to score percentage
    const failedToScore =
      venue === 'home'
        ? stats.homeFailedToScorePercentage || stats.failedToScorePercentage || 0
        : stats.awayFailedToScorePercentage || stats.failedToScorePercentage || 0;

    return {
      goalsPerMatch: parseFloat(goalsPerMatch).toFixed(2),
      totalGoals: parseInt(totalGoals, 10),
      firstHalfAvg: firstHalfAvg,
      secondHalfAvg: secondHalfAvg,
      over05: overUnder.over05,
      over15: overUnder.over15,
      over25: overUnder.over25,
      over35: overUnder.over35,
      failedToScore: parseFloat(failedToScore).toFixed(0),
    };
  }

  /**
   * Extract half-time average goals
   * @param {Object} stats - Processed statistics from match-details-data.js
   * @param {string} venue - 'home' or 'away'
   * @param {string} half - 'first' or 'second'
   * @returns {string} Average goals
   */
  extractHalfTimeAverage(stats, venue, half) {
    let avg = 0;

    if (half === 'first') {
      // First half goals average - these fields are already extracted in match-details-data.js
      if (venue === 'home') {
        avg =
          stats.scoredAVGHT_home ||
          stats.firstHalfGoalsAVG_home ||
          stats.scoredAVGHT_overall ||
          stats.firstHalfGoalsAVG_overall ||
          0;
      } else {
        avg =
          stats.scoredAVGHT_away ||
          stats.firstHalfGoalsAVG_away ||
          stats.scoredAVGHT_overall ||
          stats.firstHalfGoalsAVG_overall ||
          0;
      }
    } else {
      // Second half goals average - these fields are already extracted in match-details-data.js
      if (venue === 'home') {
        avg =
          stats.scored_2hg_avg_home ||
          stats.secondHalfGoalsAVG_home ||
          stats.scoredAVG2H_home ||
          stats.scored_2hg_avg_overall ||
          stats.secondHalfGoalsAVG_overall ||
          stats.scoredAVG2H_overall ||
          0;
      } else {
        avg =
          stats.scored_2hg_avg_away ||
          stats.secondHalfGoalsAVG_away ||
          stats.scoredAVG2H_away ||
          stats.scored_2hg_avg_overall ||
          stats.secondHalfGoalsAVG_overall ||
          stats.scoredAVG2H_overall ||
          0;
      }
    }

    return parseFloat(avg).toFixed(2);
  }

  /**
   * Extract over/under statistics
   * @param {Object} stats - Processed statistics from match-details-data.js
   * @param {string} venue - 'home' or 'away'
   * @returns {Object} Over/under percentages
   */
  extractOverUnderStats(stats, venue) {
    const result = {
      over05: 0,
      over15: 0,
      over25: 0,
      over35: 0,
    };


    if (venue === 'home') {
      // CRITICAL FIX: Use TEAM SCORED over/under percentages ONLY (not match over/under)
      // For a home team, we want their HOME venue-specific SCORED statistics
      result.over05 = stats.homeScoredOver05Percentage || stats.seasonScoredOver05Percentage_home || 0;
      result.over15 = stats.homeScoredOver15Percentage || stats.seasonScoredOver15Percentage_home || 0;
      result.over25 = stats.homeScoredOver25Percentage || stats.seasonScoredOver25Percentage_home || 0;
      result.over35 = stats.homeScoredOver35Percentage || stats.seasonScoredOver35Percentage_home || 0;
    } else {
      // CRITICAL FIX: Use TEAM SCORED over/under percentages ONLY (not match over/under)
      // For an away team, we want their AWAY venue-specific SCORED statistics
      result.over05 = stats.awayScoredOver05Percentage || stats.seasonScoredOver05Percentage_away || 0;
      result.over15 = stats.awayScoredOver15Percentage || stats.seasonScoredOver15Percentage_away || 0;
      result.over25 = stats.awayScoredOver25Percentage || stats.seasonScoredOver25Percentage_away || 0;
      result.over35 = stats.awayScoredOver35Percentage || stats.seasonScoredOver35Percentage_away || 0;
    }

    // Convert to integers
    Object.keys(result).forEach(key => {
      result[key] = parseInt(result[key], 10);
    });

    return result;
  }
}

export default GoalsComparison;
