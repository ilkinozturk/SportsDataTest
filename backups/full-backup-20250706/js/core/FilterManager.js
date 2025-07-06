/**
 * FilterManager - Centralized filter state management
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

    // Bind methods
    this.getFilter = this.getFilter.bind(this);
    this.setFilter = this.setFilter.bind(this);
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
   * Set filter value for a specific section
   * @param {string} section - The section name
   * @param {string} value - The filter value (overall, home, away)
   */
  setFilter(section, value) {
    const oldValue = this.filters.get(section);
    this.filters.set(section, value);
    
    // Emit change event if value changed
    if (oldValue !== value) {
      this.emitChange(section, value, oldValue);
    }
  }

  /**
   * Add event listener for filter changes
   * @param {string} section - The section name
   * @param {Function} callback - Callback function
   */
  on(section, callback) {
    if (!this.listeners.has(section)) {
      this.listeners.set(section, []);
    }
    this.listeners.get(section).push(callback);
  }

  /**
   * Remove event listener
   * @param {string} section - The section name
   * @param {Function} callback - Callback function to remove
   */
  off(section, callback) {
    const sectionListeners = this.listeners.get(section);
    if (sectionListeners) {
      const index = sectionListeners.indexOf(callback);
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
      sectionListeners.forEach(callback => {
        callback(newValue, oldValue, section);
      });
    }
  }

  /**
   * Update UI for filter buttons
   * @param {string} section - The section name
   * @param {string} value - The filter value
   */
  updateFilterUI(section, value) {
    // Get all filter buttons for this section
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
      // Remove active class from all buttons
      document.querySelectorAll(selector).forEach(btn => {
        btn.classList.remove('active');
      });

      // Add active class to selected button
      const activeButtonId = this.getActiveButtonId(section, value);
      const activeButton = document.getElementById(activeButtonId);
      if (activeButton) {
        activeButton.classList.add('active');
      }
    }
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
   * Legacy support methods
   * These maintain backward compatibility with existing code
   */
  
  // Main filter (general statistics)
  setMainFilter(filter) {
    this.setFilter('current', filter);
    this.updateFilterUI('current', filter);
  }

  // Cards filter
  setCardsFilter(filter) {
    this.setFilter('cards', filter);
    this.updateFilterUI('cards', filter);
  }

  // XG filter
  setXgFilter(filter) {
    this.setFilter('xg', filter);
    this.updateFilterUI('xg', filter);
  }

  // Halftime filter
  setHalftimeFilter(filter) {
    this.setFilter('halftime', filter);
    this.updateFilterUI('halftime', filter);
  }

  // Timing filter
  setTimingFilter(filter) {
    this.setFilter('timing', filter);
    this.updateFilterUI('timing', filter);
  }

  // Goal timings filter
  setGoalTimingsFilter(filter) {
    this.setFilter('goalTimings', filter);
    this.updateFilterUI('goalTimings', filter);
  }

  // Shots filter
  setShotsFilter(filter) {
    this.setFilter('shots', filter);
    this.updateFilterUI('shots', filter);
  }

  // Corners filter
  setCornersFilter(filter) {
    this.setFilter('corners', filter);
    this.updateFilterUI('corners', filter);
  }

  // Team corners filter
  setTeamCornersFilter(filter) {
    this.setFilter('teamCorners', filter);
    this.updateFilterUI('teamCorners', filter);
  }

  // Team cards filter
  setTeamCardsFilter(filter) {
    this.setFilter('teamCards', filter);
    this.updateFilterUI('teamCards', filter);
  }

  // Match cards filter
  setMatchCardsFilter(filter) {
    this.setFilter('matchCards', filter);
    this.updateFilterUI('matchCards', filter);
  }

  // Get all current filter values
  getAllFilters() {
    return Object.fromEntries(this.filters);
  }

  // Reset all filters to default
  resetAllFilters() {
    this.filters.forEach((value, key) => {
      this.setFilter(key, 'overall');
    });
  }
}

// Create singleton instance
const filterManager = new FilterManager();

// Export singleton
export default filterManager;