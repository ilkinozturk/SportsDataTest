/**
 * Tab Manager Module
 * Centralized tab management system for team statistics
 * Features: Tab switching, state sync, event handling, lazy loading
 */

(function (global) {
  'use strict';

  // Debug mode - set to false for production
  const DEBUG = false;
  const log = DEBUG ? console.log.bind(console) : () => {};

  class TabManager {
    constructor() {
      // Tab configuration
      this.tabs = {
        overview: {
          id: 'overview',
          label: 'Overview',
          icon: '📊',
          index: 0,
          loaded: false,
          component: 'OverviewTab',
        },
        goals: {
          id: 'goals',
          label: 'Goals',
          icon: '⚽',
          index: 1,
          loaded: false,
          component: 'GoalsTab',
        },
        cards: {
          id: 'cards',
          label: 'Cards',
          icon: '🟨',
          index: 2,
          loaded: false,
          component: 'CardsTab',
        },
        corners: {
          id: 'corners',
          label: 'Corners',
          icon: '🚩',
          index: 3,
          loaded: false,
          component: 'CornersTab',
        },
        halfTime: {
          id: 'halfTime',
          label: 'Half Time',
          icon: '⏱️',
          index: 4,
          loaded: false,
          component: 'HalfTimeTab',
        },
        playersGoals: {
          id: 'playersGoals',
          label: "Player's Goals",
          icon: '👤',
          index: 5,
          loaded: false,
          component: 'PlayersGoalsTab',
        },
        xg: {
          id: 'xg',
          label: 'xG',
          icon: '📈',
          index: 6,
          loaded: false,
          component: 'XGTab',
        },
        timing: {
          id: 'timing',
          label: 'Timing',
          icon: '⏰',
          index: 7,
          loaded: false,
          component: 'TimingTab',
        },
        shots: {
          id: 'shots',
          label: 'Shots',
          icon: '🎯',
          index: 8,
          loaded: false,
          component: 'ShotsTab',
        },
        allStats: {
          id: 'allStats',
          label: 'All Stats',
          icon: '📊',
          index: 9,
          loaded: false,
          component: 'AllStatsTab',
        },
      };

      // Current active tab
      this.activeTab = 'overview';
      this.previousTab = null;

      // Event handlers storage
      this.eventHandlers = {
        beforeSwitch: [],
        afterSwitch: [],
        tabLoaded: [],
        tabError: [],
      };

      // Performance tracking
      this.performanceMetrics = {
        switchCount: 0,
        totalSwitchTime: 0,
        tabLoadTimes: {},
      };

      // Tab history for navigation
      this.history = [];
      this.historyIndex = -1;

      // Initialize dependencies
      this.initializeDependencies();
    }

    initializeDependencies() {
      // Check for required dependencies
      if (typeof TeamStatsStateManager === 'undefined') {
        log('TabManager: StateManager not found, running in standalone mode');
        this.stateManager = null;
      } else {
        this.stateManager = TeamStatsStateManager;
      }

      if (typeof TeamStatsEventBus === 'undefined') {
        log('TabManager: EventBus not found, running in standalone mode');
        this.eventBus = null;
      } else {
        this.eventBus = TeamStatsEventBus;
      }
    }

    /**
     * Initialize tab manager with DOM elements
     */
    initialize(config = {}) {
      this.config = {
        tabContainerSelector: config.tabContainerSelector || '.tab-buttons',
        contentContainerSelector: config.contentContainerSelector || '.tab-content',
        activeClass: config.activeClass || 'active',
        loadingClass: config.loadingClass || 'loading',
        animationDuration: config.animationDuration || 300,
        lazyLoad: config.lazyLoad !== false,
        persistState: config.persistState !== false,
        ...config,
      };

      // Setup DOM references
      this.setupDOM();

      // Restore previous state if exists
      if (this.config.persistState) {
        this.restoreState();
      }

      // Setup event listeners
      this.setupEventListeners();

      // Initial tab activation
      this.switchTab(this.activeTab, { skipHistory: true });

      // Emit initialization event
      if (this.eventBus) {
        this.eventBus.emit('tab-manager:initialized', {
          tabs: Object.keys(this.tabs),
          activeTab: this.activeTab,
        });
      }

      return this;
    }

    /**
     * Setup DOM references
     */
    setupDOM() {
      this.tabContainer = document.querySelector(this.config.tabContainerSelector);
      this.contentContainer = document.querySelector(this.config.contentContainerSelector);

      if (!this.tabContainer) {
        console.error('TabManager: Tab container not found');
        return;
      }

      // Find all tab buttons
      this.tabButtons = {};
      Object.keys(this.tabs).forEach(tabId => {
        const button = this.tabContainer.querySelector(`[data-tab="${tabId}"]`);
        if (button) {
          this.tabButtons[tabId] = button;
        }
      });

      // Find all content panels
      this.contentPanels = {};
      if (this.contentContainer) {
        Object.keys(this.tabs).forEach(tabId => {
          const panel = this.contentContainer.querySelector(`[data-tab-content="${tabId}"]`);
          if (panel) {
            this.contentPanels[tabId] = panel;
          }
        });
      }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
      // Tab button clicks
      Object.entries(this.tabButtons).forEach(([tabId, button]) => {
        button.addEventListener('click', e => {
          e.preventDefault();
          this.switchTab(tabId);
        });
      });

      // Keyboard navigation
      document.addEventListener('keydown', e => {
        if (e.ctrlKey || e.metaKey) {
          if (e.key >= '1' && e.key <= '9') {
            const index = parseInt(e.key) - 1;
            const tabId = Object.keys(this.tabs)[index];
            if (tabId) {
              e.preventDefault();
              this.switchTab(tabId);
            }
          }
        }
      });

      // Listen for state changes
      if (this.stateManager) {
        this.stateManager.observe('activeTab', newTab => {
          if (newTab && newTab !== this.activeTab) {
            this.switchTab(newTab, { fromState: true });
          }
        });
      }

      // Listen for external tab switch requests
      if (this.eventBus) {
        this.eventBus.on('request-tab-switch', data => {
          this.switchTab(data.tabId, data.options);
        });
      }
    }

    /**
     * Switch to a specific tab
     */
    async switchTab(tabId, options = {}) {
      // Validate tab
      if (!this.tabs[tabId]) {
        console.error(`TabManager: Invalid tab ID: ${tabId}`);
        return false;
      }

      // Check if already active
      if (tabId === this.activeTab && !options.force) {
        return true;
      }

      const startTime = performance.now();

      // Emit before switch event
      const beforeSwitchData = {
        from: this.activeTab,
        to: tabId,
        options,
      };

      if (!this.emit('beforeSwitch', beforeSwitchData)) {
        return false; // Switch cancelled by event handler
      }

      try {
        // Update UI
        this.updateTabUI(tabId);

        // Show loading state if lazy loading
        if (this.config.lazyLoad && !this.tabs[tabId].loaded) {
          this.showLoadingState(tabId);
        }

        // Update content visibility with animation
        await this.updateContentVisibility(tabId);

        // Lazy load content if needed
        if (this.config.lazyLoad && !this.tabs[tabId].loaded) {
          await this.loadTabContent(tabId);
          this.tabs[tabId].loaded = true;
          this.hideLoadingState(tabId);
        }

        // Update state
        this.previousTab = this.activeTab;
        this.activeTab = tabId;

        // Update history
        if (!options.skipHistory) {
          this.updateHistory(tabId);
        }

        // Sync with state manager
        if (this.stateManager && !options.fromState) {
          this.stateManager.set('activeTab', tabId);
        }

        // Persist state
        if (this.config.persistState) {
          this.saveState();
        }

        // Track performance
        const switchTime = performance.now() - startTime;
        this.trackPerformance(tabId, switchTime);

        // Emit after switch event
        this.emit('afterSwitch', {
          from: this.previousTab,
          to: tabId,
          switchTime,
          options,
        });

        // Emit to event bus
        if (this.eventBus) {
          this.eventBus.emit('tab-switched', {
            from: this.previousTab,
            to: tabId,
            timestamp: Date.now(),
          });
        }

        return true;
      } catch (error) {
        console.error('TabManager: Error switching tab', error);
        this.emit('tabError', { tabId, error });
        this.hideLoadingState(tabId);
        return false;
      }
    }

    /**
     * Update tab button UI
     */
    updateTabUI(activeTabId) {
      Object.entries(this.tabButtons).forEach(([tabId, button]) => {
        if (tabId === activeTabId) {
          button.classList.add(this.config.activeClass);
          button.setAttribute('aria-selected', 'true');
        } else {
          button.classList.remove(this.config.activeClass);
          button.setAttribute('aria-selected', 'false');
        }
      });
    }

    /**
     * Update content panel visibility with animation
     */
    async updateContentVisibility(activeTabId) {
      if (!this.contentContainer) return;

      return new Promise(resolve => {
        Object.entries(this.contentPanels).forEach(([tabId, panel]) => {
          if (tabId === activeTabId) {
            // Show new panel
            panel.style.display = 'block';
            requestAnimationFrame(() => {
              panel.classList.add(this.config.activeClass);
            });
          } else {
            // Hide other panels
            panel.classList.remove(this.config.activeClass);
            setTimeout(() => {
              if (panel.getAttribute('data-tab-content') !== this.activeTab) {
                panel.style.display = 'none';
              }
            }, this.config.animationDuration);
          }
        });

        setTimeout(resolve, this.config.animationDuration);
      });
    }

    /**
     * Load tab content (lazy loading)
     */
    async loadTabContent(tabId) {
      const tab = this.tabs[tabId];

      // Simulate content loading (replace with actual loading logic)
      return new Promise(resolve => {
        setTimeout(() => {
          if (this.eventBus) {
            this.eventBus.emit('tab-content-loaded', {
              tabId,
              component: tab.component,
            });
          }
          this.emit('tabLoaded', { tabId, tab });
          resolve();
        }, 100);
      });
    }

    /**
     * Show loading state for a tab
     */
    showLoadingState(tabId) {
      const panel = this.contentPanels[tabId];
      if (panel) {
        panel.classList.add(this.config.loadingClass);
      }
    }

    /**
     * Hide loading state for a tab
     */
    hideLoadingState(tabId) {
      const panel = this.contentPanels[tabId];
      if (panel) {
        panel.classList.remove(this.config.loadingClass);
      }
    }

    /**
     * Get current active tab
     */
    getActiveTab() {
      return this.activeTab;
    }

    /**
     * Get tab info
     */
    getTab(tabId) {
      return this.tabs[tabId];
    }

    /**
     * Get all tabs
     */
    getAllTabs() {
      return { ...this.tabs };
    }

    /**
     * Check if tab is loaded
     */
    isTabLoaded(tabId) {
      return this.tabs[tabId]?.loaded || false;
    }

    /**
     * Navigate to previous tab
     */
    previousTabNavigation() {
      if (this.previousTab) {
        this.switchTab(this.previousTab);
      }
    }

    /**
     * Navigate through history
     */
    navigateHistory(direction) {
      if (direction === 'back' && this.historyIndex > 0) {
        this.historyIndex--;
        this.switchTab(this.history[this.historyIndex], { skipHistory: true });
      } else if (direction === 'forward' && this.historyIndex < this.history.length - 1) {
        this.historyIndex++;
        this.switchTab(this.history[this.historyIndex], { skipHistory: true });
      }
    }

    /**
     * Update navigation history
     */
    updateHistory(tabId) {
      // Remove forward history if navigating from middle
      if (this.historyIndex < this.history.length - 1) {
        this.history = this.history.slice(0, this.historyIndex + 1);
      }

      this.history.push(tabId);
      this.historyIndex = this.history.length - 1;

      // Limit history size
      if (this.history.length > 20) {
        this.history = this.history.slice(-20);
        this.historyIndex = this.history.length - 1;
      }
    }

    /**
     * Event handling
     */
    on(event, handler) {
      if (this.eventHandlers[event]) {
        this.eventHandlers[event].push(handler);
      }
      return () => this.off(event, handler);
    }

    off(event, handler) {
      if (this.eventHandlers[event]) {
        this.eventHandlers[event] = this.eventHandlers[event].filter(h => h !== handler);
      }
    }

    emit(event, data) {
      if (this.eventHandlers[event]) {
        for (const handler of this.eventHandlers[event]) {
          if (handler(data) === false) {
            return false;
          }
        }
      }
      return true;
    }

    /**
     * Performance tracking
     */
    trackPerformance(tabId, switchTime) {
      this.performanceMetrics.switchCount++;
      this.performanceMetrics.totalSwitchTime += switchTime;

      if (!this.performanceMetrics.tabLoadTimes[tabId]) {
        this.performanceMetrics.tabLoadTimes[tabId] = [];
      }
      this.performanceMetrics.tabLoadTimes[tabId].push(switchTime);

      // Keep only last 10 measurements per tab
      if (this.performanceMetrics.tabLoadTimes[tabId].length > 10) {
        this.performanceMetrics.tabLoadTimes[tabId].shift();
      }
    }

    /**
     * Get performance metrics
     */
    getPerformanceMetrics() {
      const avgSwitchTime =
        this.performanceMetrics.totalSwitchTime / (this.performanceMetrics.switchCount || 1);

      const tabAverages = {};
      Object.entries(this.performanceMetrics.tabLoadTimes).forEach(([tabId, times]) => {
        if (times.length > 0) {
          tabAverages[tabId] = times.reduce((a, b) => a + b, 0) / times.length;
        }
      });

      return {
        totalSwitches: this.performanceMetrics.switchCount,
        averageSwitchTime: avgSwitchTime,
        tabAverages,
        fastestTab: Object.entries(tabAverages).sort(([, a], [, b]) => a - b)[0]?.[0],
        slowestTab: Object.entries(tabAverages).sort(([, a], [, b]) => b - a)[0]?.[0],
      };
    }

    /**
     * State persistence
     */
    saveState() {
      if (typeof localStorage !== 'undefined') {
        const state = {
          activeTab: this.activeTab,
          history: this.history.slice(-10),
          timestamp: Date.now(),
        };
        localStorage.setItem('tabManagerState', JSON.stringify(state));
      }
    }

    restoreState() {
      if (typeof localStorage !== 'undefined') {
        try {
          const saved = localStorage.getItem('tabManagerState');
          if (saved) {
            const state = JSON.parse(saved);
            // Only restore if less than 24 hours old
            if (Date.now() - state.timestamp < 24 * 60 * 60 * 1000) {
              this.activeTab = state.activeTab || 'overview';
              this.history = state.history || [];
              this.historyIndex = this.history.length - 1;
            }
          }
        } catch (error) {
          log('TabManager: Failed to restore state', error);
        }
      }
    }

    /**
     * Reset tab manager
     */
    reset() {
      this.activeTab = 'overview';
      this.previousTab = null;
      this.history = [];
      this.historyIndex = -1;

      Object.keys(this.tabs).forEach(tabId => {
        this.tabs[tabId].loaded = false;
      });

      this.performanceMetrics = {
        switchCount: 0,
        totalSwitchTime: 0,
        tabLoadTimes: {},
      };

      if (this.config?.persistState) {
        localStorage.removeItem('tabManagerState');
      }

      this.switchTab('overview', { skipHistory: true });
    }

    /**
     * Destroy tab manager
     */
    destroy() {
      // Remove event listeners
      Object.values(this.tabButtons).forEach(button => {
        button.replaceWith(button.cloneNode(true));
      });

      // Clear event handlers
      Object.keys(this.eventHandlers).forEach(event => {
        this.eventHandlers[event] = [];
      });

      // Clear references
      this.tabButtons = {};
      this.contentPanels = {};
      this.tabContainer = null;
      this.contentContainer = null;
    }
  }

  // Export for different module systems
  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = TabManager;
  } else if (typeof define === 'function' && define.amd) {
    define([], function () {
      return TabManager;
    });
  } else {
    global.TeamStatsTabManager = new TabManager();
  }
})(typeof window !== 'undefined' ? window : this);
