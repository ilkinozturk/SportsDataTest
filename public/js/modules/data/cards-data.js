/**
 * Cards Data Module
 * Handles cards statistics data processing and field mapping
 * Independent from teamDataService
 */

(function(global) {
  'use strict';

  class CardsData {
    constructor() {
      this.name = 'CardsData';
      this.version = '1.0.0';
    }

    /**
     * Process cards data from API response
     */
    processCardsData(stats, additionalInfo = {}) {
      return {
        // Cards averages
        cardsAVG: stats.cardsAVG_overall || 0,
        cardsAVG_overall: stats.cardsAVG_overall || 0,
        cardsAVG_home: stats.cardsAVG_home || 0,
        cardsAVG_away: stats.cardsAVG_away || 0,
        
        // Total cards
        cardsTotal: stats.cardsTotal_overall || 0,
        cardsTotal_overall: stats.cardsTotal_overall || 0,
        cardsTotal_home: stats.cardsTotal_home || 0,
        cardsTotal_away: stats.cardsTotal_away || 0,
        
        // Highest/Lowest
        cardsHighest: stats.cardsHighest_overall || 0,
        cardsHighest_overall: stats.cardsHighest_overall || 0,
        cardsHighest_home: stats.cardsHighest_home || 0,
        cardsHighest_away: stats.cardsHighest_away || 0,
        cardsLowest: stats.cardsLowest_overall || 0,
        cardsLowest_overall: stats.cardsLowest_overall || 0,
        cardsLowest_home: stats.cardsLowest_home || 0,
        cardsLowest_away: stats.cardsLowest_away || 0,
        
        // Cards Over percentages - Overall
        cardsOver05: stats.over05CardsPercentage_overall || additionalInfo.over05_cards_percentage || 0,
        cardsOver15: stats.over15CardsPercentage_overall || additionalInfo.over15_cards_percentage || 0,
        cardsOver25: stats.over25CardsPercentage_overall || additionalInfo.over25_cards_percentage || 0,
        cardsOver35: stats.over35CardsPercentage_overall || additionalInfo.over35_cards_percentage || 0,
        cardsOver45: stats.over45CardsPercentage_overall || additionalInfo.over45_cards_percentage || 0,
        cardsOver55: stats.over55CardsPercentage_overall || additionalInfo.over55_cards_percentage || 0,
        
        // Cards Over percentages - Overall with suffix
        cardsOver05_overall: stats.over05CardsPercentage_overall || additionalInfo.over05_cards_percentage || 0,
        cardsOver15_overall: stats.over15CardsPercentage_overall || additionalInfo.over15_cards_percentage || 0,
        cardsOver25_overall: stats.over25CardsPercentage_overall || additionalInfo.over25_cards_percentage || 0,
        cardsOver35_overall: stats.over35CardsPercentage_overall || additionalInfo.over35_cards_percentage || 0,
        cardsOver45_overall: stats.over45CardsPercentage_overall || additionalInfo.over45_cards_percentage || 0,
        cardsOver55_overall: stats.over55CardsPercentage_overall || additionalInfo.over55_cards_percentage || 0,
        
        // Cards Over percentages - Home
        cardsOver05_home: stats.over05CardsPercentage_home || additionalInfo.over05_cards_percentage_home || 0,
        cardsOver15_home: stats.over15CardsPercentage_home || additionalInfo.over15_cards_percentage_home || 0,
        cardsOver25_home: stats.over25CardsPercentage_home || additionalInfo.over25_cards_percentage_home || 0,
        cardsOver35_home: stats.over35CardsPercentage_home || additionalInfo.over35_cards_percentage_home || 0,
        cardsOver45_home: stats.over45CardsPercentage_home || additionalInfo.over45_cards_percentage_home || 0,
        cardsOver55_home: stats.over55CardsPercentage_home || additionalInfo.over55_cards_percentage_home || 0,
        
        // Cards Over percentages - Away
        cardsOver05_away: stats.over05CardsPercentage_away || additionalInfo.over05_cards_percentage_away || 0,
        cardsOver15_away: stats.over15CardsPercentage_away || additionalInfo.over15_cards_percentage_away || 0,
        cardsOver25_away: stats.over25CardsPercentage_away || additionalInfo.over25_cards_percentage_away || 0,
        cardsOver35_away: stats.over35CardsPercentage_away || additionalInfo.over35_cards_percentage_away || 0,
        cardsOver45_away: stats.over45CardsPercentage_away || additionalInfo.over45_cards_percentage_away || 0,
        cardsOver55_away: stats.over55CardsPercentage_away || additionalInfo.over55_cards_percentage_away || 0,
        
        // Cards For/Against
        cardsFor: additionalInfo.cards_for || additionalInfo.cards_for_overall || 0,
        cardsAgainst: additionalInfo.cards_against || additionalInfo.cards_against_overall || 0,
        cardsForPerMatch: additionalInfo.cards_for_avg || additionalInfo.cards_for_avg_overall || 0,
        cardsAgainstPerMatch: additionalInfo.cards_against_avg || additionalInfo.cards_against_avg_overall || 0,
        
        // Home/Away Cards For/Against
        homeCardsFor: additionalInfo.cards_for_home || 0,
        homeCardsAgainst: additionalInfo.cards_against_home || 0,
        awayCardsFor: additionalInfo.cards_for_away || 0,
        awayCardsAgainst: additionalInfo.cards_against_away || 0,
        
        // Yellow/Red cards
        yellowCards: stats.yellowCards_overall || 0,
        redCards: stats.redCards_overall || 0,
        homeYellowCards: stats.yellowCards_home || 0,
        homeRedCards: stats.redCards_home || 0,
        awayYellowCards: stats.yellowCards_away || 0,
        awayRedCards: stats.redCards_away || 0,
        
        // First/Second half cards
        cards1H: stats.cards1H_overall || stats.fh_cards_total || 0,
        cards2H: stats.cards2H_overall || stats['2h_cards_total'] || 0,
        cards1H_AVG: stats.cards1H_AVG_overall || stats.fh_cards_avg || 0,
        cards2H_AVG: stats.cards2H_AVG_overall || stats['2h_cards_avg'] || 0
      };
    }

    /**
     * Merge cards data into existing statistics
     */
    mergeCardsData(existingStats, apiStats, additionalInfo = {}) {
      const cardsData = this.processCardsData(apiStats, additionalInfo);
      return {
        ...existingStats,
        ...cardsData
      };
    }

    /**
     * Get cards data for specific filter
     */
    getFilteredCardsData(stats, filter = 'overall') {
      const suffix = filter === 'overall' ? '' : `_${filter}`;
      
      return {
        cardsAVG: stats[`cardsAVG${suffix}`] || stats.cardsAVG || 0,
        cardsTotal: stats[`cardsTotal${suffix}`] || stats.cardsTotal || 0,
        cardsHighest: stats[`cardsHighest${suffix}`] || stats.cardsHighest || 0,
        cardsLowest: stats[`cardsLowest${suffix}`] || stats.cardsLowest || 0,
        cardsOver05: stats[`cardsOver05${suffix}`] || stats.cardsOver05 || 0,
        cardsOver15: stats[`cardsOver15${suffix}`] || stats.cardsOver15 || 0,
        cardsOver25: stats[`cardsOver25${suffix}`] || stats.cardsOver25 || 0,
        cardsOver35: stats[`cardsOver35${suffix}`] || stats.cardsOver35 || 0,
        cardsOver45: stats[`cardsOver45${suffix}`] || stats.cardsOver45 || 0,
        cardsOver55: stats[`cardsOver55${suffix}`] || stats.cardsOver55 || 0
      };
    }
  }

  // Create singleton instance
  const cardsData = new CardsData();

  // Export to global scope
  global.TeamStatsCardsData = cardsData;

  // Also attach to EventBus if available
  if (global.TeamStatsEventBus) {
    // Listen for data loaded event
    global.TeamStatsEventBus.on('data:loaded', (data) => {
      if (data.statistics) {
        const additionalInfo = data.statistics.additional_info || {};
        const mergedStats = cardsData.mergeCardsData(
          data.statistics,
          data.statistics,
          additionalInfo
        );
        
        // Update statistics with merged data
        data.statistics = mergedStats;
        
        // Emit cards data ready event
        global.TeamStatsEventBus.emit('data:cards:ready', mergedStats);
      }
    });
  }

  console.log('[CardsData] Module loaded successfully');

})(window);