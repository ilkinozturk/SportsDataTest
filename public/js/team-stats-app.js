/**
 * Team Stats Application Controller
 * Main entry point for the modular team stats application
 */

(function(global) {
  'use strict';

  class TeamStatsApp {
    constructor() {
      this.initialized = false;
      this.teamId = null;
      this.components = new Map();
      this.subscriptions = [];
    }

    /**
     * Initialize the application
     * @param {Object} config - Configuration options
     */
    async init(config = {}) {
      if (this.initialized) {
        console.warn('Team Stats App already initialized');
        return;
      }

      try {
        console.log('Initializing Team Stats Application...');

        // Extract team ID from URL
        this.teamId = this.getTeamIdFromUrl();
        if (!this.teamId) {
          throw new Error('No team ID found in URL');
        }

        // Initialize state
        this.initializeState();

        // Set up event listeners
        this.setupEventListeners();

        // Initialize UI components
        await this.initializeComponents();

        // Load initial data
        await this.loadTeamData();

        // Mark as initialized
        this.initialized = true;
        console.log('Team Stats Application initialized successfully');

        // Emit initialization event
        TeamStatsEventBus.emit('app:initialized', { teamId: this.teamId });

      } catch (error) {
        console.error('Failed to initialize Team Stats App:', error);
        this.showError('Failed to load team statistics. Please try again.');
      }
    }

    /**
     * Initialize application state
     */
    initializeState() {
      // Set initial state
      TeamStatsStateManager.setState({
        teamId: this.teamId,
        teamInfo: null,
        globalStatistics: null,
        filters: {
          current: 'overall',
          cards: 'overall',
          xg: 'overall',
          halftime: 'overall',
          timing: 'overall',
          goalTimings: 'overall',
          shots: 'overall',
          corners: 'overall',
          teamCorners: 'overall',
          overUnder: 'overall',
          btts: 'overall',
          matchCards: 'overall',
          teamCards: 'overall'
        },
        activeTab: 'all',
        timeFrame: 'all',
        venue: 'overall',
        loading: true,
        error: null
      });

      // Subscribe to state changes
      this.subscribeToStateChanges();
    }

    /**
     * Subscribe to state changes
     */
    subscribeToStateChanges() {
      // Subscribe to filter changes
      const filterSub = TeamStatsStateManager.subscribe('filters', (filters) => {
        TeamStatsEventBus.emit('filters:changed', filters);
      });
      this.subscriptions.push(filterSub);

      // Subscribe to tab changes
      const tabSub = TeamStatsStateManager.subscribe('activeTab', (tab) => {
        TeamStatsEventBus.emit('tab:changed', tab);
      });
      this.subscriptions.push(tabSub);

      // Subscribe to loading state
      const loadingSub = TeamStatsStateManager.subscribe('loading', (loading) => {
        this.updateLoadingState(loading);
      });
      this.subscriptions.push(loadingSub);
    }

    /**
     * Set up global event listeners
     */
    setupEventListeners() {
      // Tab navigation
      TeamStatsEventBus.on('tab:change', (tab) => {
        this.changeTab(tab);
      });

      // Filter changes
      TeamStatsEventBus.on('filter:change', ({ type, value }) => {
        this.changeFilter(type, value);
      });

      // Data refresh
      TeamStatsEventBus.on('data:refresh', () => {
        this.loadTeamData();
      });

      // Error handling
      TeamStatsEventBus.on('error', (error) => {
        this.handleError(error);
      });

      // Window resize
      TeamStatsUIEvents.throttle(() => {
        TeamStatsEventBus.emit('window:resize');
      }, 250);
    }

    /**
     * Initialize UI components
     */
    async initializeComponents() {
      try {
        // Create header component
        const header = TeamStatsComponents.create('team-stats-header');
        header.mount('#teamHeader');
        this.components.set('header', header);

        // Create filters component
        const filters = TeamStatsComponents.create('team-stats-filters');
        filters.mount('#filtersContainer');
        this.components.set('filters', filters);

        // Create stats table component
        const statsTable = TeamStatsComponents.create('team-stats-table');
        statsTable.mount('#statsTable');
        this.components.set('statsTable', statsTable);

        // Create match list component
        const matchList = TeamStatsComponents.create('match-list');
        matchList.mount('#matchList');
        this.components.set('matchList', matchList);

        // Register custom components if needed
        this.registerCustomComponents();

        console.log('UI components initialized');
      } catch (error) {
        console.error('Failed to initialize components:', error);
        throw error;
      }
    }

    /**
     * Register custom components
     */
    registerCustomComponents() {
      // Register team stats specific components
      TeamStatsComponents.register('team-stats-header', {
        template: `
          <div class="team-header">
            {{#if teamInfo}}
              <div class="team-info">
                <img src="{{teamInfo.logo}}" alt="{{teamInfo.name}}" class="team-logo">
                <h1>{{teamInfo.name}}</h1>
                <p class="team-league">{{teamInfo.league}}</p>
              </div>
              <div class="team-stats-summary">
                <div class="stat-item">
                  <span class="stat-value">{{statistics.matches}}</span>
                  <span class="stat-label">Matches</span>
                </div>
                <div class="stat-item">
                  <span class="stat-value">{{statistics.winRate}}%</span>
                  <span class="stat-label">Win Rate</span>
                </div>
                <div class="stat-item">
                  <span class="stat-value">{{statistics.goalsPerMatch}}</span>
                  <span class="stat-label">Goals/Match</span>
                </div>
              </div>
            {{else}}
              <div class="loading-skeleton">
                <div class="skeleton-box" style="width: 100px; height: 100px;"></div>
                <div class="skeleton-box" style="width: 200px; height: 30px;"></div>
                <div class="skeleton-box" style="width: 150px; height: 20px;"></div>
              </div>
            {{/if}}
          </div>
        `,
        props: {
          teamInfo: null,
          statistics: null
        },
        mounted() {
          // Subscribe to team info updates
          this.unsubscribe = TeamStatsStateManager.subscribe('teamInfo', (teamInfo) => {
            this.update({ teamInfo });
          });
        },
        destroyed() {
          if (this.unsubscribe) this.unsubscribe();
        }
      });

      // Register filter component
      TeamStatsComponents.register('team-stats-filters', {
        template: `
          <div class="filters-container">
            <div class="filter-group">
              <button class="filter-btn {{#if (eq filter 'overall')}}active{{/if}}" 
                      data-filter="overall">Overall</button>
              <button class="filter-btn {{#if (eq filter 'home')}}active{{/if}}" 
                      data-filter="home">Home</button>
              <button class="filter-btn {{#if (eq filter 'away')}}active{{/if}}" 
                      data-filter="away">Away</button>
            </div>
          </div>
        `,
        props: {
          filter: 'overall',
          type: 'current'
        },
        mounted() {
          // Add click handlers
          TeamStatsUIEvents.delegate(this.element, 'click', '.filter-btn', function(e) {
            const filter = this.dataset.filter;
            TeamStatsEventBus.emit('filter:change', { 
              type: this.props.type || 'current', 
              value: filter 
            });
          }.bind(this));
        }
      });
    }

    /**
     * Load team data from API
     */
    async loadTeamData() {
      try {
        TeamStatsStateManager.setState({ loading: true, error: null });

        // Fetch team data using API Client
        const data = await TeamStatsAPIClient.getTeamData(this.teamId);

        // Update state with fetched data
        TeamStatsStateManager.setState({
          teamInfo: data.teamInfo,
          globalStatistics: data.statistics,
          loading: false
        });

        // Process and update UI
        this.processStatistics(data.statistics);

        // Emit data loaded event
        TeamStatsEventBus.emit('data:loaded', data);

      } catch (error) {
        console.error('Failed to load team data:', error);
        TeamStatsStateManager.setState({ 
          loading: false, 
          error: error.message 
        });
        throw error;
      }
    }

    /**
     * Process statistics data
     */
    processStatistics(statistics) {
      // Calculate derived statistics
      const processed = {
        ...statistics,
        winRate: Math.round((statistics.wins / statistics.matches) * 100),
        goalsPerMatch: (statistics.goalsFor / statistics.matches).toFixed(2),
        cleanSheetRate: Math.round((statistics.cleanSheets / statistics.matches) * 100)
      };

      // Emit processed statistics
      TeamStatsEventBus.emit('statistics:processed', processed);
    }

    /**
     * Change active tab
     */
    changeTab(tab) {
      TeamStatsStateManager.setState({ activeTab: tab });
      
      // Update URL without reload
      const url = new URL(window.location);
      url.searchParams.set('tab', tab);
      window.history.pushState({ tab }, '', url);
    }

    /**
     * Change filter value
     */
    changeFilter(type, value) {
      const filters = TeamStatsStateManager.getState().filters;
      filters[type] = value;
      TeamStatsStateManager.setState({ filters: { ...filters } });
    }

    /**
     * Update loading state
     */
    updateLoadingState(loading) {
      const mainContent = document.getElementById('mainContent');
      if (loading) {
        mainContent?.classList.add('loading');
      } else {
        mainContent?.classList.remove('loading');
      }
    }

    /**
     * Handle errors
     */
    handleError(error) {
      console.error('Team Stats Error:', error);
      this.showError(error.message || 'An error occurred');
    }

    /**
     * Show error message
     */
    showError(message) {
      const errorComponent = TeamStatsComponents.create('error-message', {
        type: 'error',
        title: 'Error',
        message: message
      });
      errorComponent.mount('#errorContainer');
    }

    /**
     * Get team ID from URL
     */
    getTeamIdFromUrl() {
      const pathParts = window.location.pathname.split('/');
      const teamIndex = pathParts.indexOf('team');
      return teamIndex !== -1 ? pathParts[teamIndex + 1] : null;
    }

    /**
     * Destroy the application
     */
    destroy() {
      // Unsubscribe from all subscriptions
      this.subscriptions.forEach(unsub => unsub());
      this.subscriptions = [];

      // Destroy all components
      this.components.forEach(component => component.destroy());
      this.components.clear();

      // Clear event listeners
      TeamStatsEventBus.clear();

      // Reset state
      TeamStatsStateManager.reset();

      this.initialized = false;
      console.log('Team Stats Application destroyed');
    }
  }

  // Create and expose singleton instance
  const app = new TeamStatsApp();
  
  // Auto-initialize when DOM is ready (unless prevented for testing)
  if (!window.preventTeamStatsAutoInit) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => app.init());
    } else {
      app.init();
    }
  }

  // Expose to global scope
  global.TeamStatsApp = app;

  console.log('Team Stats Application Controller loaded');

})(window);