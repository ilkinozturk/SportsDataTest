/**
 * Over 2.5 & BTTS Comparison Module
 * Calculates and displays Over 2.5 goals and BTTS (Both Teams To Score) predictions
 * Uses venue-specific data (home team's home stats vs away team's away stats)
 */

export class OverBTTSComparison {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.attachEventListeners();
  }

  attachEventListeners() {
    // Listen for team stats data
    this.eventBus.on('team-stats-loaded', teamData => {
      if (teamData && teamData.homeTeam && teamData.awayTeam) {
        const comparison = this.processOverBTTSComparison(teamData);
        this.eventBus.emit('over-btts-comparison-calculated', comparison);
      }
    });
  }

  /**
   * Process Over 2.5 & BTTS comparison data
   * @param {Object} teamData - Contains home and away team data
   * @returns {Object} Processed comparison data
   */
  processOverBTTSComparison(teamData) {
    const { homeTeam, awayTeam } = teamData;

    // Extract stats directly from team data which already has processed statistics
    const homeStats = this.extractOverBTTSStats(homeTeam, 'home');
    const awayStats = this.extractOverBTTSStats(awayTeam, 'away');

    // Calculate combined predictions
    const predictions = this.calculatePredictions(homeStats, awayStats);

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
      predictions,
    };
  }

  /**
   * Extract Over 2.5 & BTTS statistics from team data
   * @param {Object} team - Team data from team-stats-loaded event
   * @param {string} venue - 'home' or 'away'
   * @returns {Object} Extracted statistics
   */
  extractOverBTTSStats(team, venue) {
    const stats = team.stats || {};
    const additionalInfo = team.additional_info || {};

    // Extract the already processed data based on venue
    let result = {};

    if (venue === 'home') {
      result = {
        // Over/Under statistics for matches (total goals)
        matchesPlayed: stats.homeMatchesPlayed || stats.matchesPlayed || 0,
        over15: parseInt(
          additionalInfo.over15Percentage_home ||
            stats.homeOver15Percentage ||
            stats.over15Percentage ||
            0,
          10
        ),
        over25: parseInt(
          additionalInfo.over25Percentage_home ||
            stats.homeOver25Percentage ||
            stats.over25Percentage ||
            0,
          10
        ),
        over35: parseInt(
          additionalInfo.over35Percentage_home ||
            stats.homeOver35Percentage ||
            stats.over35Percentage ||
            0,
          10
        ),

        // BTTS statistics
        bttsYes: parseInt(
          additionalInfo.btts_percentage_home ||
            stats.homeBTTSPercentage ||
            stats.bttsPercentage ||
            0,
          10
        ),
        bttsNo:
          100 -
          parseInt(
            additionalInfo.btts_percentage_home ||
              stats.homeBTTSPercentage ||
              stats.bttsPercentage ||
              0,
            10
          ),

        // Average goals in matches
        avgTotalGoals: parseFloat(
          (
            parseFloat(stats.homeGoalsPerMatch || stats.goalsPerMatch || 0) +
            parseFloat(stats.homeGoalsAgainstPerMatch || stats.goalsAgainstPerMatch || 0)
          ).toFixed(2)
        ),

        // Goals scored and conceded for insights
        goalsPerMatch: parseFloat(stats.homeGoalsPerMatch || stats.goalsPerMatch || 0),
        goalsConcededPerMatch: parseFloat(
          stats.homeGoalsAgainstPerMatch || stats.goalsAgainstPerMatch || 0
        ),
      };
    } else {
      result = {
        // Over/Under statistics for matches (total goals)
        matchesPlayed: stats.awayMatchesPlayed || stats.matchesPlayed || 0,
        over15: parseInt(
          additionalInfo.over15Percentage_away ||
            stats.awayOver15Percentage ||
            stats.over15Percentage ||
            0,
          10
        ),
        over25: parseInt(
          additionalInfo.over25Percentage_away ||
            stats.awayOver25Percentage ||
            stats.over25Percentage ||
            0,
          10
        ),
        over35: parseInt(
          additionalInfo.over35Percentage_away ||
            stats.awayOver35Percentage ||
            stats.over35Percentage ||
            0,
          10
        ),

        // BTTS statistics
        bttsYes: parseInt(
          additionalInfo.btts_percentage_away ||
            stats.awayBTTSPercentage ||
            stats.bttsPercentage ||
            0,
          10
        ),
        bttsNo:
          100 -
          parseInt(
            additionalInfo.btts_percentage_away ||
              stats.awayBTTSPercentage ||
              stats.bttsPercentage ||
              0,
            10
          ),

        // Average goals in matches
        avgTotalGoals: parseFloat(
          (
            parseFloat(stats.awayGoalsPerMatch || stats.goalsPerMatch || 0) +
            parseFloat(stats.awayGoalsAgainstPerMatch || stats.goalsAgainstPerMatch || 0)
          ).toFixed(2)
        ),

        // Goals scored and conceded for insights
        goalsPerMatch: parseFloat(stats.awayGoalsPerMatch || stats.goalsPerMatch || 0),
        goalsConcededPerMatch: parseFloat(
          stats.awayGoalsAgainstPerMatch || stats.goalsAgainstPerMatch || 0
        ),
      };
    }

    return result;
  }

  /**
   * Calculate combined predictions based on both teams' statistics
   * @param {Object} homeStats - Home team statistics
   * @param {Object} awayStats - Away team statistics
   * @returns {Object} Predictions and insights
   */
  calculatePredictions(homeStats, awayStats) {
    // Calculate combined Over 2.5 prediction
    const combinedOver25 = Math.round((homeStats.over25 + awayStats.over25) / 2);

    // Calculate combined BTTS prediction
    const combinedBTTS = Math.round((homeStats.bttsYes + awayStats.bttsYes) / 2);

    // Calculate expected total goals
    const expectedTotalGoals = (homeStats.avgTotalGoals + awayStats.avgTotalGoals) / 2;

    // Determine confidence levels
    const over25Confidence = this.calculateConfidence(homeStats.over25, awayStats.over25);
    const bttsConfidence = this.calculateConfidence(homeStats.bttsYes, awayStats.bttsYes);

    // Generate insights
    const insights = this.generateInsights(homeStats, awayStats, combinedOver25, combinedBTTS);

    return {
      over25: {
        percentage: combinedOver25,
        confidence: over25Confidence,
        homePercentage: homeStats.over25,
        awayPercentage: awayStats.over25,
        expectedGoals: expectedTotalGoals.toFixed(2),
      },
      btts: {
        percentage: combinedBTTS,
        confidence: bttsConfidence,
        homePercentage: homeStats.bttsYes,
        awayPercentage: awayStats.bttsYes,
      },
      insights,
    };
  }

  /**
   * Calculate confidence level based on consistency between teams
   * @param {number} homeValue - Home team value
   * @param {number} awayValue - Away team value
   * @returns {string} Confidence level (high/medium/low)
   */
  calculateConfidence(homeValue, awayValue) {
    const difference = Math.abs(homeValue - awayValue);

    if (difference <= 10) {
      return 'high';
    } else if (difference <= 20) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Generate insights based on statistics
   * @param {Object} homeStats - Home team statistics
   * @param {Object} awayStats - Away team statistics
   * @param {number} combinedOver25 - Combined Over 2.5 prediction
   * @param {number} combinedBTTS - Combined BTTS prediction
   * @returns {Array} Array of insight strings
   */
  generateInsights(homeStats, awayStats, combinedOver25, combinedBTTS) {
    const insights = [];

    // Over 2.5 insights
    if (combinedOver25 >= 70) {
      insights.push('Yüksek gollü maç beklentisi');
    } else if (combinedOver25 >= 50) {
      insights.push('Orta seviyede gol beklentisi');
    } else {
      insights.push('Düşük gollü maç olasılığı');
    }

    // BTTS insights
    if (combinedBTTS >= 70) {
      insights.push('Her iki takım da büyük olasılıkla gol atar');
    } else if (combinedBTTS >= 50) {
      insights.push('Karşılıklı gol ihtimali orta seviyede');
    } else {
      insights.push('Tek taraflı skor olasılığı yüksek');
    }

    // Team-specific insights
    if (homeStats.goalsPerMatch >= 2.0) {
      insights.push('Ev sahibi takım evinde güçlü hücum');
    }
    if (awayStats.goalsPerMatch >= 1.5) {
      insights.push('Deplasman takımı dışarıda gol buluyor');
    }

    // Defensive insights
    if (homeStats.goalsConcededPerMatch >= 1.5 && awayStats.goalsPerMatch >= 1.0) {
      insights.push('Ev sahibi savunması zayıf, BTTS olasılığı artıyor');
    }
    if (awayStats.goalsConcededPerMatch >= 1.5 && homeStats.goalsPerMatch >= 1.0) {
      insights.push('Deplasman savunması zayıf, yüksek skor olabilir');
    }

    return insights;
  }
}

export default OverBTTSComparison;
