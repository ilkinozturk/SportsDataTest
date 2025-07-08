/**
 * Match Details Module - Main Entry Point
 * Coordinates between data and display modules
 */

import EventBus from '../events/EventBus.js';
import MatchDetailsData from './match-details-data.js';
import MatchDetailsDisplay from '../display/match-details-display.js';
import MatchTabsDisplay from '../display/match-tabs-display.js';
import H2HData from '../data/h2h-data.js';
import FormPrediction from '../prediction/form-prediction.js';
import GoalsComparison from '../prediction/goals-comparison.js';

class MatchDetailsApp {
  constructor() {
    this.eventBus = new EventBus();
    this.modules = {};

    // Create API client for modules
    this.apiClient = window.TeamStatsAPIClient ||
      window.APIClient || {
        get: async url => {
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return await response.json();
        },
      };

    this.initializeModules();
    this.setupGlobalHandlers();
  }

  initializeModules() {
    // Initialize data modules
    this.modules.data = new MatchDetailsData(this.eventBus);
    this.modules.h2hData = new H2HData(this.eventBus, this.apiClient);

    // Initialize display modules
    this.modules.display = new MatchDetailsDisplay(this.eventBus);
    this.modules.tabsDisplay = new MatchTabsDisplay(this.eventBus);

    // Initialize prediction modules
    this.modules.formPrediction = new FormPrediction(this.eventBus);
    this.modules.goalsComparison = new GoalsComparison(this.eventBus);

    // Log initialization
    console.log(
      'Match Details modules initialized (including H2H, Form Prediction, and Goals Comparison modules)'
    );
  }

  setupGlobalHandlers() {
    // Global tab switching function
    window.switchTab = tabName => {
      console.log('Switching to tab:', tabName);
      this.eventBus.emit('switch-tab', tabName);
    };

    // Handle display errors
    this.eventBus.on('display-error', error => {
      console.error('Display error:', error);
    });

    // Log successful initialization
    console.log('Match Details App initialized successfully');
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new MatchDetailsApp();
  });
} else {
  new MatchDetailsApp();
}

// Export for potential external use
export default MatchDetailsApp;
