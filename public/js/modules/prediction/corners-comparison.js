/**
 * Corners Comparison Module
 * Compares corner statistics between two teams
 */
class CornersComparison {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.initialize();
  }

  initialize() {
    this.eventBus.on('team-stats-loaded', teamData => {
      this.calculateCornersComparison(teamData);
    });
  }

  /**
   * Calculate corners comparison between teams
   * @param {Object} teamData - Contains homeTeam and awayTeam data
   */
  calculateCornersComparison(teamData) {
    if (!teamData.homeTeam || !teamData.awayTeam) {
      return;
    }

    const comparison = {
      homeTeam: {
        name: teamData.homeTeam.name,
        logo: teamData.homeTeam.logo,
        stats: this.extractCornersStats(teamData.homeTeam, 'home'),
      },
      awayTeam: {
        name: teamData.awayTeam.name,
        logo: teamData.awayTeam.logo,
        stats: this.extractCornersStats(teamData.awayTeam, 'away'),
      },
    };

    // Calculate averages
    comparison.averages = this.calculateAverages(
      comparison.homeTeam.stats,
      comparison.awayTeam.stats
    );

    // Emit the calculated comparison
    this.eventBus.emit('corners-comparison-calculated', comparison);
  }

  /**
   * Extract corner statistics from team data
   * @param {Object} team - Team data from team-stats-loaded event
   * @param {string} venue - 'home' or 'away'
   * @returns {Object} Extracted statistics
   */
  extractCornersStats(team, venue) {
    const stats = team.stats || {};

    // Check for corner fields (commented out to fix ESLint error)
    // const cornerFields = Object.keys(stats).filter(key => key.toLowerCase().includes('corner'));

    // Get corner earned values with proper fallback logic
    let cornersEarnedPerMatch = 0;
    let cornersAgainstPerMatch = 0;

    if (venue === 'home') {
      cornersEarnedPerMatch = parseFloat(
        stats.homeCornersForPerMatch || stats.cornersForPerMatch || 0
      );
      cornersAgainstPerMatch = parseFloat(
        stats.homeCornersAgainstPerMatch || stats.cornersAgainstPerMatch || 0
      );
    } else if (venue === 'away') {
      cornersEarnedPerMatch = parseFloat(
        stats.awayCornersForPerMatch || stats.cornersForPerMatch || 0
      );
      cornersAgainstPerMatch = parseFloat(
        stats.awayCornersAgainstPerMatch || stats.cornersAgainstPerMatch || 0
      );
    }

    return {
      // Corners per match statistics - use correct field names from match-details-data.js
      cornersEarnedPerMatch,
      cornersAgainstPerMatch,

      // Over corners for (team wins corners) - use simplified field names
      over25CornersFor: parseFloat(
        stats[`${venue}Over25CornersFor`] || stats.over25CornersFor || 0
      ),
      over35CornersFor: parseFloat(
        stats[`${venue}Over35CornersFor`] || stats.over35CornersFor || 0
      ),
      over45CornersFor: parseFloat(
        stats[`${venue}Over45CornersFor`] || stats.over45CornersFor || 0
      ),

      // Over corners against (opponent wins corners) - use simplified field names
      over25CornersAgainst: parseFloat(
        stats[`${venue}Over25CornersAgainst`] || stats.over25CornersAgainst || 0
      ),
      over35CornersAgainst: parseFloat(
        stats[`${venue}Over35CornersAgainst`] || stats.over35CornersAgainst || 0
      ),
      over45CornersAgainst: parseFloat(
        stats[`${venue}Over45CornersAgainst`] || stats.over45CornersAgainst || 0
      ),

      // Additional stats for context
      totalCornersFor: parseInt(stats[`${venue}CornersFor`] || stats.cornersFor || 0, 10),
      totalCornersAgainst: parseInt(stats[`${venue}CornersAgainst`] || stats.cornersAgainst || 0, 10),
      matchesPlayed: parseInt(stats.matchesPlayed || 1, 10),
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
      'cornersEarnedPerMatch',
      'cornersAgainstPerMatch',
      'over25CornersFor',
      'over35CornersFor',
      'over45CornersFor',
      'over25CornersAgainst',
      'over35CornersAgainst',
      'over45CornersAgainst',
    ];

    fields.forEach(field => {
      averages[field] = ((homeStats[field] + awayStats[field]) / 2).toFixed(1);
    });

    // Calculate expected total corners
    const homeExpectedCorners =
      (parseFloat(homeStats.cornersEarnedPerMatch) + parseFloat(awayStats.cornersAgainstPerMatch)) /
      2;
    const awayExpectedCorners =
      (parseFloat(awayStats.cornersEarnedPerMatch) + parseFloat(homeStats.cornersAgainstPerMatch)) /
      2;
    averages.totalCornersExpected = (homeExpectedCorners + awayExpectedCorners).toFixed(2);
    averages.homeExpectedCorners = homeExpectedCorners.toFixed(2);
    averages.awayExpectedCorners = awayExpectedCorners.toFixed(2);

    // Corners prediction strength
    if (averages.totalCornersExpected >= 11) {
      averages.cornersStrength = 'Çok Yüksek';
      averages.cornersClass = 'very-high';
    } else if (averages.totalCornersExpected >= 9) {
      averages.cornersStrength = 'Yüksek';
      averages.cornersClass = 'high';
    } else if (averages.totalCornersExpected >= 7) {
      averages.cornersStrength = 'Orta';
      averages.cornersClass = 'medium';
    } else {
      averages.cornersStrength = 'Düşük';
      averages.cornersClass = 'low';
    }

    return averages;
  }
}

export { CornersComparison };
