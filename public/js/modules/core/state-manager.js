/**
 * State Manager - Core Module
 * Centralized state management with backward compatibility
 * IMPORTANT: This module must not break existing functionality
 */

(function (window) {
  'use strict';

  // Debug mode - set to false for production
  const DEBUG = false;
  const log = DEBUG ? console.log.bind(console) : () => {};

  // State Manager Class
  class StateManager {
    constructor() {
      // Initialize state that mirrors existing global variables
      this._state = {
        // Data
        globalStatistics: null,

        // Current filters - matching existing global variables
        currentFilter: 'overall',
        currentCardsFilter: 'overall',
        currentXgFilter: 'overall',
        currentHalftimeFilter: 'overall',
        currentTimingFilter: 'overall',
        currentGoalTimingsFilter: 'overall',
        currentShotsFilter: 'overall',
        currentCornersFilter: 'overall',
        currentTeamCornersFilter: 'overall',
        currentTab: 'all',

        // Additional filter states found in original code
        currentOverUnderFilter: 'overall',
        currentBttsFilter: 'overall',
        currentMatchCardsFilter: 'overall',
        currentTeamCardsFilter: 'overall',
      };

      // Observers for state changes
      this._observers = new Map();

      // Track if we're in compatibility mode
      this._compatibilityMode = true;

      // Sync with existing globals if they exist
      this._syncWithGlobals();
    }

    /**
     * Sync with existing global variables
     * This ensures backward compatibility
     */
    _syncWithGlobals() {
      if (typeof window !== 'undefined') {
        // Check if globals exist and sync
        if (window.globalStatistics !== undefined) {
          this._state.globalStatistics = window.globalStatistics;
        }
        if (window.currentFilter !== undefined) {
          this._state.currentFilter = window.currentFilter;
        }
        if (window.currentCardsFilter !== undefined) {
          this._state.currentCardsFilter = window.currentCardsFilter;
        }
        if (window.currentXgFilter !== undefined) {
          this._state.currentXgFilter = window.currentXgFilter;
        }
        if (window.currentHalftimeFilter !== undefined) {
          this._state.currentHalftimeFilter = window.currentHalftimeFilter;
        }
        if (window.currentTimingFilter !== undefined) {
          this._state.currentTimingFilter = window.currentTimingFilter;
        }
        if (window.currentGoalTimingsFilter !== undefined) {
          this._state.currentGoalTimingsFilter = window.currentGoalTimingsFilter;
        }
        if (window.currentShotsFilter !== undefined) {
          this._state.currentShotsFilter = window.currentShotsFilter;
        }
        if (window.currentCornersFilter !== undefined) {
          this._state.currentCornersFilter = window.currentCornersFilter;
        }
        if (window.currentTeamCornersFilter !== undefined) {
          this._state.currentTeamCornersFilter = window.currentTeamCornersFilter;
        }
        if (window.currentTab !== undefined) {
          this._state.currentTab = window.currentTab;
        }
      }
    }

    /**
     * Get state value
     * @param {string} key - State key
     * @returns {*} State value
     */
    get(key) {
      return this._state[key];
    }

    /**
     * Set state value
     * @param {string} key - State key
     * @param {*} value - New value
     * @param {boolean} skipGlobalSync - Skip syncing with global variables
     */
    set(key, value, skipGlobalSync = false) {
      const oldValue = this._state[key];
      this._state[key] = value;

      // Sync with global variables for backward compatibility
      if (!skipGlobalSync && this._compatibilityMode && typeof window !== 'undefined') {
        window[key] = value;
      }

      // Notify observers
      this._notifyObservers(key, value, oldValue);
    }

    /**
     * Get all statistics data
     * @returns {Object|null} Statistics data
     */
    getStatistics() {
      return this._state.globalStatistics;
    }

    /**
     * Set statistics data
     * @param {Object} statistics - Statistics data
     */
    setStatistics(statistics) {
      this.set('globalStatistics', statistics, true); // Skip global sync to prevent circular calls
    }

    /**
     * Get filter value
     * @param {string} filterType - Filter type (e.g., 'cards', 'xg', etc.)
     * @returns {string} Filter value
     */
    getFilter(filterType) {
      const key =
        filterType === 'main' ? 'currentFilter' : `current${this._capitalize(filterType)}Filter`;
      return this._state[key] || 'overall';
    }

    /**
     * Set filter value
     * @param {string} filterType - Filter type
     * @param {string} value - Filter value
     */
    setFilter(filterType, value) {
      const key =
        filterType === 'main' ? 'currentFilter' : `current${this._capitalize(filterType)}Filter`;
      this.set(key, value);
    }

    /**
     * Get current tab
     * @returns {string} Current tab
     */
    getCurrentTab() {
      return this._state.currentTab;
    }

    /**
     * Set current tab
     * @param {string} tab - Tab name
     */
    setCurrentTab(tab) {
      this.set('currentTab', tab);
    }

    /**
     * Get team data
     * @returns {Object|null} Team data
     */
    getTeamData() {
      return this._state.lastTeamData;
    }

    /**
     * Set team data
     * @param {Object} teamData - Team data
     */
    setTeamData(teamData) {
      this.set('lastTeamData', teamData);
    }

    /**
     * Set statistics
     * @param {Object} statistics - Statistics data
     */
    setStatistics(statistics) {
      this.set('globalStatistics', statistics);
    }

    /**
     * Subscribe to state changes
     * @param {string} key - State key to observe
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    subscribe(key, callback) {
      if (!this._observers.has(key)) {
        this._observers.set(key, new Set());
      }

      this._observers.get(key).add(callback);

      // Return unsubscribe function
      return () => {
        const callbacks = this._observers.get(key);
        if (callbacks) {
          callbacks.delete(callback);
          if (callbacks.size === 0) {
            this._observers.delete(key);
          }
        }
      };
    }

    /**
     * Alias for subscribe (for compatibility)
     */
    observe(key, callback) {
      return this.subscribe(key, callback);
    }

    /**
     * Notify observers of state change
     * @private
     */
    _notifyObservers(key, newValue, oldValue) {
      const observers = this._observers.get(key);
      if (observers) {
        observers.forEach(callback => {
          try {
            callback(newValue, oldValue, key);
          } catch (error) {
            console.error('Error in state observer:', error);
          }
        });
      }
    }

    /**
     * Reset all filters to default
     */
    resetAllFilters() {
      const filterKeys = Object.keys(this._state).filter(key => key.includes('Filter'));
      filterKeys.forEach(key => {
        this.set(key, 'overall');
      });
    }

    /**
     * Get full state snapshot
     * @returns {Object} Current state copy
     */
    getState() {
      return { ...this._state };
    }

    /**
     * Set multiple state values at once (object-based setState like React)
     * @param {Object} newState - Object containing key-value pairs to update
     * @param {boolean} skipGlobalSync - Skip syncing with global variables
     */
    setState(newState, skipGlobalSync = false) {
      if (typeof newState !== 'object' || newState === null) {
        console.error('setState expects an object');
        return;
      }

      const oldValues = {};

      // Update each property in the state
      Object.keys(newState).forEach(key => {
        oldValues[key] = this._state[key];
        this._state[key] = newState[key];

        // Sync with global variables for backward compatibility
        if (!skipGlobalSync && this._compatibilityMode && typeof window !== 'undefined') {
          window[key] = newState[key];
        }

        // Notify observers for this key
        this._notifyObservers(key, newState[key], oldValues[key]);
      });
    }

    /**
     * Enable/disable compatibility mode
     * @param {boolean} enabled - Compatibility mode state
     */
    setCompatibilityMode(enabled) {
      this._compatibilityMode = enabled;
    }

    /**
     * Utility: Capitalize first letter
     * @private
     */
    _capitalize(str) {
      return str.charAt(0).toUpperCase() + str.slice(1);
    }

    /**
     * Check data integrity
     * @returns {Object} Integrity check results
     */
    checkDataIntegrity() {
      const results = {
        hasStatistics: !!this._state.globalStatistics,
        statisticsKeys: this._state.globalStatistics
          ? Object.keys(this._state.globalStatistics).length
          : 0,
        filters: {},
        errors: [],
      };

      // Check all filters
      Object.keys(this._state).forEach(key => {
        if (key.includes('Filter') || key === 'currentTab') {
          results.filters[key] = this._state[key];
          if (
            !['overall', 'home', 'away', 'all', 'goals', 'corners', 'cards'].includes(
              this._state[key]
            )
          ) {
            // Check if it's a valid value
            const validValues = ['overall', 'home', 'away'];
            if (!validValues.includes(this._state[key]) && key === 'currentTab') {
              // Tab has different valid values
              const validTabs = ['all', 'goals', 'corners', 'cards'];
              if (!validTabs.includes(this._state[key])) {
                results.errors.push(`Invalid value for ${key}: ${this._state[key]}`);
              }
            }
          }
        }
      });

      return results;
    }

    // Reset state to initial values
    reset() {
      // Store current subscriptions
      const subscriptions = this._subscriptions;

      // Reset to initial state
      this._state = {
        globalStatistics: null,
        currentFilter: 'overall',
        currentCardsFilter: 'overall',
        currentXgFilter: 'overall',
        currentHalftimeFilter: 'overall',
        currentTimingFilter: 'overall',
        currentGoalTimingsFilter: 'overall',
        currentShotsFilter: 'overall',
        currentCornersFilter: 'overall',
        currentTeamCornersFilter: 'overall',
        currentOverUnderFilter: 'overall',
        currentBttsFilter: 'overall',
        currentMatchCardsFilter: 'overall',
        currentTeamCardsFilter: 'overall',
        currentTab: 'all',
        timeFrame: 'all',
        matchList: [],
        lastTeamData: null,
      };

      // Restore subscriptions (they should persist through reset)
      this._subscriptions = subscriptions;

      // Notify observers of reset
      Object.keys(this._state).forEach(key => {
        this._notifyObservers(key, this._state[key], null);
      });

      log('[StateManager] State reset to initial values');
    }
  }

  // Create singleton instance
  const stateManager = new StateManager();

  // Setup backward compatibility by creating getters/setters for global variables
  if (typeof window !== 'undefined') {
    // Create property descriptors for backward compatibility
    const globalVarNames = [
      'globalStatistics',
      'currentFilter',
      'currentCardsFilter',
      'currentXgFilter',
      'currentHalftimeFilter',
      'currentTimingFilter',
      'currentGoalTimingsFilter',
      'currentShotsFilter',
      'currentCornersFilter',
      'currentTeamCornersFilter',
      'currentTab',
    ];

    globalVarNames.forEach(varName => {
      // Only create if doesn't exist
      if (!window.hasOwnProperty(varName)) {
        Object.defineProperty(window, varName, {
          get: function () {
            return stateManager.get(varName);
          },
          set: function (value) {
            stateManager.set(varName, value, true);
          },
          configurable: true,
        });
      }
    });
  }

  // Export for different module systems
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = stateManager;
  } else if (typeof define === 'function' && define.amd) {
    define([], function () {
      return stateManager;
    });
  } else if (typeof window !== 'undefined') {
    window.TeamStatsStateManager = stateManager;
  }

  return stateManager;
})(typeof window !== 'undefined' ? window : this);
