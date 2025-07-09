/**
 * Over 2.5 & BTTS Comparison Module
 * Compares Over 2.5 and BTTS statistics between two teams
 */
class OverBTTSComparison {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.initialize();
  }

  initialize() {
    this.eventBus.on('team-stats-loaded', teamData => {
      this.calculateOverBTTSComparison(teamData);
    });
  }

  /**
   * Calculate Over 2.5 & BTTS comparison between teams
   * @param {Object} teamData - Contains homeTeam and awayTeam data
   */
  calculateOverBTTSComparison(teamData) {
    if (!teamData.homeTeam || !teamData.awayTeam) {
      return;
    }

    const comparison = {
      homeTeam: {
        name: teamData.homeTeam.name,
        logo: teamData.homeTeam.logo,
        stats: this.extractOverBTTSStats(teamData.homeTeam, 'home'),
      },
      awayTeam: {
        name: teamData.awayTeam.name,
        logo: teamData.awayTeam.logo,
        stats: this.extractOverBTTSStats(teamData.awayTeam, 'away'),
      },
    };

    // Calculate averages
    comparison.averages = this.calculateAverages(
      comparison.homeTeam.stats,
      comparison.awayTeam.stats
    );

    // Emit the calculated comparison
    this.eventBus.emit('over-btts-comparison-calculated', comparison);
  }

  /**
   * Extract Over & BTTS statistics from team data
   * @param {Object} team - Team data from team-stats-loaded event
   * @param {string} venue - 'home' or 'away'
   * @returns {Object} Extracted statistics
   */
  extractOverBTTSStats(team, venue) {
    const stats = team.stats || {};

    // Extract venue-specific stats
    const venuePrefix = venue === 'home' ? 'home' : 'away';

    return {
      // Over statistics
      over05: parseFloat(stats[`${venuePrefix}Over05`] || stats.over05 || 0),
      over15: parseFloat(stats[`${venuePrefix}Over15`] || stats.over15 || 0),
      over25: parseFloat(stats[`${venuePrefix}Over25`] || stats.over25 || 0),
      over35: parseFloat(stats[`${venuePrefix}Over35`] || stats.over35 || 0),
      over45: parseFloat(stats[`${venuePrefix}Over45`] || stats.over45 || 0),

      // BTTS statistics
      btts: parseFloat(
        stats[`seasonBTTSPercentage_${venue}`] ||
          stats[`${venuePrefix}BTTSPercentage`] ||
          stats.btts ||
          0
      ),
      bttsWin: parseFloat(
        stats[`BTTS_and_win_percentage_${venue}`] ||
          stats[`${venuePrefix}BTTSWin`] ||
          stats.bttsWin ||
          0
      ),
      bttsDraw: parseFloat(
        stats[`BTTS_and_draw_percentage_${venue}`] ||
          stats[`${venuePrefix}BTTSDraw`] ||
          stats.bttsDraw ||
          0
      ),
      bttsOver25: parseFloat(
        stats[`BTTS_and_over_2_5_percentage_${venue}`] ||
          stats[`over25_and_btts_percentage_${venue}`] ||
          stats[`${venuePrefix}BTTSAndOver25`] ||
          stats.bttsAndOver25 ||
          0
      ),
      bttsNoOver25: parseFloat(
        stats[`BTTS_no_and_over_2_5_percentage_${venue}`] ||
          stats[`over25_and_no_btts_percentage_${venue}`] ||
          stats[`${venuePrefix}BTTSNoAndOver25`] ||
          stats.bttsNoAndOver25 ||
          0
      ),

      // Additional stats for context
      goalsPerMatch: parseFloat(stats[`${venuePrefix}GoalsPerMatch`] || stats.goalsPerMatch || 0),
      concededPerMatch: parseFloat(
        stats[`${venuePrefix}ConcededPerMatch`] ||
          stats[`${venuePrefix}GoalsAgainstPerMatch`] ||
          stats.concededPerMatch ||
          0
      ),
      cleanSheetPercentage: parseFloat(
        stats[`${venuePrefix}CleanSheetPercentage`] || stats.cleanSheetPercentage || 0
      ),
      failedToScore: parseFloat(
        stats[`${venuePrefix}FailedToScorePercentage`] || stats.failedToScore || 0
      ),
    };
  }

  /**
   * Calculate average values between home and away teams
   * @param {Object} homeStats - Home team statistics
   * @param {Object} awayStats - Away team statistics
   * @returns {Object} Average statistics
   */
  calculateAverages(homeStats, awayStats) {
    const averages = {};

    // Calculate averages for all statistical fields
    const fields = [
      'over05',
      'over15',
      'over25',
      'over35',
      'over45',
      'btts',
      'bttsWin',
      'bttsDraw',
      'bttsOver25',
      'bttsNoOver25',
    ];

    fields.forEach(field => {
      averages[field] = ((homeStats[field] + awayStats[field]) / 2).toFixed(1);
    });

    // Calculate combined metrics
    // Expected goals considers both offensive and defensive capabilities
    // Home team expected goals = (Home goals per match + Away conceded per match) / 2
    // Away team expected goals = (Away goals per match + Home conceded per match) / 2
    const homeExpectedGoals =
      (parseFloat(homeStats.goalsPerMatch) + parseFloat(awayStats.concededPerMatch)) / 2;
    const awayExpectedGoals =
      (parseFloat(awayStats.goalsPerMatch) + parseFloat(homeStats.concededPerMatch)) / 2;
    averages.totalGoalsExpected = (homeExpectedGoals + awayExpectedGoals).toFixed(2);
    averages.homeExpectedGoals = homeExpectedGoals.toFixed(2);
    averages.awayExpectedGoals = awayExpectedGoals.toFixed(2);
    // BTTS likelihood calculation - using actual BTTS stats
    // If BTTS stats are available, use them. Otherwise calculate from failed to score percentages
    if (homeStats.btts > 0 && awayStats.btts > 0) {
      averages.bothTeamsLikelyToScore = averages.btts; // Use the already calculated BTTS average
    } else {
      // Calculate based on probability both teams will score
      const homeScoringProb = 100 - homeStats.failedToScore;
      const awayScoringProb = 100 - awayStats.failedToScore;
      averages.bothTeamsLikelyToScore = ((homeScoringProb * awayScoringProb) / 100).toFixed(1);
    }

    // Over 2.5 prediction strength
    if (averages.over25 >= 70) {
      averages.over25Strength = 'Çok Yüksek';
      averages.over25Class = 'very-high';
    } else if (averages.over25 >= 55) {
      averages.over25Strength = 'Yüksek';
      averages.over25Class = 'high';
    } else if (averages.over25 >= 45) {
      averages.over25Strength = 'Orta';
      averages.over25Class = 'medium';
    } else {
      averages.over25Strength = 'Düşük';
      averages.over25Class = 'low';
    }

    // BTTS prediction strength
    if (averages.btts >= 65) {
      averages.bttsStrength = 'Çok Yüksek';
      averages.bttsClass = 'very-high';
    } else if (averages.btts >= 50) {
      averages.bttsStrength = 'Yüksek';
      averages.bttsClass = 'high';
    } else if (averages.btts >= 40) {
      averages.bttsStrength = 'Orta';
      averages.bttsClass = 'medium';
    } else {
      averages.bttsStrength = 'Düşük';
      averages.bttsClass = 'low';
    }

    return averages;
  }
}

export { OverBTTSComparison };
