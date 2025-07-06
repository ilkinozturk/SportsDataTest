/**
 * Team Stats Modular Integration
 * Progressive migration from monolithic to modular architecture
 * 
 * This file serves as the main entry point for the modular team stats system
 * It handles module loading, dependency management, and progressive enhancement
 */

(function(global) {
  'use strict';

  console.log('[Team Stats Modular] Initializing modular system...');

  // Module Registry
  const ModuleRegistry = {
    modules: new Map(),
    loadOrder: [],
    dependencies: new Map(),
    
    register(name, module, dependencies = []) {
      this.modules.set(name, {
        module,
        dependencies,
        loaded: false,
        initialized: false
      });
      this.dependencies.set(name, dependencies);
      console.log(`[ModuleRegistry] Registered module: ${name}`);
    },
    
    get(name) {
      const entry = this.modules.get(name);
      return entry ? entry.module : null;
    },
    
    isLoaded(name) {
      const entry = this.modules.get(name);
      return entry ? entry.loaded : false;
    },
    
    markLoaded(name) {
      const entry = this.modules.get(name);
      if (entry) {
        entry.loaded = true;
        this.loadOrder.push(name);
      }
    },
    
    getDependencyOrder() {
      const visited = new Set();
      const order = [];
      
      const visit = (name) => {
        if (visited.has(name)) return;
        visited.add(name);
        
        const deps = this.dependencies.get(name) || [];
        deps.forEach(dep => visit(dep));
        
        order.push(name);
      };
      
      this.modules.forEach((_, name) => visit(name));
      return order;
    }
  };

  // Module Loader
  const ModuleLoader = {
    baseUrl: 'public/js/modules/',
    loaded: new Set(),
    
    async loadModule(category, name) {
      const path = `${this.baseUrl}${category}/${name}.js`;
      const moduleKey = `${category}/${name}`;
      
      if (this.loaded.has(moduleKey)) {
        return true;
      }
      
      try {
        // For now, we assume modules are already loaded via script tags
        // In production, this would use dynamic imports
        console.log(`[ModuleLoader] Loading module: ${moduleKey}`);
        this.loaded.add(moduleKey);
        return true;
      } catch (error) {
        console.error(`[ModuleLoader] Failed to load module ${moduleKey}:`, error);
        return false;
      }
    },
    
    async loadModules(moduleList) {
      const results = [];
      for (const [category, name] of moduleList) {
        const result = await this.loadModule(category, name);
        results.push({ category, name, success: result });
      }
      return results;
    }
  };

  // Legacy Bridge - Connects old code with new modules
  const LegacyBridge = {
    // Map legacy global variables to module methods
    globalMappings: {
      'globalStatistics': () => global.TeamStatsStateManager?.get('statistics'),
      'currentFilter': () => global.TeamStatsStateManager?.get('filters.current'),
      'currentTab': () => global.TeamStatsStateManager?.get('ui.activeTab')
    },
    
    // Map legacy functions to module methods
    functionMappings: {
      'showTab': (tabName, event) => {
        if (global.TeamStatsTabManager) {
          global.TeamStatsTabManager.switchTab(tabName);
        }
        // Also call legacy function if it exists
        if (global._legacyShowTab) {
          global._legacyShowTab(tabName, event);
        }
      },
      'updateStatistics': (stats) => {
        if (global.TeamStatsStateManager) {
          global.TeamStatsStateManager.setStatistics(stats);
        }
        if (global.TeamStatsEventBus) {
          global.TeamStatsEventBus.emit('data:statistics:updated', { statistics: stats });
        }
      },
      'setFilter': (filterType, value) => {
        if (global.TeamStatsFilterManager) {
          global.TeamStatsFilterManager.setFilter(filterType, value);
        }
      }
    },
    
    // Initialize bridges
    init() {
      console.log('[LegacyBridge] Initializing legacy compatibility layer...');
      this._settingGlobal = false;
      
      // Backup legacy functions
      if (global.showTab) {
        global._legacyShowTab = global.showTab;
      }
      
      // Override with bridged versions
      Object.entries(this.functionMappings).forEach(([name, bridgedFn]) => {
        global[name] = bridgedFn;
        console.log(`[LegacyBridge] Bridged function: ${name}`);
      });
      
      // Create getters for global variables
      Object.entries(this.globalMappings).forEach(([name, getter]) => {
        try {
          Object.defineProperty(global, name, {
            get: getter,
            set: (value) => {
              // Prevent circular calls by checking if we're already in a set operation
              if (this._settingGlobal) return;
              
              console.warn(`[LegacyBridge] Attempted to set legacy global: ${name}`, value);
              // Update in state manager if applicable
              if (name === 'globalStatistics' && global.TeamStatsStateManager) {
                this._settingGlobal = true;
                try {
                  global.TeamStatsStateManager.setStatistics(value);
                } finally {
                  this._settingGlobal = false;
                }
              }
            }
          });
        } catch (e) {
          console.warn(`[LegacyBridge] Could not bridge global: ${name}`, e);
        }
      });
    }
  };

  // Main App Initializer
  const TeamStatsModular = {
    initialized: false,
    config: {
      progressive: true, // Enable progressive enhancement
      fallbackToLegacy: true, // Fallback to legacy code if modules fail
      debug: true
    },
    
    // Core modules to load first
    coreModules: [
      ['core', 'constants'],
      ['core', 'event-bus'],
      ['core', 'state-manager'],
      ['core', 'api-client'],
      ['core', 'team-service']
    ],
    
    // UI modules
    uiModules: [
      ['ui', 'tabs'],
      ['ui', 'filters'],
      ['ui', 'theme'],
      ['ui', 'components']
    ],
    
    // Statistics modules
    statsModules: [
      ['statistics', 'base-statistics'],
      ['statistics', 'goals-statistics'],
      ['statistics', 'cards-statistics'],
      ['statistics', 'corners-statistics'],
      ['statistics', 'form-analyzer']
    ],
    
    // Display modules
    displayModules: [
      ['display', 'goals-display'],
      ['display', 'cards-display'],
      ['display', 'corners-display'],
      ['display', 'form-display'],
      ['display', 'statistics-display']
    ],
    
    async initialize() {
      if (this.initialized) {
        console.warn('[TeamStatsModular] Already initialized');
        return;
      }
      
      console.log('[TeamStatsModular] Starting initialization...');
      
      try {
        // Phase 1: Load core modules
        console.log('[TeamStatsModular] Phase 1: Loading core modules...');
        await this.loadCoreModules();
        
        // Phase 2: Initialize legacy bridge
        console.log('[TeamStatsModular] Phase 2: Initializing legacy bridge...');
        LegacyBridge.init();
        
        // Phase 3: Load UI modules
        console.log('[TeamStatsModular] Phase 3: Loading UI modules...');
        await this.loadUIModules();
        
        // Phase 4: Load statistics modules
        console.log('[TeamStatsModular] Phase 4: Loading statistics modules...');
        await this.loadStatisticsModules();
        
        // Phase 5: Load display modules
        console.log('[TeamStatsModular] Phase 5: Loading display modules...');
        await this.loadDisplayModules();
        
        // Phase 6: Initialize app
        console.log('[TeamStatsModular] Phase 6: Initializing application...');
        await this.initializeApp();
        
        this.initialized = true;
        console.log('[TeamStatsModular] ✅ Initialization complete!');
        
        // Emit ready event
        if (global.TeamStatsEventBus) {
          global.TeamStatsEventBus.emit('app:ready');
        }
        
      } catch (error) {
        console.error('[TeamStatsModular] Initialization failed:', error);
        
        if (this.config.fallbackToLegacy) {
          console.warn('[TeamStatsModular] Falling back to legacy mode...');
          this.initializeLegacyMode();
        }
      }
    },
    
    async loadCoreModules() {
      const results = await ModuleLoader.loadModules(this.coreModules);
      const failed = results.filter(r => !r.success);
      
      if (failed.length > 0) {
        throw new Error(`Failed to load core modules: ${failed.map(f => f.name).join(', ')}`);
      }
      
      // Verify core modules are available
      const required = ['TeamStatsEventBus', 'TeamStatsStateManager', 'TeamStatsAPIClient'];
      for (const module of required) {
        if (!global[module]) {
          throw new Error(`Core module not found: ${module}`);
        }
      }
    },
    
    async loadUIModules() {
      const results = await ModuleLoader.loadModules(this.uiModules);
      console.log('[TeamStatsModular] UI modules loaded:', results.filter(r => r.success).length);
    },
    
    async loadStatisticsModules() {
      const results = await ModuleLoader.loadModules(this.statsModules);
      console.log('[TeamStatsModular] Statistics modules loaded:', results.filter(r => r.success).length);
    },
    
    async loadDisplayModules() {
      const results = await ModuleLoader.loadModules(this.displayModules);
      console.log('[TeamStatsModular] Display modules loaded:', results.filter(r => r.success).length);
    },
    
    async initializeApp() {
      // Get team ID from URL
      console.log('[TeamStatsModular] Current URL:', window.location.href);
      console.log('[TeamStatsModular] Search params:', window.location.search);
      console.log('[TeamStatsModular] Pathname:', window.location.pathname);
      
      const urlParams = new URLSearchParams(window.location.search);
      const teamId = urlParams.get('teamId') || this.getTeamIdFromPath() || '836'; // Default to Shanghai SIPG for testing
      
      if (!teamId) {
        console.warn('[TeamStatsModular] No team ID found');
        return;
      }
      
      console.log(`[TeamStatsModular] Loading data for team ID: ${teamId}`);
      
      // Initialize state
      if (global.TeamStatsStateManager) {
        global.TeamStatsStateManager.set('teamId', teamId);
        global.TeamStatsStateManager.set('ui.loading', true);
        global.TeamStatsStateManager.set('filters.current', 'overall');
        global.TeamStatsStateManager.set('ui.activeTab', 'all');
        
        // Initialize all filter types
        global.TeamStatsStateManager.set('filters', {
          current: 'overall',
          cards: 'overall',
          xg: 'overall',
          halftime: 'overall',
          timing: 'overall',
          goalTimings: 'overall',
          shots: 'overall',
          corners: 'overall',
          teamCorners: 'overall'
        });
      }
      
      // Load team data
      if (global.TeamStatsTeamService) {
        try {
          console.log('[TeamStatsModular] Fetching data for team:', teamId);
          const teamData = await global.TeamStatsTeamService.getTeamData(teamId);
          
          console.log('[TeamStatsModular] Team data received:', teamData);
          console.log('[TeamStatsModular] Team name:', teamData?.teamInfo?.name || teamData?.teamName);
          console.log('[TeamStatsModular] Team logo:', teamData?.teamInfo?.image || teamData?.teamLogo);
          
          if (teamData && (teamData.statistics || teamData.stats)) {
            const stats = teamData.statistics || teamData.stats;
            
            // Update state
            global.TeamStatsStateManager.setTeamData(teamData);
            global.TeamStatsStateManager.setStatistics(stats);
            
            // Also set in general state for legacy bridge
            global.TeamStatsStateManager.set('statistics', stats);
            
            // Initialize displays
            this.initializeDisplays({...teamData, stats});
            
            // Update UI elements - POPULATE TEAM INFO
            console.log('[TeamStatsModular] Calling populateTeamInfo...');
            this.populateTeamInfo(teamData);
            
            // Hide loading, show team section
            const loadingSection = document.getElementById('loadingSection');
            const teamSection = document.getElementById('teamSection');
            if (loadingSection) loadingSection.style.display = 'none';
            if (teamSection) teamSection.style.display = 'block';
            
            // Manually emit the event to ensure populateTeamInfo gets called
            if (global.TeamStatsEventBus) {
              global.TeamStatsEventBus.emit('data:team:loaded', {
                teamId: teamData.teamInfo?.id || teamId,
                data: teamData
              });
              
              // Also emit data:loaded event for display modules
              global.TeamStatsEventBus.emit('data:loaded', teamData);
            }
            
            // Update goals statistics initially
            if (global.TeamStatsGoalsDisplay && global.TeamStatsGoalsDisplay.updateGoalsStatistics) {
              global.TeamStatsGoalsDisplay.updateGoalsStatistics(stats, 'overall');
            }
            
            // Initialize tab display to ensure correct sections are shown
            global.showTab('all');
            
            console.log('[TeamStatsModular] Team data loaded successfully');
          } else {
            console.error('[TeamStatsModular] No statistics found in team data');
          }
        } catch (error) {
          console.error('[TeamStatsModular] Failed to load team data:', error);
        } finally {
          if (global.TeamStatsStateManager) {
            global.TeamStatsStateManager.set('ui.loading', false);
          }
        }
      }
    },
    
    initializeDisplays(teamData) {
      const container = document.querySelector('.main-content') || document.body;
      const stats = teamData.stats;
      
      // Initialize tab manager
      if (global.TeamStatsTabManager) {
        global.TeamStatsTabManager.initialize();
      }
      
      // Initialize filter manager
      if (global.TeamStatsFilterManager) {
        global.TeamStatsFilterManager.initialize();
      }
      
      // Add filter button event listeners
      this.initializeFilterButtons(stats);
      
      // Initialize display modules based on active tab
      const activeTab = global.TeamStatsStateManager?.get('ui.activeTab') || 'all';
      this.updateDisplaysForTab(activeTab, stats);
      
      // Listen for tab changes
      if (global.TeamStatsEventBus) {
        global.TeamStatsEventBus.on('tab:changed', (data) => {
          this.updateDisplaysForTab(data.tab, stats);
        });
      }
    },
    
    updateDisplaysForTab(tab, stats) {
      console.log(`[TeamStatsModular] Updating displays for tab: ${tab}`);
      
      // Map tabs to display modules
      const tabDisplayMap = {
        'all': ['statistics-display'],
        'goals': ['goals-display'],
        'cards': ['cards-display'],
        'corners': ['corners-display'],
        'xg': ['statistics-display'],
        'halftime': ['statistics-display'],
        'timing': ['goals-display'],
        'shots': ['statistics-display']
      };
      
      const displays = tabDisplayMap[tab] || ['statistics-display'];
      
      displays.forEach(displayName => {
        const moduleKey = `TeamStats${displayName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')}`;
        const display = global[moduleKey];
        
        if (display && display.renderSection) {
          const container = document.querySelector(`.${displayName}-container`) || 
                          document.querySelector('.main-content');
          if (container) {
            display.renderSection(container, stats, { filter: 'overall' });
          }
        }
      });
    },
    
    getTeamIdFromPath() {
      // Extract team ID from URL path like /team-stats.html?teamId=123
      const path = window.location.pathname;
      const match = path.match(/team[/-]?(\d+)/);
      return match ? match[1] : null;
    },
    
    populateTeamInfo(teamData) {
      console.log('[TeamStatsModular] Populating team info...', teamData);
      
      // Update team name
      const teamNameEl = document.getElementById('teamName');
      if (teamNameEl) {
        const teamName = teamData.teamInfo?.name || teamData.teamName || teamData.name || 'Unknown Team';
        console.log('[TeamStatsModular] Setting team name to:', teamName);
        teamNameEl.textContent = teamName;
      } else {
        console.error('[TeamStatsModular] Team name element not found!');
      }
      
      // Update team logo
      const teamLogoEl = document.getElementById('teamLogo');
      if (teamLogoEl) {
        const logoUrl = teamData.teamInfo?.image || teamData.teamInfo?.logo || teamData.teamLogo || teamData.logo;
        if (logoUrl) {
          teamLogoEl.innerHTML = `<img src="${logoUrl}" alt="Team Logo" style="width: 100%; height: 100%; object-fit: contain;">`;
        } else {
          // Use first letter as fallback
          const firstLetter = (teamData.teamInfo?.name || teamData.teamName || teamData.name || 'T').charAt(0).toUpperCase();
          teamLogoEl.textContent = firstLetter;
        }
      }
      
      // Update season info
      const seasonInfoEl = document.getElementById('seasonInfo');
      if (seasonInfoEl) {
        const season = teamData.teamInfo?.season || teamData.season || '2024/25';
        seasonInfoEl.textContent = `${season} Season`;
      }
      
      // Update league info  
      const leagueInfoEl = document.getElementById('leagueInfo');
      if (leagueInfoEl) {
        leagueInfoEl.textContent = teamData.league?.name || teamData.leagueName || 'League';
      }
      
      // Update league position
      const leaguePositionEl = document.getElementById('leaguePosition');
      if (leaguePositionEl) {
        const position = teamData.leaguePosition?.position || teamData.position || '-';
        const totalTeams = teamData.leaguePosition?.totalTeams || '-';
        if (position !== '-' && totalTeams !== '-') {
          leaguePositionEl.textContent = `${position}th out of ${totalTeams}`;
        } else {
          leaguePositionEl.textContent = 'Position: -';
        }
      }
      
      // Update main stats if elements exist
      const stats = teamData.statistics || teamData.stats || {};
      
      // PPG
      const ppgEl = document.getElementById('ppgValue');
      if (ppgEl) {
        const ppg = stats.pointsPerGame || stats.ppg || 0;
        ppgEl.textContent = ppg.toFixed(2);
      }
      
      // Goals scored
      const goalsScoredEl = document.getElementById('goalsPerMatch');
      if (goalsScoredEl) {
        const goalsPerMatch = stats.goalsForPerMatch || stats.averageGoalsFor || 0;
        goalsScoredEl.textContent = goalsPerMatch.toFixed(2);
      }
      
      // Goals conceded
      const goalsConcededEl = document.getElementById('concededPerMatch');
      if (goalsConcededEl) {
        const concededPerMatch = stats.goalsAgainstPerMatch || stats.averageGoalsAgainst || 0;
        goalsConcededEl.textContent = concededPerMatch.toFixed(2);
      }
      
      // Update recent form
      const recentFormEl = document.getElementById('recentForm');
      if (recentFormEl && stats.recentForm) {
        recentFormEl.innerHTML = '';
        const formLetters = stats.recentForm.slice(-5).split('');
        formLetters.forEach(letter => {
          const badge = document.createElement('div');
          badge.className = `form-badge form-${letter.toUpperCase()}`;
          badge.textContent = letter.toUpperCase();
          recentFormEl.appendChild(badge);
        });
      }
      
      // Update form text
      const formTextEl = document.getElementById('formText');
      if (formTextEl) {
        const wins = (stats.recentForm || '').slice(-5).split('').filter(l => l.toLowerCase() === 'w').length;
        let formText = 'Average Form';
        if (wins >= 4) formText = 'Very Good Form';
        else if (wins >= 3) formText = 'Good Form';
        else if (wins <= 1) formText = 'Poor Form';
        formTextEl.textContent = formText;
      }
      
      // Update penalties
      const penaltiesWonEl = document.getElementById('penaltiesWon');
      if (penaltiesWonEl) {
        penaltiesWonEl.textContent = stats.penaltiesWon !== undefined ? stats.penaltiesWon : '0';
      }
      
      const penaltiesConcededEl = document.getElementById('penaltiesConceded');
      if (penaltiesConcededEl) {
        penaltiesConcededEl.textContent = stats.penaltiesConceded !== undefined ? stats.penaltiesConceded : '0';
      }
      
      // Update main statistics table
      this.updateMainStatsTable(teamData);
    },
    
    updateMainStatsTable(teamData) {
      const stats = teamData.statistics || teamData.stats || {};
      
      // Update table title if exists
      const titleEl = document.getElementById('mainStatsTitle');
      if (titleEl) {
        titleEl.textContent = `2024/25 ${teamData.teamInfo?.name || teamData.name || 'Team'} Statistics`;
      }
      
      // Update all stat values - Total row
      const totalMappings = {
        'totalPlayed': stats.totalMatches || stats.matches || stats.matches_overall || 0,
        'totalWins': stats.wins || stats.wins_overall || 0,
        'totalDraws': stats.draws || stats.draws_overall || 0,
        'totalLosses': stats.losses || stats.losses_overall || 0,
        'totalGoalsFor': stats.goalsFor || stats.goalsFor_overall || 0,
        'totalGoalsAgainst': stats.goalsAgainst || stats.goalsAgainst_overall || 0,
        'totalGD': stats.goalDifference || (stats.goalsFor - stats.goalsAgainst) || 0,
        'totalPPG': (stats.pointsPerGame || stats.ppg || 0).toFixed(2)
      };
      
      // Update all stat values - Home row
      const homeMappings = {
        'homePlayed': stats.homeMatches || 0,
        'homeWins': stats.homeWins || 0,
        'homeDraws': stats.homeDraws || 0,
        'homeLosses': stats.homeLosses || 0,
        'homeGoalsFor': stats.homeGoalsFor || 0,
        'homeGoalsAgainst': stats.homeGoalsAgainst || 0,
        'homeGD': stats.homeGoalDifference || (stats.homeGoalsFor - stats.homeGoalsAgainst) || 0,
        'homePPG': (stats.homePointsPerGame || 0).toFixed(2)
      };
      
      // Update all stat values - Away row
      const awayMappings = {
        'awayPlayed': stats.awayMatches || 0,
        'awayWins': stats.awayWins || 0,
        'awayDraws': stats.awayDraws || 0,
        'awayLosses': stats.awayLosses || 0,
        'awayGoalsFor': stats.awayGoalsFor || 0,
        'awayGoalsAgainst': stats.awayGoalsAgainst || 0,
        'awayGD': stats.awayGoalDifference || (stats.awayGoalsFor - stats.awayGoalsAgainst) || 0,
        'awayPPG': (stats.awayPointsPerGame || 0).toFixed(2)
      };
      
      // Combine all mappings
      const statMappings = { ...totalMappings, ...homeMappings, ...awayMappings };
      
      Object.entries(statMappings).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) {
          el.textContent = value;
        }
      });
    },
    
    initializeFilterButtons(stats) {
      console.log('[TeamStatsModular] Initializing filter buttons...');
      
      // Handle filter button clicks
      document.addEventListener('click', (e) => {
        const filterBtn = e.target.closest('.section-filter');
        if (filterBtn) {
          const filterType = filterBtn.dataset.filterType || 'current';
          const filterValue = filterBtn.dataset.filterValue;
          
          if (filterValue) {
            console.log(`[TeamStatsModular] Filter clicked: ${filterType} = ${filterValue}`);
            
            // Update button states
            const allButtons = document.querySelectorAll(`.section-filter[data-filter-type="${filterType}"]`);
            allButtons.forEach(btn => btn.classList.remove('active'));
            filterBtn.classList.add('active');
            
            // Update statistics based on filter
            this.updateStatisticsForFilter(stats, filterValue);
            
            // Emit filter change event for modules
            if (global.TeamStatsEventBus) {
              global.TeamStatsEventBus.emit('filters:change', {
                group: 'venue',
                value: filterValue,
                allFilters: { venue: filterValue }
              });
            }
          }
        }
      });
    },
    
    updateStatisticsForFilter(stats, filter) {
      console.log('[TeamStatsModular] Updating statistics for filter:', filter);
      
      // Update all statistics sections
      this.updateGoalsStatistics(stats, filter);
      this.updateCardsStatistics(stats, filter);
      this.updateCornersStatistics(stats, filter);
      this.updateOverUnderStatistics(stats, filter);
      this.updateBTTSStatistics(stats, filter);
      
      // Store current filter in state
      if (global.TeamStatsStateManager) {
        global.TeamStatsStateManager.set('filters.current', filter);
      }
    },
    
    updateGoalsStatistics(stats, filter) {
      // Let the goals display module handle this
      if (global.TeamStatsGoalsDisplay && global.TeamStatsGoalsDisplay.updateGoalsStatistics) {
        global.TeamStatsGoalsDisplay.updateGoalsStatistics(stats, filter);
      }
    },
    
    updateCardsStatistics(stats, filter) {
      // Let the cards display module handle this
      if (global.TeamStatsCardsDisplay && global.TeamStatsCardsDisplay.updateCardsStatistics) {
        global.TeamStatsCardsDisplay.updateCardsStatistics(stats, filter);
      }
    },
    
    updateCornersStatistics(stats, filter) {
      // Let the corners display module handle this
      if (global.TeamStatsCornersDisplay && global.TeamStatsCornersDisplay.updateCornersStatistics) {
        global.TeamStatsCornersDisplay.updateCornersStatistics(stats, filter);
      }
    },
    
    updateOverUnderStatistics(stats, filter) {
      // Over/Under is part of goals statistics
      if (global.TeamStatsGoalsDisplay && global.TeamStatsGoalsDisplay.updateGoalsStatistics) {
        global.TeamStatsGoalsDisplay.updateGoalsStatistics(stats, filter);
      }
    },
    
    updateBTTSStatistics(stats, filter) {
      // BTTS is also part of goals statistics
      if (global.TeamStatsGoalsDisplay && global.TeamStatsGoalsDisplay.updateGoalsStatistics) {
        global.TeamStatsGoalsDisplay.updateGoalsStatistics(stats, filter);
      }
    },
    
    initializeLegacyMode() {
      console.log('[TeamStatsModular] Running in legacy mode');
      // Legacy code continues to run as before
      // Just ensure basic functionality works
    }
  };

  // Public API
  global.TeamStatsModular = TeamStatsModular;
  global.ModuleRegistry = ModuleRegistry;
  global.ModuleLoader = ModuleLoader;
  
  // Tab functionality
  global.showTab = function(tabName, event) {
    console.log('[TeamStatsModular] Switching to tab:', tabName);
    
    // Update active tab button
    document.querySelectorAll('.tab-button').forEach(btn => {
      btn.classList.remove('active');
    });
    
    // If event exists, use it. Otherwise find the button by content
    if (event && event.target) {
      event.target.closest('.tab-button').classList.add('active');
    } else {
      // Find and activate the correct tab button
      document.querySelectorAll('.tab-button').forEach(btn => {
        if (btn.getAttribute('data-tab') === tabName) {
          btn.classList.add('active');
        }
      });
    }
    
    // Show/hide sections based on tab
    const sections = document.querySelectorAll(
      '.main-stats-section, .filterable-section, .goal-timing, .match-list, .top-stats[data-tab], .stats-category[data-tab]'
    );
    
    sections.forEach(section => {
      const sectionTab = section.getAttribute('data-tab');
      
      if (!sectionTab) {
        // If no data-tab attribute, show in all tabs
        section.style.display = tabName === 'all' ? 'block' : 'none';
      } else if (sectionTab === tabName) {
        // For top-stats elements, use grid display
        if (section.classList.contains('top-stats')) {
          section.style.display = 'grid';
        } else {
          section.style.display = 'block';
        }
      } else {
        section.style.display = 'none';
      }
    });
    
    // Special handling for Timing Analytics section
    const timingAnalytics = document.getElementById('timing-analytics-section');
    if (timingAnalytics) {
      timingAnalytics.style.display = tabName === 'goals' ? 'block' : 'none';
    }
    
    // Update state
    if (global.TeamStatsStateManager) {
      global.TeamStatsStateManager.set('ui.activeTab', tabName);
    }
    
    // Emit event
    if (global.TeamStatsEventBus) {
      global.TeamStatsEventBus.emit('tab:changed', { tab: tabName });
    }
    
    // Update statistics for the active tab
    if (tabName === 'goals' && global.TeamStatsGoalsDisplay) {
      const stats = global.TeamStatsStateManager?.get('statistics');
      const currentFilter = global.TeamStatsStateManager?.get('filters.current') || 'overall';
      if (stats) {
        global.TeamStatsGoalsDisplay.updateGoalsStatistics(stats, currentFilter);
      }
    }
  };
  
  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      TeamStatsModular.initialize();
    });
  } else {
    // DOM already loaded
    setTimeout(() => TeamStatsModular.initialize(), 100);
  }
  
  console.log('[Team Stats Modular] Module loaded, waiting for DOM...');

})(window);