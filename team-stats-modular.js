// Import modules
import filterManager from './js/core/FilterManager.js';
import tabManager from './js/modules/ui/TabManager.js';
import { GoalsStatistics } from './js/modules/statistics/GoalsStatistics.js';

// Initialize modules
const goalsStats = new GoalsStatistics(filterManager);

// Global variables that are still needed
let globalStatistics = null;

// Legacy support - Map old global variables to new system
Object.defineProperty(window, 'currentFilter', {
  get: () => filterManager.getFilter('current'),
  set: (value) => filterManager.setFilter('current', value)
});

Object.defineProperty(window, 'currentCardsFilter', {
  get: () => filterManager.getFilter('cards'),
  set: (value) => filterManager.setFilter('cards', value)
});

Object.defineProperty(window, 'currentXgFilter', {
  get: () => filterManager.getFilter('xg'),
  set: (value) => filterManager.setFilter('xg', value)
});

Object.defineProperty(window, 'currentHalftimeFilter', {
  get: () => filterManager.getFilter('halftime'),
  set: (value) => filterManager.setFilter('halftime', value)
});

Object.defineProperty(window, 'currentTimingFilter', {
  get: () => filterManager.getFilter('timing'),
  set: (value) => filterManager.setFilter('timing', value)
});

Object.defineProperty(window, 'currentGoalTimingsFilter', {
  get: () => filterManager.getFilter('goalTimings'),
  set: (value) => filterManager.setFilter('goalTimings', value)
});

Object.defineProperty(window, 'currentShotsFilter', {
  get: () => filterManager.getFilter('shots'),
  set: (value) => filterManager.setFilter('shots', value)
});

Object.defineProperty(window, 'currentCornersFilter', {
  get: () => filterManager.getFilter('corners'),
  set: (value) => filterManager.setFilter('corners', value)
});

Object.defineProperty(window, 'currentTeamCornersFilter', {
  get: () => filterManager.getFilter('teamCorners'),
  set: (value) => filterManager.setFilter('teamCorners', value)
});

Object.defineProperty(window, 'currentTab', {
  get: () => tabManager.getCurrentTab(),
  set: (value) => console.warn('currentTab is now read-only. Use tabManager.show() instead.')
});

// Legacy support - Map old functions to new system
window.showTab = (tabName, event) => tabManager.show(tabName, event);

// Filter functions with legacy support
window.setMainFilter = function(filter) {
  filterManager.setMainFilter(filter);
  if (globalStatistics) {
    populateStatistics(globalStatistics);
  }
};

window.setCardsFilter = function(filter) {
  filterManager.setCardsFilter(filter);
  if (globalStatistics) {
    updateCardStatistics(globalStatistics, filter);
  }
};

window.setXgFilter = function(filter) {
  filterManager.setXgFilter(filter);
  if (globalStatistics) {
    updateXgStatistics(globalStatistics, filter);
  }
};

window.setHalftimeFilter = function(filter) {
  filterManager.setHalftimeFilter(filter);
  if (globalStatistics) {
    updateHalftimeStatistics(globalStatistics, filter);
  }
};

window.setTimingFilter = function(filter) {
  filterManager.setTimingFilter(filter);
  if (globalStatistics) {
    updateTimingAnalyticsNew(globalStatistics);
  }
};

window.setGoalTimingsFilter = function(filter) {
  filterManager.setGoalTimingsFilter(filter);
  if (globalStatistics) {
    updateGoalTimingBars(globalStatistics);
  }
};

window.setShotsFilter = function(filter) {
  filterManager.setShotsFilter(filter);
  if (globalStatistics) {
    updateShotsStatistics(globalStatistics);
  }
};

window.setCornersFilter = function(filter) {
  filterManager.setCornersFilter(filter);
  if (globalStatistics) {
    updateCornerStatistics(globalStatistics, filter);
  }
};

window.setTeamCornersFilter = function(filter) {
  filterManager.setTeamCornersFilter(filter);
  if (globalStatistics) {
    updateTeamCornersStatistics(globalStatistics, filter);
  }
};

window.setTeamCardsFilter = function(filter) {
  filterManager.setTeamCardsFilter(filter);
  if (globalStatistics) {
    updateTeamCardsStatistics(globalStatistics, filter);
  }
};

window.setMatchCardsFilter = function(filter) {
  filterManager.setMatchCardsFilter(filter);
  if (globalStatistics) {
    updateCardStatistics(globalStatistics, filter);
  }
};

// Update goals tab statistics using new module
function updateGoalsTabStatistics(statistics) {
  goalsStats.update(statistics);
}

// Helper function for element updates (will be replaced by BaseStatistics methods)
function updateElementText(elementId, text) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = text;
  }
}

// Export for use in other modules
window.filterManager = filterManager;
window.tabManager = tabManager;
window.updateElementText = updateElementText;

// Note: The rest of the original team-stats.js functions should be added below
// This includes all the update functions, fetch functions, and initialization code