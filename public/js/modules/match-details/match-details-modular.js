/**
 * Match Details Module - Main Entry Point
 * Coordinates between data and display modules
 */

import EventBus from '../events/EventBus.js';
import MatchDetailsData from './match-details-data.js';
import MatchDetailsDisplay from '../display/match-details-display.js';
import MatchTabsDisplay from '../display/match-tabs-display.js';

class MatchDetailsApp {
  constructor() {
    this.eventBus = new EventBus();
    this.modules = {};
    
    this.initializeModules();
    this.setupGlobalHandlers();
  }

  initializeModules() {
    // Initialize data module
    this.modules.data = new MatchDetailsData(this.eventBus);
    
    // Initialize display modules
    this.modules.display = new MatchDetailsDisplay(this.eventBus);
    this.modules.tabsDisplay = new MatchTabsDisplay(this.eventBus);
    
    // Log initialization
    console.log('Match Details modules initialized');
  }

  setupGlobalHandlers() {
    // Global tab switching function
    window.switchTab = (tabName) => {
      this.eventBus.emit('switch-tab', tabName);
    };
    
    // Handle display errors
    this.eventBus.on('display-error', (error) => {
      console.error('Display error:', error);
    });
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