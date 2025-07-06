/**
 * FilterManager - Centralized filter state management with performance optimizations
 * Manages all filter states for different statistics sections
 */
export class FilterManager {
  constructor() {
    // Initialize filters map with default values
    this.filters = new Map([
      ['current', 'overall'],
      ['cards', 'overall'],
      ['xg', 'overall'],
      ['halftime', 'overall'],
      ['timing', 'overall'],
      ['goalTimings', 'overall'],
      ['shots', 'overall'],
      ['corners', 'overall'],
      ['teamCorners', 'overall'],
      ['teamCards', 'overall'],
      ['matchCards', 'overall'],
      ['mainStats', 'overall'],
      ['overallStats', 'overall'],
      ['allStats', 'overall']
    ]);

    // Event listeners for filter changes
    this.listeners = new Map();
    
    // Performance optimization
    this.pendingUpdates = new Map();
    this.updateDelay = 100; // ms
    this.throttleDelay = 50; // ms
    this.lastThrottleTime = new Map();
    
    // Batch update support
    this.batchMode = false;
    this.batchQueue = [];

    // Bind methods
    this.getFilter = this.getFilter.bind(this);
    this.setFilter = this.setFilter.bind(this);
    this._performUpdate = this._performUpdate.bind(this);
  }

  /**
   * Get current filter value for a specific section
   * @param {string} section - The section name
   * @returns {string} Current filter value
   */
  getFilter(section) {
    return this.filters.get(section) || 'overall';
  }

  /**
   * Set filter value for a specific section with optimization options
   * @param {string} section - The section name
   * @param {string} value - The filter value (overall, home, away)
   * @param {Object} options - Optimization options
   */
  setFilter(section, value, options = {}) {
    const { 
      immediate = false, 
      silent = false,
      debounce = true,
      throttle = false 
    } = options;
    
    // Check if value actually changed
    const currentValue = this.filters.get(section);
    if (currentValue === value) return;
    
    // If in batch mode, queue the update
    if (this.batchMode) {
      this.batchQueue.push({ section, value, silent });
      return;
    }
    
    // Throttle check
    if (throttle && !immediate) {
      const now = Date.now();
      const lastTime = this.lastThrottleTime.get(section) || 0;
      
      if (now - lastTime < this.throttleDelay) {
        // Skip this update due to throttling
        return;
      }
      
      this.lastThrottleTime.set(section, now);
    }
    
    // Cancel pending debounced update if exists
    if (this.pendingUpdates.has(section)) {
      clearTimeout(this.pendingUpdates.get(section));
      this.pendingUpdates.delete(section);
    }
    
    if (immediate || !debounce) {
      this._performUpdate(section, value, silent);
    } else {
      // Debounce update
      const timeoutId = setTimeout(() => {
        this._performUpdate(section, value, silent);
        this.pendingUpdates.delete(section);
      }, this.updateDelay);
      
      this.pendingUpdates.set(section, timeoutId);
    }
  }

  /**
   * Perform the actual update
   * @private
   */
  _performUpdate(section, value, silent) {
    const oldValue = this.filters.get(section);
    this.filters.set(section, value);
    
    // Update UI if not silent
    if (!silent) {
      this.updateFilterUI(section, value);
    }
    
    // Emit change event if value changed and not silent
    if (oldValue !== value && !silent) {
      this.emitChange(section, value, oldValue);
    }
  }

  /**
   * Start batch mode for multiple updates
   */
  startBatch() {
    this.batchMode = true;
    this.batchQueue = [];
  }

  /**
   * Execute all batched updates
   */
  executeBatch() {
    this.batchMode = false;
    
    // Group updates by section to avoid duplicate updates
    const updates = new Map();
    
    this.batchQueue.forEach(({ section, value, silent }) => {
      updates.set(section, { value, silent });
    });
    
    // Execute all unique updates
    updates.forEach(({ value, silent }, section) => {
      this._performUpdate(section, value, silent);
    });
    
    this.batchQueue = [];
  }

  /**
   * Cancel all pending updates
   */
  cancelPendingUpdates() {
    this.pendingUpdates.forEach(timeoutId => clearTimeout(timeoutId));
    this.pendingUpdates.clear();
  }

  /**
   * Set update delays
   * @param {number} debounceDelay - Debounce delay in ms
   * @param {number} throttleDelay - Throttle delay in ms
   */
  setDelays(debounceDelay, throttleDelay) {
    this.updateDelay = debounceDelay;
    this.throttleDelay = throttleDelay;
  }

  /**
   * Add event listener for filter changes
   * @param {string} section - The section name
   * @param {Function} callback - Callback function
   * @param {Object} options - Listener options
   */
  on(section, callback, options = {}) {
    const { priority = 'normal' } = options;
    
    if (!this.listeners.has(section)) {
      this.listeners.set(section, []);
    }
    
    const listener = { callback, priority };
    const sectionListeners = this.listeners.get(section);
    
    // Add listener based on priority
    if (priority === 'high') {
      sectionListeners.unshift(listener);
    } else {
      sectionListeners.push(listener);
    }
    
    // Return unsubscribe function
    return () => {
      const index = sectionListeners.findIndex(l => l.callback === callback);
      if (index > -1) {
        sectionListeners.splice(index, 1);
      }
    };
  }

