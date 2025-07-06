const StatisticsProcessor = require('./StatisticsProcessor');

/**
 * Goals Statistics Processor
 * Handles all goals-related statistics processing
 */
class GoalsStatisticsProcessor extends StatisticsProcessor {
  constructor() {
    super();
  }

  /**
   * Get field mappings for goals statistics
   * @returns {Object} Field mappings {outputField: inputField}
   */
  getFieldMappings() {
    return {
      // Basic goals statistics
      'goalsFor': 'seasonScoredNum',
      'goalsAgainst': 'seasonConcededNum',
      'goalsDifference': 'seasonGoalDifference',
      'goalsTotal': 'seasonGoalsTotal',
      'goalsAVG': 'seasonScoredAVG',
      'goalsConcededAVG': 'seasonConcededAVG',
      'goalsForPerMatch': 'seasonScoredAVG',
      'goalsAgainstPerMatch': 'seasonConcededAVG',
      
      // Goal ranges and percentages
      'goals05': 'over05Goals',
      'goals15': 'over15Goals', 
      'goals25': 'over25Goals',
      'goals35': 'over35Goals',
      'goals45': 'over45Goals',
      'goals55': 'over55Goals',
      'goals65': 'over65Goals',
      
      // BTTS (Both Teams To Score)
      'btts': 'btts_percentage',
      'bttsYes': 'btts_yes',
      'bttsNo': 'btts_no',
      'bttsPercentage': 'btts_percentage',
      
      // Clean sheets and failed to score
      'cleanSheets': 'clean_sheets',
      'cleanSheetsPercentage': 'clean_sheets_percentage',
      'failedToScore': 'failed_to_score',
      'failedToScorePercentage': 'failed_to_score_percentage',
      
      // xG (Expected Goals) statistics
      'xgFor': 'xg_for',
      'xgAgainst': 'xg_against',
      'xgDifference': 'xg_difference',
      'xgForPerMatch': 'xg_for_per_match',
      'xgAgainstPerMatch': 'xg_against_per_match',
      
      // Goal timing statistics
      'goalsMinute0to15': 'goals_minute_0_to_15',
      'goalsMinute16to30': 'goals_minute_16_to_30',
      'goalsMinute31to45': 'goals_minute_31_to_45',
      'goalsMinute46to60': 'goals_minute_46_to_60',
      'goalsMinute61to75': 'goals_minute_61_to_75',
      'goalsMinute76to90': 'goals_minute_76_to_90',
      
      // First/Second half goals
      'firstHalfGoals': 'first_half_goals',
      'secondHalfGoals': 'second_half_goals',
      'firstHalfGoalsFor': 'first_half_goals_for',
      'firstHalfGoalsAgainst': 'first_half_goals_against',
      'secondHalfGoalsFor': 'second_half_goals_for',
      'secondHalfGoalsAgainst': 'second_half_goals_against',
      
      // Goal statistics by competition
      'leagueGoalsFor': 'league_goals_for',
      'leagueGoalsAgainst': 'league_goals_against',
      'cupGoalsFor': 'cup_goals_for',
      'cupGoalsAgainst': 'cup_goals_against'
    };
  }

  /**
   * Process goals statistics with additional calculations
   * @param {Object} stats - Raw statistics data
   * @param {Object} additionalInfo - Additional statistics data
   * @param {string} context - Context (overall, home, away)
   * @returns {Object} Processed goals statistics
   */
  processForContext(stats, additionalInfo, context) {
    const result = super.processForContext(stats, additionalInfo, context);
    const suffix = this.getContextSuffix(context);
    
    // Additional calculations for goals
    this.calculateGoalAverages(result, suffix);
    this.calculateGoalPercentages(result, suffix);
    this.calculateGoalRatios(result, suffix);
    
    return result;
  }

  /**
   * Calculate goal averages
   * @param {Object} result - Result object to modify
   * @param {string} suffix - Context suffix
   */
  calculateGoalAverages(result, suffix) {
    // Calculate goals per match if not present
    if (result[`goalsFor${suffix}`] && result[`matchesPlayed${suffix}`]) {
      result[`goalsForPerMatch${suffix}`] = this.applyMathOperation(
        result[`goalsFor${suffix}`] / result[`matchesPlayed${suffix}`], 
        'round', 
        2
      );
    }
    
    if (result[`goalsAgainst${suffix}`] && result[`matchesPlayed${suffix}`]) {
      result[`goalsAgainstPerMatch${suffix}`] = this.applyMathOperation(
        result[`goalsAgainst${suffix}`] / result[`matchesPlayed${suffix}`], 
        'round', 
        2
      );
    }
    
    // Calculate goal difference
    if (result[`goalsFor${suffix}`] && result[`goalsAgainst${suffix}`]) {
      result[`goalsDifference${suffix}`] = result[`goalsFor${suffix}`] - result[`goalsAgainst${suffix}`];
    }
  }

