/**
 * Team Stats Modular Integration
 * Progressive migration from monolithic to modular architecture
 * 
 * This file serves as the main entry point for the modular team stats system
 * It handles module loading, dependency management, and progressive enhancement
 */

(function(global) {
  'use strict';

  // Debug mode - set to false for production
  const DEBUG = false;
  const log = DEBUG ? console.log.bind(console) : () => {};

  log('[Team Stats Modular] Initializing modular system...');

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
      log(`[ModuleRegistry] Registered module: ${name}`);
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
        log(`[ModuleLoader] Loading module: ${moduleKey}`);
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
        log(`[LegacyBridge] Bridged function: ${name}`);
      });
      
      // Create getters for global variables
      Object.entries(this.globalMappings).forEach(([name, getter]) => {
        try {
          Object.defineProperty(global, name, {
            get: getter,
            set: (value) => {
              // Prevent circular calls by checking if we're already in a set operation
              if (this._settingGlobal) return;
              
              log(`[LegacyBridge] Attempted to set legacy global: ${name}`, value);
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
          log(`[LegacyBridge] Could not bridge global: ${name}`, e);
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
        log('[TeamStatsModular] Already initialized');
        return;
      }
      
      log('[TeamStatsModular] Starting initialization...');
      
      try {
        // Phase 1: Load core modules
        log('[TeamStatsModular] Phase 1: Loading core modules...');
        await this.loadCoreModules();
        
        // Phase 2: Initialize legacy bridge
        log('[TeamStatsModular] Phase 2: Initializing legacy bridge...');
        LegacyBridge.init();
        
        // Phase 3: Load UI modules
        log('[TeamStatsModular] Phase 3: Loading UI modules...');
        await this.loadUIModules();
        
        // Phase 4: Load statistics modules
        log('[TeamStatsModular] Phase 4: Loading statistics modules...');
        await this.loadStatisticsModules();
        
        // Phase 5: Load display modules
        log('[TeamStatsModular] Phase 5: Loading display modules...');
        await this.loadDisplayModules();
        
        // Phase 6: Initialize app
        log('[TeamStatsModular] Phase 6: Initializing application...');
        await this.initializeApp();
        
        this.initialized = true;
        log('[TeamStatsModular] ✅ Initialization complete!');
        
        // Emit ready event
        if (global.TeamStatsEventBus) {
          global.TeamStatsEventBus.emit('app:ready');
        }
        
      } catch (error) {
        console.error('[TeamStatsModular] Initialization failed:', error);
        
        if (this.config.fallbackToLegacy) {
          log('[TeamStatsModular] Falling back to legacy mode...');
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
      log('[TeamStatsModular] UI modules loaded:', results.filter(r => r.success).length);
    },
    
    async loadStatisticsModules() {
      const results = await ModuleLoader.loadModules(this.statsModules);
      log('[TeamStatsModular] Statistics modules loaded:', results.filter(r => r.success).length);
    },
    
    async loadDisplayModules() {
      const results = await ModuleLoader.loadModules(this.displayModules);
      log('[TeamStatsModular] Display modules loaded:', results.filter(r => r.success).length);
    },
    
    async initializeApp() {
      // Get team ID from URL
      log('[TeamStatsModular] Current URL:', window.location.href);
      log('[TeamStatsModular] Search params:', window.location.search);
      log('[TeamStatsModular] Pathname:', window.location.pathname);
      
      const urlParams = new URLSearchParams(window.location.search);
      const teamId = urlParams.get('teamId') || this.getTeamIdFromPath() || '836'; // Default to Shanghai SIPG for testing
      
      if (!teamId) {
        log('[TeamStatsModular] No team ID found');
        return;
      }
      
      log(`[TeamStatsModular] Loading data for team ID: ${teamId}`);
      
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
          log('[TeamStatsModular] Fetching data for team:', teamId);
          const teamData = await global.TeamStatsTeamService.getTeamData(teamId);
          
          log('[TeamStatsModular] Team data received:', teamData);
          log('[TeamStatsModular] Team name:', teamData?.teamInfo?.name || teamData?.teamName);
          log('[TeamStatsModular] Team logo:', teamData?.teamInfo?.image || teamData?.teamLogo);
          
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
            log('[TeamStatsModular] Calling populateTeamInfo...');
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
              // Also update conceded section
              if (global.TeamStatsGoalsDisplay.updateConcededSection) {
                global.TeamStatsGoalsDisplay.updateConcededSection(stats, 'overall');
              }
            }
            
            // Initialize tab display to ensure correct sections are shown
            global.showTab('all');
            
            log('[TeamStatsModular] Team data loaded successfully');
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
      
      // Add tab button event listeners
      this.initializeTabButtons();
      
      // Populate all statistics sections with initial data
      this.populateStatistics(stats);
      
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
      log(`[TeamStatsModular] Updating displays for tab: ${tab}`);
      
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
      
      // Special handling for Goals tab - update conceded section
      if (tab === 'goals' && global.TeamStatsGoalsDisplay && global.TeamStatsGoalsDisplay.updateConcededSection) {
        global.TeamStatsGoalsDisplay.updateConcededSection(stats, 'overall');
      }
    },
    
    getTeamIdFromPath() {
      // Extract team ID from URL path like /team-stats.html?teamId=123
      const path = window.location.pathname;
      const match = path.match(/team[/-]?(\d+)/);
      return match ? match[1] : null;
    },
    
    populateTeamInfo(teamData) {
      log('[TeamStatsModular] Populating team info...', teamData);
      
      // Update team name
      const teamNameEl = document.getElementById('teamName');
      if (teamNameEl) {
        const teamName = teamData.teamInfo?.name || teamData.teamName || teamData.name || 'Unknown Team';
        log('[TeamStatsModular] Setting team name to:', teamName);
        teamNameEl.textContent = teamName;
      } else {
        console.error('[TeamStatsModular] Team name element not found!');
      }
      
      // Update team logo
      const teamLogoEl = document.getElementById('teamLogo');
      if (teamLogoEl) {
        const logoUrl = teamData.teamInfo?.image || teamData.teamInfo?.logo || teamData.teamLogo || teamData.logo;
        
        // Only update logo if we have a valid URL and haven't already set an image
        if (logoUrl && logoUrl.length > 0 && !teamLogoEl.querySelector('img')) {
          teamLogoEl.innerHTML = `<img src="${logoUrl}" alt="Team Logo" style="width: 100%; height: 100%; object-fit: contain;">`;
        } else if (!logoUrl && !teamLogoEl.querySelector('img')) {
          // Use first letter as fallback only if no img exists
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
      
      // Goals conceded - update both top card and stats section
      const concededPerMatch = stats.goalsAgainstPerMatch || stats.averageGoalsAgainst || stats.seasonConcededAVG_overall || 0;
      
      const goalsConcededTopEl = document.getElementById('concededPerMatchTop');
      if (goalsConcededTopEl) {
        goalsConcededTopEl.textContent = concededPerMatch.toFixed(2);
      }
      
      const goalsConcededEl = document.getElementById('concededPerMatch');
      if (goalsConcededEl) {
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
    
    updateElement(id, value) {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = value;
      }
    },
    
    updateSectionStatistics(section, stats, filter) {
      log('[TeamStatsModular] Updating section statistics', section, filter);
      
      // Get suffix for data fields
      const suffix = filter === 'overall' ? '_overall' : `_${filter}`;
      
      // Find all elements with data-stat attribute within this section
      const statElements = section.querySelectorAll('[data-stat]');
      
      statElements.forEach(element => {
        const statKey = element.dataset.stat;
        
        // Build the field name based on filter
        let fieldName = statKey;
        if (filter !== 'overall') {
          // For home/away, try different naming patterns
          if (filter === 'home') {
            fieldName = stats[`home${statKey.charAt(0).toUpperCase() + statKey.slice(1)}`] !== undefined 
              ? `home${statKey.charAt(0).toUpperCase() + statKey.slice(1)}`
              : `${statKey}_home`;
          } else if (filter === 'away') {
            fieldName = stats[`away${statKey.charAt(0).toUpperCase() + statKey.slice(1)}`] !== undefined
              ? `away${statKey.charAt(0).toUpperCase() + statKey.slice(1)}`
              : `${statKey}_away`;
          }
        }
        
        // Get the value from stats
        const value = stats[fieldName] || stats[`${statKey}${suffix}`] || stats[statKey] || 0;
        
        // Update the element
        if (element.tagName === 'INPUT') {
          element.value = value;
        } else {
          element.textContent = value;
        }
        
        // Update bar widths if it's a bar element
        if (element.classList.contains('bar')) {
          const maxValue = parseInt(element.dataset.max) || 100;
          const percentage = (value / maxValue) * 100;
          element.style.width = Math.min(percentage, 100) + '%';
        }
      });
    },
    
    populateStatistics(stats) {
      log('[TeamStatsModular] Populating all statistics sections with initial data');
      
      // Update all sections with overall filter
      this.updateGoalTimingsStatistics(stats, 'overall');
      this.updateXGStatistics(stats, 'overall');
      this.updateHalftimeStatistics(stats, 'overall');
      this.updateCardsStatistics(stats, 'overall');  // Add Card & Discipline Statistics
      
      // Update other sections if their modules are available
      if (global.TeamStatsGoalsDisplay && global.TeamStatsGoalsDisplay.updateGoalsStatistics) {
        global.TeamStatsGoalsDisplay.updateGoalsStatistics(stats, 'overall');
        // Also update conceded section specifically
        if (global.TeamStatsGoalsDisplay.updateConcededSection) {
          global.TeamStatsGoalsDisplay.updateConcededSection(stats, 'overall');
        }
        // Update top stats cards if available
        if (global.TeamStatsGoalsDisplay.updateScoredTopStats) {
          global.TeamStatsGoalsDisplay.updateScoredTopStats(stats, 'overall');
        }
        if (global.TeamStatsGoalsDisplay.updateConcededTopStats) {
          global.TeamStatsGoalsDisplay.updateConcededTopStats(stats, 'overall');
        }
      }
      
      if (global.TeamStatsCardsDisplay && global.TeamStatsCardsDisplay.updateCardsStatistics) {
        global.TeamStatsCardsDisplay.updateCardsStatistics(stats, 'overall');
        // Also update Match Cards section
        if (global.TeamStatsCardsDisplay.updateMatchCardsSection) {
          global.TeamStatsCardsDisplay.updateMatchCardsSection(stats, 'overall');
        }
        // Also update Team Cards section if exists
        if (global.TeamStatsCardsDisplay.updateTeamCardsSection) {
          global.TeamStatsCardsDisplay.updateTeamCardsSection(stats, 'overall');
        }
      }
      
      if (global.TeamStatsCornersDisplay && global.TeamStatsCornersDisplay.updateCornersStatistics) {
        global.TeamStatsCornersDisplay.updateCornersStatistics(stats, 'overall');
        // Also update Team Corners section
        if (global.TeamStatsCornersDisplay.updateTeamCornersSection) {
          global.TeamStatsCornersDisplay.updateTeamCornersSection(stats, 'overall');
        }
        // Update corners top stats
        if (global.TeamStatsCornersDisplay.updateCornersTopStats) {
          global.TeamStatsCornersDisplay.updateCornersTopStats(stats, 'overall');
        }
      }
      
      if (global.TeamStatsShotsDisplay && global.TeamStatsShotsDisplay.updateShotsStatistics) {
        global.TeamStatsShotsDisplay.updateShotsStatistics(stats, 'overall');
      }
    },
    
    initializeFilterButtons(stats) {
      log('[TeamStatsModular] Initializing filter buttons...');
      
      // Simple approach: each section maintains its own filter state
      document.addEventListener('click', (e) => {
        const filterBtn = e.target.closest('.section-filter');
        if (filterBtn) {
          const filterValue = filterBtn.dataset.filterValue;
          const filterType = filterBtn.dataset.filterType || 'current';
          
          if (filterValue) {
            log(`[TeamStatsModular] Filter clicked: ${filterType} = ${filterValue}`);
            
            // Find the parent section
            const section = filterBtn.closest('.filterable-section, .goal-timing, .stats-category');
            
            if (section) {
              // Update button states only within this section
              const sectionButtons = section.querySelectorAll(`.section-filter[data-filter-type="${filterType}"]`);
              sectionButtons.forEach(btn => btn.classList.remove('active'));
              filterBtn.classList.add('active');
            } else {
              // If no parent section, update all buttons of same type
              const allButtons = document.querySelectorAll(`.section-filter[data-filter-type="${filterType}"]`);
              allButtons.forEach(btn => btn.classList.remove('active'));
              filterBtn.classList.add('active');
            }
            
            // Update statistics based on filter type
            this.updateStatisticsForFilterType(stats, filterType, filterValue);
            
            // Store filter state
            if (global.TeamStatsStateManager) {
              global.TeamStatsStateManager.set(`filters.${filterType}`, filterValue);
            }
          }
        }
      });
    },
    
    initializeTabButtons() {
      log('[TeamStatsModular] Initializing tab buttons...');
      
      // Local showTab function
      const showTab = (tabName, event) => {
        log('🔄 [SHOW TAB] Switching to tab:', tabName);
        
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
        
        // Update state
        if (global.TeamStatsStateManager) {
          global.TeamStatsStateManager.set('ui.activeTab', tabName);
        }
        
        // Emit event
        if (global.TeamStatsEventBus) {
          global.TeamStatsEventBus.emit('tab:changed', { tab: tabName });
        }
      };
      
      // Add click event listeners to all tab buttons
      document.querySelectorAll('.tab-button').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const tabName = btn.getAttribute('data-tab');
          if (tabName) {
            log(`[TeamStatsModular] Tab button clicked: ${tabName}`);
            showTab(tabName, e);
          }
        });
      });
      
      // Also make it globally available
      global.showTab = showTab;
    },
    
    updateStatisticsForFilterType(stats, filterType, filter) {
      log('[TeamStatsModular] Updating statistics for filter type:', filterType, 'filter:', filter);
      
      // Update only the relevant section based on filter type
      switch(filterType) {
        case 'scored':
          // Update ONLY Scored Statistics section in Goals tab
          if (global.TeamStatsGoalsDisplay && global.TeamStatsGoalsDisplay.updateScoredSection) {
            global.TeamStatsGoalsDisplay.updateScoredSection(stats, filter);
          }
          break;
        case 'conceded':
          // Update ONLY Conceded Statistics section in Goals tab
          if (global.TeamStatsGoalsDisplay && global.TeamStatsGoalsDisplay.updateConcededSection) {
            global.TeamStatsGoalsDisplay.updateConcededSection(stats, filter);
          }
          break;
        case 'cards':
          // Update ONLY Card & Discipline Statistics section
          this.updateCardsStatistics(stats, filter);
          break;
        case 'matchCards':
          // Update ONLY Match Cards section
          if (global.TeamStatsCardsDisplay && global.TeamStatsCardsDisplay.updateMatchCardsSection) {
            global.TeamStatsCardsDisplay.updateMatchCardsSection(stats, filter);
          } else {
            this.updateCardsStatistics(stats, filter);
          }
          break;
        case 'teamCards':
          // Update ONLY Team Cards section
          if (global.TeamStatsCardsDisplay && global.TeamStatsCardsDisplay.updateTeamCardsSection) {
            global.TeamStatsCardsDisplay.updateTeamCardsSection(stats, filter);
          } else {
            this.updateCardsStatistics(stats, filter);
          }
          break;
        case 'corners':
          // Update ONLY Match Corners section
          if (global.TeamStatsCornersDisplay && global.TeamStatsCornersDisplay.updateMatchCornersSection) {
            global.TeamStatsCornersDisplay.updateMatchCornersSection(stats, filter);
          } else {
            this.updateCornersStatistics(stats, filter);
          }
          break;
        case 'teamCorners':
          // Update ONLY Team Corners section
          if (global.TeamStatsCornersDisplay && global.TeamStatsCornersDisplay.updateTeamCornersSection) {
            global.TeamStatsCornersDisplay.updateTeamCornersSection(stats, filter);
          } else {
            this.updateCornersStatistics(stats, filter);
          }
          break;
        case 'current':
        case 'main':
          // For main filters, update all sections (legacy behavior)
          this.updateStatisticsForFilter(stats, filter);
          break;
        case 'overUnder':
          // Update ONLY Over/Under section
          if (global.TeamStatsGoalsDisplay && global.TeamStatsGoalsDisplay.updateOverUnderSection) {
            global.TeamStatsGoalsDisplay.updateOverUnderSection(stats, filter);
          } else {
            this.updateOverUnderStatistics(stats, filter);
          }
          break;
        case 'btts':
          // Update ONLY BTTS section
          if (global.TeamStatsGoalsDisplay && global.TeamStatsGoalsDisplay.updateBTTSSection) {
            global.TeamStatsGoalsDisplay.updateBTTSSection(stats, filter);
          } else {
            this.updateBTTSStatistics(stats, filter);
          }
          break;
        case 'xg':
          // Update ONLY xG Analysis section
          this.updateXGStatistics(stats, filter);
          break;
        case 'halftime':
          // Update ONLY Halftime Analysis section  
          this.updateHalftimeStatistics(stats, filter);
          break;
        case 'goalTimings':
          // Update ONLY Goal Timings section
          this.updateGoalTimingsStatistics(stats, filter);
          break;
        case 'shots':
          // Update ONLY Shots section
          if (global.TeamStatsShotsDisplay && global.TeamStatsShotsDisplay.updateShotsStatistics) {
            global.TeamStatsShotsDisplay.updateShotsStatistics(stats, filter);
          }
          break;
        default:
          log('[TeamStatsModular] Unknown filter type:', filterType);
          break;
      }
      
      // Store filter in state based on type
      if (global.TeamStatsStateManager) {
        global.TeamStatsStateManager.set(`filters.${filterType}`, filter);
      }
    },

    updateStatisticsForFilter(stats, filter) {
      log('[TeamStatsModular] Updating statistics for filter:', filter);
      
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
      log('[TeamStatsModular] Updating Card & Discipline Statistics with filter:', filter);
      
      // Update Card & Discipline Statistics section
      const suffix = filter === 'overall' ? '_overall' : `_${filter}`;
      
      // Total cards
      let totalCards = 0;
      if (filter === 'overall') {
        totalCards = stats.cardsTotal_overall || stats.totalCards || 0;
      } else if (filter === 'home') {
        totalCards = stats.cardsTotal_home || stats.homeTotalCards || 0;
      } else if (filter === 'away') {
        totalCards = stats.cardsTotal_away || stats.awayTotalCards || 0;
      }
      this.updateElement('totalCards', totalCards);
      
      // Cards per match
      let cardsPerMatch = 0;
      if (filter === 'overall') {
        cardsPerMatch = stats.cardsAVG_overall || stats.averageCards || 0;
      } else if (filter === 'home') {
        cardsPerMatch = stats.cardsAVG_home || stats.homeAverageCards || 0;
      } else if (filter === 'away') {
        cardsPerMatch = stats.cardsAVG_away || stats.awayAverageCards || 0;
      }
      this.updateElement('cardsPerMatch', cardsPerMatch.toFixed(2));
      
      // Home/Away specific cards
      if (filter === 'overall') {
        this.updateElement('homeCards', stats.homeCardsTotal || 0);
        this.updateElement('awayCards', stats.awayCardsTotal || 0);
        this.updateElement('homeCardsPerMatch', (stats.homeCardsAVG || 0).toFixed(2));
        this.updateElement('awayCardsPerMatch', (stats.awayCardsAVG || 0).toFixed(2));
      }
      
      // Highest/Lowest cards
      this.updateElement('cardsHighest', stats[`cardsHighest${suffix}`] || stats.cardsHighest_overall || 0);
      this.updateElement('cardsLowest', stats[`cardsLowest${suffix}`] || stats.cardsLowest_overall || 0);
      
      // Cards Over statistics
      this.updateElement('cardsOver05', (stats[`cardsOver05${suffix}`] || stats.over05Cards || 0) + '%');
      this.updateElement('cardsOver15', (stats[`cardsOver15${suffix}`] || stats.over15Cards || 0) + '%');
      this.updateElement('cardsOver25', (stats[`cardsOver25${suffix}`] || stats.over25Cards || 0) + '%');
      this.updateElement('cardsOver35', (stats[`cardsOver35${suffix}`] || stats.over35Cards || 0) + '%');
      this.updateElement('cardsOver45', (stats[`cardsOver45${suffix}`] || stats.over45Cards || 0) + '%');
      this.updateElement('cardsOver55', (stats[`cardsOver55${suffix}`] || stats.over55Cards || 0) + '%');
      
      // Let the cards display module handle additional updates if available
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
    
    updateXGStatistics(stats, filter) {
      log('[TeamStatsModular] Updating ONLY xG Analysis with filter:', filter);
      const suffix = filter === 'overall' ? '_overall' : `_${filter}`;
      
      // Update xG values
      let xgFor = 0, xgAgainst = 0, xgForPerMatch = 0, xgAgainstPerMatch = 0;
      let goalsForPerMatch = 0, goalsAgainstPerMatch = 0;
      
      if (filter === 'overall') {
        xgFor = stats.xgFor || 0;
        xgAgainst = stats.xgAgainst || 0;
        xgForPerMatch = stats.xgForPerMatch || 0;
        xgAgainstPerMatch = stats.xgAgainstPerMatch || 0;
        goalsForPerMatch = stats.goalsForPerMatch || stats.seasonScoredAVG_overall || 0;
        goalsAgainstPerMatch = stats.goalsAgainstPerMatch || stats.seasonConcededAVG_overall || 0;
      } else if (filter === 'home') {
        xgFor = stats.homeXgFor || 0;
        xgAgainst = stats.homeXgAgainst || 0;
        xgForPerMatch = stats.homeXgForPerMatch || 0;
        xgAgainstPerMatch = stats.homeXgAgainstPerMatch || 0;
        goalsForPerMatch = stats.homeGoalsForPerMatch || stats.seasonScoredAVG_home || 0;
        goalsAgainstPerMatch = stats.homeGoalsAgainstPerMatch || stats.seasonConcededAVG_home || 0;
      } else if (filter === 'away') {
        xgFor = stats.awayXgFor || 0;
        xgAgainst = stats.awayXgAgainst || 0;
        xgForPerMatch = stats.awayXgForPerMatch || 0;
        xgAgainstPerMatch = stats.awayXgAgainstPerMatch || 0;
        goalsForPerMatch = stats.awayGoalsForPerMatch || stats.seasonScoredAVG_away || 0;
        goalsAgainstPerMatch = stats.awayGoalsAgainstPerMatch || stats.seasonConcededAVG_away || 0;
      }
      
      // Update xG elements - use unique IDs for xG section
      this.updateElement('xgFor', xgFor.toFixed(2));
      this.updateElement('xgAgainst', xgAgainst.toFixed(2));
      this.updateElement('xgSectionForPerMatch', xgForPerMatch.toFixed(2));
      this.updateElement('xgSectionAgainstPerMatch', xgAgainstPerMatch.toFixed(2));
      
      // Calculate differences
      const xgDifference = xgForPerMatch - xgAgainstPerMatch;
      const xgDiffSign = xgDifference >= 0 ? '+' : '';
      this.updateElement('xgSectionDifference', xgDiffSign + xgDifference.toFixed(2));
      
      // Update goals per match in xG section
      this.updateElement('xgSectionGoalsForAvg', goalsForPerMatch.toFixed(2));
      this.updateElement('xgSectionGoalsAgainstAvg', goalsAgainstPerMatch.toFixed(2));
      
      // Calculate goal difference
      const goalDifference = goalsForPerMatch - goalsAgainstPerMatch;
      const goalDiffSign = goalDifference >= 0 ? '+' : '';
      this.updateElement('xgSectionGoalDifferenceAvg', goalDiffSign + goalDifference.toFixed(2));
    },
    
    updateHalftimeStatistics(stats, filter) {
      log('[TeamStatsModular] Updating ONLY Halftime Analysis with filter:', filter);
      log('[TeamStatsModular] Halftime stats:', {
        scored1H_overall: stats.scored1H_overall,
        seasonScored1H_overall: stats.seasonScored1H_overall,
        halftimeWins_overall: stats.halftimeWins_overall,
        halftimeDraws_overall: stats.halftimeDraws_overall,
        halftimeLosses_overall: stats.halftimeLosses_overall
      });
      
      const suffix = filter === 'overall' ? '_overall' : `_${filter}`;
      
      // Get matches count
      let matches = 0;
      if (filter === 'overall') {
        matches = stats.totalMatches || stats.matches || stats.matches_overall || 0;
      } else if (filter === 'home') {
        matches = stats.homeMatches || stats.matches_home || 0;
      } else if (filter === 'away') {
        matches = stats.awayMatches || stats.matches_away || 0;
      }
      
      // Update column header
      let headerText = 'Overall';
      if (filter === 'home') headerText = 'Home';
      else if (filter === 'away') headerText = 'Away';
      this.updateElement('halftimeColumnHeader', headerText);
      
      // First Half Goals Scored - use correct API fields
      let firstHalfGoalsScored = 0;
      let scoredMatchesWithGoals = 0;
      if (filter === 'overall') {
        firstHalfGoalsScored = stats.scoredGoalsHT_overall || stats.scored1H_overall || stats.seasonScored1H_overall || 0;
        scoredMatchesWithGoals = stats.seasonScored1HMatches_overall || matches;
      } else if (filter === 'home') {
        firstHalfGoalsScored = stats.scoredGoalsHT_home || stats.scored1H_home || stats.seasonScored1H_home || 0;
        scoredMatchesWithGoals = stats.seasonScored1HMatches_home || matches;
      } else if (filter === 'away') {
        firstHalfGoalsScored = stats.scoredGoalsHT_away || stats.scored1H_away || stats.seasonScored1H_away || 0;
        scoredMatchesWithGoals = stats.seasonScored1HMatches_away || matches;
      }
      this.updateElement('firstHalfGoalsScored', firstHalfGoalsScored);
      this.updateElement('firstHalfGoalsScoredMatches', matches);
      const firstHalfGoalsScoredPerc = stats[`scored1HPercentage${suffix}`] || stats[`seasonScored1HPercentage${suffix}`] ||
        (scoredMatchesWithGoals > 0 ? Math.round((firstHalfGoalsScored / scoredMatchesWithGoals) * 100) : 0);
      this.updateElement('firstHalfGoalsScoredPerc', `${firstHalfGoalsScoredPerc}%`);
      
      // First Half Goals Conceded - use correct API fields
      let firstHalfGoalsConceded = 0;
      if (filter === 'overall') {
        firstHalfGoalsConceded = stats.concededGoalsHT_overall || stats.conceded1H_overall || stats.seasonConceded1H_overall || 0;
      } else if (filter === 'home') {
        firstHalfGoalsConceded = stats.concededGoalsHT_home || stats.conceded1H_home || stats.seasonConceded1H_home || 0;
      } else if (filter === 'away') {
        firstHalfGoalsConceded = stats.concededGoalsHT_away || stats.conceded1H_away || stats.seasonConceded1H_away || 0;
      }
      this.updateElement('firstHalfGoalsConceded', firstHalfGoalsConceded);
      this.updateElement('firstHalfGoalsConcededMatches', matches);
      const firstHalfGoalsConcededPerc = stats[`conceded1HPercentage${suffix}`] || 
        (matches > 0 ? Math.round((firstHalfGoalsConceded / matches) * 100) : 0);
      this.updateElement('firstHalfGoalsConcededPerc', `${firstHalfGoalsConcededPerc}%`);
      
      // Leading at Halftime - use the correct API fields
      let leadingAtHT = 0;
      if (filter === 'overall') {
        leadingAtHT = stats.leadingAtHT_overall || stats.leadingAtHT || 0;
      } else if (filter === 'home') {
        leadingAtHT = stats.leadingAtHT_home || stats.homeLeadingAtHT || 0;
      } else if (filter === 'away') {
        leadingAtHT = stats.leadingAtHT_away || stats.awayLeadingAtHT || 0;
      }
      
      this.updateElement('leadingAtHT', leadingAtHT);
      this.updateElement('leadingAtHTMatches', matches);
      const leadingAtHTPerc = matches > 0 ? Math.round((leadingAtHT / matches) * 100) : 0;
      this.updateElement('leadingAtHTPerc', `${leadingAtHTPerc}%`);
      
      // Drawing at Halftime - use the correct API fields
      let drawingAtHT = 0;
      if (filter === 'overall') {
        drawingAtHT = stats.drawingAtHT_overall || stats.drawingAtHT || 0;
      } else if (filter === 'home') {
        drawingAtHT = stats.drawingAtHT_home || stats.homeDrawingAtHT || 0;
      } else if (filter === 'away') {
        drawingAtHT = stats.drawingAtHT_away || stats.awayDrawingAtHT || 0;
      }
      
      this.updateElement('drawingAtHT', drawingAtHT);
      this.updateElement('drawingAtHTMatches', matches);
      const drawingAtHTPerc = matches > 0 ? Math.round((drawingAtHT / matches) * 100) : 0;
      this.updateElement('drawingAtHTPerc', `${drawingAtHTPerc}%`);
      
      // Losing at Halftime - use the correct API fields (trailingAtHT)
      let losingAtHT = 0;
      if (filter === 'overall') {
        losingAtHT = stats.trailingAtHT_overall || stats.losingAtHT_overall || stats.losingAtHT || 0;
      } else if (filter === 'home') {
        losingAtHT = stats.trailingAtHT_home || stats.losingAtHT_home || stats.homeLosingAtHT || 0;
      } else if (filter === 'away') {
        losingAtHT = stats.trailingAtHT_away || stats.losingAtHT_away || stats.awayLosingAtHT || 0;
      }
      
      this.updateElement('losingAtHT', losingAtHT);
      this.updateElement('losingAtHTMatches', matches);
      const losingAtHTPerc = matches > 0 ? Math.round((losingAtHT / matches) * 100) : 0;
      this.updateElement('losingAtHTPerc', `${losingAtHTPerc}%`);
    },
    
    updateGoalTimingsStatistics(stats, filter) {
      log('[TeamStatsModular] Updating ONLY Goal Timings with filter:', filter);
      
      // Goal timing periods
      const timingPeriods = ['0_15', '16_30', '31_45', '46_60', '61_75', '76_90'];
      
      timingPeriods.forEach(period => {
        let scoredValue = 0;
        let concededValue = 0;
        
        if (filter === 'overall') {
          scoredValue = stats[`goals${period}`] || 0;
          concededValue = stats[`goalsConc${period}`] || 0;
        } else if (filter === 'home') {
          scoredValue = stats[`homeGoals${period}`] || 0;
          concededValue = stats[`homeGoalsConc${period}`] || 0;
        } else if (filter === 'away') {
          scoredValue = stats[`awayGoals${period}`] || 0;
          concededValue = stats[`awayGoalsConc${period}`] || 0;
        }
        
        // Update the values
        this.updateElement(`scored${period}Value`, scoredValue);
        this.updateElement(`conceded${period}Value`, concededValue);
        
        // Update the bar widths (assuming max 10 goals per period for visualization)
        const maxGoals = 10;
        const scoredWidth = (scoredValue / maxGoals) * 100;
        const concededWidth = (concededValue / maxGoals) * 100;
        
        const scoredBar = document.getElementById(`scored${period}Bar`);
        const concededBar = document.getElementById(`conceded${period}Bar`);
        
        if (scoredBar) {
          scoredBar.style.width = Math.min(scoredWidth, 100) + '%';
        }
        if (concededBar) {
          concededBar.style.width = Math.min(concededWidth, 100) + '%';
        }
      });
    },
    
    initializeLegacyMode() {
      log('[TeamStatsModular] Running in legacy mode');
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
    console.log('🔄 [SHOW TAB] Switching to tab:', tabName);
    console.log('🔄 [SHOW TAB] Event:', event);
    
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