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

    // Debug: Check what fields are available
    console.log(`[OffsideComparison] ${team.name} (${venue} in this match) available fields:`, {
      venue: venue,
      critical_fields: {
        'stats.over25OffsidesPercentage_home': stats.over25OffsidesPercentage_home,
        'stats.over25OffsidesPercentage_away': stats.over25OffsidesPercentage_away,
        'stats.over35OffsidesPercentage_home': stats.over35OffsidesPercentage_home,
        'stats.over35OffsidesPercentage_away': stats.over35OffsidesPercentage_away,
        'stats.homeOffsideOver25': stats.homeOffsideOver25,
        'stats.awayOffsideOver25': stats.awayOffsideOver25,
        'stats.homeOffsideOver35': stats.homeOffsideOver35,
        'stats.awayOffsideOver35': stats.awayOffsideOver35,
      },
      average_fields: {
        homeOffsidePerMatch: stats.homeOffsidePerMatch,
        awayOffsidePerMatch: stats.awayOffsidePerMatch,
        homeOffsidesAvg: stats.homeOffsidesAvg,
        awayOffsidesAvg: stats.awayOffsidesAvg,
        offsidesAvg: stats.offsidesAvg,
        matchOffsidesAvg: stats.matchOffsidesAvg,
      },
      'ALL OFFSIDE FIELDS': Object.keys(stats)
        .filter(k => k.toLowerCase().includes('offside'))
        .sort(),
    });

    // Get offside values based on team's role in THIS match
    let offsidePerMatch = 0;
    let over25Offsides = 0;
    let over35Offsides = 0;

    // Her takım için, bu maçtaki rolüne göre doğru istatistikleri kullan
    if (venue === 'home') {
      // This team is playing at home in THIS match, so use their HOME venue statistics
      offsidePerMatch = parseFloat(
        stats.homeOffsidePerMatch ||
          stats.homeOffsidesAvg ||
          stats.homeMatchOffsidesAvg ||
          stats.offsidesTeamAVG_home ||
          stats.offsidesAVG_home ||
          stats.homeOffsidesPerMatch ||
          stats.homeOffsideAVG ||
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
        stats.awayOffsidePerMatch ||
          stats.awayOffsidesAvg ||
          stats.awayMatchOffsidesAvg ||
          stats.offsidesTeamAVG_away ||
          stats.offsidesAVG_away ||
          stats.awayOffsidesPerMatch ||
          stats.awayOffsideAVG ||
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

    // Validate logic: Over 3.5 cannot be higher than Over 2.5
    if (over35Offsides > over25Offsides) {
      console.warn(`[OffsideComparison] DATA LOGIC ERROR for ${team.name}:`, {
        over25Offsides,
        over35Offsides,
        error: 'Over 3.5 percentage cannot be higher than Over 2.5 percentage!',
        possibleCause: 'API data might be incorrect or fields might be swapped',
      });

      // Swap values if they appear to be reversed
      // const temp = over25Offsides;
      // over25Offsides = over35Offsides;
      // over35Offsides = temp;
    }

    // Debug: Log selected values
    console.log(`[OffsideComparison] ${team.name} (${venue}) FINAL selected values:`, {
      venue_role: venue,
      selected_values: {
        offsidePerMatch,
        over25Offsides,
        over35Offsides,
      },
      logic_check: {
        if_home_should_use: {
          over25OffsidesPercentage_home: stats.over25OffsidesPercentage_home,
          over35OffsidesPercentage_home: stats.over35OffsidesPercentage_home,
        },
        if_away_should_use: {
          over25OffsidesPercentage_away: stats.over25OffsidesPercentage_away,
          over35OffsidesPercentage_away: stats.over35OffsidesPercentage_away,
        },
        what_was_selected: {
          over25: venue === 'home' ? 'home percentages' : 'away percentages',
          over35: venue === 'home' ? 'home percentages' : 'away percentages',
        },
      },
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
