const StatisticsProcessor = require('./StatisticsProcessor');

/**
 * Cards Statistics Processor  
 * Handles all cards-related statistics processing
 */
class CardsStatisticsProcessor extends StatisticsProcessor {
  constructor() {
    super();
  }

  /**
   * Get field mappings for cards statistics
   * @returns {Object} Field mappings {outputField: inputField}
   */
  getFieldMappings() {
    return {
      // Basic cards statistics
      'cardsTotal': 'cardsTotal',
      'cardsAVG': 'cardsAVG',
      'cardsFor': 'cards_for',
      'cardsAgainst': 'cards_against',
      'cardsForPerMatch': 'cards_for_per_match',
      'cardsAgainstPerMatch': 'cards_against_per_match',
      'cardsHighest': 'cardsHighest',
      'cardsLowest': 'cardsLowest',
      
      // Yellow cards
      'yellowCards': 'yellow_cards',
      'yellowCardsAVG': 'yellow_cards_avg',
      'yellowCardsFor': 'yellow_cards_for',
      'yellowCardsAgainst': 'yellow_cards_against',
      
      // Red cards
      'redCards': 'red_cards',
      'redCardsAVG': 'red_cards_avg',
      'redCardsFor': 'red_cards_for',
      'redCardsAgainst': 'red_cards_against',
      
      // Over/Under cards percentages (traditional)
      'over05Cards': 'over05Cards',
      'over15Cards': 'over15Cards',
      'over25Cards': 'over25Cards',
      'over35Cards': 'over35Cards',
      'over45Cards': 'over45Cards',
      'over55Cards': 'over55Cards',
      'over65Cards': 'over65Cards',
      
      // New cards percentage format (Under 2/2 to 3/Over 3)
      'cardsUnder2': 'cards_under2_percentage',
      'cards2to3': 'cards_2to3_percentage', 
      'cardsOver3': 'cards_over3_percentage',
      
      // First half cards
      'cards1H': 'fh_cards_total',
      'cards1H_AVG': 'fh_cards_avg',
      'cards1H_under2_percentage': 'fh_total_cards_under2_percentage',
      'cards1H_2to3_percentage': 'fh_total_cards_2to3_percentage',
      'cards1H_over3_percentage': 'fh_total_cards_over3_percentage',
      
      // Second half cards
      'cards2H': '2h_cards_total',
      'cards2H_AVG': '2h_cards_avg',
      'cards2H_under2_percentage': '2h_total_cards_under2_percentage',
      'cards2H_2to3_percentage': '2h_total_cards_2to3_percentage', 
      'cards2H_over3_percentage': '2h_total_cards_over3_percentage',
      
      // Cards for/against over percentages
      'cardsForOver05': 'cards_for_over05_percentage',
      'cardsForOver15': 'cards_for_over15_percentage',
      'cardsForOver25': 'cards_for_over25_percentage',
      'cardsAgainstOver05': 'cards_against_over05_percentage',
      'cardsAgainstOver15': 'cards_against_over15_percentage',
      'cardsAgainstOver25': 'cards_against_over25_percentage',
      
      // Cards timing statistics
      'cardsMinute0to15': 'cards_minute_0_to_15',
      'cardsMinute16to30': 'cards_minute_16_to_30',
      'cardsMinute31to45': 'cards_minute_31_to_45',
      'cardsMinute46to60': 'cards_minute_46_to_60',
      'cardsMinute61to75': 'cards_minute_61_to_75',
      'cardsMinute76to90': 'cards_minute_76_to_90'
    };
  }

  /**
   * Process cards statistics with additional calculations
   * @param {Object} stats - Raw statistics data
   * @param {Object} additionalInfo - Additional statistics data
   * @param {string} context - Context (overall, home, away)
   * @returns {Object} Processed cards statistics
   */
  processForContext(stats, additionalInfo, context) {
    const result = super.processForContext(stats, additionalInfo, context);
    const suffix = this.getContextSuffix(context);
    
    // Additional calculations for cards
    this.calculateCardAverages(result, suffix);
    this.calculateCardPercentages(result, suffix);
    this.calculateHalfTimeCards(result, suffix);
    
    return result;
  }

