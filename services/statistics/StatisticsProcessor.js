/**
 * Base Statistics Processor
 * Provides common functionality for all statistics processors
 */
class StatisticsProcessor {
  constructor() {
    this.supportedContexts = ['overall', 'home', 'away'];
    this.supportedSuffixes = ['_overall', '_home', '_away'];
  }

  /**
   * Process statistics for all contexts (overall, home, away)
   * @param {Object} stats - Raw statistics data
   * @param {Object} additionalInfo - Additional statistics data
   * @param {string} defaultContext - Default context if none specified
   * @returns {Object} Processed statistics
   */
  processStatistics(stats, additionalInfo, defaultContext = 'overall') {
    const result = {};
    
    // Validate input data
    if (!this.validateInputData(stats)) {
      throw new Error('Invalid statistics data provided');
    }

    // Process for each context
    for (const context of this.supportedContexts) {
      const contextResult = this.processForContext(stats, additionalInfo, context);
      Object.assign(result, contextResult);
    }

    return result;
  }

  /**
   * Process statistics for a specific context
   * @param {Object} stats - Raw statistics data
   * @param {Object} additionalInfo - Additional statistics data
   * @param {string} context - Context (overall, home, away)
   * @returns {Object} Processed statistics for context
   */
  processForContext(stats, additionalInfo, context) {
    const result = {};
    const suffix = this.getContextSuffix(context);
    
    // Get field mappings for this processor
    const fieldMappings = this.getFieldMappings();
    
    // Process each field mapping
    for (const [outputField, inputField] of Object.entries(fieldMappings)) {
      const value = this.extractFieldValue(stats, additionalInfo, inputField, suffix);
      if (value !== null && value !== undefined) {
        result[outputField + suffix] = value;
      }
    }

    return result;
  }

  /**
   * Extract field value from stats or additionalInfo
   * @param {Object} stats - Main statistics data
   * @param {Object} additionalInfo - Additional statistics data
   * @param {string} fieldName - Field name to extract
   * @param {string} suffix - Context suffix
   * @returns {*} Field value or null
   */
  extractFieldValue(stats, additionalInfo, fieldName, suffix) {
    // Try with suffix first
    const fieldWithSuffix = fieldName + suffix;
    
    // Check in additionalInfo first (priority)
    if (additionalInfo && additionalInfo[fieldWithSuffix] !== undefined) {
      return additionalInfo[fieldWithSuffix];
    }
    
    // Check in main stats with suffix
    if (stats && stats[fieldWithSuffix] !== undefined) {
      return stats[fieldWithSuffix];
    }
    
    // Try without suffix (fallback)
    if (additionalInfo && additionalInfo[fieldName] !== undefined) {
      return additionalInfo[fieldName];
    }
    
    if (stats && stats[fieldName] !== undefined) {
      return stats[fieldName];
    }
    
    return null;
  }

  /**
   * Get context suffix for field names
   * @param {string} context - Context name
   * @returns {string} Suffix string
   */
  getContextSuffix(context) {
    switch (context) {
      case 'overall':
        return '_overall';
      case 'home':
        return '_home';
      case 'away':
        return '_away';
      default:
        return '_overall';
    }
  }

  /**
   * Build field name with context suffix
   * @param {string} baseField - Base field name
   * @param {string} context - Context (overall, home, away)
   * @returns {string} Field name with context suffix
   */
  buildFieldName(baseField, context) {
    // If context is overall and the field doesn't need suffix, return as is
    if (context === 'overall' && !baseField.endsWith('_overall')) {
      return baseField;
    }
    
    // If the field already has a context suffix, return as is
    if (baseField.endsWith('_overall') || baseField.endsWith('_home') || baseField.endsWith('_away')) {
      return baseField;
    }
    
    // Add context suffix
    return baseField + this.getContextSuffix(context);
  }

  /**
   * Validate input statistics data
   * @param {Object} stats - Statistics data to validate
   * @returns {boolean} True if valid
   */
  validateInputData(stats) {
    return stats && typeof stats === 'object';
  }

  /**
   * Get field mappings for this processor
   * Should be overridden by child classes
   * @returns {Object} Field mappings {outputField: inputField}
   */
  getFieldMappings() {
    throw new Error('getFieldMappings() must be implemented by child classes');
  }

  /**
   * Get processor name for logging
   * @returns {string} Processor name
   */
  getProcessorName() {
    return this.constructor.name;
  }

  /**
   * Apply mathematical operations to field values
   * @param {number} value - Input value
   * @param {string} operation - Operation type ('round', 'floor', 'ceil', 'abs')
   * @param {number} precision - Decimal precision for rounding
   * @returns {number} Processed value
   */
  applyMathOperation(value, operation = 'round', precision = 2) {
    if (value === null || value === undefined || isNaN(value)) {
      return 0;
    }

    const numValue = parseFloat(value);
    
    switch (operation) {
      case 'round':
        return Math.round(numValue * Math.pow(10, precision)) / Math.pow(10, precision);
      case 'floor':
        return Math.floor(numValue);
      case 'ceil':
        return Math.ceil(numValue);
      case 'abs':
        return Math.abs(numValue);
      default:
        return numValue;
    }
  }

  /**
   * Calculate percentage value
   * @param {number} numerator - Numerator value
   * @param {number} denominator - Denominator value
   * @returns {number} Percentage value (0-100)
   */
  calculatePercentage(numerator, denominator) {
    if (!denominator || denominator === 0) {
      return 0;
    }
    return Math.round((numerator / denominator) * 100);
  }

  /**
   * Convert string values to appropriate types
   * @param {*} value - Input value
   * @param {string} type - Target type ('number', 'string', 'boolean')
   * @returns {*} Converted value
   */
  convertType(value, type = 'number') {
    if (value === null || value === undefined) {
      return type === 'number' ? 0 : value;
    }

    switch (type) {
      case 'number':
        const num = parseFloat(value);
        return isNaN(num) ? 0 : num;
      case 'string':
        return String(value);
      case 'boolean':
        return Boolean(value);
      default:
        return value;
    }
  }
}

module.exports = StatisticsProcessor;