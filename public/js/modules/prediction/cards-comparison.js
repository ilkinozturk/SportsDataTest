/**
 * Cards Comparison Module
 * Compares card statistics between two teams
 */
class CardsComparison {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.initialize();
  }

  initialize() {
    this.eventBus.on('team-stats-loaded', teamData => {
      this.calculateCardsComparison(teamData);
    });
  }

  /**
   * Calculate cards comparison between teams
   * @param {Object} teamData - Contains homeTeam and awayTeam data
   */
  calculateCardsComparison(teamData) {
    if (!teamData.homeTeam || !teamData.awayTeam) {
      return;
    }

    const comparison = {
      homeTeam: {
        name: teamData.homeTeam.name,
        logo: teamData.homeTeam.logo,
        stats: this.extractCardsStats(teamData.homeTeam, 'home'),
      },
      awayTeam: {
        name: teamData.awayTeam.name,
        logo: teamData.awayTeam.logo,
        stats: this.extractCardsStats(teamData.awayTeam, 'away'),
      },
    };

    // Calculate averages
    comparison.averages = this.calculateAverages(
      comparison.homeTeam.stats,
      comparison.awayTeam.stats
    );

    // Emit the calculated comparison
    this.eventBus.emit('cards-comparison-calculated', comparison);
  }

  /**
   * Extract card statistics from team data
   * @param {Object} team - Team data from team-stats-loaded event
   * @param {string} venue - 'home' or 'away'
   * @returns {Object} Extracted statistics
   */
  extractCardsStats(team, venue) {
    const stats = team.stats || {};

    // Debug: Check what fields are available
    console.log(`[CardsComparison] ${team.name} (${venue}) available fields:`, {
      over25CardsPercentage_home: stats.over25CardsPercentage_home,
      over25CardsPercentage_away: stats.over25CardsPercentage_away,
      over25CardsPercentage_overall: stats.over25CardsPercentage_overall,
      cardsOver25_home: stats.cardsOver25_home,
      cardsOver25_away: stats.cardsOver25_away,
      'ALL CARD FIELDS': Object.keys(stats)
        .filter(k => k.toLowerCase().includes('card'))
        .sort(),
    });

    // Get card values with proper fallback logic
    let cardsPerMatch = 0;
    let cardsAgainstPerMatch = 0;

    if (venue === 'home') {
      cardsPerMatch = parseFloat(
        stats.homeCardsPerMatch || stats.homeCardsAVG || stats.cardsPerMatch || stats.cardsAVG || 0
      );
      cardsAgainstPerMatch = parseFloat(
        stats.homeCardsAgainstPerMatch ||
          stats.homeCardsAgainstAVG ||
          stats.cardsAgainstPerMatch ||
          stats.cardsAgainstAVG ||
          0
      );
    } else if (venue === 'away') {
      cardsPerMatch = parseFloat(
        stats.awayCardsPerMatch || stats.awayCardsAVG || stats.cardsPerMatch || stats.cardsAVG || 0
      );
      cardsAgainstPerMatch = parseFloat(
        stats.awayCardsAgainstPerMatch ||
          stats.awayCardsAgainstAVG ||
          stats.cardsAgainstPerMatch ||
          stats.cardsAgainstAVG ||
          0
      );
    }

    // Get match total cards over/under - Use venue-specific fields
    let over15Cards = 0;
    let over25Cards = 0;
    let over35Cards = 0;
    let over45Cards = 0;
    let over55Cards = 0;
    let over65Cards = 0;

    if (venue === 'home') {
      // For home, check all possible field names
      over15Cards = parseFloat(
        stats.homeCardsOver15 || stats.cardsOver15_home || stats.over15CardsPercentage_home || 0
      );
      over25Cards = parseFloat(
        stats.homeCardsOver25 || stats.cardsOver25_home || stats.over25CardsPercentage_home || 0
      );
      over35Cards = parseFloat(
        stats.homeCardsOver35 || stats.cardsOver35_home || stats.over35CardsPercentage_home || 0
      );
      over45Cards = parseFloat(
        stats.homeCardsOver45 || stats.cardsOver45_home || stats.over45CardsPercentage_home || 0
      );
      over55Cards = parseFloat(
        stats.homeCardsOver55 || stats.cardsOver55_home || stats.over55CardsPercentage_home || 0
      );
      over65Cards = parseFloat(
        stats.homeCardsOver65 || stats.cardsOver65_home || stats.over65CardsPercentage_home || 0
      );
    } else if (venue === 'away') {
      // For away, check all possible field names
      over15Cards = parseFloat(
        stats.awayCardsOver15 || stats.cardsOver15_away || stats.over15CardsPercentage_away || 0
      );
      over25Cards = parseFloat(
        stats.awayCardsOver25 || stats.cardsOver25_away || stats.over25CardsPercentage_away || 0
      );
      over35Cards = parseFloat(
        stats.awayCardsOver35 || stats.cardsOver35_away || stats.over35CardsPercentage_away || 0
      );
      over45Cards = parseFloat(
        stats.awayCardsOver45 || stats.cardsOver45_away || stats.over45CardsPercentage_away || 0
      );
      over55Cards = parseFloat(
        stats.awayCardsOver55 || stats.cardsOver55_away || stats.over55CardsPercentage_away || 0
      );
      over65Cards = parseFloat(
        stats.awayCardsOver65 || stats.cardsOver65_away || stats.over65CardsPercentage_away || 0
      );

      // Debug: Log away values specifically
      console.log(`[CardsComparison] ${team.name} AWAY card values:`, {
        over25CardsPercentage_away: stats.over25CardsPercentage_away,
        over35CardsPercentage_away: stats.over35CardsPercentage_away,
        over45CardsPercentage_away: stats.over45CardsPercentage_away,
        final_over25Cards: over25Cards,
        final_over35Cards: over35Cards,
      });
    }

    return {
      // Cards per match statistics
      cardsPerMatch,
      cardsAgainstPerMatch,

      // Match total cards over/under - Use cardsOver fields for match totals
      over15CardsFor: over15Cards,
      over25CardsFor: over25Cards,
      over35CardsFor: over35Cards,
      over45CardsFor: over45Cards,
      over55CardsFor: over55Cards,
      over65CardsFor: over65Cards,

      // Over cards against (opponent gets cards)
      over15CardsAgainst: parseFloat(
        stats[`${venue}Over15CardsAgainst`] ||
          stats[`over15CardsAgainstPercentage_${venue}`] ||
          stats.over15CardsAgainstPercentage_overall ||
          stats.over15CardsAgainst ||
          stats.over15CardsAgainstPercentage ||
          0
      ),
      over25CardsAgainst: parseFloat(
        stats[`${venue}Over25CardsAgainst`] ||
          stats[`over25CardsAgainstPercentage_${venue}`] ||
          stats.over25CardsAgainstPercentage_overall ||
          stats.over25CardsAgainst ||
          stats.over25CardsAgainstPercentage ||
          0
      ),
      over35CardsAgainst: parseFloat(
        stats[`${venue}Over35CardsAgainst`] ||
          stats[`over35CardsAgainstPercentage_${venue}`] ||
          stats.over35CardsAgainstPercentage_overall ||
          stats.over35CardsAgainst ||
          stats.over35CardsAgainstPercentage ||
          0
      ),
      over45CardsAgainst: parseFloat(
        stats[`${venue}Over45CardsAgainst`] ||
          stats[`over45CardsAgainstPercentage_${venue}`] ||
          stats.over45CardsAgainstPercentage_overall ||
          stats.over45CardsAgainst ||
          stats.over45CardsAgainstPercentage ||
          0
      ),
      over55CardsAgainst: parseFloat(
        stats[`${venue}Over55CardsAgainst`] ||
          stats[`over55CardsAgainstPercentage_${venue}`] ||
          stats.over55CardsAgainstPercentage_overall ||
          stats.over55CardsAgainst ||
          stats.over55CardsAgainstPercentage ||
          0
      ),
      over65CardsAgainst: parseFloat(
        stats[`${venue}Over65CardsAgainst`] ||
          stats[`over65CardsAgainstPercentage_${venue}`] ||
          stats.over65CardsAgainstPercentage_overall ||
          stats.over65CardsAgainst ||
          stats.over65CardsAgainstPercentage ||
          0
      ),

      // Additional stats for context
      totalCardsFor: parseInt(
        stats[`${venue}CardsFor`] || stats.cardsFor || stats.totalCards || 0,
        10
      ),
      totalCardsAgainst: parseInt(stats[`${venue}CardsAgainst`] || stats.cardsAgainst || 0, 10),
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
      'cardsPerMatch',
      'cardsAgainstPerMatch',
      'over15CardsFor',
      'over25CardsFor',
      'over35CardsFor',
      'over45CardsFor',
      'over55CardsFor',
      'over65CardsFor',
      'over15CardsAgainst',
      'over25CardsAgainst',
      'over35CardsAgainst',
      'over45CardsAgainst',
      'over55CardsAgainst',
      'over65CardsAgainst',
    ];

    fields.forEach(field => {
      averages[field] = ((homeStats[field] + awayStats[field]) / 2).toFixed(1);
    });

    // Calculate expected total cards
    const homeExpectedCards =
      (parseFloat(homeStats.cardsPerMatch) + parseFloat(awayStats.cardsAgainstPerMatch)) / 2;
    const awayExpectedCards =
      (parseFloat(awayStats.cardsPerMatch) + parseFloat(homeStats.cardsAgainstPerMatch)) / 2;
    averages.totalCardsExpected = (homeExpectedCards + awayExpectedCards).toFixed(2);
    averages.homeExpectedCards = homeExpectedCards.toFixed(2);
    averages.awayExpectedCards = awayExpectedCards.toFixed(2);

    // Cards prediction strength
    if (averages.totalCardsExpected >= 5.5) {
      averages.cardsStrength = 'Çok Yüksek';
      averages.cardsClass = 'very-high';
    } else if (averages.totalCardsExpected >= 4.5) {
      averages.cardsStrength = 'Yüksek';
      averages.cardsClass = 'high';
    } else if (averages.totalCardsExpected >= 3.5) {
      averages.cardsStrength = 'Orta';
      averages.cardsClass = 'medium';
    } else {
      averages.cardsStrength = 'Düşük';
      averages.cardsClass = 'low';
    }

    return averages;
  }
}

export { CardsComparison };