  /**
   * Calculate card averages
   * @param {Object} result - Result object to modify
   * @param {string} suffix - Context suffix
   */
  calculateCardAverages(result, suffix) {
    const matchesPlayed = result[`matchesPlayed${suffix}`] || 0;
    
    if (matchesPlayed > 0) {
      // Cards per match
      if (result[`cardsTotal${suffix}`]) {
        result[`cardsAVG${suffix}`] = this.applyMathOperation(
          result[`cardsTotal${suffix}`] / matchesPlayed, 
          'round', 
          2
        );
      }
      
      // Cards for per match
      if (result[`cardsFor${suffix}`]) {
        result[`cardsForPerMatch${suffix}`] = this.applyMathOperation(
          result[`cardsFor${suffix}`] / matchesPlayed, 
          'round', 
          2
        );
      }
      
      // Cards against per match
      if (result[`cardsAgainst${suffix}`]) {
        result[`cardsAgainstPerMatch${suffix}`] = this.applyMathOperation(
          result[`cardsAgainst${suffix}`] / matchesPlayed, 
          'round', 
          2
        );
      }
      
      // Yellow cards average
      if (result[`yellowCards${suffix}`]) {
        result[`yellowCardsAVG${suffix}`] = this.applyMathOperation(
          result[`yellowCards${suffix}`] / matchesPlayed, 
          'round', 
          2
        );
      }
      
      // Red cards average
      if (result[`redCards${suffix}`]) {
        result[`redCardsAVG${suffix}`] = this.applyMathOperation(
          result[`redCards${suffix}`] / matchesPlayed, 
          'round', 
          2
        );
      }
    }
  }

  /**
   * Calculate card percentages
   * @param {Object} result - Result object to modify
   * @param {string} suffix - Context suffix
   */
  calculateCardPercentages(result, suffix) {
    const matchesPlayed = result[`matchesPlayed${suffix}`] || 0;
    
    if (matchesPlayed > 0) {
      // Convert Over/Under card counts to percentages if needed
      const thresholds = ['05', '15', '25', '35', '45', '55', '65'];
      
      for (const threshold of thresholds) {
        const overField = `over${threshold}Cards${suffix}`;
        const underField = `under${threshold}Cards${suffix}`;
        
        if (result[overField] && result[overField] <= matchesPlayed) {
          // If it's a count, convert to percentage
          result[overField] = this.calculatePercentage(result[overField], matchesPlayed);
        }
        
        // Calculate under percentage
        if (result[overField]) {
          result[underField] = 100 - result[overField];
        }
      }
    }
  }

  /**
   * Calculate half-time card statistics
   * @param {Object} result - Result object to modify
   * @param {string} suffix - Context suffix
   */
  calculateHalfTimeCards(result, suffix) {
    const matchesPlayed = result[`matchesPlayed${suffix}`] || 0;
    
    if (matchesPlayed > 0) {
      // First half cards average
      if (result[`cards1H${suffix}`]) {
        result[`cards1H_AVG${suffix}`] = this.applyMathOperation(
          result[`cards1H${suffix}`] / matchesPlayed, 
          'round', 
          2
        );
      }
      
      // Second half cards average  
      if (result[`cards2H${suffix}`]) {
        result[`cards2H_AVG${suffix}`] = this.applyMathOperation(
          result[`cards2H${suffix}`] / matchesPlayed, 
          'round', 
          2
        );
      }
    }
  }

  /**
   * Process Over/Under cards statistics
   * @param {Object} stats - Raw statistics data
   * @param {Object} additionalInfo - Additional statistics data
   * @returns {Object} Processed Over/Under cards statistics
   */
  processOverUnderCards(stats, additionalInfo) {
    const result = {};
    
    // Traditional Over/Under thresholds
    const thresholds = ['05', '15', '25', '35', '45', '55', '65'];
    
    for (const context of this.supportedContexts) {
      const suffix = this.getContextSuffix(context);
      
      for (const threshold of thresholds) {
        const overField = `over${threshold}Cards${suffix}`;
        const underField = `under${threshold}Cards${suffix}`;
        
        // Extract over cards percentage
        const overValue = this.extractFieldValue(
          stats, 
          additionalInfo, 
          `over${threshold}Cards`, 
          suffix
        );
        
        if (overValue !== null) {
          result[overField] = this.convertType(overValue, 'number');
          result[underField] = 100 - result[overField]; // Calculate under percentage
        }
      }
    }
    
    return result;
  }

  /**
   * Process new cards percentage format (Under 2/2 to 3/Over 3)
   * @param {Object} stats - Raw statistics data
   * @param {Object} additionalInfo - Additional statistics data
   * @returns {Object} Processed new format cards statistics
   */
  processNewCardsFormat(stats, additionalInfo) {
    const result = {};
    
    for (const context of this.supportedContexts) {
      const suffix = this.getContextSuffix(context);
      
      // Under 2 cards
      const under2 = this.extractFieldValue(
        stats, 
        additionalInfo, 
        'cards_under2_percentage', 
        suffix
      );
      if (under2 !== null) {
        result[`cardsUnder2${suffix}`] = this.convertType(under2, 'number');
      }
      
      // 2 to 3 cards
      const cards2to3 = this.extractFieldValue(
        stats, 
        additionalInfo, 
        'cards_2to3_percentage', 
        suffix
      );
      if (cards2to3 !== null) {
        result[`cards2to3${suffix}`] = this.convertType(cards2to3, 'number');
      }
      
      // Over 3 cards
      const over3 = this.extractFieldValue(
        stats, 
        additionalInfo, 
        'cards_over3_percentage', 
        suffix
      );
      if (over3 !== null) {
        result[`cardsOver3${suffix}`] = this.convertType(over3, 'number');
      }
    }
    
    return result;
  }

