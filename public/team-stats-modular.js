/**
 * Team Statistics Application Entry Point
 * Initializes all modules and sets up the application
 */

// Import styles
import './team-stats.css';

// Import core modules
import filterManager from './js/core/FilterManager-optimized.js';
import ENV from './js/config/env.js';

// Import UI modules
import { TabManager } from './js/modules/ui/TabManager.js';
import { FormDisplay } from './js/modules/ui/FormDisplay.js';
import { PerformanceDashboard } from './js/modules/ui/PerformanceDashboard.js';

// Import statistics modules
import { GoalsStatistics } from './js/modules/statistics/GoalsStatistics.js';
import { CardsStatistics } from './js/modules/statistics/CardsStatistics.js';
import { CornersStatistics } from './js/modules/statistics/CornersStatistics.js';
import { XGStatistics } from './js/modules/statistics/XGStatistics.js';
import { ShotsStatistics } from './js/modules/statistics/ShotsStatistics.js';

// Import utilities
import lazyLoader from './js/utils/lazy-loader.js';
import performanceMonitor from './js/utils/performance-monitor.js';
import { ErrorHandler } from './js/core/ErrorHandler.js';

// Import services
import { TeamDataService } from './services/teamDataService.js';

/**
 * Application class
 */
class TeamStatsApp {
  constructor() {
    this.modules = {};
    this.services = {};
    this.initialized = false;
  }

  /**
   * Initialize the application
   */
  async init() {
    try {
      // Start initialization timing
      const initTimer = performanceMonitor.startOperation('app-initialization');

      // Initialize error handling
      this.errorHandler = new ErrorHandler();

      // Initialize services
      await this.initializeServices();

      // Initialize UI modules
      await this.initializeUIModules();

      // Initialize statistics modules
      await this.initializeStatisticsModules();

      // Set up global exports for legacy compatibility
      this.setupLegacySupport();

      // Load initial data
      await this.loadInitialData();

      // Set up performance monitoring if enabled
      if (ENV.ENABLE_PERFORMANCE_MONITOR) {
        this.setupPerformanceMonitoring();
      }

      // Mark as initialized
      this.initialized = true;
      window.appInitialized = true;

      // Dispatch initialization event
      window.dispatchEvent(new CustomEvent('app-initialized'));

      // End initialization timing
      performanceMonitor.endOperation(initTimer);

      ENV.log('info', 'Team Stats App initialized successfully');

    } catch (error) {
      ENV.reportError(error, { phase: 'initialization' });
      this.handleInitializationError(error);
    }
  }

  /**
   * Initialize services
   */
  async initializeServices() {
    ENV.log('debug', 'Initializing services...');

    // Initialize data service
    this.services.teamData = new TeamDataService({
      apiUrl: ENV.API_URL,
      cacheEnabled: ENV.ENABLE_CACHE,
      cacheTTL: ENV.CACHE_TTL
    });

    // Set up filter manager delays
    filterManager.setDelays(ENV.DEBOUNCE_DELAY, ENV.THROTTLE_DELAY);
  }

  /**
   * Initialize UI modules
   */
  async initializeUIModules() {
    ENV.log('debug', 'Initializing UI modules...');

    // Tab manager
    this.modules.tabManager = new TabManager();
    this.modules.tabManager.init();

    // Form display
    this.modules.formDisplay = new FormDisplay();

    // Set up lazy loading
    lazyLoader.registerAll();
  }

  /**
   * Initialize statistics modules
   */
  async initializeStatisticsModules() {
    ENV.log('debug', 'Initializing statistics modules...');

    // Create statistics modules
    this.modules.goalsStats = new GoalsStatistics(filterManager);
    this.modules.cardsStats = new CardsStatistics(filterManager);
    this.modules.cornersStats = new CornersStatistics(filterManager);
    this.modules.xgStats = new XGStatistics(filterManager);
    this.modules.shotsStats = new ShotsStatistics(filterManager);

    // Initialize each module
    const initPromises = Object.values(this.modules)
      .filter(module => typeof module.init === 'function')
      .map(module => module.init());

    await Promise.all(initPromises);
  }

