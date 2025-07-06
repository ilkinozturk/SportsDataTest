/**
 * Secure Configuration Manager
 * Handles environment variables with validation and security checks
 */

const path = require('path');

class SecureConfigManager {
  constructor() {
    this.config = {};
    this.sensitiveKeys = [
      'FOOTYSTATS_API_KEY',
      'SESSION_SECRET',
      'JWT_SECRET',
      'DATABASE_PASSWORD',
      'REDIS_PASSWORD'
    ];
    this.requiredKeys = ['FOOTYSTATS_API_KEY'];
    this.loadConfig();
  }

  /**
   * Load configuration from environment variables
   */
  loadConfig() {
    // In development, load from .env files if they exist
    if (process.env.NODE_ENV !== 'production') {
      try {
        require('dotenv').config({ path: '.env' });
        require('dotenv').config({ path: '.env.local' });
      } catch (error) {
        // Dotenv is optional in development
      }
    }

    // Load from process.env (highest priority)
    this.config = { ...process.env };

    // Validate required keys
    this.validateRequiredKeys();
  }

  /**
   * Get configuration value
   * @param {string} key - Configuration key
   * @param {*} defaultValue - Default value if key not found
   * @returns {*} Configuration value
   */
  get(key, defaultValue = undefined) {
    const value = this.config[key] || process.env[key];
    
    if (value === undefined && this.requiredKeys.includes(key)) {
      throw new Error(`Required configuration key "${key}" is not set`);
    }

    return value !== undefined ? value : defaultValue;
  }

  /**
   * Check if a key exists
   * @param {string} key - Configuration key
   * @returns {boolean}
   */
  has(key) {
    return this.config[key] !== undefined || process.env[key] !== undefined;
  }

  /**
   * Validate required keys are present
   */
  validateRequiredKeys() {
    const missingKeys = [];
    
    for (const key of this.requiredKeys) {
      if (!this.has(key)) {
        missingKeys.push(key);
      }
    }

    if (missingKeys.length > 0) {
      const message = `Missing required environment variables: ${missingKeys.join(', ')}\n` +
        `Please set these variables in your environment or .env file`;
      
      if (process.env.NODE_ENV === 'production') {
        // In production, throw error immediately
        throw new Error(message);
      } else {
        // In development, warn but continue
        console.warn(`⚠️  ${message}`);
      }
    }
  }

  /**
   * Get safe configuration for logging (masks sensitive values)
   * @returns {Object} Safe configuration object
   */
  getSafeConfig() {
    const safeConfig = {};
    
    for (const [key, value] of Object.entries(this.config)) {
      if (this.sensitiveKeys.includes(key)) {
        safeConfig[key] = this.maskSensitiveValue(value);
      } else {
        safeConfig[key] = value;
      }
    }
    
    return safeConfig;
  }

  /**
   * Mask sensitive value for logging
   * @param {string} value - Value to mask
   * @returns {string} Masked value
   */
  maskSensitiveValue(value) {
    if (!value || typeof value !== 'string') return '[NOT SET]';
    if (value.length <= 8) return '[SET]';
    
    const visibleLength = Math.min(4, Math.floor(value.length / 4));
    return value.substring(0, visibleLength) + '*'.repeat(value.length - visibleLength);
  }

  /**
   * Validate API key format
   * @param {string} apiKey - API key to validate
   * @returns {boolean}
   */
  validateApiKey(apiKey) {
    if (!apiKey) return false;
    
    // FootyStats API keys are typically 64 characters long
    if (apiKey.length < 32 || apiKey.length > 128) return false;
    
    // Should only contain alphanumeric characters
    if (!/^[a-zA-Z0-9]+$/.test(apiKey)) return false;
    
    return true;
  }

  /**
   * Get validated API key
   * @returns {string} Validated API key
   * @throws {Error} If API key is invalid
   */
  getApiKey() {
    const apiKey = this.get('FOOTYSTATS_API_KEY');
    
    if (!this.validateApiKey(apiKey)) {
      throw new Error('Invalid API key format. Please check your FOOTYSTATS_API_KEY environment variable.');
    }
    
    return apiKey;
  }

  /**
   * Check if running in production
   * @returns {boolean}
   */
  isProduction() {
    return this.get('NODE_ENV') === 'production';
  }

  /**
   * Get all configuration as object
   * @returns {Object}
   */
  getAll() {
    return { ...this.config };
  }
}

// Export singleton instance
module.exports = new SecureConfigManager();