  /**
   * Process half-time cards statistics  
   * @param {Object} stats - Raw statistics data
   * @param {Object} additionalInfo - Additional statistics data
   * @returns {Object} Processed half-time cards statistics
   */
  processHalfTimeCards(stats, additionalInfo) {
    const result = {};
    
    for (const context of this.supportedContexts) {
      const suffix = this.getContextSuffix(context);
      
      // First half cards
      const fhTotal = this.extractFieldValue(stats, additionalInfo, 'fh_cards_total', suffix);
      if (fhTotal !== null) {
        result[`cards1H${suffix}`] = this.convertType(fhTotal, 'number');
      }
      
      // First half cards percentages
      const fhUnder2 = this.extractFieldValue(
        stats, 
        additionalInfo, 
        'fh_total_cards_under2_percentage', 
        suffix
      );
      if (fhUnder2 !== null) {
        result[`cards1H_under2_percentage${suffix}`] = this.convertType(fhUnder2, 'number');
      }
      
      const fh2to3 = this.extractFieldValue(
        stats, 
        additionalInfo, 
        'fh_total_cards_2to3_percentage', 
        suffix
      );
      if (fh2to3 !== null) {
        result[`cards1H_2to3_percentage${suffix}`] = this.convertType(fh2to3, 'number');
      }
      
      const fhOver3 = this.extractFieldValue(
        stats, 
        additionalInfo, 
        'fh_total_cards_over3_percentage', 
        suffix
      );
      if (fhOver3 !== null) {
        result[`cards1H_over3_percentage${suffix}`] = this.convertType(fhOver3, 'number');
      }
      
      // Second half cards
      const shTotal = this.extractFieldValue(stats, additionalInfo, '2h_cards_total', suffix);
      if (shTotal !== null) {
        result[`cards2H${suffix}`] = this.convertType(shTotal, 'number');
      }
      
      // Second half cards percentages
      const shUnder2 = this.extractFieldValue(
        stats, 
        additionalInfo, 
        '2h_total_cards_under2_percentage', 
        suffix
      );
      if (shUnder2 !== null) {
        result[`cards2H_under2_percentage${suffix}`] = this.convertType(shUnder2, 'number');
      }
      
      const sh2to3 = this.extractFieldValue(
        stats, 
        additionalInfo, 
        '2h_total_cards_2to3_percentage', 
        suffix
      );
      if (sh2to3 !== null) {
        result[`cards2H_2to3_percentage${suffix}`] = this.convertType(sh2to3, 'number');
      }
      
      const shOver3 = this.extractFieldValue(
        stats, 
        additionalInfo, 
        '2h_total_cards_over3_percentage', 
        suffix
      );
      if (shOver3 !== null) {
        result[`cards2H_over3_percentage${suffix}`] = this.convertType(shOver3, 'number');
      }
    }
    
    return result;
  }

  /**
   * Process cards for/against over percentages
   * @param {Object} stats - Raw statistics data
   * @param {Object} additionalInfo - Additional statistics data
   * @returns {Object} Processed cards for/against statistics
   */
  processCardsForAgainst(stats, additionalInfo) {
    const result = {};
    
    const thresholds = ['05', '15', '25'];
    
    for (const context of this.supportedContexts) {
      const suffix = this.getContextSuffix(context);
      
      for (const threshold of thresholds) {
        // Cards for over percentage
        const cardsForOver = this.extractFieldValue(
          stats, 
          additionalInfo, 
          `cards_for_over${threshold}_percentage`, 
          suffix
        );
        if (cardsForOver !== null) {
          result[`cardsForOver${threshold}${suffix}`] = this.convertType(cardsForOver, 'number');
        }
        
        // Cards against over percentage
        const cardsAgainstOver = this.extractFieldValue(
          stats, 
          additionalInfo, 
          `cards_against_over${threshold}_percentage`, 
          suffix
        );
        if (cardsAgainstOver !== null) {
          result[`cardsAgainstOver${threshold}${suffix}`] = this.convertType(cardsAgainstOver, 'number');
        }
      }
    }
    
    return result;
  }
}

module.exports = CardsStatisticsProcessor;