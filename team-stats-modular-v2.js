// Import modules
import filterManager from './js/core/FilterManager.js';
import tabManager from './js/modules/ui/TabManager.js';
import formDisplay from './js/modules/ui/FormDisplay.js';
import { GoalsStatistics } from './js/modules/statistics/GoalsStatistics.js';
import { CardsStatistics } from './js/modules/statistics/CardsStatistics.js';
import { CornersStatistics } from './js/modules/statistics/CornersStatistics.js';
import { XGStatistics } from './js/modules/statistics/XGStatistics.js';
import { ShotsStatistics } from './js/modules/statistics/ShotsStatistics.js';
import { updateElementText, safeSetContent } from './js/utils/dom.js';

// Initialize statistics modules
const goalsStats = new GoalsStatistics(filterManager);
const cardsStats = new CardsStatistics(filterManager);
const cornersStats = new CornersStatistics(filterManager);
const xgStats = new XGStatistics(filterManager);
const shotsStats = new ShotsStatistics(filterManager);

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
    cardsStats.updateMatchCards(filter);
  }
};

window.setXgFilter = function(filter) {
  filterManager.setXgFilter(filter);
  if (globalStatistics) {
    xgStats.updateXgStats(filter);
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
    shotsStats.updateGoalTimingBars(filter);
  }
};

window.setShotsFilter = function(filter) {
  filterManager.setShotsFilter(filter);
  if (globalStatistics) {
    shotsStats.updateShotsStats(filter);
  }
};

window.setCornersFilter = function(filter) {
  filterManager.setCornersFilter(filter);
  if (globalStatistics) {
    cornersStats.updateCornersStats(filter);
  }
};

window.setTeamCornersFilter = function(filter) {
  filterManager.setTeamCornersFilter(filter);
  if (globalStatistics) {
    cornersStats.updateTeamCorners(filter);
  }
};

window.setTeamCardsFilter = function(filter) {
  filterManager.setTeamCardsFilter(filter);
  if (globalStatistics) {
    cardsStats.updateTeamCards(filter);
  }
};

window.setMatchCardsFilter = function(filter) {
  filterManager.setMatchCardsFilter(filter);
  if (globalStatistics) {
    cardsStats.updateMatchCards(filter);
  }
};

// Update statistics using new modules
function updateGoalsTabStatistics(statistics) {
  goalsStats.update(statistics);
}

function updateCardStatistics(statistics, filter) {
  cardsStats.updateMatchCards(filter);
}

function updateTeamCardsStatistics(statistics, filter) {
  cardsStats.updateTeamCards(filter);
}

function updateCardsTopStats(statistics) {
  cardsStats.updateTopStats();
}

function updateCornerStatistics(statistics, filter) {
  cornersStats.updateCornersStats(filter);
}

function updateXgStatistics(statistics, filter) {
  xgStats.updateXgStats(filter);
}

function updateShotsStatistics(statistics) {
  const filter = filterManager.getFilter('shots');
  shotsStats.updateShotsStats(filter);
}

function updateGoalTimingBars(statistics) {
  const filter = filterManager.getFilter('goalTimings');
  shotsStats.updateGoalTimingBars(filter);
}

// Export for use in other modules
window.filterManager = filterManager;
window.tabManager = tabManager;
window.formDisplay = formDisplay;
window.updateElementText = updateElementText;
window.safeSetContent = safeSetContent;

// Export statistics modules
window.goalsStats = goalsStats;
window.cardsStats = cardsStats;
window.cornersStats = cornersStats;
window.xgStats = xgStats;
window.shotsStats = shotsStats;

// Note: Below this point, add all the remaining functions from the original team-stats.js
// that haven't been migrated to modules yet (like updateHalftimeStatistics, updateTimingAnalyticsNew, etc.)

// Helper function for getting filtered stats (still needed for some legacy functions)
function getFilteredStats(statistics, filter) {
  switch (filter) {
    case 'home':
      return {
        matches: statistics.homeMatches,
        wins: statistics.homeWins,
        draws: statistics.homeDraws,
        losses: statistics.homeLosses,
      };
    case 'away':
      return {
        matches: statistics.awayMatches,
        wins: statistics.awayWins,
        draws: statistics.awayDraws,
        losses: statistics.awayLosses,
      };
    default: // overall
      return {
        matches: statistics.completedMatches,
        wins: statistics.wins,
        draws: statistics.draws,
        losses: statistics.losses,
      };
  }
}

// Function to populate all statistics (main entry point)
function populateStatistics(statistics) {
  if (!statistics) return;
  
  // Store globally
  globalStatistics = statistics;
  
  // Update all statistics modules
  goalsStats.update(statistics);
  cardsStats.update(statistics);
  cornersStats.update(statistics);
  xgStats.update(statistics);
  shotsStats.update(statistics);
  
  // Update other statistics that haven't been migrated yet
  const currentFilter = filterManager.getFilter('current');
  updateStatisticsWithFilter(statistics, currentFilter);
  
  // Update form displays
  if (statistics.form && statistics.form.length > 0) {
    formDisplay.update('overallForm', statistics.form);
  }
  if (statistics.homeForm && statistics.homeForm.length > 0) {
    formDisplay.update('homeForm', statistics.homeForm);
  }
  if (statistics.awayForm && statistics.awayForm.length > 0) {
    formDisplay.update('awayForm', statistics.awayForm);
  }
}

// Export populateStatistics
window.populateStatistics = populateStatistics;

// Add remaining legacy functions below...