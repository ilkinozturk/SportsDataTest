/**
 * Offside Comparison Module
 * Compares offside statistics between two teams
 */
class OffsideComparison {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.initialize();
  }

  initialize() {
    this.eventBus.on('team-stats-loaded', teamData => {
      this.calculateOffsideComparison(teamData);
    });
  }

  /**
   * Calculate offside comparison between teams
   * @param {Object} teamData - Contains homeTeam and awayTeam data
   */
  calculateOffsideComparison(teamData) {
    if (!teamData.homeTeam || !teamData.awayTeam) {
      return;
    }

    const comparison = {
      homeTeam: {
        name: teamData.homeTeam.name,
        logo: teamData.homeTeam.logo,
        stats: this.extractOffsideStats(teamData.homeTeam, 'home'),
      },
      awayTeam: {
        name: teamData.awayTeam.name,
        logo: teamData.awayTeam.logo,
        stats: this.extractOffsideStats(teamData.awayTeam, 'away'),
      },
    };

    // Calculate averages
    comparison.averages = this.calculateAverages(
      comparison.homeTeam.stats,
      comparison.awayTeam.stats
    );

    // Emit the calculated comparison
    this.eventBus.emit('offside-comparison-calculated', comparison);
  }

  /**
   * Extract offside statistics from team data
   * @param {Object} team - Team data from team-stats-loaded event
   * @param {string} venue - 'home' or 'away' - The team's role in THIS match
   * @returns {Object} Extracted statistics
   */
  extractOffsideStats(team, venue) {
    const stats = team.stats || {};

    // Get offside values based on team's role in THIS match
    let offsidePerMatch = 0;
    let over25Offsides = 0;
    let over35Offsides = 0;

    // Her takım için, bu maçtaki rolüne göre doğru istatistikleri kullan
    if (venue === 'home') {
      // This team is playing at home in THIS match, so use their HOME venue statistics
      offsidePerMatch = parseFloat(
        stats.homeOffsidesAvg || // Team's own offsides (from backend)
          stats.offsidesTeamAVG_home || // API field if available
          stats.homeOffsidePerMatch ||
          stats.homeOffsidesPerMatch ||
          stats.homeOffsideAVG ||
          stats.homeMatchOffsidesAvg || // Match total - fallback only
          stats.offsidesAVG_home || // Match total - fallback only
          0
      );

      // Use home venue-specific percentages
      over25Offsides = parseFloat(
        stats.over25OffsidesPercentage_home ||
          stats.homeOffsidesOver2_5 ||
          stats.homeMatchOffsidesOver2_5 ||
          stats.homeOffsideOver25 ||
          0
      );

      over35Offsides = parseFloat(
        stats.over35OffsidesPercentage_home ||
          stats.homeOffsidesOver3_5 ||
          stats.homeMatchOffsidesOver3_5 ||
          stats.homeOffsideOver35 ||
          0
      );
    } else if (venue === 'away') {
      // This team is playing away in THIS match, so use their AWAY venue statistics
      offsidePerMatch = parseFloat(
        stats.awayOffsidesAvg || // Team's own offsides (from backend)
          stats.offsidesTeamAVG_away || // API field if available
          stats.awayOffsidePerMatch ||
          stats.awayOffsidesPerMatch ||
          stats.awayOffsideAVG ||
          stats.awayMatchOffsidesAvg || // Match total - fallback only
          stats.offsidesAVG_away || // Match total - fallback only
          0
      );

      // Use away venue-specific percentages
      over25Offsides = parseFloat(
        stats.over25OffsidesPercentage_away ||
          stats.awayOffsidesOver2_5 ||
          stats.awayMatchOffsidesOver2_5 ||
          stats.awayOffsideOver25 ||
          0
      );

      over35Offsides = parseFloat(
        stats.over35OffsidesPercentage_away ||
          stats.awayOffsidesOver3_5 ||
          stats.awayMatchOffsidesOver3_5 ||
          stats.awayOffsideOver35 ||
          0
      );
    }

    return {
      // Offside per match statistics
      offsidePerMatch,

      // Match total offsides over/under
      over25Offsides,
      over35Offsides,

      // Additional stats for context
      totalOffsides: parseInt(
        stats[`${venue}TotalOffsides`] ||
          stats[`${venue}TotalOffside`] ||
          stats[`${venue}Offsides`] ||
          stats.totalOffsides ||
          stats.totalOffside ||
          0,
        10
      ),
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
    const fields = ['offsidePerMatch', 'over25Offsides', 'over35Offsides'];

    fields.forEach(field => {
      averages[field] = ((homeStats[field] + awayStats[field]) / 2).toFixed(1);
    });

    // Calculate expected total offsides
    const totalOffsidesExpected = (
      parseFloat(homeStats.offsidePerMatch) + parseFloat(awayStats.offsidePerMatch)
    ).toFixed(2);
    averages.totalOffsidesExpected = totalOffsidesExpected;
    averages.homeExpectedOffsides = homeStats.offsidePerMatch.toFixed(2);
    averages.awayExpectedOffsides = awayStats.offsidePerMatch.toFixed(2);

    // Offside prediction strength
    if (averages.totalOffsidesExpected >= 5.0) {
      averages.offsideStrength = 'Çok Yüksek';
      averages.offsideClass = 'very-high';
    } else if (averages.totalOffsidesExpected >= 3.5) {
      averages.offsideStrength = 'Yüksek';
      averages.offsideClass = 'high';
    } else if (averages.totalOffsidesExpected >= 2.0) {
      averages.offsideStrength = 'Orta';
      averages.offsideClass = 'medium';
    } else {
      averages.offsideStrength = 'Düşük';
      averages.offsideClass = 'low';
    }

    return averages;
  }
}

export { OffsideComparison };
