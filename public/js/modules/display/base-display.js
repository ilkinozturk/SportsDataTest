/**
 * Base Display Module
 * Parent class for all display modules providing common functionality
 */

(function(global) {
  'use strict';

  class BaseDisplay {
    constructor(name) {
      this.name = name;
      this.eventBus = global.TeamStatsEventBus;
      this.stateManager = global.TeamStatsStateManager;
      this.initialized = false;
      this.lastStatistics = null;
      this.elementMappings = {};
      this.debug = true;
    }

    /**
     * Initialize the display module
     */
    initialize() {
      if (this.initialized) {
        this.log('warn', 'Already initialized');
        return;
      }

      this.log('info', 'Initializing...');
      this.setupEventListeners();
      this.setupElementMappings();
      this.initialized = true;
      this.log('info', '✓ Initialized successfully');
    }

    /**
     * Setup event listeners - override in child classes
     */
    setupEventListeners() {
      if (this.eventBus) {
        // Listen for initial data load
        this.eventBus.on('data:team:loaded', this.handleTeamDataLoaded.bind(this));
        
        // Listen for filter changes
        this.eventBus.on('filters:change', this.handleFilterChange.bind(this));
        
        // Listen for state changes
        if (this.stateManager) {
          this.stateManager.subscribe('statistics', this.handleStatisticsUpdate.bind(this));
        }
      }
    }

    /**
     * Setup element mappings - override in child classes
     */
    setupElementMappings() {
      // Child classes should define their element mappings
      // Example:
      // this.elementMappings = {
      //   'scoredPerMatch': ['scoredPerMatch', 'scoredPerMatchAll'],
      //   'totalGoals': ['totalGoals', 'goalsTotal']
      // };
    }

    /**
     * Handle team data loaded event
     */
    handleTeamDataLoaded(eventData) {
      this.log('info', 'Team data loaded event received');
      
      if (eventData && eventData.data && eventData.data.statistics) {
        this.lastStatistics = eventData.data.statistics;
        const currentFilter = this.getCurrentFilter();
        this.updateDisplay(eventData.data.statistics, currentFilter);
      }
    }

    /**
     * Handle filter change event
     */
    handleFilterChange(filterData) {
      this.log('info', 'Filter change event received:', filterData);
      
      const filter = this.extractFilterValue(filterData);
      if (this.lastStatistics) {
        this.updateDisplay(this.lastStatistics, filter);
      }
    }

    /**
     * Handle statistics update from state manager
     */
    handleStatisticsUpdate(statistics) {
      this.log('info', 'Statistics updated in state');
      
      if (statistics) {
        this.lastStatistics = statistics;
        const currentFilter = this.getCurrentFilter();
        this.updateDisplay(statistics, currentFilter);
      }
    }

    /**
     * Main update method - override in child classes
     */
    updateDisplay(statistics, filter) {
      this.log('warn', 'updateDisplay not implemented in child class');
    }

    /**
     * Update a single element by ID
     */
    updateElement(id, value) {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = value;
        return true;
      }
      return false;
    }

    /**
     * Update multiple elements with the same value
     */
    updateElementGroup(mappingKey, value) {
      const ids = this.elementMappings[mappingKey] || [mappingKey];
      let updated = 0;
      
      ids.forEach(id => {
        if (this.updateElement(id, value)) {
          updated++;
        }
      });
      
      if (updated === 0 && this.debug) {
        this.log('warn', `No elements found for mapping: ${mappingKey}`);
      }
      
      return updated;
    }

    /**
     * Update multiple elements with different values
     */
    updateElements(mappings) {
      Object.entries(mappings).forEach(([id, value]) => {
        this.updateElement(id, value);
      });
    }

    /**
     * Get current filter value
     */
    getCurrentFilter() {
      return this.stateManager?.get('filters.current') || 'overall';
    }

    /**
     * Extract filter value from various event formats
     */
    extractFilterValue(filterData) {
      if (typeof filterData === 'string') {
        return filterData;
      }
      
      return filterData.value || filterData.venue || filterData.filter || 'overall';
    }

    /**
     * Get statistic value with filter suffix
     */
    getStatValue(statistics, key, filter = 'overall') {
      if (filter === 'overall') {
        return statistics[key] || statistics[`${key}_overall`] || 0;
      }
      
      const suffix = `_${filter}`;
      return statistics[`${key}${suffix}`] || statistics[`${filter}${key.charAt(0).toUpperCase() + key.slice(1)}`] || 0;
    }

    /**
     * Format percentage value
     */
    formatPercentage(value) {
      return `${value || 0}%`;
    }

    /**
     * Format decimal value
     */
    formatDecimal(value, decimals = 2) {
      return (value || 0).toFixed(decimals);
    }

    /**
     * Calculate per match value
     */
    calculatePerMatch(total, matches) {
      if (!matches || matches === 0) return 0;
      return total / matches;
    }

    /**
     * Log helper
     */
    log(level, ...args) {
      if (!this.debug && level !== 'error') return;
      
      const prefix = `[${this.name}]`;
      switch (level) {
        case 'error':
          console.error(prefix, ...args);
          break;
        case 'warn':
          console.warn(prefix, ...args);
          break;
        case 'info':
        default:
          console.log(prefix, ...args);
      }
    }

    /**
     * Create DOM element helper
     */
    createElement(tag, attributes = {}) {
      const element = document.createElement(tag);
      
      Object.entries(attributes).forEach(([key, value]) => {
        if (key === 'className') {
          element.className = value;
        } else if (key === 'innerHTML') {
          element.innerHTML = value;
        } else if (key === 'textContent') {
          element.textContent = value;
        } else if (key === 'style' && typeof value === 'object') {
          Object.assign(element.style, value);
        } else {
          element.setAttribute(key, value);
        }
      });
      
      return element;
    }

    /**
     * Show/hide element
     */
    toggleElement(id, show) {
      const element = document.getElementById(id);
      if (element) {
        element.style.display = show ? '' : 'none';
      }
    }

    /**
     * Add/remove CSS class
     */
    toggleClass(id, className, add) {
      const element = document.getElementById(id);
      if (element) {
        if (add) {
          element.classList.add(className);
        } else {
          element.classList.remove(className);
        }
      }
    }
  }

  // Export to global scope
  global.TeamStatsBaseDisplay = BaseDisplay;

  console.log('Base Display module loaded');

})(window);