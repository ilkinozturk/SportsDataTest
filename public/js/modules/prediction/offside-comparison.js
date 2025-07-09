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
   * @param {string} venue - 'home' or 'away'
   * @returns {Object} Extracted statistics
   */
  extractOffsideStats(team, venue) {
    const stats = team.stats || {};

    // Debug: Check what fields are available
    console.log(`[OffsideComparison] ${team.name} (${venue}) available fields:`, {
      venue: venue,
      homeOffsidesAvg: stats.homeOffsidesAvg,
      awayOffsidesAvg: stats.awayOffsidesAvg,
      homeOffsidesOver2_5: stats.homeOffsidesOver2_5,
      awayOffsidesOver2_5: stats.awayOffsidesOver2_5,
      homeOffsideOver25: stats.homeOffsideOver25,
      awayOffsideOver25: stats.awayOffsideOver25,
      'ALL OFFSIDE FIELDS': Object.keys(stats)
        .filter(k => k.toLowerCase().includes('offside'))
        .sort(),
    });

    // Get offside values with proper fallback logic
    let offsidePerMatch = 0;

    if (venue === 'home') {
      offsidePerMatch = parseFloat(
        stats.homeOffsidesAvg ||
          stats.homeMatchOffsidesAvg ||
          stats.homeOffsidePerMatch ||
          stats.offsidesAVG_home ||
          stats.offsidesTeamAVG_home ||
          stats.homeOffsidesPerMatch ||
          stats.homeOffsideAVG ||
          stats.offsidePerMatch ||
          stats.offsidesPerMatch ||
          stats.offsideAVG ||
          0
      );
    } else if (venue === 'away') {
      offsidePerMatch = parseFloat(
        stats.awayOffsidesAvg ||
          stats.awayMatchOffsidesAvg ||
          stats.awayOffsidePerMatch ||
          stats.offsidesAVG_away ||
          stats.offsidesTeamAVG_away ||
          stats.awayOffsidesPerMatch ||
          stats.awayOffsideAVG ||
          stats.offsidePerMatch ||
          stats.offsidesPerMatch ||
          stats.offsideAVG ||
          0
      );
    }

    // Get match total offsides over/under - Use venue-specific fields
    let over25Offsides = 0;
    let over35Offsides = 0;

    if (venue === 'home') {
      // For home, check all possible field names - API uses homeOffsideOver25 format
      over25Offsides = parseFloat(
        stats.homeOffsideOver25 ||
          stats.homeOffsidesOver2_5 ||
          stats.homeMatchOffsidesOver2_5 ||
          stats.over25OffsidesPercentage_home ||
          stats.over25OffsidesTeamPercentage_home ||
          stats.homeOffsidesOver25 ||
          stats.offsideOver25_home ||
          stats.offsidesOver25_home ||
          0
      );
      over35Offsides = parseFloat(
        stats.homeOffsideOver35 ||
          stats.homeOffsidesOver3_5 ||
          stats.homeMatchOffsidesOver3_5 ||
          stats.over35OffsidesPercentage_home ||
          stats.over35OffsidesTeamPercentage_home ||
          stats.homeOffsidesOver35 ||
          stats.offsideOver35_home ||
          stats.offsidesOver35_home ||
          0
      );
    } else if (venue === 'away') {
      // For away, check all possible field names - API uses awayOffsideOver25 format
      over25Offsides = parseFloat(
        stats.awayOffsideOver25 ||
          stats.awayOffsidesOver2_5 ||
          stats.awayMatchOffsidesOver2_5 ||
          stats.over25OffsidesPercentage_away ||
          stats.over25OffsidesTeamPercentage_away ||
          stats.awayOffsidesOver25 ||
          stats.offsideOver25_away ||
          stats.offsidesOver25_away ||
          0
      );
      over35Offsides = parseFloat(
        stats.awayOffsideOver35 ||
          stats.awayOffsidesOver3_5 ||
          stats.awayMatchOffsidesOver3_5 ||
          stats.over35OffsidesPercentage_away ||
          stats.over35OffsidesTeamPercentage_away ||
          stats.awayOffsidesOver35 ||
          stats.offsideOver35_away ||
          stats.offsidesOver35_away ||
          0
      );
    }

    // Debug: Log selected values
    console.log(`[OffsideComparison] ${team.name} (${venue}) selected values:`, {
      offsidePerMatch,
      over25Offsides,
      over35Offsides,
      source_field_over25: venue === 'home' ? stats.homeOffsideOver25 : stats.awayOffsideOver25,
      source_field_over35: venue === 'home' ? stats.homeOffsideOver35 : stats.awayOffsideOver35,
    });

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
