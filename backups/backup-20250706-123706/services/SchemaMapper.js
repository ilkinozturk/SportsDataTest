/**
 * SchemaMapper - Centralized field mapping service
 * Maps API response fields to frontend fields using schema definitions
 */

const { TeamStatsSchema, SpecialMappings } = require('../schemas/teamStatsSchema');
const Logger = require('../utils/logger');

class SchemaMapper {
  constructor() {
    this.logger = new Logger('SchemaMapper');
    this.schema = TeamStatsSchema;
    this.specialMappings = SpecialMappings;
    this.cache = new Map();
  }

  /**
   * Map API response to frontend structure using schema
   * @param {Object} apiData - Raw API response data
   * @param {String} context - Context for mapping (overall/home/away)
   * @returns {Object} Mapped data following frontend structure
   */
  mapTeamStats(apiData, context = 'overall') {
    const cacheKey = `${JSON.stringify(apiData)}_${context}`;

    // Check cache
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const result = {
      basic: {},
      goals: {},
      corners: {},
      cards: {},
      results: {},
      xg: {},
    };

    // Extract data sources
    const stats = apiData.stats || apiData || {};
    // additional_info genellikle stats içinde bulunur
    const additionalInfo = stats.additional_info || apiData.additional_info || {};
    const apiStats = apiData;

    // Map each category
    Object.keys(this.schema).forEach(category => {
      result[category] = this.mapCategory(category, stats, additionalInfo, apiStats, context);
    });

    // Cache result
    this.cache.set(cacheKey, result);
    return result;
  }

  /**
   * Map a specific category of fields
   */
  mapCategory(category, stats, additionalInfo, apiStats, context) {
    const categorySchema = this.schema[category];
    const mapped = {};

    Object.keys(categorySchema).forEach(fieldName => {
      const fieldConfig = categorySchema[fieldName];
      const value = this.findFieldValue(
        fieldName,
        fieldConfig,
        stats,
        additionalInfo,
        apiStats,
        context
      );
      mapped[fieldName] = value;
    });

    return mapped;
  }

  /**
   * Find field value from multiple sources
   */
  findFieldValue(fieldName, fieldConfig, stats, additionalInfo, apiStats, context) {
    // Check if this is a suffix field that needs context
    if (this.specialMappings.suffixFields.includes(fieldName)) {
      return this.findSuffixFieldValue(
        fieldName,
        fieldConfig,
        stats,
        additionalInfo,
        apiStats,
        context
      );
    }

    // Try each source in order
    for (const source of fieldConfig.sources) {
      // First check additional_info
      if (additionalInfo[source] !== undefined && additionalInfo[source] !== null) {
        return additionalInfo[source];
      }

      // Then check stats
      if (stats[source] !== undefined && stats[source] !== null) {
        return stats[source];
      }

      // Finally check apiStats
      if (apiStats[source] !== undefined && apiStats[source] !== null) {
        return apiStats[source];
      }
    }

    // Return default value
    return fieldConfig.default;
  }

  /**
   * Find field value for suffix fields (overall/home/away)
   */
  findSuffixFieldValue(fieldName, fieldConfig, stats, additionalInfo, apiStats, context) {
    // Build field names with suffix
    const suffixedFieldName = `${fieldName}_${context}`;

    // Debug logging for specific fields
    if (
      fieldName === 'winPercentage' ||
      fieldName === 'cleanSheets' ||
      fieldName === 'totalCards'
    ) {
      this.logger.debug(`Looking for ${fieldName} in ${context} context`, {
        sources: fieldConfig.sources,
        context
      });
    }

    // First check with suffix
    for (const source of fieldConfig.sources) {
      const suffixedSource = `${source}_${context}`;

      // Check additional_info first (for special fields like team_with_most_corners_win_percentage)
      if (this.specialMappings.additionalInfoFields.some(field => suffixedSource.includes(field))) {
        if (
          additionalInfo[suffixedSource] !== undefined &&
          additionalInfo[suffixedSource] !== null
        ) {
          return additionalInfo[suffixedSource];
        }
      }

      // Check additional_info
      if (additionalInfo[suffixedSource] !== undefined && additionalInfo[suffixedSource] !== null) {
        return additionalInfo[suffixedSource];
      }

      // Check stats
      if (stats[suffixedSource] !== undefined && stats[suffixedSource] !== null) {
        if (
          fieldName === 'winPercentage' ||
          fieldName === 'cleanSheets' ||
          fieldName === 'totalCards'
        ) {
          this.logger.debug(`Found ${suffixedSource} in stats`, {
            field: suffixedSource,
            value: stats[suffixedSource]
          });
        }
        return stats[suffixedSource];
      }

      // Check apiStats
      if (apiStats[suffixedSource] !== undefined && apiStats[suffixedSource] !== null) {
        return apiStats[suffixedSource];
      }

      // Also check in the main apiStats.stats object
      if (
        apiStats.stats &&
        apiStats.stats[suffixedSource] !== undefined &&
        apiStats.stats[suffixedSource] !== null
      ) {
        return apiStats.stats[suffixedSource];
      }

      // Check in apiStats.stats.additional_info
      if (
        apiStats.stats &&
        apiStats.stats.additional_info &&
        apiStats.stats.additional_info[suffixedSource] !== undefined &&
        apiStats.stats.additional_info[suffixedSource] !== null
      ) {
        return apiStats.stats.additional_info[suffixedSource];
      }
    }

    // Try without suffix as fallback
    for (const source of fieldConfig.sources) {
      if (additionalInfo[source] !== undefined && additionalInfo[source] !== null) {
        return additionalInfo[source];
      }
      if (stats[source] !== undefined && stats[source] !== null) {
        return stats[source];
      }
      if (apiStats[source] !== undefined && apiStats[source] !== null) {
        return apiStats[source];
      }
      if (
        apiStats.stats &&
        apiStats.stats[source] !== undefined &&
        apiStats.stats[source] !== null
      ) {
        return apiStats.stats[source];
      }
    }

    return fieldConfig.default;
  }

  /**
   * Get raw field mapping for debugging
   */
  getFieldMapping(fieldPath) {
    const parts = fieldPath.split('.');
    let current = this.schema;

    for (const part of parts) {
      if (current[part]) {
        current = current[part];
      } else {
        return null;
      }
    }

    return current;
  }

  /**
   * Validate mapped data against schema
   */
  validateMappedData(mappedData) {
    const errors = [];

    Object.keys(this.schema).forEach(category => {
      if (!mappedData[category]) {
        errors.push(`Missing category: ${category}`);
        return;
      }

      Object.keys(this.schema[category]).forEach(field => {
        if (mappedData[category][field] === undefined) {
          errors.push(`Missing field: ${category}.${field}`);
        }
      });
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }
}

module.exports = SchemaMapper;
