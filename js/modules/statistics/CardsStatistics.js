import { BaseStatistics } from './BaseStatistics.js';

/**
 * CardsStatistics - Manages all card-related statistics
 */
export class CardsStatistics extends BaseStatistics {
  constructor(filterManager) {
    super(filterManager);
    
    // Listen to filter changes
    this.filterManager.on('cards', (newValue) => {
      if (this.statistics) {
        this.updateMatchCards(newValue);
      }
    });
    
    this.filterManager.on('matchCards', (newValue) => {
      if (this.statistics) {
        this.updateMatchCards(newValue);
      }
    });
    
    this.filterManager.on('teamCards', (newValue) => {
      if (this.statistics) {
        this.updateTeamCards(newValue);
      }
    });
  }

  /**
   * Update all card statistics
   * @param {Object} statistics - Statistics data
   */
  update(statistics) {
    if (!statistics) return;
    
    this.setStatistics(statistics);
    
    // Update all card sections
    const currentFilter = this.filterManager.getFilter('cards');
    this.updateMatchCards(currentFilter);
    this.updateTeamCards(this.filterManager.getFilter('teamCards'));
    this.updateTopStats();
  }

  /**
   * Update match cards statistics
   * @param {string} filter - Filter type (overall, home, away)
   */
  updateMatchCards(filter = 'overall') {
    const statistics = this.statistics;
    if (!statistics) return;

    // Helper function to get filtered stats
    const getFilteredCardStats = (stats, filter) => {
      if (filter === 'home') {
        return {
          matches: stats.homeMatches || 0,
          totalCards: stats.homeCards || 0,
          cardsPerMatch: stats.homeCardsPerMatch || 0,
          cardsHighest: stats.cardsHighest || 0,
          cardsLowest: stats.cardsLowest || 0
        };
      } else if (filter === 'away') {
        return {
          matches: stats.awayMatches || 0,
          totalCards: stats.awayCards || 0,
          cardsPerMatch: stats.awayCardsPerMatch || 0,
          cardsHighest: stats.cardsHighest || 0,
          cardsLowest: stats.cardsLowest || 0
        };
      }
      return {
        matches: stats.totalMatches || 0,
        totalCards: stats.totalCards || 0,
        cardsPerMatch: stats.cardsPerMatch || 0,
        cardsHighest: stats.cardsHighest || 0,
        cardsLowest: stats.cardsLowest || 0
      };
    };

    const filteredStats = getFilteredCardStats(statistics, filter);

    // Update match cards section based on filter
    if (filter === 'home') {
      this.updateElement('totalCards', statistics.homeCards || 0);
      this.updateElement('cardsPerMatch', statistics.homeCardsPerMatch || 0, { isDecimal: true, decimals: 1 });
      this.updateElement('homeCards', statistics.homeCards || 0);
      this.updateElement('awayCards', statistics.awayCards || 0);
      this.updateElement('homeCardsPerMatch', statistics.homeCardsPerMatch || 0, { isDecimal: true, decimals: 1 });
      this.updateElement('awayCardsPerMatch', statistics.awayCardsPerMatch || 0, { isDecimal: true, decimals: 1 });
      this.updateElement('cardsHighest', statistics.cardsHighest || 0);
      this.updateElement('cardsLowest', statistics.cardsLowest || 0);

      // Card Over statistics - Home
      this.updateElement('cardsOver05', statistics.homeCardsOver05 || 0, { isPercentage: true });
      this.updateElement('cardsOver15', statistics.homeCardsOver15 || 0, { isPercentage: true });
      this.updateElement('cardsOver25', statistics.homeCardsOver25 || 0, { isPercentage: true });
      this.updateElement('cardsOver35', statistics.homeCardsOver35 || 0, { isPercentage: true });
      this.updateElement('cardsOver45', statistics.homeCardsOver45 || 0, { isPercentage: true });
      this.updateElement('cardsOver55', statistics.homeCardsOver55 || 0, { isPercentage: true });
    } else if (filter === 'away') {
      this.updateElement('totalCards', statistics.awayCards || 0);
      this.updateElement('cardsPerMatch', statistics.awayCardsPerMatch || 0, { isDecimal: true, decimals: 1 });
      this.updateElement('homeCards', statistics.homeCards || 0);
      this.updateElement('awayCards', statistics.awayCards || 0);
      this.updateElement('homeCardsPerMatch', statistics.homeCardsPerMatch || 0, { isDecimal: true, decimals: 1 });
      this.updateElement('awayCardsPerMatch', statistics.awayCardsPerMatch || 0, { isDecimal: true, decimals: 1 });
      this.updateElement('cardsHighest', statistics.cardsHighest || 0);
      this.updateElement('cardsLowest', statistics.cardsLowest || 0);

      // Card Over statistics - Away
      this.updateElement('cardsOver05', statistics.awayCardsOver05 || 0, { isPercentage: true });
      this.updateElement('cardsOver15', statistics.awayCardsOver15 || 0, { isPercentage: true });
      this.updateElement('cardsOver25', statistics.awayCardsOver25 || 0, { isPercentage: true });
      this.updateElement('cardsOver35', statistics.awayCardsOver35 || 0, { isPercentage: true });
      this.updateElement('cardsOver45', statistics.awayCardsOver45 || 0, { isPercentage: true });
      this.updateElement('cardsOver55', statistics.awayCardsOver55 || 0, { isPercentage: true });
    } else {
      // Overall
      this.updateElement('totalCards', statistics.totalCards || 0);
      this.updateElement('cardsPerMatch', statistics.cardsPerMatch || 0, { isDecimal: true, decimals: 1 });
      this.updateElement('homeCards', statistics.homeCards || 0);
      this.updateElement('awayCards', statistics.awayCards || 0);
      this.updateElement('homeCardsPerMatch', statistics.homeCardsPerMatch || 0, { isDecimal: true, decimals: 1 });
      this.updateElement('awayCardsPerMatch', statistics.awayCardsPerMatch || 0, { isDecimal: true, decimals: 1 });
      this.updateElement('cardsHighest', statistics.cardsHighest || 0);
      this.updateElement('cardsLowest', statistics.cardsLowest || 0);

      // Card Over statistics - Overall
      this.updateElement('cardsOver05', statistics.cardsOver05 || 0, { isPercentage: true });
      this.updateElement('cardsOver15', statistics.cardsOver15 || 0, { isPercentage: true });
      this.updateElement('cardsOver25', statistics.cardsOver25 || 0, { isPercentage: true });
      this.updateElement('cardsOver35', statistics.cardsOver35 || 0, { isPercentage: true });
      this.updateElement('cardsOver45', statistics.cardsOver45 || 0, { isPercentage: true });
      this.updateElement('cardsOver55', statistics.cardsOver55 || 0, { isPercentage: true });
    }

    // Disciplinary record
    this.updateElement('cleanGames', statistics.cleanGames || 0, { isPercentage: true });
    this.updateElement('multipleCardsGames', statistics.multipleCardsGames || 0, { isPercentage: true });
    this.updateElement('earlyCards', statistics.earlyCards || 0);
    this.updateElement('lateCards', statistics.lateCards || 0);

    // Update 1st/2nd half cards
    this.updateHalfTimeCards(filter);
  }

