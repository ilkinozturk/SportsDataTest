/**
 * Team Stats Constants Module
 * Centralized configuration and constants management
 * @module TeamStatsConstants
 */

(function(global) {
  'use strict';

  /**
   * Constants Manager Class
   * Provides centralized, immutable constants and configuration
   */
  class ConstantsManager {
    constructor() {
      // Private storage for constants
      this._constants = new Map();
      this._frozen = false;
      
      // Initialize with default constants
      this._initializeDefaults();
    }

    /**
     * Initialize default constants
     * @private
     */
    _initializeDefaults() {
      // API Configuration
      this.define('API', {
        BASE_URL: '/api',
        TIMEOUT: 30000,
        RETRY_ATTEMPTS: 3,
        RETRY_DELAY: 1000,
        CACHE_DURATION: 30 * 60 * 1000, // 30 minutes
        RATE_LIMIT_DELAY: 1000,
        MAX_CONCURRENT_REQUESTS: 5
      });

      // API Endpoints
      this.define('ENDPOINTS', {
        TEAM_DATA: 'teams/data',
        MATCH_DETAILS: 'match/:matchId',
        LEAGUE_TEAMS: 'league-teams',
        LEAGUE_LIST: 'league-list',
        CHOSEN_LEAGUES: 'chosen-leagues',
        TEAM_SEARCH: 'teams/search',
        TEAM_STANDINGS: 'teams/standings'
      });

      // Filter Types
      this.define('FILTERS', {
        VENUE: ['overall', 'home', 'away'],
        TIMEFRAME: ['overall', 'last5', 'last10'],
        MATCH_TYPE: ['all', 'league', 'cup', 'friendly'],
        RESULT: ['all', 'wins', 'draws', 'losses']
      });

      // Statistics Categories
      this.define('STAT_CATEGORIES', {
        GENERAL: ['matches', 'wins', 'draws', 'losses', 'points'],
        GOALS: ['goalsFor', 'goalsAgainst', 'goalDifference', 'avgGoalsFor', 'avgGoalsAgainst'],
        CARDS: ['yellowCards', 'redCards', 'cardsTotal', 'cardsFor', 'cardsAgainst'],
        CORNERS: ['cornersFor', 'cornersAgainst', 'cornersTotal', 'avgCornersFor', 'avgCornersAgainst'],
        POSSESSION: ['avgPossession', 'avgPassAccuracy', 'avgShots', 'avgShotsOnTarget'],
        FORM: ['ppg', 'form', 'cleanSheets', 'failedToScore', 'btts']
      });

      // Tab Names
      this.define('TABS', {
        OVERVIEW: 'overview',
        GOALS: 'goals',
        CARDS: 'cards',
        CORNERS: 'corners',
        HALFTIME: 'half-time',
        MATCHES: 'matches',
        PLAYERS: 'players'
      });

      // Event Names
      this.define('EVENTS', {
        // Data Events
        TEAM_LOADED: 'data:team:loaded',
        MATCH_LOADED: 'data:match:loaded',
        STATISTICS_UPDATED: 'data:statistics:updated',
        
        // API Events
        REQUEST_START: 'api:request:start',
        REQUEST_SUCCESS: 'api:request:success',
        REQUEST_ERROR: 'api:request:error',
        REQUEST_RETRY: 'api:retry',
        
        // Cache Events
        CACHE_HIT: 'api:cache:hit',
        CACHE_MISS: 'api:cache:miss',
        CACHE_CLEARED: 'api:cache:cleared',
        
        // State Events
        STATE_CHANGED: 'state:changed',
        FILTER_CHANGED: 'filter:changed',
        TAB_CHANGED: 'tab:changed',
        
        // UI Events
        LOADING_START: 'ui:loading:start',
        LOADING_END: 'ui:loading:end',
        ERROR_SHOWN: 'ui:error:shown',
        NOTIFICATION_SHOWN: 'ui:notification:shown'
      });

      // Error Types
      this.define('ERROR_TYPES', {
        NETWORK: 'NETWORK_ERROR',
        TIMEOUT: 'TIMEOUT_ERROR',
        AUTH: 'AUTH_ERROR',
        NOT_FOUND: 'NOT_FOUND_ERROR',
        SERVER: 'SERVER_ERROR',
        VALIDATION: 'VALIDATION_ERROR',
        RATE_LIMIT: 'RATE_LIMIT_ERROR',
        CANCELLED: 'REQUEST_CANCELLED'
      });

      // Status Codes
      this.define('STATUS_CODES', {
        OK: 200,
        CREATED: 201,
        NO_CONTENT: 204,
        BAD_REQUEST: 400,
        UNAUTHORIZED: 401,
        FORBIDDEN: 403,
        NOT_FOUND: 404,
        RATE_LIMITED: 429,
        SERVER_ERROR: 500,
        SERVICE_UNAVAILABLE: 503
      });

      // Time Periods
      this.define('TIME_PERIODS', {
        MINUTE: 60 * 1000,
        HOUR: 60 * 60 * 1000,
        DAY: 24 * 60 * 60 * 1000,
        WEEK: 7 * 24 * 60 * 60 * 1000,
        MONTH: 30 * 24 * 60 * 60 * 1000
      });

      // Regex Patterns
      this.define('PATTERNS', {
        EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        TEAM_ID: /^\d+$/,
        MATCH_ID: /^\d+$/,
        SEASON_FORMAT: /^\d{4}\/\d{4}$/,
        DATE_FORMAT: /^\d{4}-\d{2}-\d{2}$/
      });

      // Color Schemes
      this.define('COLORS', {
        PRIMARY: '#1a1a1a',
        SECONDARY: '#2196F3',
        SUCCESS: '#4CAF50',
        WARNING: '#ff9800',
        ERROR: '#f44336',
        INFO: '#2196F3',
        DARK: '#0d0d0d',
        LIGHT: '#ffffff',
        GRAY: '#666666'
      });

      // Chart Colors
      this.define('CHART_COLORS', {
        WINS: '#4CAF50',
        DRAWS: '#ff9800',
        LOSSES: '#f44336',
        GOALS_FOR: '#2196F3',
        GOALS_AGAINST: '#ff5252',
        HOME: '#4CAF50',
        AWAY: '#ff9800'
      });

      // Breakpoints
      this.define('BREAKPOINTS', {
        MOBILE: 480,
        TABLET: 768,
        DESKTOP: 1024,
        WIDE: 1440
      });

      // Animation Durations
      this.define('ANIMATIONS', {
        FAST: 200,
        NORMAL: 300,
        SLOW: 500,
        VERY_SLOW: 1000
      });

      // Local Storage Keys
      this.define('STORAGE_KEYS', {
        USER_PREFERENCES: 'teamstats_preferences',
        CACHED_TEAMS: 'teamstats_cached_teams',
        LAST_VIEWED: 'teamstats_last_viewed',
        FAVORITES: 'teamstats_favorites',
        THEME: 'teamstats_theme',
        LANGUAGE: 'teamstats_language'
      });

      // Default Values
      this.define('DEFAULTS', {
        TEAM_ID: null,
        FILTER: 'overall',
        TAB: 'overview',
        PAGE_SIZE: 20,
        SORT_ORDER: 'desc',
        THEME: 'dark',
        LANGUAGE: 'en'
      });

      // Validation Rules
      this.define('VALIDATION', {
        MIN_TEAM_ID: 1,
        MAX_TEAM_ID: 999999,
        MIN_PAGE: 1,
        MAX_PAGE: 1000,
        MIN_PAGE_SIZE: 1,
        MAX_PAGE_SIZE: 100,
        MAX_SEARCH_LENGTH: 100,
        MAX_CACHE_SIZE: 100 * 1024 * 1024 // 100MB
      });

      // Feature Flags
      this.define('FEATURES', {
        ENABLE_CACHE: true,
        ENABLE_RETRY: true,
        ENABLE_ANALYTICS: false,
        ENABLE_DEBUG: false,
        ENABLE_MOCK_DATA: false,
        ENABLE_WEBSOCKET: false,
        ENABLE_NOTIFICATIONS: true
      });

      // Version Info
      this.define('VERSION', {
        API: '1.0.0',
        APP: '1.3.0',
        MODULE: '1.0.0'
      });
    }

    /**
     * Define a new constant
     * @param {string} key - Constant key
     * @param {*} value - Constant value (will be frozen)
     * @throws {Error} If constants are frozen or key exists
     */
    define(key, value) {
      if (this._frozen) {
        throw new Error('Cannot define new constants after freeze()');
      }

      if (this._constants.has(key)) {
        throw new Error(`Constant "${key}" is already defined`);
      }

      // Deep freeze objects
      const frozenValue = this._deepFreeze(value);
      this._constants.set(key, frozenValue);
    }

    /**
     * Get a constant value
     * @param {string} key - Constant key
     * @param {string} [path] - Nested path (e.g., 'API.TIMEOUT')
     * @returns {*} Constant value
     */
    get(key, path) {
      if (!this._constants.has(key)) {
        console.warn(`Constant "${key}" not found`);
        return undefined;
      }

      const value = this._constants.get(key);

      if (path) {
        return this._getNestedValue(value, path);
      }

      return value;
    }

    /**
     * Get nested value from object
     * @private
     */
    _getNestedValue(obj, path) {
      const keys = path.split('.');
      let current = obj;

      for (const key of keys) {
        if (current && typeof current === 'object' && key in current) {
          current = current[key];
        } else {
          return undefined;
        }
      }

      return current;
    }

    /**
     * Check if a constant exists
     * @param {string} key - Constant key
     * @returns {boolean}
     */
    has(key) {
      return this._constants.has(key);
    }

    /**
     * Get all constants
     * @returns {Object} All constants as plain object
     */
    getAll() {
      const result = {};
      this._constants.forEach((value, key) => {
        result[key] = value;
      });
      return this._deepFreeze(result);
    }

    /**
     * Deep freeze an object
     * @private
     */
    _deepFreeze(obj) {
      // Primitive values don't need freezing
      if (obj === null || typeof obj !== 'object') {
        return obj;
      }

      // Already frozen
      if (Object.isFrozen(obj)) {
        return obj;
      }

      // Arrays
      if (Array.isArray(obj)) {
        return Object.freeze(obj.map(item => this._deepFreeze(item)));
      }

      // Objects
      const frozen = {};
      Object.keys(obj).forEach(key => {
        frozen[key] = this._deepFreeze(obj[key]);
      });

      return Object.freeze(frozen);
    }

    /**
     * Freeze all constants (prevent further modifications)
     */
    freeze() {
      this._frozen = true;
      console.log('Constants frozen - no further modifications allowed');
    }

    /**
     * Create a namespace with prefixed constants
     * @param {string} namespace - Namespace prefix
     * @param {Object} constants - Constants to add
     */
    namespace(namespace, constants) {
      if (this._frozen) {
        throw new Error('Cannot create namespace after freeze()');
      }

      const namespacedConstants = {};
      Object.keys(constants).forEach(key => {
        namespacedConstants[key] = constants[key];
      });

      this.define(namespace, namespacedConstants);
    }

    /**
     * Extend existing constants (before freeze)
     * @param {string} key - Constant key to extend
     * @param {Object} extensions - New properties to add
     */
    extend(key, extensions) {
      if (this._frozen) {
        throw new Error('Cannot extend constants after freeze()');
      }

      if (!this._constants.has(key)) {
        throw new Error(`Cannot extend non-existent constant "${key}"`);
      }

      const current = this._constants.get(key);
      if (typeof current !== 'object' || Array.isArray(current)) {
        throw new Error(`Cannot extend non-object constant "${key}"`);
      }

      const extended = { ...current, ...extensions };
      this._constants.set(key, this._deepFreeze(extended));
    }

    /**
     * Get constants for specific feature/module
     * @param {string} feature - Feature name
     * @returns {Object} Feature-specific constants
     */
    getFeatureConstants(feature) {
      const featureUpper = feature.toUpperCase();
      const result = {};

      this._constants.forEach((value, key) => {
        if (key.includes(featureUpper) || key === featureUpper) {
          result[key] = value;
        }
      });

      return result;
    }

    /**
     * Validate value against constant options
     * @param {string} constantKey - Constant key containing valid options
     * @param {*} value - Value to validate
     * @returns {boolean} Is valid
     */
    isValidOption(constantKey, value) {
      // Support nested paths like 'FILTERS.VENUE'
      let options;
      
      if (constantKey.includes('.')) {
        const [mainKey, subKey] = constantKey.split('.');
        const mainConstant = this.get(mainKey);
        options = mainConstant && mainConstant[subKey];
      } else {
        options = this.get(constantKey);
      }
      
      if (Array.isArray(options)) {
        return options.includes(value);
      }
      
      if (typeof options === 'object') {
        return Object.values(options).includes(value);
      }

      return false;
    }

    /**
     * Get constant by pattern matching
     * @param {RegExp|string} pattern - Pattern to match keys
     * @returns {Object} Matching constants
     */
    findByPattern(pattern) {
      const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern, 'i');
      const result = {};

      this._constants.forEach((value, key) => {
        if (regex.test(key)) {
          result[key] = value;
        }
      });

      return result;
    }
  }

  // Create singleton instance
  const constants = new ConstantsManager();

  // Expose to global scope
  global.TeamStatsConstants = constants;

  // For convenience, expose common getters
  global.CONSTANTS = {
    get API() { return constants.get('API'); },
    get ENDPOINTS() { return constants.get('ENDPOINTS'); },
    get EVENTS() { return constants.get('EVENTS'); },
    get FILTERS() { return constants.get('FILTERS'); },
    get TABS() { return constants.get('TABS'); },
    get COLORS() { return constants.get('COLORS'); },
    get DEFAULTS() { return constants.get('DEFAULTS'); }
  };

  console.log('Team Stats Constants Module initialized');

})(window);