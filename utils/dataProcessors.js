// Data Processing Utility Functions

/**
 * Format number to fixed decimal places
 * @param {number} value - The value to format
 * @param {number} decimals - Number of decimal places
 * @returns {number} Formatted number
 */
function formatNumber(value, decimals = 2) {
  if (value === null || value === undefined || isNaN(value)) {
    return 0;
  }
  return Number(parseFloat(value).toFixed(decimals));
}

/**
 * Calculate percentage
 * @param {number} value - The value
 * @param {number} total - The total
 * @returns {number} Percentage
 */
function calculatePercentage(value, total) {
  if (!total || total === 0) {
    return 0;
  }
  return formatNumber((value / total) * 100);
}

/**
 * Calculate average
 * @param {number} total - Total value
 * @param {number} count - Number of items
 * @returns {number} Average
 */
function calculateAverage(total, count) {
  if (!count || count === 0) {
    return 0;
  }
  return formatNumber(total / count);
}

/**
 * Get value with fallback
 * @param {object} obj - Object to check
 * @param {string[]} keys - Keys to try
 * @param {any} defaultValue - Default value if not found
 * @returns {any} Found value or default
 */
function getValueWithFallback(obj, keys, defaultValue = 0) {
  for (const key of keys) {
    if (obj && obj[key] !== undefined && obj[key] !== null) {
      return obj[key];
    }
  }
  return defaultValue;
}

/**
 * Safe parse integer
 * @param {any} value - Value to parse
 * @param {number} defaultValue - Default if parse fails
 * @returns {number} Parsed integer
 */
function safeParseInt(value, defaultValue = 0) {
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Safe parse float
 * @param {any} value - Value to parse
 * @param {number} defaultValue - Default if parse fails
 * @returns {number} Parsed float
 */
function safeParseFloat(value, defaultValue = 0) {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Extract suffix from field name
 * @param {string} fieldName - Field name
 * @returns {string|null} Suffix or null
 */
function extractSuffix(fieldName) {
  const suffixes = ['_overall', '_home', '_away'];
  for (const suffix of suffixes) {
    if (fieldName.endsWith(suffix)) {
      return suffix;
    }
  }
  return null;
}

/**
 * Remove suffix from field name
 * @param {string} fieldName - Field name
 * @returns {string} Field name without suffix
 */
function removeSuffix(fieldName) {
  const suffix = extractSuffix(fieldName);
  if (suffix) {
    return fieldName.slice(0, -suffix.length);
  }
  return fieldName;
}

module.exports = {
  formatNumber,
  calculatePercentage,
  calculateAverage,
  getValueWithFallback,
  safeParseInt,
  safeParseFloat,
  extractSuffix,
  removeSuffix,
};