  /**
   * Update half time cards statistics
   * @param {string} filter - Filter type
   */
  updateHalfTimeCards(filter) {
    const statistics = this.statistics;
    if (!statistics) return;

    const isHome = filter === 'home';
    const isAway = filter === 'away';

    // 1st Half average
    const cards1HAvg = isHome ? statistics.cards1H_AVG_home :
                      isAway ? statistics.cards1H_AVG_away :
                      statistics.cards1H_AVG || 0;

    // 2nd Half average
    const cards2HAvg = isHome ? statistics.cards2H_AVG_home :
                      isAway ? statistics.cards2H_AVG_away :
                      statistics.cards2H_AVG || 0;

    this.updateElement('cards1HAVG', cards1HAvg, { isDecimal: true });
    this.updateElement('cards2HAVG', cards2HAvg, { isDecimal: true });

    // Update percentage bars
    const total = cards1HAvg + cards2HAvg;
    if (total > 0) {
      const cards1HPerc = Math.round((cards1HAvg / total) * 100);
      const cards2HPerc = Math.round((cards2HAvg / total) * 100);
      
      const cards1HBar = document.getElementById('cards1HBar');
      const cards2HBar = document.getElementById('cards2HBar');
      
      if (cards1HBar) cards1HBar.style.width = `${cards1HPerc}%`;
      if (cards2HBar) cards2HBar.style.width = `${cards2HPerc}%`;
    }

    // Update Under 2 / 2 to 3 / Over 3 percentages
    this.updateCardRanges(filter);
  }