  /**
   * Remove event listener
   * @param {string} section - The section name
   * @param {Function} callback - Callback function to remove
   */
  off(section, callback) {
    const sectionListeners = this.listeners.get(section);
    if (sectionListeners) {
      const index = sectionListeners.findIndex(l => l.callback === callback);
      if (index > -1) {
        sectionListeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit change event
   * @private
   */
  emitChange(section, newValue, oldValue) {
    const sectionListeners = this.listeners.get(section);
    if (sectionListeners) {
      // Use requestAnimationFrame for better performance
      requestAnimationFrame(() => {
        sectionListeners.forEach(({ callback }) => {
          try {
            callback(newValue, oldValue, section);
          } catch (error) {
            console.error('Error in filter change listener:', error);
          }
        });
      });
    }
  }

  /**
   * Update UI for filter buttons
   * @param {string} section - The section name
   * @param {string} value - The filter value
   */
  updateFilterUI(section, value) {
    // Use requestAnimationFrame for DOM updates
    requestAnimationFrame(() => {
      const selectorMap = {
        'current': '#overallFilter, #homeFilter, #awayFilter',
        'cards': '#cardsOverallFilter, #cardsHomeFilter, #cardsAwayFilter',
        'xg': '#xgOverallFilter, #xgHomeFilter, #xgAwayFilter',
        'halftime': '#halftimeOverallFilter, #halftimeHomeFilter, #halftimeAwayFilter',
        'timing': '#timingOverallFilter, #timingHomeFilter, #timingAwayFilter',
        'goalTimings': '#goalTimingsAll, #goalTimingsScored, #goalTimingsConceded',
        'shots': '#shotsOverallFilter, #shotsHomeFilter, #shotsAwayFilter',
        'corners': '#cornersOverallFilter, #cornersHomeFilter, #cornersAwayFilter',
        'teamCorners': '#teamCornersOverallFilter, #teamCornersHomeFilter, #teamCornersAwayFilter',
        'teamCards': '#teamCardsOverallFilter, #teamCardsHomeFilter, #teamCardsAwayFilter',
        'matchCards': '#matchCardsOverallFilter, #matchCardsHomeFilter, #matchCardsAwayFilter'
      };

      const selector = selectorMap[section];
      if (selector) {
        // Batch DOM reads and writes
        const buttons = document.querySelectorAll(selector);
        const activeButtonId = this.getActiveButtonId(section, value);
        
        buttons.forEach(btn => {
          if (btn.id === activeButtonId) {
            btn.classList.add('active');
          } else {
            btn.classList.remove('active');
          }
        });
      }
    });
  }

  /**
   * Get the button ID for the active filter
   * @private
   */
  getActiveButtonId(section, value) {
    const idMap = {
      'current': { 'overall': 'overallFilter', 'home': 'homeFilter', 'away': 'awayFilter' },
      'cards': { 'overall': 'cardsOverallFilter', 'home': 'cardsHomeFilter', 'away': 'cardsAwayFilter' },
      'xg': { 'overall': 'xgOverallFilter', 'home': 'xgHomeFilter', 'away': 'xgAwayFilter' },
      'halftime': { 'overall': 'halftimeOverallFilter', 'home': 'halftimeHomeFilter', 'away': 'halftimeAwayFilter' },
      'timing': { 'overall': 'timingOverallFilter', 'home': 'timingHomeFilter', 'away': 'timingAwayFilter' },
      'goalTimings': { 'overall': 'goalTimingsAll', 'scored': 'goalTimingsScored', 'conceded': 'goalTimingsConceded' },
      'shots': { 'overall': 'shotsOverallFilter', 'home': 'shotsHomeFilter', 'away': 'shotsAwayFilter' },
      'corners': { 'overall': 'cornersOverallFilter', 'home': 'cornersHomeFilter', 'away': 'cornersAwayFilter' },
      'teamCorners': { 'overall': 'teamCornersOverallFilter', 'home': 'teamCornersHomeFilter', 'away': 'teamCornersAwayFilter' },
      'teamCards': { 'overall': 'teamCardsOverallFilter', 'home': 'teamCardsHomeFilter', 'away': 'teamCardsAwayFilter' },
      'matchCards': { 'overall': 'matchCardsOverallFilter', 'home': 'matchCardsHomeFilter', 'away': 'matchCardsAwayFilter' }
    };

    const sectionMap = idMap[section];
    return sectionMap ? sectionMap[value] : null;
  }

  /**
   * Legacy support methods with performance optimizations
   */
  
  setMainFilter(filter) {
    this.setFilter('current', filter, { debounce: true });
  }

  setCardsFilter(filter) {
    this.setFilter('cards', filter, { debounce: true });
  }

  setXgFilter(filter) {
    this.setFilter('xg', filter, { debounce: true });
  }

  setHalftimeFilter(filter) {
    this.setFilter('halftime', filter, { debounce: true });
  }

  setTimingFilter(filter) {
    this.setFilter('timing', filter, { debounce: true });
  }

  setGoalTimingsFilter(filter) {
    this.setFilter('goalTimings', filter, { debounce: true });
  }

  setShotsFilter(filter) {
    this.setFilter('shots', filter, { debounce: true });
  }

  setCornersFilter(filter) {
    this.setFilter('corners', filter, { debounce: true });
  }

  setTeamCornersFilter(filter) {
    this.setFilter('teamCorners', filter, { debounce: true });
  }

  setTeamCardsFilter(filter) {
    this.setFilter('teamCards', filter, { debounce: true });
  }

  setMatchCardsFilter(filter) {
    this.setFilter('matchCards', filter, { debounce: true });
  }

  /**
   * Get all current filter values
   */
  getAllFilters() {
    return Object.fromEntries(this.filters);
  }

  /**
   * Reset all filters to default
   */
  resetAllFilters() {
    this.startBatch();
    this.filters.forEach((value, key) => {
      this.setFilter(key, 'overall');
    });
    this.executeBatch();
  }

  /**
   * Cleanup method to prevent memory leaks
   */
  destroy() {
    this.cancelPendingUpdates();
    this.listeners.clear();
    this.filters.clear();
    this.lastThrottleTime.clear();
  }
}

// Create singleton instance
const filterManager = new FilterManager();

// Export singleton
export default filterManager;