  /**
   * Calculate goal percentages
   * @param {Object} result - Result object to modify
   * @param {string} suffix - Context suffix
   */
  calculateGoalPercentages(result, suffix) {
    const matchesPlayed = result[`matchesPlayed${suffix}`] || 0;
    
    if (matchesPlayed > 0) {
      // Clean sheets percentage
      if (result[`cleanSheets${suffix}`]) {
        result[`cleanSheetsPercentage${suffix}`] = this.calculatePercentage(
          result[`cleanSheets${suffix}`], 
          matchesPlayed
        );
      }
      
      // Failed to score percentage
      if (result[`failedToScore${suffix}`]) {
        result[`failedToScorePercentage${suffix}`] = this.calculatePercentage(
          result[`failedToScore${suffix}`], 
          matchesPlayed
        );
      }
      
      // BTTS percentage
      if (result[`bttsYes${suffix}`]) {
        result[`bttsPercentage${suffix}`] = this.calculatePercentage(
          result[`bttsYes${suffix}`], 
          matchesPlayed
        );
      }
    }
  }

  /**
   * Calculate goal ratios and advanced metrics
   * @param {Object} result - Result object to modify
   * @param {string} suffix - Context suffix
   */
  calculateGoalRatios(result, suffix) {
    // xG ratio (actual goals vs expected goals)
    if (result[`goalsFor${suffix}`] && result[`xgFor${suffix}`]) {
      result[`xgRatio${suffix}`] = this.applyMathOperation(
        result[`goalsFor${suffix}`] / result[`xgFor${suffix}`], 
        'round', 
        2
      );
    }
    
    // Defensive xG ratio
    if (result[`goalsAgainst${suffix}`] && result[`xgAgainst${suffix}`]) {
      result[`xgDefensiveRatio${suffix}`] = this.applyMathOperation(
        result[`goalsAgainst${suffix}`] / result[`xgAgainst${suffix}`], 
        'round', 
        2
      );
    }
    
    // Attack efficiency (goals per xG)
    if (result[`xgFor${suffix}`] && result[`xgFor${suffix}`] > 0) {
      result[`attackEfficiency${suffix}`] = this.applyMathOperation(
        (result[`goalsFor${suffix}`] / result[`xgFor${suffix}`]) * 100, 
        'round', 
        1
      );
    }
  }

  /**
   * Process Over/Under goals statistics
   * @param {Object} stats - Raw statistics data
   * @param {Object} additionalInfo - Additional statistics data
   * @returns {Object} Processed Over/Under statistics
   */
  processOverUnderGoals(stats, additionalInfo) {
    const result = {};
    
    // Over/Under thresholds
    const thresholds = ['05', '15', '25', '35', '45', '55', '65'];
    
    for (const context of this.supportedContexts) {
      const suffix = this.getContextSuffix(context);
      
      for (const threshold of thresholds) {
        const overField = `over${threshold}Goals${suffix}`;
        const underField = `under${threshold}Goals${suffix}`;
        
        // Extract over goals percentage
        const overValue = this.extractFieldValue(
          stats, 
          additionalInfo, 
          `over${threshold}Goals`, 
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
   * Process BTTS statistics
   * @param {Object} stats - Raw statistics data
   * @param {Object} additionalInfo - Additional statistics data
   * @returns {Object} Processed BTTS statistics
   */
  processBTTSStatistics(stats, additionalInfo) {
    const result = {};
    
    for (const context of this.supportedContexts) {
      const suffix = this.getContextSuffix(context);
      
      // BTTS Yes/No counts
      const bttsYes = this.extractFieldValue(stats, additionalInfo, 'btts_yes', suffix);
      const bttsNo = this.extractFieldValue(stats, additionalInfo, 'btts_no', suffix);
      
      if (bttsYes !== null) {
        result[`bttsYes${suffix}`] = this.convertType(bttsYes, 'number');
      }
      
      if (bttsNo !== null) {
        result[`bttsNo${suffix}`] = this.convertType(bttsNo, 'number');
      }
      
      // Calculate BTTS percentage
      if (bttsYes !== null && bttsNo !== null) {
        const totalMatches = bttsYes + bttsNo;
        result[`bttsPercentage${suffix}`] = this.calculatePercentage(bttsYes, totalMatches);
      }
    }
    
    return result;
  }

  /**
   * Process clean sheets and failed to score statistics
   * @param {Object} stats - Raw statistics data
   * @param {Object} additionalInfo - Additional statistics data
   * @returns {Object} Processed clean sheets statistics
   */
  processCleanSheetStatistics(stats, additionalInfo) {
    const result = {};
    
    for (const context of this.supportedContexts) {
      const suffix = this.getContextSuffix(context);
      
      // Clean sheets
      const cleanSheets = this.extractFieldValue(stats, additionalInfo, 'clean_sheets', suffix);
      if (cleanSheets !== null) {
        result[`cleanSheets${suffix}`] = this.convertType(cleanSheets, 'number');
      }
      
      // Failed to score
      const failedToScore = this.extractFieldValue(stats, additionalInfo, 'failed_to_score', suffix);
      if (failedToScore !== null) {
        result[`failedToScore${suffix}`] = this.convertType(failedToScore, 'number');
      }
    }
    
    return result;
  }
}

module.exports = GoalsStatisticsProcessor;