  /**
   * Update card range percentages (Under 2, 2 to 3, Over 3)
   * @param {string} filter - Filter type
   */
  updateCardRanges(filter) {
    const statistics = this.statistics;
    if (!statistics) return;

    const isHome = filter === 'home';
    const isAway = filter === 'away';

    // 1st Half ranges
    const cards1H_under2 = isHome ? statistics.cards1H_under2_percentage_home :
                          isAway ? statistics.cards1H_under2_percentage_away :
                          statistics.cards1H_under2_percentage_overall || 0;
    
    const cards1H_2to3 = isHome ? statistics.cards1H_2to3_percentage_home :
                        isAway ? statistics.cards1H_2to3_percentage_away :
                        statistics.cards1H_2to3_percentage_overall || 0;
    
    const cards1H_over3 = isHome ? statistics.cards1H_over3_percentage_home :
                         isAway ? statistics.cards1H_over3_percentage_away :
                         statistics.cards1H_over3_percentage_overall || 0;

    // 2nd Half ranges
    const cards2H_under2 = isHome ? statistics.cards2H_under2_percentage_home :
                          isAway ? statistics.cards2H_under2_percentage_away :
                          statistics.cards2H_under2_percentage_overall || 0;
    
    const cards2H_2to3 = isHome ? statistics.cards2H_2to3_percentage_home :
                        isAway ? statistics.cards2H_2to3_percentage_away :
                        statistics.cards2H_2to3_percentage_overall || 0;
    
    const cards2H_over3 = isHome ? statistics.cards2H_over3_percentage_home :
                         isAway ? statistics.cards2H_over3_percentage_away :
                         statistics.cards2H_over3_percentage_overall || 0;

    // Update elements
    this.updateElement('cards1H_under2', cards1H_under2, { isPercentage: true });
    this.updateElement('cards1H_2to3', cards1H_2to3, { isPercentage: true });
    this.updateElement('cards1H_over3', cards1H_over3, { isPercentage: true });
    
    this.updateElement('cards2H_under2', cards2H_under2, { isPercentage: true });
    this.updateElement('cards2H_2to3', cards2H_2to3, { isPercentage: true });
    this.updateElement('cards2H_over3', cards2H_over3, { isPercentage: true });
  }

  /**
   * Update team cards statistics
   * @param {string} filter - Filter type
   */
  updateTeamCards(filter = 'overall') {
    const statistics = this.statistics;
    if (!statistics) return;

    const isHome = filter === 'home';
    const isAway = filter === 'away';

    // Determine which stats to use based on filter
    const filteredStats = this.getTeamCardsFilteredStats(statistics, filter);

    // Update Cards For stats
    this.updateElement('teamCards-avgFor', filteredStats.avgCardsFor, { isDecimal: true });
    this.updateElement('teamCards-totalFor', filteredStats.totalCardsFor);
    this.updateElement('teamCards-forOver05', filteredStats.over05CardsFor, { isPercentage: true });
    this.updateElement('teamCards-forOver15', filteredStats.over15CardsFor, { isPercentage: true });
    this.updateElement('teamCards-forOver25', filteredStats.over25CardsFor, { isPercentage: true });
    this.updateElement('teamCards-forOver35', filteredStats.over35CardsFor, { isPercentage: true });
    this.updateElement('teamCards-forOver45', filteredStats.over45CardsFor, { isPercentage: true });
    this.updateElement('teamCards-forOver55', filteredStats.over55CardsFor, { isPercentage: true });
    this.updateElement('teamCards-forOver65', filteredStats.over65CardsFor, { isPercentage: true });
    this.updateElement('teamCards-highestFor', filteredStats.highestCardsFor);

    // Update Cards Against stats
    this.updateElement('teamCards-avgAgainst', filteredStats.avgCardsAgainst, { isDecimal: true });
    this.updateElement('teamCards-totalAgainst', filteredStats.totalCardsAgainst);
    this.updateElement('teamCards-againstOver05', filteredStats.over05CardsAgainst, { isPercentage: true });
    this.updateElement('teamCards-againstOver15', filteredStats.over15CardsAgainst, { isPercentage: true });
    this.updateElement('teamCards-againstOver25', filteredStats.over25CardsAgainst, { isPercentage: true });
    this.updateElement('teamCards-againstOver35', filteredStats.over35CardsAgainst, { isPercentage: true });
    this.updateElement('teamCards-againstOver45', filteredStats.over45CardsAgainst, { isPercentage: true });
    this.updateElement('teamCards-againstOver55', filteredStats.over55CardsAgainst, { isPercentage: true });
    this.updateElement('teamCards-againstOver65', filteredStats.over65CardsAgainst, { isPercentage: true });
    this.updateElement('teamCards-highestAgainst', filteredStats.highestCardsAgainst);
  }

