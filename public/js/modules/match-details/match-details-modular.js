/**
 * Match Details Module - Main Entry Point
 * Coordinates between data and display modules
 */

import EventBus from '../events/EventBus.js';
import { MatchDetailsData } from './match-details-data.js';
import { MatchDetailsDisplay } from '../display/match-details-display.js';
import { MatchTabsDisplay } from '../display/match-tabs-display.js';
import { H2HData } from '../data/h2h-data.js';
import { FormPrediction } from '../prediction/form-prediction.js';
import { GoalsComparison } from '../prediction/goals-comparison.js';
import { GoalsConcededComparison } from '../prediction/goals-conceded-comparison.js';
import { OverBTTSComparison } from '../prediction/over-btts-comparison.js';
import { CornersComparison } from '../prediction/corners-comparison.js';
import { CardsComparison } from '../prediction/cards-comparison.js';
import { OffsideComparison } from '../prediction/offside-comparison.js';
import { LeagueTableComparison } from '../prediction/league-table-comparison.js';
import { GoalsH2HComparison } from '../h2h/goals-h2h-comparison.js';
import { GoalsConcededH2HComparison } from '../h2h/goals-conceded-h2h-comparison.js';
import { OverBTTSH2HComparison } from '../h2h/over-btts-h2h-comparison.js';
import { FirstGoalH2HComparison } from '../h2h/first-goal-h2h-comparison.js';
import CornersH2HComparison from '../h2h/corners-h2h-comparison.js';

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
    this.modules.goalsConcededComparison = new GoalsConcededComparison(this.eventBus);
    this.modules.overBTTSComparison = new OverBTTSComparison(this.eventBus);
    this.modules.cornersComparison = new CornersComparison(this.eventBus);
    this.modules.cardsComparison = new CardsComparison(this.eventBus);
    this.modules.offsideComparison = new OffsideComparison(this.eventBus);
    this.modules.leagueTableComparison = new LeagueTableComparison(this.eventBus);
    
    // Initialize H2H modules
    this.modules.goalsH2HComparison = new GoalsH2HComparison(this.eventBus);
    this.modules.goalsConcededH2HComparison = new GoalsConcededH2HComparison(this.eventBus);
    this.modules.overBTTSH2HComparison = new OverBTTSH2HComparison(this.eventBus);
    this.modules.firstGoalH2HComparison = new FirstGoalH2HComparison(this.eventBus);
    this.modules.cornersH2HComparison = new CornersH2HComparison(this.eventBus);
  }

  setupGlobalHandlers() {
    // Global tab switching function
    window.switchTab = tabName => {
      this.eventBus.emit('switch-tab', tabName);
    };

    // Handle display errors
    this.eventBus.on('display-error', error => {
    });
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.matchDetailsApp = new MatchDetailsApp();
  });
} else {
  window.matchDetailsApp = new MatchDetailsApp();
}

// Export for potential external use
export default MatchDetailsApp;
