const GoalsStatisticsProcessor = require('./GoalsStatisticsProcessor');
const CardsStatisticsProcessor = require('./CardsStatisticsProcessor');
const FormStatisticsProcessor = require('./FormStatisticsProcessor');
const Logger = require('../../utils/logger');

/**
 * Statistics Processor Factory
 * Manages creation and access to statistics processors
 */
class StatisticsProcessorFactory {
  constructor() {
    this.logger = new Logger('StatisticsProcessorFactory');
    this.processors = new Map();
    this.initializeProcessors();
  }

  /**
   * Initialize all statistics processors
   */
  initializeProcessors() {
    // Goals processor
    this.processors.set('goals', new GoalsStatisticsProcessor());
    
    // Cards processor
    this.processors.set('cards', new CardsStatisticsProcessor());
    
    // Form processor
    this.processors.set('form', new FormStatisticsProcessor());
    
    // TODO: Add more processors as they are created
    // this.processors.set('corners', new CornersStatisticsProcessor());
    // this.processors.set('offsides', new OffsideStatisticsProcessor());
    // this.processors.set('general', new GeneralStatisticsProcessor());
  }

  /**
   * Get a specific statistics processor
   * @param {string} processorType - Type of processor (goals, cards, corners, etc.)
   * @returns {StatisticsProcessor} Processor instance
   */
  getProcessor(processorType) {
    const processor = this.processors.get(processorType);
    if (!processor) {
      throw new Error(`Unknown processor type: ${processorType}`);
    }
    return processor;
  }

  /**
   * Get all available processors
   * @returns {Map} Map of all processors
   */
  getAllProcessors() {
    return this.processors;
  }

  /**
   * Get list of available processor types
   * @returns {Array} Array of processor type names
   */
  getAvailableProcessorTypes() {
    return Array.from(this.processors.keys());
  }

  /**
   * Process statistics using all processors
   * @param {Object} stats - Raw statistics data
   * @param {Object} additionalInfo - Additional statistics data
   * @returns {Object} Combined processed statistics from all processors
   */
  processAllStatistics(stats, additionalInfo) {
    const result = {};
    
    // Process with each processor
    for (const [processorType, processor] of this.processors) {
      try {
        const processorResult = processor.processStatistics(stats, additionalInfo);
        Object.assign(result, processorResult);
        
        this.logger.success(`${processorType} statistics processed successfully`);
      } catch (error) {
        this.logger.error(`Error processing ${processorType} statistics: ${error.message}`, error);
        // Continue with other processors even if one fails
      }
    }
    
    return result;
  }

  /**
   * Process statistics using specific processors
   * @param {Array} processorTypes - Array of processor types to use
   * @param {Object} stats - Raw statistics data
   * @param {Object} additionalInfo - Additional statistics data
   * @returns {Object} Combined processed statistics from specified processors
   */
  processWithProcessors(processorTypes, stats, additionalInfo) {
    const result = {};
    
    for (const processorType of processorTypes) {
      try {
        const processor = this.getProcessor(processorType);
        const processorResult = processor.processStatistics(stats, additionalInfo);
        Object.assign(result, processorResult);
        
        this.logger.success(`${processorType} statistics processed successfully`);
      } catch (error) {
        this.logger.error(`Error processing ${processorType} statistics: ${error.message}`, error);
        // Continue with other processors even if one fails
      }
    }
    
    return result;
  }

  /**
   * Add a new processor to the factory
   * @param {string} processorType - Type name for the processor
   * @param {StatisticsProcessor} processor - Processor instance
   */
  addProcessor(processorType, processor) {
    if (this.processors.has(processorType)) {
      this.logger.warn(`Processor type '${processorType}' already exists. Overwriting...`);
    }
    
    this.processors.set(processorType, processor);
    this.logger.info(`Processor '${processorType}' added to factory`);
  }

  /**
   * Remove a processor from the factory
   * @param {string} processorType - Type of processor to remove
   * @returns {boolean} True if processor was removed, false if not found
   */
  removeProcessor(processorType) {
    const removed = this.processors.delete(processorType);
    if (removed) {
      this.logger.info(`Processor '${processorType}' removed from factory`);
    } else {
      this.logger.warn(`Processor '${processorType}' not found`);
    }
    return removed;
  }

  /**
   * Check if a processor type is available
   * @param {string} processorType - Type of processor to check
   * @returns {boolean} True if processor is available
   */
  hasProcessor(processorType) {
    return this.processors.has(processorType);
  }

  /**
   * Get processor information
   * @returns {Object} Information about all processors
   */
  getProcessorInfo() {
    const info = {};
    
    for (const [processorType, processor] of this.processors) {
      info[processorType] = {
        name: processor.getProcessorName(),
        supportedContexts: processor.supportedContexts,
        fieldMappings: Object.keys(processor.getFieldMappings())
      };
    }
    
    return info;
  }

  /**
   * Validate statistics data against all processors
   * @param {Object} stats - Raw statistics data
   * @returns {Object} Validation results
   */
  validateStatisticsData(stats) {
    const validationResults = {};
    
    for (const [processorType, processor] of this.processors) {
      try {
        const isValid = processor.validateInputData(stats);
        validationResults[processorType] = {
          valid: isValid,
          message: isValid ? 'Valid' : 'Invalid statistics data'
        };
      } catch (error) {
        validationResults[processorType] = {
          valid: false,
          message: error.message
        };
      }
    }
    
    return validationResults;
  }

  /**
   * Get statistics summary
   * @param {Object} processedStats - Processed statistics data
   * @returns {Object} Statistics summary
   */
  getStatisticsSummary(processedStats) {
    const summary = {
      totalFields: Object.keys(processedStats).length,
      contexts: {
        overall: 0,
        home: 0,
        away: 0
      },
      categories: {}
    };
    
    // Count fields by context
    for (const fieldName of Object.keys(processedStats)) {
      if (fieldName.endsWith('_overall')) {
        summary.contexts.overall++;
      } else if (fieldName.endsWith('_home')) {
        summary.contexts.home++;
      } else if (fieldName.endsWith('_away')) {
        summary.contexts.away++;
      }
    }
    
    // Count fields by processor category
    for (const [processorType, processor] of this.processors) {
      const fieldMappings = processor.getFieldMappings();
      let categoryCount = 0;
      
      for (const outputField of Object.keys(fieldMappings)) {
        for (const context of processor.supportedContexts) {
          const fieldWithContext = outputField + processor.getContextSuffix(context);
          if (processedStats.hasOwnProperty(fieldWithContext)) {
            categoryCount++;
          }
        }
      }
      
      summary.categories[processorType] = categoryCount;
    }
    
    return summary;
  }
}

module.exports = StatisticsProcessorFactory;