  /**
   * Get filtered team cards statistics
   * @private
   */
  getTeamCardsFilteredStats(statistics, filter) {
    const isHome = filter === 'home';
    const isAway = filter === 'away';

    if (isHome) {
      return {
        avgCardsFor: statistics.cardsForPerMatch_home || statistics.cards_for_avg_home ||
          (statistics.homeCardsFor && statistics.homeMatches ? 
            statistics.homeCardsFor / statistics.homeMatches : 0),
        totalCardsFor: statistics.homeCardsFor || statistics.cardsFor_home || 0,
        avgCardsAgainst: statistics.cardsAgainstPerMatch_home || statistics.cards_against_avg_home ||
          (statistics.homeCardsAgainst && statistics.homeMatches ? 
            statistics.homeCardsAgainst / statistics.homeMatches : 0),
        totalCardsAgainst: statistics.homeCardsAgainst || statistics.cardsAgainst_home || 0,
        over05CardsFor: statistics.homeOver05CardsForPercentage || statistics.over05CardsForPercentage_home || 0,
        over15CardsFor: statistics.homeOver15CardsForPercentage || statistics.over15CardsForPercentage_home || 0,
        over25CardsFor: statistics.homeOver25CardsForPercentage || statistics.over25CardsForPercentage_home || 0,
        over35CardsFor: statistics.homeOver35CardsForPercentage || statistics.over35CardsForPercentage_home || 0,
        over45CardsFor: statistics.homeOver45CardsForPercentage || statistics.over45CardsForPercentage_home || 0,
        over55CardsFor: statistics.homeOver55CardsForPercentage || statistics.over55CardsForPercentage_home || 0,
        over65CardsFor: statistics.homeOver65CardsForPercentage || statistics.over65CardsForPercentage_home || 0,
        over05CardsAgainst: statistics.homeOver05CardsAgainstPercentage || statistics.over05CardsAgainstPercentage_home || 0,
        over15CardsAgainst: statistics.homeOver15CardsAgainstPercentage || statistics.over15CardsAgainstPercentage_home || 0,
        over25CardsAgainst: statistics.homeOver25CardsAgainstPercentage || statistics.over25CardsAgainstPercentage_home || 0,
        over35CardsAgainst: statistics.homeOver35CardsAgainstPercentage || statistics.over35CardsAgainstPercentage_home || 0,
        over45CardsAgainst: statistics.homeOver45CardsAgainstPercentage || statistics.over45CardsAgainstPercentage_home || 0,
        over55CardsAgainst: statistics.homeOver55CardsAgainstPercentage || statistics.over55CardsAgainstPercentage_home || 0,
        over65CardsAgainst: statistics.homeOver65CardsAgainstPercentage || statistics.over65CardsAgainstPercentage_home || 0,
        highestCardsFor: statistics.homeCardsForHighest || statistics.cardsForHighest_home || 0,
        highestCardsAgainst: statistics.homeCardsAgainstHighest || statistics.cardsAgainstHighest_home || 0
      };
    } else if (isAway) {
      return {
        avgCardsFor: statistics.cardsForPerMatch_away || statistics.cards_for_avg_away ||
          (statistics.awayCardsFor && statistics.awayMatches ? 
            statistics.awayCardsFor / statistics.awayMatches : 0),
        totalCardsFor: statistics.awayCardsFor || statistics.cardsFor_away || 0,
        avgCardsAgainst: statistics.cardsAgainstPerMatch_away || statistics.cards_against_avg_away ||
          (statistics.awayCardsAgainst && statistics.awayMatches ? 
            statistics.awayCardsAgainst / statistics.awayMatches : 0),
        totalCardsAgainst: statistics.awayCardsAgainst || statistics.cardsAgainst_away || 0,
        over05CardsFor: statistics.awayOver05CardsForPercentage || statistics.over05CardsForPercentage_away || 0,
        over15CardsFor: statistics.awayOver15CardsForPercentage || statistics.over15CardsForPercentage_away || 0,
        over25CardsFor: statistics.awayOver25CardsForPercentage || statistics.over25CardsForPercentage_away || 0,
        over35CardsFor: statistics.awayOver35CardsForPercentage || statistics.over35CardsForPercentage_away || 0,
        over45CardsFor: statistics.awayOver45CardsForPercentage || statistics.over45CardsForPercentage_away || 0,
        over55CardsFor: statistics.awayOver55CardsForPercentage || statistics.over55CardsForPercentage_away || 0,
        over65CardsFor: statistics.awayOver65CardsForPercentage || statistics.over65CardsForPercentage_away || 0,
        over05CardsAgainst: statistics.awayOver05CardsAgainstPercentage || statistics.over05CardsAgainstPercentage_away || 0,
        over15CardsAgainst: statistics.awayOver15CardsAgainstPercentage || statistics.over15CardsAgainstPercentage_away || 0,
        over25CardsAgainst: statistics.awayOver25CardsAgainstPercentage || statistics.over25CardsAgainstPercentage_away || 0,
        over35CardsAgainst: statistics.awayOver35CardsAgainstPercentage || statistics.over35CardsAgainstPercentage_away || 0,
        over45CardsAgainst: statistics.awayOver45CardsAgainstPercentage || statistics.over45CardsAgainstPercentage_away || 0,
        over55CardsAgainst: statistics.awayOver55CardsAgainstPercentage || statistics.over55CardsAgainstPercentage_away || 0,
        over65CardsAgainst: statistics.awayOver65CardsAgainstPercentage || statistics.over65CardsAgainstPercentage_away || 0,
        highestCardsFor: statistics.awayCardsForHighest || statistics.cardsForHighest_away || 0,
        highestCardsAgainst: statistics.awayCardsAgainstHighest || statistics.cardsAgainstHighest_away || 0
      };
    } else {
      // Overall
      return {
        avgCardsFor: statistics.cardsForPerMatch || 0,
        totalCardsFor: statistics.cardsFor || 0,
        avgCardsAgainst: statistics.cardsAgainstPerMatch || 0,
        totalCardsAgainst: statistics.cardsAgainst || 0,
        over05CardsFor: statistics.over05CardsForPercentage || 0,
        over15CardsFor: statistics.over15CardsForPercentage || 0,
        over25CardsFor: statistics.over25CardsForPercentage || 0,
        over35CardsFor: statistics.over35CardsForPercentage || 0,
        over45CardsFor: statistics.over45CardsForPercentage || 0,
        over55CardsFor: statistics.over55CardsForPercentage || 0,
        over65CardsFor: statistics.over65CardsForPercentage || 0,
        over05CardsAgainst: statistics.over05CardsAgainstPercentage || 0,
        over15CardsAgainst: statistics.over15CardsAgainstPercentage || 0,
        over25CardsAgainst: statistics.over25CardsAgainstPercentage || 0,
        over35CardsAgainst: statistics.over35CardsAgainstPercentage || 0,
        over45CardsAgainst: statistics.over45CardsAgainstPercentage || 0,
        over55CardsAgainst: statistics.over55CardsAgainstPercentage || 0,
        over65CardsAgainst: statistics.over65CardsAgainstPercentage || 0,
        highestCardsFor: statistics.cardsForHighest || 0,
        highestCardsAgainst: statistics.cardsAgainstHighest || 0
      };
    }
  }

  /**
   * Update cards tab top stats
   */
  updateTopStats() {
    const statistics = this.statistics;
    if (!statistics) return;

    // Cards For Over 1.5 - team receives 2+ cards
    const cardsForOver15 = statistics.over15CardsForPercentage || 0;
    const teamBookedAvg = statistics.cardsForPerMatch || 0;
    const opponentsBookedAvg = statistics.cardsAgainstPerMatch || 0;

    this.updateElement('cardsForOver15Value', cardsForOver15, { isPercentage: true });
    this.updateElement('teamBookedAvgValue', teamBookedAvg, { isDecimal: true });
    this.updateElement('opponentsBookedAvgValue', opponentsBookedAvg, { isDecimal: true });
  }
}