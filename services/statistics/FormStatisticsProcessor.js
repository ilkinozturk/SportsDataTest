const StatisticsProcessor = require('./StatisticsProcessor');

/**
 * Processor for form-related statistics
 */
class FormStatisticsProcessor extends StatisticsProcessor {
  constructor() {
    super();
    this.category = 'form';
    this.supportedContexts = ['overall', 'home', 'away'];
  }

  /**
   * Get field mappings for form stats
   */
  getFieldMappings() {
    return {
      // Form runs from additional_info
      'recentForm': {
        source: 'formRun_overall',
        contexts: ['overall'],
        fromAdditionalInfo: true
      },
      'homeForm': {
        source: 'formRun_home',
        contexts: ['home'],
        fromAdditionalInfo: true
      },
      'awayForm': {
        source: 'formRun_away', 
        contexts: ['away'],
        fromAdditionalInfo: true
      },
      
      // PPG (Points Per Game)
      'ppg': {
        source: 'ppg',
        contexts: ['overall', 'home', 'away']
      },
      'pointsPerGame': {
        source: 'seasonPPG',
        contexts: ['overall', 'home', 'away']
      },
      
      // Win/Draw/Loss counts
      'wins': {
        source: 'seasonWinsNum',
        contexts: ['overall', 'home', 'away']
      },
      'draws': {
        source: 'seasonDrawsNum',
        contexts: ['overall', 'home', 'away']
      },
      'losses': {
        source: 'seasonLossesNum',
        contexts: ['overall', 'home', 'away']
      },
      
      // Win percentages
      'winPercentage': {
        source: 'winPercentage',
        contexts: ['overall', 'home', 'away']
      },
      'drawPercentage': {
        source: 'drawPercentage',
        contexts: ['overall', 'home', 'away']
      },
      'lossPercentage': {
        source: 'lossPercentage',
        contexts: ['overall', 'home', 'away']
      },
      
      // Unbeaten/Winless runs
      'unbeatenRun': {
        source: 'current_unbeaten_run',
        contexts: ['overall'],
        fromAdditionalInfo: true
      },
      'winlessRun': {
        source: 'current_winless_run',
        contexts: ['overall'],
        fromAdditionalInfo: true
      },
      
      // Clean sheet run
      'cleanSheetRun': {
        source: 'current_clean_sheet_run',
        contexts: ['overall'],
        fromAdditionalInfo: true
      },
      
      // Home advantage
      'homeAdvantagePercentage': {
        source: 'home_advantage_percentage',
        contexts: ['overall'],
        fromAdditionalInfo: true
      }
    };
  }

  /**
   * Process form statistics for a specific context
   */
  processForContext(stats, additionalInfo, context) {
    const result = {};
    const mappings = this.getFieldMappings();
    
    Object.entries(mappings).forEach(([targetField, config]) => {
      // Skip if context not supported for this field
      if (!config.contexts.includes(context)) {
        return;
      }
      
      const sourceField = this.buildFieldName(config.source, context);
      const value = config.fromAdditionalInfo ? 
        additionalInfo[sourceField] : 
        stats[sourceField];
      
      if (value !== undefined && value !== null) {
        const fieldName = this.buildFieldName(targetField, context);
        result[fieldName] = value;
      }
    });
    
    return result;
  }
  
  /**
   * Additional processing for form data
   */
  processStatistics(stats, additionalInfo, defaultContext = 'overall') {
    const result = super.processStatistics(stats, additionalInfo, defaultContext);
    
    // Ensure we have form data for backward compatibility
    if (!result.recentForm && additionalInfo.formRun_overall) {
      result.recentForm = additionalInfo.formRun_overall;
    }
    if (!result.homeForm && additionalInfo.formRun_home) {
      result.homeForm = additionalInfo.formRun_home;
    }
    if (!result.awayForm && additionalInfo.formRun_away) {
      result.awayForm = additionalInfo.formRun_away;
    }
    
    return result;
  }
}

module.exports = FormStatisticsProcessor;