  /**
   * Load initial data
   */
  async loadInitialData() {
    ENV.log('debug', 'Loading initial data...');

    // Get team ID from URL or default
    const teamId = this.getTeamIdFromUrl() || ENV.DEFAULT_TEAM_ID;
    
    if (!teamId) {
      ENV.log('warn', 'No team ID provided');
      return;
    }

    try {
      // Load team statistics
      const statistics = await this.services.teamData.getTeamStatistics(teamId);

      // Update all modules with data
      this.updateModulesWithData(statistics);

      ENV.log('info', `Loaded statistics for team ${teamId}`);

    } catch (error) {
      ENV.reportError(error, { phase: 'data-loading', teamId });
      throw error;
    }
  }

  /**
   * Update all modules with new data
   */
  updateModulesWithData(statistics) {
    // Update each statistics module
    Object.values(this.modules).forEach(module => {
      if (typeof module.setStatistics === 'function') {
        module.setStatistics(statistics);
      }
    });

    // Update global statistics for legacy support
    window.currentStatistics = statistics;
  }

  /**
   * Get team ID from URL parameters
   */
  getTeamIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('team_id');
  }

  /**
   * Set up legacy support for global functions
   */
  setupLegacySupport() {
    // Filter functions
    window.setMainFilter = filter => filterManager.setMainFilter(filter);
    window.setCardsFilter = filter => filterManager.setCardsFilter(filter);
    window.setXgFilter = filter => filterManager.setXgFilter(filter);
    window.setHalftimeFilter = filter => filterManager.setHalftimeFilter(filter);
    window.setTimingFilter = filter => filterManager.setTimingFilter(filter);
    window.setGoalTimingsFilter = filter => filterManager.setGoalTimingsFilter(filter);
    window.setShotsFilter = filter => filterManager.setShotsFilter(filter);
    window.setCornersFilter = filter => filterManager.setCornersFilter(filter);
    window.setTeamCornersFilter = filter => filterManager.setTeamCornersFilter(filter);
    window.setTeamCardsFilter = filter => filterManager.setTeamCardsFilter(filter);
    window.setMatchCardsFilter = filter => filterManager.setMatchCardsFilter(filter);

    // Tab function
    window.showTab = (tab, event) => this.modules.tabManager.show(tab, event);

    // Data loading function
    window.loadTeamStatistics = teamId => this.loadTeamStatistics(teamId);

    // Export modules for debugging
    window.teamStatsModules = this.modules;
    window.filterManager = filterManager;
  }

  /**
   * Load team statistics (legacy support)
   */
  async loadTeamStatistics(teamId) {
    try {
      const statistics = await this.services.teamData.getTeamStatistics(teamId);
      this.updateModulesWithData(statistics);
    } catch (error) {
      ENV.reportError(error, { phase: 'manual-load', teamId });
      throw error;
    }
  }

  /**
   * Set up performance monitoring
   */
  setupPerformanceMonitoring() {
    // Create performance dashboard
    const dashboard = new PerformanceDashboard({
      position: 'bottom-right',
      theme: ENV.isDevelopment() ? 'dark' : 'light',
      refreshRate: 1000,
      collapsed: !ENV.isDevelopment()
    });

    dashboard.init();

    // Show in development
    if (ENV.isDevelopment()) {
      dashboard.show();
    }

    // Add keyboard shortcut
    document.addEventListener('keydown', e => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        dashboard.toggle();
      }
    });

    this.modules.performanceDashboard = dashboard;
  }

  /**
   * Handle initialization error
   */
  handleInitializationError(error) {
    console.error('Failed to initialize app:', error);

    // Show error in UI
    const errorContainer = document.getElementById('error-container');
    const errorDetails = document.getElementById('error-details');

    if (errorContainer && errorDetails) {
      errorDetails.textContent = ENV.SHOW_ERROR_DETAILS 
        ? error.message 
        : 'Failed to load application. Please refresh the page.';
      
      errorContainer.classList.remove('hidden');
      document.getElementById('app').classList.add('hidden');
      document.getElementById('app-loading').classList.add('hidden');
    }
  }

  /**
   * Clean up resources
   */
  destroy() {
    // Destroy all modules
    Object.values(this.modules).forEach(module => {
      if (typeof module.destroy === 'function') {
        module.destroy();
      }
    });

    // Clear services
    Object.values(this.services).forEach(service => {
      if (typeof service.destroy === 'function') {
        service.destroy();
      }
    });

    // Clear references
    this.modules = {};
    this.services = {};
    this.initialized = false;
  }
}

// Create and initialize app
const app = new TeamStatsApp();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => app.init());
} else {
  app.init();
}

// Handle page unload
window.addEventListener('beforeunload', () => {
  if (app.initialized) {
    app.destroy();
  }
});

// Export app instance
export default app;