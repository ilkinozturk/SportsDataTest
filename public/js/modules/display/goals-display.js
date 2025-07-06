/**
 * Goals Display Module
 * Handles the visualization and rendering of goals statistics
 * 
 * Features:
 * - Goals overview cards
 * - Goals timing charts
 * - Home/Away goals comparison
 * - Over/Under goals display
 * - Clean sheets visualization
 * - Goal patterns analysis
 * - Interactive charts and animations
 */

(function(global) {
  'use strict';

  // Debug mode - set to false for production
  const DEBUG = false;
  const log = DEBUG ? console.log.bind(console) : () => {};

  // Module dependencies check
  const requiredModules = ['TeamStatsEventBus', 'TeamStatsStateManager'];
  const missingModules = requiredModules.filter(module => !global[module]);
  
  if (missingModules.length > 0) {
    log('[GoalsDisplay] Missing optional modules:', missingModules);
  }

  class GoalsDisplay {
    constructor() {
      this.name = 'GoalsDisplay';
      this.version = '1.0.0';
      this.initialized = false;
      this.config = {
        animationDuration: 300,
        chartColors: {
          goals: '#10b981',
          conceded: '#ef4444',
          cleanSheet: '#3b82f6',
          failedToScore: '#f59e0b',
          home: '#06b6d4',
          away: '#8b5cf6'
        },
        thresholds: {
          highScoring: 2.5,
          lowScoring: 1.5,
          goodDefense: 1.0,
          poorDefense: 2.0
        }
      };
      this.state = {
        activeFilter: 'overall',
        activeTimeFrame: 'all',
        comparisonMode: false,
        chartType: 'bar' // bar, line, pie
      };
    }

    /**
     * Create element helper
     */
    createElement(tag, options = {}) {
      const element = document.createElement(tag);
      if (options.className) element.className = options.className;
      if (options.textContent) element.textContent = options.textContent;
      if (options.innerHTML) element.innerHTML = options.innerHTML;
      if (options.style) {
        Object.assign(element.style, options.style);
      }
      if (options.parent) {
        options.parent.appendChild(element);
      }
      return element;
    }

    /**
     * Clear container helper
     */
    clearContainer(container) {
      if (container) {
        container.innerHTML = '';
      }
    }

    /**
     * Get GoalsStatistics module
     */
    get goalsStats() {
      return global.TeamStatsGoalsStatistics;
    }

    /**
     * Get Renderer module
     */
    get renderer() {
      return global.TeamStatsRenderer;
    }

    /**
     * Get Components module
     */
    get components() {
      return global.TeamStatsComponents;
    }

    /**
     * Get goals details from statistics
     */
    getGoalsDetailsFromStats(statistics, options = {}) {
      const goalsData = this.goalsStats.calculateGoalStatistics(statistics.recentMatches || [], { 
        filter: options.filter,
        teamId: statistics.teamId
      });
      
      return {
        scoringPatterns: goalsData.scoringPatterns || {
          firstGoalPercentage: 65,
          bothHalvesPercentage: 45,
          lateGoalsPercentage: 30,
          highestScoringPeriod: '46-60 min'
        },
        defensivePatterns: {
          cleanSheetPercentage: goalsData.cleanSheets ? Math.round((goalsData.cleanSheets / goalsData.matches) * 100) : 0,
          firstHalfConcededPercentage: 40,
          secondHalfConcededPercentage: 60,
          mostVulnerablePeriod: '76-90 min'
        },
        overUnder: goalsData.overUnder || {
          over05Percentage: 87,
          over15Percentage: 73,
          over25Percentage: 60,
          over35Percentage: 40,
          over45Percentage: 20
        },
        btts: goalsData.btts || {
          bttsPercentage: 57,
          bttsAndWinPercentage: 27,
          bttsAndDrawPercentage: 10,
          bttsAndLosePercentage: 20
        }
      };
    }

    /**
     * Initialize the display module
     */
    initialize() {
      if (this.initialized) {
        log('[GoalsDisplay] Already initialized');
        return;
      }

      log('[GoalsDisplay] Initializing...');
      this.setupEventListeners();
      this.initialized = true;
      log('[GoalsDisplay] ✓ Initialized successfully');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
      // Listen for data updates
      if (global.TeamStatsEventBus) {
        global.TeamStatsEventBus.on('data:goals:updated', (data) => {
          this.handleDataUpdate(data);
        });

        global.TeamStatsEventBus.on('filters:change', (filter) => {
          this.handleFilterChange(filter);
        });
        
        // Listen for initial team data load
        global.TeamStatsEventBus.on('data:team:loaded', (data) => {
          log('[GoalsDisplay] Team data loaded:', data);
          if (data.data && data.data.statistics) {
            this.lastStatistics = data.data.statistics;
            // Update with current filter
            const currentFilter = global.TeamStatsStateManager?.get('filters.current') || 'overall';
            this.updateGoalsStatistics(data.data.statistics, currentFilter);
          }
        });
      }
    }

    /**
     * Render goals statistics section
     */
    renderGoalsSection(container, statistics, options = {}) {
      if (!container || !statistics) {
        console.error('[GoalsDisplay] Invalid parameters for renderGoalsSection');
        return;
      }

      const {
        filter = 'overall',
        showCharts = true,
        showDetails = true,
        animated = true
      } = options;

      log('[GoalsDisplay] Rendering goals section with filter:', filter);

      // Clear container
      this.clearContainer(container);

      // Create section structure
      const section = this.createSectionStructure(container);

      // Render components
      this.renderOverviewCards(section.overview, statistics, filter);
      this.renderGoalsChart(section.chart, statistics, filter, showCharts);
      this.renderGoalsDetails(section.details, statistics, filter, showDetails);
      this.renderGoalPatterns(section.patterns, statistics, filter);

      // Apply animations if enabled
      if (animated) {
        this.animateSection(section);
      }

      return section;
    }

    /**
     * Create section structure
     */
    createSectionStructure(container) {
      const structure = {
        container,
        overview: this.createElement('div', {
          className: 'goals-overview-cards',
          parent: container
        }),
        chart: this.createElement('div', {
          className: 'goals-chart-container',
          parent: container
        }),
        details: this.createElement('div', {
          className: 'goals-details-grid',
          parent: container
        }),
        patterns: this.createElement('div', {
          className: 'goals-patterns-analysis',
          parent: container
        })
      };

      return structure;
    }

    /**
     * Render overview cards
     */
    renderOverviewCards(container, statistics, filter) {
      // Debug logging
      log('[GoalsDisplay] renderOverviewCards - statistics:', statistics);
      
      // Extract data based on filter
      let goalsFor, goalsAgainst, cleanSheets, failedToScore, matches;
      
      if (filter === 'home') {
        goalsFor = statistics.homeGoalsFor || 0;
        goalsAgainst = statistics.homeGoalsAgainst || 0;
        cleanSheets = statistics.homeCleanSheets || 0;
        failedToScore = statistics.homeFailedToScore || 0;
        matches = statistics.homeMatches || 0;
      } else if (filter === 'away') {
        goalsFor = statistics.awayGoalsFor || 0;
        goalsAgainst = statistics.awayGoalsAgainst || 0;
        cleanSheets = statistics.awayCleanSheets || 0;
        failedToScore = statistics.awayFailedToScore || 0;
        matches = statistics.awayMatches || 0;
      } else {
        goalsFor = statistics.goalsFor || 0;
        goalsAgainst = statistics.goalsAgainst || 0;
        cleanSheets = statistics.cleanSheets || 0;
        failedToScore = statistics.failedToScore || 0;
        matches = statistics.totalMatches || statistics.matches || 0;
      }
      
      // Calculate derived values
      const avgGoalsFor = matches > 0 ? (goalsFor / matches).toFixed(2) : '0.00';
      const avgGoalsAgainst = matches > 0 ? (goalsAgainst / matches).toFixed(2) : '0.00';
      const cleanSheetPercentage = matches > 0 ? Math.round((cleanSheets / matches) * 100) : 0;
      const failedToScorePercentage = matches > 0 ? Math.round((failedToScore / matches) * 100) : 0;
      
      const cards = [
        {
          title: 'Goals Scored',
          value: goalsFor.toString(),
          subtitle: `${avgGoalsFor} per match`,
          color: this.config.chartColors.goals,
          icon: '⚽',
          trend: 'stable'
        },
        {
          title: 'Goals Conceded',
          value: goalsAgainst.toString(),
          subtitle: `${avgGoalsAgainst} per match`,
          color: this.config.chartColors.conceded,
          icon: '🥅',
          trend: 'stable'
        },
        {
          title: 'Clean Sheets',
          value: `${cleanSheetPercentage}%`,
          subtitle: `${cleanSheets} matches`,
          color: this.config.chartColors.cleanSheet,
          icon: '🛡️',
          trend: 'stable'
        },
        {
          title: 'Failed to Score',
          value: `${failedToScorePercentage}%`,
          subtitle: `${failedToScore} matches`,
          color: this.config.chartColors.failedToScore,
          icon: '❌',
          trend: 'stable'
        }
      ];

      const grid = this.createElement('div', {
        className: 'grid grid-cols-2 md:grid-cols-4 gap-4',
        parent: container
      });

      cards.forEach((card, index) => {
        this.renderOverviewCard(grid, card, index);
      });
    }

    /**
     * Render single overview card
     */
    renderOverviewCard(container, cardData, index) {
      // Create card manually since StatCard component doesn't exist
      const cardElement = this.createElement('div', {
        className: 'goals-overview-card',
        style: {
          '--card-color': cardData.color,
          'animation-delay': `${index * 100}ms`,
          padding: '1.5rem',
          borderRadius: '0.5rem',
          backgroundColor: 'white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          transition: 'all 0.3s ease'
        },
        parent: container
      });

      // Add card content
      this.createElement('div', {
        className: 'card-icon',
        innerHTML: cardData.icon,
        style: { fontSize: '2rem', marginBottom: '0.5rem' },
        parent: cardElement
      });

      this.createElement('div', {
        className: 'stat-value',
        textContent: cardData.value,
        style: { fontSize: '1.5rem', fontWeight: 'bold', color: '#333' },
        parent: cardElement
      });

      this.createElement('div', {
        className: 'stat-label',
        textContent: cardData.title,
        style: { fontSize: '0.875rem', color: '#666' },
        parent: cardElement
      });

      if (cardData.subtitle) {
        this.createElement('div', {
          className: 'stat-subtitle',
          textContent: cardData.subtitle,
          style: { fontSize: '0.75rem', color: '#999', marginTop: '0.25rem' },
          parent: cardElement
        });
      }

      if (cardData.trend) {
        const trendIcon = cardData.trend === 'up' ? '↑' : cardData.trend === 'down' ? '↓' : '→';
        const trendColor = cardData.trend === 'up' ? '#10b981' : cardData.trend === 'down' ? '#ef4444' : '#6b7280';
        this.createElement('div', {
          className: 'stat-trend',
          innerHTML: trendIcon,
          style: { color: trendColor, fontSize: '1.2rem', marginTop: '0.25rem' },
          parent: cardElement
        });
      }

      // Add hover effects
      this.addCardHoverEffects(cardElement);

      return cardElement;
    }

    /**
     * Render goals chart
     */
    renderGoalsChart(container, statistics, filter, show = true) {
      if (!show) {
        container.style.display = 'none';
        return;
      }

      const chartData = this.prepareChartData(statistics, filter);
      
      // Create chart container
      const chartWrapper = this.createElement('div', {
        className: 'goals-chart-wrapper bg-white rounded-lg shadow-md p-6',
        parent: container
      });

      // Chart header
      const header = this.createElement('div', {
        className: 'chart-header flex justify-between items-center mb-4',
        parent: chartWrapper
      });

      this.createElement('h3', {
        className: 'text-lg font-semibold',
        textContent: 'Goals Distribution',
        parent: header
      });

      // Chart type selector
      this.renderChartTypeSelector(header);

      // Render chart based on type
      switch (this.state.chartType) {
        case 'line':
          this.renderLineChart(chartWrapper, chartData);
          break;
        case 'pie':
          this.renderPieChart(chartWrapper, chartData);
          break;
        default:
          this.renderBarChart(chartWrapper, chartData);
      }
    }

    /**
     * Render bar chart
     */
    renderBarChart(container, data) {
      const chartContainer = this.createElement('div', {
        className: 'bar-chart-container',
        parent: container
      });

      const maxValue = Math.max(...data.values);
      const chartHeight = 200;

      data.labels.forEach((label, index) => {
        const value = data.values[index];
        const percentage = (value / maxValue) * 100;
        const barHeight = (percentage / 100) * chartHeight;

        const barWrapper = this.createElement('div', {
          className: 'bar-wrapper',
          parent: chartContainer
        });

        const bar = this.createElement('div', {
          className: 'bar',
          style: {
            height: `${barHeight}px`,
            backgroundColor: data.colors[index],
            transition: 'height 0.5s ease-out',
            transitionDelay: `${index * 100}ms`
          },
          parent: barWrapper
        });

        // Value label
        this.createElement('div', {
          className: 'bar-value',
          textContent: value,
          parent: barWrapper
        });

        // Label
        this.createElement('div', {
          className: 'bar-label',
          textContent: label,
          parent: barWrapper
        });
      });
    }

    /**
     * Render goals details
     */
    renderGoalsDetails(container, statistics, filter, show = true) {
      if (!show) {
        container.style.display = 'none';
        return;
      }

      const details = this.getGoalsDetailsFromStats(statistics, { filter });
      
      // Create details grid
      const grid = this.createElement('div', {
        className: 'grid grid-cols-1 md:grid-cols-2 gap-6',
        parent: container
      });

      // Scoring patterns
      this.renderScoringPatterns(grid, details.scoringPatterns);

      // Defensive patterns
      this.renderDefensivePatterns(grid, details.defensivePatterns);

      // Over/Under statistics
      this.renderOverUnderStats(grid, details.overUnder);

      // Both teams to score
      this.renderBTTSStats(grid, details.btts);
    }

    /**
     * Render scoring patterns
     */
    renderScoringPatterns(container, patterns) {
      const card = this.createElement('div', {
        className: 'bg-white rounded-lg shadow-md p-6',
        parent: container
      });

      this.createElement('h4', {
        className: 'text-md font-semibold mb-4',
        textContent: 'Scoring Patterns',
        parent: card
      });

      const items = [
        { label: 'First Goal', value: `${patterns.firstGoalPercentage}%`, icon: '🥇' },
        { label: 'Scored in Both Halves', value: `${patterns.bothHalvesPercentage}%`, icon: '⏱️' },
        { label: 'Late Goals (76-90)', value: `${patterns.lateGoalsPercentage}%`, icon: '⏰' },
        { label: 'Highest Scoring Period', value: patterns.highestScoringPeriod, icon: '📊' }
      ];

      const list = this.createElement('div', {
        className: 'space-y-3',
        parent: card
      });

      items.forEach(item => {
        this.renderPatternItem(list, item);
      });
    }

    /**
     * Render pattern item
     */
    renderPatternItem(container, item) {
      const row = this.createElement('div', {
        className: 'flex items-center justify-between p-2 hover:bg-gray-50 rounded',
        parent: container
      });

      const label = this.createElement('div', {
        className: 'flex items-center gap-2',
        parent: row
      });

      this.createElement('span', {
        className: 'text-xl',
        textContent: item.icon,
        parent: label
      });

      this.createElement('span', {
        className: 'text-sm text-gray-600',
        textContent: item.label,
        parent: label
      });

      this.createElement('span', {
        className: 'font-semibold',
        textContent: item.value,
        parent: row
      });
    }

    /**
     * Render goal patterns analysis
     */
    renderGoalPatterns(container, statistics, filter) {
      // Calculate patterns from statistics
      const matches = statistics.recentMatches || [];
      const patterns = matches.length > 0 
        ? this.goalsStats.calculateGoalStatistics(matches, { 
            filter,
            teamId: statistics.teamId
          })
        : {
            avgGoalsFor: statistics.matches ? (statistics.goalsFor / statistics.matches) : 0,
            avgGoalsAgainst: statistics.matches ? (statistics.goalsAgainst / statistics.matches) : 0,
            cleanSheetPercentage: statistics.matches ? Math.round((statistics.cleanSheets / statistics.matches) * 100) : 0,
            over25Percentage: 60
          };
      
      const card = this.createElement('div', {
        className: 'bg-white rounded-lg shadow-md p-6',
        parent: container
      });

      this.createElement('h3', {
        className: 'text-lg font-semibold mb-4',
        textContent: 'Goal Patterns Analysis',
        parent: card
      });

      // Render pattern insights
      this.renderPatternInsights(card, patterns);
    }

    /**
     * Render pattern insights
     */
    renderPatternInsights(container, patterns) {
      const insights = this.generateInsights(patterns);
      
      const insightsList = this.createElement('div', {
        className: 'space-y-3',
        parent: container
      });

      insights.forEach(insight => {
        const item = this.createElement('div', {
          className: `p-3 rounded-lg ${insight.type === 'positive' ? 'bg-green-50' : 'bg-red-50'}`,
          parent: insightsList
        });

        this.createElement('p', {
          className: `text-sm ${insight.type === 'positive' ? 'text-green-700' : 'text-red-700'}`,
          innerHTML: `${insight.icon} ${insight.text}`,
          parent: item
        });
      });
    }

    /**
     * Generate insights from patterns
     */
    generateInsights(patterns) {
      const insights = [];

      // Scoring ability
      if (patterns.avgGoalsFor >= this.config.thresholds.highScoring) {
        insights.push({
          type: 'positive',
          icon: '✅',
          text: `Strong attacking team averaging <strong>${patterns.avgGoalsFor}</strong> goals per match`
        });
      } else if (patterns.avgGoalsFor < this.config.thresholds.lowScoring) {
        insights.push({
          type: 'negative',
          icon: '⚠️',
          text: `Struggling in attack with only <strong>${patterns.avgGoalsFor}</strong> goals per match`
        });
      }

      // Defensive ability
      if (patterns.avgGoalsAgainst <= this.config.thresholds.goodDefense) {
        insights.push({
          type: 'positive',
          icon: '🛡️',
          text: `Solid defense conceding only <strong>${patterns.avgGoalsAgainst}</strong> goals per match`
        });
      } else if (patterns.avgGoalsAgainst >= this.config.thresholds.poorDefense) {
        insights.push({
          type: 'negative',
          icon: '🚨',
          text: `Defensive issues conceding <strong>${patterns.avgGoalsAgainst}</strong> goals per match`
        });
      }

      // Clean sheet ability
      if (patterns.cleanSheetPercentage >= 30) {
        insights.push({
          type: 'positive',
          icon: '🥅',
          text: `Keeps clean sheets in <strong>${patterns.cleanSheetPercentage}%</strong> of matches`
        });
      }

      // High scoring matches
      if (patterns.over25Percentage >= 60) {
        insights.push({
          type: 'neutral',
          icon: '📈',
          text: `<strong>${patterns.over25Percentage}%</strong> of matches have over 2.5 goals`
        });
      }

      return insights;
    }

    /**
     * Add card hover effects
     */
    addCardHoverEffects(card) {
      card.addEventListener('mouseenter', () => {
        card.style.transform = 'translateY(-2px)';
        card.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = 'translateY(0)';
        card.style.boxShadow = '';
      });
    }

    /**
     * Animate section
     */
    animateSection(section) {
      const elements = section.container.querySelectorAll('.goals-overview-card, .bar, .pattern-item');
      
      elements.forEach((element, index) => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
          element.style.transition = 'all 0.5s ease-out';
          element.style.opacity = '1';
          element.style.transform = 'translateY(0)';
        }, index * 50);
      });
    }

    /**
     * Prepare chart data
     */
    prepareChartData(statistics, filter) {
      // Convert statistics to match format for goals calculation
      const matches = statistics.recentMatches || [];
      const goalsData = matches.length > 0 
        ? this.goalsStats.calculateGoalStatistics(matches, { 
            filter,
            teamId: statistics.teamId
          })
        : {
            totalGoalsFor: statistics.goalsFor || 0,
            totalGoalsAgainst: statistics.goalsAgainst || 0,
            avgGoalsFor: statistics.matches ? (statistics.goalsFor / statistics.matches).toFixed(2) : '0.00',
            avgGoalsAgainst: statistics.matches ? (statistics.goalsAgainst / statistics.matches).toFixed(2) : '0.00',
            cleanSheets: statistics.cleanSheets || 0,
            cleanSheetPercentage: statistics.matches ? Math.round((statistics.cleanSheets / statistics.matches) * 100) : 0,
            failedToScore: statistics.failedToScore || 0,
            failedToScorePercentage: statistics.matches ? Math.round((statistics.failedToScore / statistics.matches) * 100) : 0,
            last5AvgGoalsFor: 1.8,
            last5AvgGoalsAgainst: 1.2,
            cleanSheetTrend: 'stable',
            failedToScoreTrend: 'stable'
          };
      
      return {
        labels: ['Goals For', 'Goals Against', 'Clean Sheets', 'Failed to Score'],
        values: [
          goalsData.totalGoalsFor,
          goalsData.totalGoalsAgainst,
          goalsData.cleanSheets,
          goalsData.failedToScore
        ],
        colors: [
          this.config.chartColors.goals,
          this.config.chartColors.conceded,
          this.config.chartColors.cleanSheet,
          this.config.chartColors.failedToScore
        ]
      };
    }

    /**
     * Calculate trend
     */
    calculateTrend(current, previous) {
      if (!previous || previous === 0) return 'stable';
      const change = ((current - previous) / previous) * 100;
      
      if (change > 10) return 'up';
      if (change < -10) return 'down';
      return 'stable';
    }

    /**
     * Handle data update
     */
    handleDataUpdate(data) {
      log('[GoalsDisplay] Handling data update:', data);
      // Re-render affected sections
    }

    /**
     * Handle filter change
     */
    handleFilterChange(filter) {
      log('[GoalsDisplay] Handling filter change:', filter);
      
      // Handle both direct filter value and object with value property
      const filterValue = typeof filter === 'string' ? filter : (filter.value || filter.venue || 'overall');
      this.state.activeFilter = filterValue;
      
      // Update goal statistics if data exists
      if (this.lastStatistics) {
        this.updateGoalsStatistics(this.lastStatistics, filterValue);
      }
    }

    /**
     * Update goals statistics based on filter
     */
    updateGoalsStatistics(statistics, filter) {
      log('[GoalsDisplay] Updating goals statistics with filter:', filter);
      
      const suffix = filter === 'overall' ? '_overall' : `_${filter}`;
      
      // Get total matches based on filter - API uses 'totalMatches' not 'matches'
      let matches = 0;
      if (filter === 'overall') {
        matches = statistics.totalMatches || statistics.matches || 0;
      } else if (filter === 'home') {
        matches = statistics.homeMatches || 0;
      } else if (filter === 'away') {
        matches = statistics.awayMatches || 0;
      }
      
      // Update scored per match - use correct API fields
      const scoredPerMatch = filter === 'overall' 
        ? (statistics.averageGoalsFor || statistics.goalsForPerMatch || statistics.seasonScoredAVG_overall || 0)
        : (statistics[`${filter}GoalsForPerMatch`] || statistics[`seasonScoredAVG${suffix}`] || statistics[`goalsForPerMatch${suffix}`] || 0);
      
      this.updateElement('scoredPerMatch', scoredPerMatch.toFixed(2));
      this.updateElement('goalsPerMatch', scoredPerMatch.toFixed(2));
      
      // Update Goals top stats cards
      this.updateElement('scoredPerMatchGoals', scoredPerMatch.toFixed(2));
      
      // Update scored and conceded top stats cards if in goals tab
      const activeTab = global.TeamStatsStateManager?.get('ui.activeTab') || 'all';
      if (activeTab === 'goals') {
        this.updateScoredTopStats(statistics, filter);
        this.updateConcededTopStats(statistics, filter);
      }
      
      // Update 1st Half Scored - use correct API fields
      const scored1H = filter === 'overall' 
        ? (statistics.scoredAVGHT_overall || statistics.firstHalfGoalsAVG_overall || 0)
        : (statistics[`scoredAVGHT${suffix}`] || statistics[`firstHalfGoalsAVG${suffix}`] || 0);
      this.updateElement('scored1HPerMatch', scored1H.toFixed(2));
      
      // Update 2nd Half Scored - use correct API fields
      const scored2H = filter === 'overall'
        ? (statistics.scored_2hg_avg_overall || statistics.secondHalfGoalsAVG_overall || statistics.scoredAVG2H_overall || 0)
        : (statistics[`scored_2hg_avg${suffix}`] || statistics[`secondHalfGoalsAVG${suffix}`] || statistics[`scoredAVG2H${suffix}`] || 0);
      this.updateElement('scored2HPerMatch', scored2H.toFixed(2));
      
      // Update conceded per match - use correct API fields
      const concededPerMatch = filter === 'overall'
        ? (statistics.averageGoalsAgainst || statistics.goalsAgainstPerMatch || 0)
        : (statistics[`${filter}GoalsAgainstPerMatch`] || statistics[`goalsAgainstPerMatch${suffix}`] || 0);
      
      this.updateElement('concededPerMatch', concededPerMatch.toFixed(2));
      
      // Update all goal-related elements
      this.updateGoalElements(statistics, filter);
    }

    /**
     * Update ONLY Scored Statistics section
     */
    updateScoredSection(statistics, filter) {
      log('[GoalsDisplay] Updating ONLY Scored Statistics section with filter:', filter);
      
      // Update scored per match - use correct API fields
      const scoredPerMatch = filter === 'overall' 
        ? (statistics.averageGoalsFor || statistics.goalsForPerMatch || statistics.seasonScoredAVG_overall || 0)
        : (statistics[`${filter}GoalsForPerMatch`] || statistics[`seasonScoredAVG_${filter}`] || 0);
      
      this.updateElement('scoredPerMatch', scoredPerMatch.toFixed(2));
      
      // Update 1st Half Scored
      const scored1H = filter === 'overall' 
        ? (statistics.scoredAVGHT_overall || statistics.firstHalfGoalsAVG_overall || 0)
        : (statistics[`scoredAVGHT_${filter}`] || statistics[`firstHalfGoalsAVG_${filter}`] || 0);
      this.updateElement('scoredAvg1H', scored1H.toFixed(2));
      
      // Update 2nd Half Scored
      const scored2H = filter === 'overall'
        ? (statistics.scored_2hg_avg_overall || statistics.secondHalfGoalsAVG_overall || statistics.scoredAVG2H_overall || 0)
        : (statistics[`scored_2hg_avg_${filter}`] || statistics[`secondHalfGoalsAVG_${filter}`] || 0);
      this.updateElement('scoredAvg2H', scored2H.toFixed(2));

      // Update scored percentages
      const suffix = filter === 'overall' ? '_overall' : `_${filter}`;
      
      let scoredOver05, scoredOver15, scoredOver25;
      if (filter === 'overall') {
        scoredOver05 = statistics.seasonScoredOver05Percentage_overall || 0;
        scoredOver15 = statistics.seasonScoredOver15Percentage_overall || 0;
        scoredOver25 = statistics.seasonScoredOver25Percentage_overall || 0;
      } else {
        scoredOver05 = statistics[`seasonScoredOver05Percentage${suffix}`] || 0;
        scoredOver15 = statistics[`seasonScoredOver15Percentage${suffix}`] || 0;
        scoredOver25 = statistics[`seasonScoredOver25Percentage${suffix}`] || 0;
      }
      
      this.updateElement('scoredOver05', scoredOver05 + '%');
      this.updateElement('scoredOver15', scoredOver15 + '%');
      this.updateElement('scoredOver25', scoredOver25 + '%');

      // Update other scored stats
      const scoredBothHalves = filter === 'overall' 
        ? (statistics.scoredBothHalvesPercentage_overall || 0)
        : (statistics[`scoredBothHalvesPercentage${suffix}`] || 0);
      this.updateElement('scoredBothHalves', scoredBothHalves + '%');

      const firstToScore = filter === 'overall' 
        ? (statistics.firstGoalScoredPercentage_overall || 0)
        : (statistics[`firstGoalScoredPercentage${suffix}`] || 0);
      this.updateElement('firstToScore', firstToScore + '%');

      const failedToScore = statistics.failedToScorePercentage || 0;
      this.updateElement('failedToScoreGoals', failedToScore + '%');

      const highestScored = statistics.seasonHighestScored_overall || 0;
      this.updateElement('highestScored', highestScored + ' Goals');

      // Update penalty stats
      if (filter === 'overall') {
        const totalMatches = statistics.totalMatches || 0;
        this.updateElement('penaltiesWonGoals', `${statistics.penaltiesWon || 0} in ${totalMatches}`);
        this.updateElement('penaltiesConcededGoals', `${statistics.penaltiesConceded || 0} in ${totalMatches}`);
        this.updateElement('penaltyInMatch', (statistics.penalty_in_a_match_percentage_overall || 0) + '%');
      } else if (filter === 'home') {
        const homeMatches = statistics.homeMatches || 0;
        this.updateElement('penaltiesWonGoals', `${statistics.homePenaltiesWon || 0} in ${homeMatches}`);
        this.updateElement('penaltiesConcededGoals', `${statistics.homePenaltiesConceded || 0} in ${homeMatches}`);
        this.updateElement('penaltyInMatch', (statistics.penalty_in_a_match_percentage_home || 0) + '%');
      } else if (filter === 'away') {
        const awayMatches = statistics.awayMatches || 0;
        this.updateElement('penaltiesWonGoals', `${statistics.awayPenaltiesWon || 0} in ${awayMatches}`);
        this.updateElement('penaltiesConcededGoals', `${statistics.awayPenaltiesConceded || 0} in ${awayMatches}`);
        this.updateElement('penaltyInMatch', (statistics.penalty_in_a_match_percentage_away || 0) + '%');
      }

      // Update minutes per goal
      const totalMatches = filter === 'overall' ? (statistics.totalMatches || 0) : 
                          (filter === 'home' ? statistics.homeMatches : statistics.awayMatches) || 0;
      const goalsFor = filter === 'overall' ? (statistics.goalsFor || 0) :
                      (filter === 'home' ? statistics.homeGoalsFor : statistics.awayGoalsFor) || 0;
      const minutesPerGoal = goalsFor > 0 ? Math.round((totalMatches * 90) / goalsFor) : 0;
      this.updateElement('minutesPerGoal', minutesPerGoal + ' min');

      // Update 1H/2H detailed stats
      this.updateScoredHalfTimeStats(statistics, filter);
    }

    /**
     * Update scored halftime statistics
     */
    updateScoredHalfTimeStats(statistics, filter) {
      // Calculate failed to score percentages
      let failedToScore1HPercentage = 0;
      let failedToScore2HPercentage = 0;
      
      if (filter === 'overall') {
        failedToScore1HPercentage = statistics.seasonFTSPercentageHT_overall || 0;
        failedToScore2HPercentage = statistics.fts_2hg_percentage_overall || 0;
      } else {
        const suffix = `_${filter}`;
        failedToScore1HPercentage = statistics[`seasonFTSPercentageHT${suffix}`] || 0;
        failedToScore2HPercentage = statistics[`fts_2hg_percentage${suffix}`] || 0;
      }
      
      // Calculate scored in percentages (inverse of failed to score)
      const scoredIn1HPercentage = 100 - failedToScore1HPercentage;
      const scoredIn2HPercentage = 100 - failedToScore2HPercentage;
      
      this.updateElement('scoredIn1H', scoredIn1HPercentage.toFixed(0) + '%');
      this.updateElement('failedToScore1H', failedToScore1HPercentage + '%');
      this.updateElement('scoredIn2H', scoredIn2HPercentage.toFixed(0) + '%');
      this.updateElement('failedToScore2H', failedToScore2HPercentage + '%');

      // Update goals in matches
      const matches = filter === 'overall' ? (statistics.totalMatches || 0) :
                     (filter === 'home' ? statistics.homeMatches : statistics.awayMatches) || 0;
      
      let goals1H = 0, goals2H = 0;
      if (filter === 'overall') {
        goals1H = statistics.scoredGoalsHT_overall || 0;
        goals2H = statistics.scored_2hg_overall || 0;
      } else {
        const suffix = `_${filter}`;
        goals1H = statistics[`scoredGoalsHT${suffix}`] || 0;
        goals2H = statistics[`scored_2hg${suffix}`] || 0;
      }

      const matchesWithGoals1H = matches - (statistics[`seasonFTSHT_${filter === 'overall' ? 'overall' : filter}`] || 0);
      const matchesWithGoals2H = matches - (statistics[`seasonFTS2H_${filter === 'overall' ? 'overall' : filter}`] || 0);

      this.updateElement('goals1HScored', `${goals1H} in ${Math.max(0, matchesWithGoals1H)}`);
      this.updateElement('goals2HScored', `${goals2H} in ${Math.max(0, matchesWithGoals2H)}`);
    }

    /**
     * Update ONLY Conceded Statistics section
     */
    updateConcededSection(statistics, filter) {
      log('[GoalsDisplay] Updating ONLY Conceded Statistics section with filter:', filter);
      
      // Update conceded per match - use correct API fields
      const concededPerMatch = filter === 'overall' 
        ? (statistics.averageGoalsAgainst || statistics.goalsAgainstPerMatch || statistics.seasonConcededAVG_overall || 0)
        : (statistics[`${filter}GoalsAgainstPerMatch`] || statistics[`seasonConcededAVG_${filter}`] || 0);
      
      console.log('[GoalsDisplay] Updating concededPerMatch:', {
        filter,
        averageGoalsAgainst: statistics.averageGoalsAgainst,
        goalsAgainstPerMatch: statistics.goalsAgainstPerMatch,
        seasonConcededAVG_overall: statistics.seasonConcededAVG_overall,
        calculatedValue: concededPerMatch
      });
      
      this.updateElement('concededPerMatch', concededPerMatch.toFixed(2));
      
      // Update 1st Half Conceded
      const conceded1H = filter === 'overall' 
        ? (statistics.concededAVGHT_overall || statistics.firstHalfGoalsAgainstAVG_overall || statistics.concededGoalsHT_overall / statistics.totalMatches || 0)
        : (statistics[`concededAVGHT_${filter}`] || statistics[`firstHalfGoalsAgainstAVG_${filter}`] || 0);
      this.updateElement('concededAvg1H', conceded1H.toFixed(2));
      
      // Update 2nd Half Conceded
      const conceded2H = filter === 'overall'
        ? (statistics.conceded_2hg_avg_overall || statistics.secondHalfGoalsAgainstAVG_overall || statistics.concededAVG2H_overall || 0)
        : (statistics[`conceded_2hg_avg_${filter}`] || statistics[`secondHalfGoalsAgainstAVG_${filter}`] || statistics[`conceded_2hg_avg_${filter}`] || 0);
      this.updateElement('concededAvg2H', conceded2H.toFixed(2));

      // Update conceded percentages
      const suffix = filter === 'overall' ? '_overall' : `_${filter}`;
      
      let concededOver05, concededOver15, concededOver25;
      if (filter === 'overall') {
        concededOver05 = statistics.seasonConcededOver05Percentage_overall || 0;
        concededOver15 = statistics.seasonConcededOver15Percentage_overall || 0;
        concededOver25 = statistics.seasonConcededOver25Percentage_overall || 0;
      } else {
        concededOver05 = statistics[`seasonConcededOver05Percentage${suffix}`] || 0;
        concededOver15 = statistics[`seasonConcededOver15Percentage${suffix}`] || 0;
        concededOver25 = statistics[`seasonConcededOver25Percentage${suffix}`] || 0;
      }
      
      this.updateElement('concededOver05', concededOver05 + '%');
      this.updateElement('concededOver15', concededOver15 + '%');
      this.updateElement('concededOver25', concededOver25 + '%');

      // Update clean sheets
      const cleanSheets = filter === 'overall' 
        ? (statistics.cleanSheetsPercentage_overall || statistics.cleanSheetPercentage || 0)
        : (statistics[`cleanSheetsPercentage${suffix}`] || statistics[`${filter}CleanSheetPercentage`] || 0);
      this.updateElement('cleanSheets', cleanSheets + '%');

      const highestConceded = statistics.seasonHighestConceded_overall || statistics.highestConceded_overall || 0;
      this.updateElement('highestConceded', highestConceded + ' Goals');

      // Update minutes per goal conceded
      const totalMatches = filter === 'overall' ? (statistics.totalMatches || 0) : 
                          (filter === 'home' ? statistics.homeMatches : statistics.awayMatches) || 0;
      const goalsAgainst = filter === 'overall' ? (statistics.goalsAgainst || 0) :
                          (filter === 'home' ? statistics.homeGoalsAgainst : statistics.awayGoalsAgainst) || 0;
      const minutesPerGoalConceded = goalsAgainst > 0 ? Math.round((totalMatches * 90) / goalsAgainst) : 0;
      this.updateElement('minutesPerGoalConceded', minutesPerGoalConceded + ' min');

      // Update 1H/2H detailed conceded stats
      this.updateConcededHalfTimeStats(statistics, filter);
    }

    /**
     * Update conceded halftime statistics
     */
    updateConcededHalfTimeStats(statistics, filter) {
      // Calculate clean sheet percentages
      let cleanSheet1HPercentage = 0;
      let cleanSheet2HPercentage = 0;
      
      if (filter === 'overall') {
        cleanSheet1HPercentage = statistics.seasonCSPercentageHT_overall || 0;
        cleanSheet2HPercentage = statistics.cs_2hg_percentage_overall || 0;
      } else {
        const suffix = `_${filter}`;
        cleanSheet1HPercentage = statistics[`seasonCSPercentageHT${suffix}`] || 0;
        cleanSheet2HPercentage = statistics[`cs_2hg_percentage${suffix}`] || 0;
      }
      
      // Calculate conceded in percentages (inverse of clean sheets)
      const concededIn1HPercentage = 100 - cleanSheet1HPercentage;
      const concededIn2HPercentage = 100 - cleanSheet2HPercentage;
      
      this.updateElement('concededIn1H', concededIn1HPercentage.toFixed(0) + '%');
      this.updateElement('cleanSheet1H', cleanSheet1HPercentage + '%');
      this.updateElement('concededIn2H', concededIn2HPercentage.toFixed(0) + '%');
      this.updateElement('cleanSheet2H', cleanSheet2HPercentage + '%');

      // Update goals conceded in matches
      const matches = filter === 'overall' ? (statistics.totalMatches || 0) :
                     (filter === 'home' ? statistics.homeMatches : statistics.awayMatches) || 0;
      
      let goalsConceded1H = 0, goalsConceded2H = 0;
      if (filter === 'overall') {
        goalsConceded1H = statistics.concededGoalsHT_overall || 0;
        goalsConceded2H = statistics.conceded_2hg_overall || 0;
      } else {
        const suffix = `_${filter}`;
        goalsConceded1H = statistics[`concededGoalsHT${suffix}`] || 0;
        goalsConceded2H = statistics[`conceded_2hg${suffix}`] || 0;
      }

      const matchesWithGoalsConceded1H = matches - (statistics[`seasonCSHT_${filter === 'overall' ? 'overall' : filter}`] || 0);
      const matchesWithGoalsConceded2H = matches - (statistics[`seasonCS2H_${filter === 'overall' ? 'overall' : filter}`] || 0);

      this.updateElement('goals1HConceded', `${goalsConceded1H} in ${Math.max(0, matchesWithGoalsConceded1H)}`);
      this.updateElement('goals2HConceded', `${goalsConceded2H} in ${Math.max(0, matchesWithGoalsConceded2H)}`);
    }
    
    /**
     * Update element helper
     */
    updateElement(id, value) {
      const element = document.getElementById(id);
      if (element) {
        const oldValue = element.textContent;
        element.textContent = value;
        if (id === 'concededPerMatch') {
          console.log(`[GoalsDisplay] updateElement: ${id} changed from "${oldValue}" to "${value}"`);
        }
      } else if (id === 'concededPerMatch') {
        console.error(`[GoalsDisplay] Element not found: ${id}`);
      }
    }
    
    /**
     * Update goal elements
     */
    updateGoalElements(statistics, filter) {
      const suffix = filter === 'overall' ? '_overall' : `_${filter}`;
      
      // Update goal totals
      const goalsFor = filter === 'overall'
        ? (statistics.goalsFor || statistics.goalsFor_overall || 0)
        : (statistics[`goalsFor${suffix}`] || 0);
        
      const goalsAgainst = filter === 'overall'
        ? (statistics.goalsAgainst || statistics.goalsAgainst_overall || 0)
        : (statistics[`goalsAgainst${suffix}`] || 0);
        
      this.updateElement('totalGoalsFor', goalsFor);
      this.updateElement('totalGoalsAgainst', goalsAgainst);
      
      // Update scored per match for both elements - use correct API fields
      const scoredPerMatch = filter === 'overall' 
        ? (statistics.averageGoalsFor || statistics.goalsForPerMatch || statistics.seasonScoredAVG_overall || 0)
        : (statistics[`${filter}GoalsForPerMatch`] || statistics[`seasonScoredAVG${suffix}`] || statistics[`goalsForPerMatch${suffix}`] || 0);
      
      this.updateElement('scoredPerMatch', scoredPerMatch.toFixed(2));
      this.updateElement('scoredPerMatchAll', scoredPerMatch.toFixed(2));
      
      // Update minutes per goal
      const totalMatches = filter === 'overall' ? (statistics.totalMatches || statistics.matches || 0) : 
                          (filter === 'home' ? statistics.homeMatches : statistics.awayMatches) || 0;
      const minutesPerGoal = goalsFor > 0 ? Math.round((totalMatches * 90) / goalsFor) : 0;
      this.updateElement('minutesPerGoal', minutesPerGoal + ' min');
      this.updateElement('minutesPerGoalAll', minutesPerGoal + ' min');
      
      // Update over percentages with correct field names based on filter
      let scoredOver05, scoredOver15, scoredOver25;
      if (filter === 'overall') {
        scoredOver05 = statistics.seasonScoredOver05Percentage_overall || statistics.scoredOver05Percentage || 0;
        scoredOver15 = statistics.seasonScoredOver15Percentage_overall || statistics.scoredOver15Percentage || 0;
        scoredOver25 = statistics.seasonScoredOver25Percentage_overall || statistics.scoredOver25Percentage || 0;
      } else {
        scoredOver05 = statistics[`seasonScoredOver05Percentage${suffix}`] || statistics[`scoredOver05Percentage${suffix}`] || 0;
        scoredOver15 = statistics[`seasonScoredOver15Percentage${suffix}`] || statistics[`scoredOver15Percentage${suffix}`] || 0;
        scoredOver25 = statistics[`seasonScoredOver25Percentage${suffix}`] || statistics[`scoredOver25Percentage${suffix}`] || 0;
      }
      
      this.updateElement('scoredOver05', scoredOver05 + '%');
      this.updateElement('scoredOver05All', scoredOver05 + '%');
      this.updateElement('scoredOver15', scoredOver15 + '%');
      this.updateElement('scoredOver15All', scoredOver15 + '%');
      this.updateElement('scoredOver25', scoredOver25 + '%');
      this.updateElement('scoredOver25All', scoredOver25 + '%');
      
      // Update scored both halves
      let scoredBothHalves;
      if (filter === 'overall') {
        scoredBothHalves = statistics.scoredBothHalvesPercentage_overall || statistics.scoredBothHalvesPercentage || 0;
      } else {
        scoredBothHalves = statistics[`scoredBothHalvesPercentage${suffix}`] || 0;
      }
      this.updateElement('scoredBothHalves', scoredBothHalves + '%');
      this.updateElement('scoredBothHalvesAll', scoredBothHalves + '%');
      
      // Update first to score
      let firstToScore;
      if (filter === 'overall') {
        firstToScore = statistics.firstGoalScoredPercentage_overall || statistics.firstToScorePercentage || 0;
      } else {
        firstToScore = statistics[`firstGoalScoredPercentage${suffix}`] || statistics[`firstToScorePercentage${suffix}`] || 0;
      }
      this.updateElement('firstToScore', firstToScore + '%');
      this.updateElement('firstToScoreAll', firstToScore + '%');
      
      // Update failed to score
      const failedToScore = statistics.failedToScorePercentage || statistics.failedToScorePercentage_overall || 0;
      this.updateElement('failedToScore', failedToScore + '%');
      this.updateElement('failedToScoreGoals', failedToScore + '%');
      this.updateElement('failedToScoreGoalsAll', failedToScore + '%');
      this.updateElement('failedToScorePercentage', failedToScore + '%');
      
      // Update highest scored
      const highestScored = statistics.seasonHighestScored_overall || statistics.highestScored || 0;
      this.updateElement('highestScored', highestScored + ' Goals');
      this.updateElement('highestScoredAll', highestScored + ' Goals');
      
      // Update failed to score 1H/2H
      this.updateElement('failedToScore1H', (statistics.failedToScore1HPercentage || 0) + '%');
      this.updateElement('failedToScore2H', (statistics.failedToScore2HPercentage || 0) + '%');
      
      // Update Scored 1st Half stats
      const scored1HAvg = filter === 'overall' 
        ? (statistics.seasonScoredAVGHT_overall || statistics.scoredAVGHT_overall || statistics.firstHalfGoalsAVG_overall || 0)
        : (statistics[`seasonScoredAVGHT${suffix}`] || statistics[`scoredAVGHT${suffix}`] || statistics[`firstHalfGoalsAVG${suffix}`] || 0);
      this.updateElement('scoredAvg1H', scored1HAvg.toFixed(2));
      
      // Scored in 1H percentage
      const matches = filter === 'overall' 
        ? (statistics.totalMatches || statistics.matches || 0)
        : (statistics[`${filter}Matches`] || 0);
      
      // Get failed to score 1H data
      let failedToScore1HCount = 0;
      let failedToScore1HPercentage = 0;
      if (filter === 'overall') {
        failedToScore1HCount = statistics.seasonFTSHT_overall || 0;
        failedToScore1HPercentage = statistics.failedToScore1HPercentage || 0;
      } else {
        failedToScore1HCount = statistics[`seasonFTSHT${suffix}`] || 0;
        failedToScore1HPercentage = statistics[`failedToScore1HPercentage${suffix}`] || 0;
      }
      
      // Calculate scored in 1H percentage (inverse of failed to score)
      const scoredIn1HPercentage = 100 - failedToScore1HPercentage;
      this.updateElement('scoredIn1H', scoredIn1HPercentage.toFixed(0) + '%');
      
      // Debug logging
      log('[GoalsDisplay] 1H Stats Debug:', {
        filter,
        suffix,
        matches,
        failedToScore1HCount,
        failedToScore1HPercentage,
        scoredIn1HPercentage,
        seasonFTSHT_overall: statistics.seasonFTSHT_overall,
        seasonFTSHT_home: statistics.seasonFTSHT_home,
        seasonFTSHT_away: statistics.seasonFTSHT_away,
        allStats: statistics
      });
      
      // Get matches with goals in 1H from API data
      let matchesWithGoals1H;
      if (filter === 'overall') {
        // For overall, look for API fields that indicate matches with 1H goals
        matchesWithGoals1H = statistics.matchesWithGoals1H_overall || 
                            statistics.scored1HMatches_overall ||
                            statistics.matches1HScored_overall || 
                            (matches - (statistics.seasonFTSHT_overall || 0));
      } else {
        // For home/away filters
        matchesWithGoals1H = statistics[`matchesWithGoals1H${suffix}`] || 
                            statistics[`scored1HMatches${suffix}`] ||
                            statistics[`matches1HScored${suffix}`] || 
                            (matches - (statistics[`seasonFTSHT${suffix}`] || 0));
      }
      
      // Ensure non-negative value
      matchesWithGoals1H = Math.max(0, matchesWithGoals1H);
      
      // Calculate goals1H here for immediate use
      const goals1H = filter === 'overall'
        ? (statistics.scoredGoalsHT_overall || statistics.seasonGoals1H_overall || statistics.firstHalfGoals_overall || 0)
        : (statistics[`scoredGoalsHT${suffix}`] || statistics[`seasonGoals1H${suffix}`] || statistics[`firstHalfGoals${suffix}`] || 0);
      this.updateElement('goals1HScored', `${goals1H} in ${matchesWithGoals1H}`);
      
      // Update Scored 2nd Half stats  
      const scored2HAvg = filter === 'overall'
        ? (statistics.scored_2hg_avg_overall || statistics.seasonScored2HAVG_overall || statistics.secondHalfGoalsAVG_overall || statistics.scoredAVG2H_overall || 0)
        : (statistics[`scored_2hg_avg${suffix}`] || statistics[`seasonScored2HAVG${suffix}`] || statistics[`secondHalfGoalsAVG${suffix}`] || statistics[`scoredAVG2H${suffix}`] || 0);
      this.updateElement('scoredAvg2H', scored2HAvg.toFixed(2));
      
      // Scored in 2H percentage
      let failedToScore2HPercentage = 0;
      if (filter === 'overall') {
        failedToScore2HPercentage = statistics.failedToScore2HPercentage || 0;
      } else {
        failedToScore2HPercentage = statistics[`failedToScore2HPercentage${suffix}`] || 0;
      }
      const scoredIn2HPercentage = 100 - failedToScore2HPercentage;
      this.updateElement('scoredIn2H', scoredIn2HPercentage.toFixed(0) + '%');
      
      // Get failed to score 2H count
      let failedToScore2HCount = 0;
      if (filter === 'overall') {
        failedToScore2HCount = statistics.seasonFTS2H_overall || 0;
      } else {
        failedToScore2HCount = statistics[`seasonFTS2H${suffix}`] || 0;
      }
      
      // Debug logging
      log('[GoalsDisplay] 2H Stats Debug:', {
        filter,
        matches,
        failedToScore2HCount,
        failedToScore2HPercentage,
        scoredIn2HPercentage
      });
      
      // Get matches with goals in 2H from API data
      let matchesWithGoals2H;
      if (filter === 'overall') {
        // For overall, look for API fields that indicate matches with 2H goals
        matchesWithGoals2H = statistics.matchesWithGoals2H_overall || 
                            statistics.scored2HMatches_overall ||
                            statistics.matches2HScored_overall || 
                            (matches - (statistics.seasonFTS2H_overall || 0));
      } else {
        // For home/away filters
        matchesWithGoals2H = statistics[`matchesWithGoals2H${suffix}`] || 
                            statistics[`scored2HMatches${suffix}`] ||
                            statistics[`matches2HScored${suffix}`] || 
                            (matches - (statistics[`seasonFTS2H${suffix}`] || 0));
      }
      
      // Ensure non-negative value
      matchesWithGoals2H = Math.max(0, matchesWithGoals2H);
      
      // Calculate goals2H here for immediate use
      const goals2H = filter === 'overall'
        ? (statistics.scored_2hg_overall || statistics.seasonGoals2H_overall || statistics.secondHalfGoals_overall || 0)
        : (statistics[`scored_2hg${suffix}`] || statistics[`seasonGoals2H${suffix}`] || statistics[`secondHalfGoals${suffix}`] || 0);
      this.updateElement('goals2HScored', `${goals2H} in ${matchesWithGoals2H}`);
      
      // Update penalty in a match percentage
      let penaltyInMatch;
      if (filter === 'overall') {
        penaltyInMatch = statistics.penalty_in_a_match_percentage_overall || statistics.penaltyInMatchPercentage || 0;
      } else if (filter === 'home') {
        penaltyInMatch = statistics.penalty_in_a_match_percentage_home || 0;
      } else if (filter === 'away') {
        penaltyInMatch = statistics.penalty_in_a_match_percentage_away || 0;
      }
      this.updateElement('penaltyInMatch', penaltyInMatch + '%');
      this.updateElement('penaltyInMatchAll', penaltyInMatch + '%');
      
      // Update over/under percentages
      const overUnderFields = ['05', '15', '25', '35', '45'];
      overUnderFields.forEach(threshold => {
        const overKey = filter === 'overall'
          ? `over${threshold}Goals`
          : `over${threshold}Goals${suffix}`;
        const overValue = statistics[overKey] || 0;
        
        this.updateElement(`over${threshold}Goals`, `${overValue}%`);
        this.updateElement(`over${threshold}GoalsPercentage`, `${overValue}%`);
      });
      
      // Update Over/Under Goals section (Full Time)
      this.updateOverUnderSection(statistics, filter);
      
      // Update BTTS (Both Teams To Score)
      let bttsPercentage = 0;
      let bttsAndWinPercentage = 0;
      let bttsAndDrawPercentage = 0;
      let bttsAndLosePercentage = 0;
      let bttsAndOver25 = 0;
      let btts1H2HYesYes = 0;
      let btts1H2HYesNo = 0;
      let btts1H2HNoYes = 0;
      let btts1H2HNoNo = 0;
      
      if (filter === 'overall') {
        bttsPercentage = statistics.bothTeamsScoredPercentage || statistics.btts || 0;
        bttsAndWinPercentage = statistics.bttsAndWinPercentage || 0;
        bttsAndDrawPercentage = statistics.bttsAndDrawPercentage || 0;
        bttsAndLosePercentage = statistics.bttsAndLosePercentage || 0;
        bttsAndOver25 = statistics.over25_and_btts_percentage_overall || 0;
        btts1H2HYesYes = statistics.btts_1h2h_yes_yes_percentage_overall || 0;
        btts1H2HYesNo = statistics.btts_1h2h_yes_no_percentage_overall || 0;
        btts1H2HNoYes = statistics.btts_1h2h_no_yes_percentage_overall || 0;
        btts1H2HNoNo = statistics.btts_1h2h_no_no_percentage_overall || 0;
      } else if (filter === 'home') {
        bttsPercentage = statistics.homeBothTeamsScoredPercentage || statistics.btts_home || 0;
        bttsAndWinPercentage = statistics.homeBttsAndWinPercentage || 0;
        bttsAndDrawPercentage = statistics.homeBttsAndDrawPercentage || 0;
        bttsAndLosePercentage = statistics.homeBttsAndLosePercentage || 0;
        bttsAndOver25 = statistics.over25_and_btts_percentage_home || 0;
        btts1H2HYesYes = statistics.btts_1h2h_yes_yes_percentage_home || 0;
        btts1H2HYesNo = statistics.btts_1h2h_yes_no_percentage_home || 0;
        btts1H2HNoYes = statistics.btts_1h2h_no_yes_percentage_home || 0;
        btts1H2HNoNo = statistics.btts_1h2h_no_no_percentage_home || 0;
      } else if (filter === 'away') {
        bttsPercentage = statistics.awayBothTeamsScoredPercentage || statistics.btts_away || 0;
        bttsAndWinPercentage = statistics.awayBttsAndWinPercentage || 0;
        bttsAndDrawPercentage = statistics.awayBttsAndDrawPercentage || 0;
        bttsAndLosePercentage = statistics.awayBttsAndLosePercentage || 0;
        bttsAndOver25 = statistics.over25_and_btts_percentage_away || 0;
        btts1H2HYesYes = statistics.btts_1h2h_yes_yes_percentage_away || 0;
        btts1H2HYesNo = statistics.btts_1h2h_yes_no_percentage_away || 0;
        btts1H2HNoYes = statistics.btts_1h2h_no_yes_percentage_away || 0;
        btts1H2HNoNo = statistics.btts_1h2h_no_no_percentage_away || 0;
      }
      
      // Update BTTS elements
      this.updateElement('bttsPercentage', bttsPercentage + '%');
      this.updateElement('bttsYes', bttsPercentage + '%');
      this.updateElement('bttsAndWin', bttsAndWinPercentage + '%');
      this.updateElement('bttsAndDraw', bttsAndDrawPercentage + '%');
      this.updateElement('bttsAndLose', bttsAndLosePercentage + '%');
      this.updateElement('bttsAndOver25', bttsAndOver25 + '%');
      this.updateElement('btts1H2HYesYes', btts1H2HYesYes + '%');
      this.updateElement('btts1H2HYesNo', btts1H2HYesNo + '%');
      this.updateElement('btts1H2HNoYes', btts1H2HNoYes + '%');
      this.updateElement('btts1H2HNoNo', btts1H2HNoNo + '%');
      this.updateElement('bttsNo', (100 - bttsPercentage) + '%');
      
      // Update 1st Half BTTS
      let bttsPercentageHT = 0;
      if (filter === 'overall') {
        bttsPercentageHT = statistics.seasonBTTSPercentageHT_overall || statistics.bttsHT || 0;
      } else if (filter === 'home') {
        bttsPercentageHT = statistics.seasonBTTSPercentageHT_home || statistics.bttsHT_home || 0;
      } else if (filter === 'away') {
        bttsPercentageHT = statistics.seasonBTTSPercentageHT_away || statistics.bttsHT_away || 0;
      }
      this.updateElement('bttsPercentageHT', bttsPercentageHT + '%');
      this.updateElement('bttsNoHT', (100 - bttsPercentageHT) + '%');
      
      // Update 2nd Half BTTS
      let bttsPercentage2H = 0;
      if (filter === 'overall') {
        bttsPercentage2H = statistics.btts_2hg_percentage_overall || statistics.btts2H || 0;
      } else if (filter === 'home') {
        bttsPercentage2H = statistics.btts_2hg_percentage_home || statistics.btts2H_home || 0;
      } else if (filter === 'away') {
        bttsPercentage2H = statistics.btts_2hg_percentage_away || statistics.btts2H_away || 0;
      }
      this.updateElement('bttsPercentage2H', bttsPercentage2H + '%');
      this.updateElement('bttsNo2H', (100 - bttsPercentage2H) + '%');
      
      // Update penalties
      if (filter === 'overall') {
        this.updateElement('penaltiesWon', statistics.penaltiesWon || 0);
        this.updateElement('penaltiesConceded', statistics.penaltiesConceded || 0);
        
        const totalMatches = statistics.totalMatches || statistics.matches || 0;
        this.updateElement('penaltiesWonGoalsAll', `${statistics.penaltiesWon || 0} in ${totalMatches}`);
        this.updateElement('penaltiesConcededGoalsAll', `${statistics.penaltiesConceded || 0} in ${totalMatches}`);
        this.updateElement('penaltiesWonGoals', `${statistics.penaltiesWon || 0} in ${totalMatches}`);
        this.updateElement('penaltiesConcededGoals', `${statistics.penaltiesConceded || 0} in ${totalMatches}`);
      } else if (filter === 'home') {
        this.updateElement('penaltiesWon', statistics.homePenaltiesWon || 0);
        this.updateElement('penaltiesConceded', statistics.homePenaltiesConceded || 0);
        
        const homeMatches = statistics.homeMatches || 0;
        this.updateElement('penaltiesWonGoals', `${statistics.homePenaltiesWon || 0} in ${homeMatches}`);
        this.updateElement('penaltiesConcededGoals', `${statistics.homePenaltiesConceded || 0} in ${homeMatches}`);
      } else if (filter === 'away') {
        this.updateElement('penaltiesWon', statistics.awayPenaltiesWon || 0);
        this.updateElement('penaltiesConceded', statistics.awayPenaltiesConceded || 0);
        
        const awayMatches = statistics.awayMatches || 0;
        this.updateElement('penaltiesWonGoals', `${statistics.awayPenaltiesWon || 0} in ${awayMatches}`);
        this.updateElement('penaltiesConcededGoals', `${statistics.awayPenaltiesConceded || 0} in ${awayMatches}`);
      }
      
      // Update Goal Timings by 15 Minutes
      const timingPeriods = ['0_15', '16_30', '31_45', '46_60', '61_75', '76_90'];
      
      timingPeriods.forEach(period => {
        let scoredValue = 0;
        let concededValue = 0;
        
        if (filter === 'overall') {
          scoredValue = statistics[`goals${period}`] || 0;
          concededValue = statistics[`goalsConc${period}`] || 0;
        } else if (filter === 'home') {
          scoredValue = statistics[`homeGoals${period}`] || 0;
          concededValue = statistics[`homeGoalsConc${period}`] || 0;
        } else if (filter === 'away') {
          scoredValue = statistics[`awayGoals${period}`] || 0;
          concededValue = statistics[`awayGoalsConc${period}`] || 0;
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
      
      // Update xG (Expected Goals) Analysis
      let xgFor = 0;
      let xgAgainst = 0;
      let xgForPerMatch = 0;
      let xgAgainstPerMatch = 0;
      let goalsForPerMatch = 0;
      let goalsAgainstPerMatch = 0;
      
      if (filter === 'overall') {
        xgFor = statistics.xgFor || 0;
        xgAgainst = statistics.xgAgainst || 0;
        xgForPerMatch = statistics.xgForPerMatch || 0;
        xgAgainstPerMatch = statistics.xgAgainstPerMatch || 0;
        goalsForPerMatch = statistics.goalsForPerMatch || statistics.seasonScoredAVG_overall || 0;
        goalsAgainstPerMatch = statistics.goalsAgainstPerMatch || statistics.seasonConcededAVG_overall || 0;
      } else if (filter === 'home') {
        xgFor = statistics.homeXgFor || 0;
        xgAgainst = statistics.homeXgAgainst || 0;
        xgForPerMatch = statistics.homeXgForPerMatch || 0;
        xgAgainstPerMatch = statistics.homeXgAgainstPerMatch || 0;
        goalsForPerMatch = statistics.homeGoalsForPerMatch || statistics.seasonScoredAVG_home || 0;
        goalsAgainstPerMatch = statistics.homeGoalsAgainstPerMatch || statistics.seasonConcededAVG_home || 0;
      } else if (filter === 'away') {
        xgFor = statistics.awayXgFor || 0;
        xgAgainst = statistics.awayXgAgainst || 0;
        xgForPerMatch = statistics.awayXgForPerMatch || 0;
        xgAgainstPerMatch = statistics.awayXgAgainstPerMatch || 0;
        goalsForPerMatch = statistics.awayGoalsForPerMatch || statistics.seasonScoredAVG_away || 0;
        goalsAgainstPerMatch = statistics.awayGoalsAgainstPerMatch || statistics.seasonConcededAVG_away || 0;
      }
      
      // Update xG elements
      this.updateElement('xgFor', xgFor.toFixed(2));
      this.updateElement('xgAgainst', xgAgainst.toFixed(2));
      this.updateElement('xgForTotal', xgForPerMatch.toFixed(2));
      this.updateElement('xgAgainstTotal', xgAgainstPerMatch.toFixed(2));
      this.updateElement('xgForPerMatch', xgForPerMatch.toFixed(2));
      this.updateElement('xgAgainstPerMatch', xgAgainstPerMatch.toFixed(2));
      
      // Calculate and update differences
      const xgDifference = xgForPerMatch - xgAgainstPerMatch;
      const xgDiffSign = xgDifference >= 0 ? '+' : '';
      this.updateElement('xgDifference', xgDiffSign + xgDifference.toFixed(2));
      
      // Update goals per match
      this.updateElement('goalsForAvg', goalsForPerMatch.toFixed(2));
      this.updateElement('goalsAgainstAvg', goalsAgainstPerMatch.toFixed(2));
      
      // Calculate and update goal difference
      const goalDifference = goalsForPerMatch - goalsAgainstPerMatch;
      const goalDiffSign = goalDifference >= 0 ? '+' : '';
      this.updateElement('goalDifferenceAvg', goalDiffSign + goalDifference.toFixed(2));
      
      // Update First Half & Halftime Analysis
      let firstHalfGoalsScored = 0;
      let firstHalfGoalsConceded = 0;
      let leadingAtHT = 0;
      let drawingAtHT = 0;
      let losingAtHT = 0;
      let leadingAtHTPercentage = 0;
      let drawingAtHTPercentage = 0;
      let losingAtHTPercentage = 0;
      
      if (filter === 'overall') {
        firstHalfGoalsScored = statistics.scoredGoalsHT_overall || 0;
        firstHalfGoalsConceded = statistics.concededGoalsHT_overall || 0;
        leadingAtHT = statistics.leadingAtHT_overall || 0;
        drawingAtHT = statistics.drawingAtHT_overall || 0;
        losingAtHT = statistics.trailingAtHT_overall || statistics.losingAtHT_overall || 0;
        leadingAtHTPercentage = statistics.leadingAtHTPercentage_overall || 0;
        drawingAtHTPercentage = statistics.drawingAtHTPercentage_overall || 0;
        losingAtHTPercentage = statistics.trailingAtHTPercentage_overall || statistics.losingAtHTPercentage_overall || 0;
      } else if (filter === 'home') {
        firstHalfGoalsScored = statistics.scoredGoalsHT_home || 0;
        firstHalfGoalsConceded = statistics.concededGoalsHT_home || 0;
        leadingAtHT = statistics.leadingAtHT_home || 0;
        drawingAtHT = statistics.drawingAtHT_home || 0;
        losingAtHT = statistics.trailingAtHT_home || statistics.losingAtHT_home || 0;
        leadingAtHTPercentage = statistics.leadingAtHTPercentage_home || 0;
        drawingAtHTPercentage = statistics.drawingAtHTPercentage_home || 0;
        losingAtHTPercentage = statistics.trailingAtHTPercentage_home || statistics.losingAtHTPercentage_home || 0;
      } else if (filter === 'away') {
        firstHalfGoalsScored = statistics.scoredGoalsHT_away || 0;
        firstHalfGoalsConceded = statistics.concededGoalsHT_away || 0;
        leadingAtHT = statistics.leadingAtHT_away || 0;
        drawingAtHT = statistics.drawingAtHT_away || 0;
        losingAtHT = statistics.trailingAtHT_away || statistics.losingAtHT_away || 0;
        leadingAtHTPercentage = statistics.leadingAtHTPercentage_away || 0;
        drawingAtHTPercentage = statistics.drawingAtHTPercentage_away || 0;
        losingAtHTPercentage = statistics.trailingAtHTPercentage_away || statistics.losingAtHTPercentage_away || 0;
      }
      
      // Update halftime elements
      // Calculate matches with first half goals (not total goals)
      let matchesWithFirstHalfGoalsScored = matches;
      let matchesWithFirstHalfGoalsConceded = matches;
      let firstHalfGoalsScoredPerc = 100;
      let firstHalfGoalsConcededPerc = 100;
      
      if (filter === 'overall') {
        // Matches where team failed to score in first half
        const failedToScoreHT = statistics.seasonFTSHT_overall || 0;
        matchesWithFirstHalfGoalsScored = matches - failedToScoreHT;
        firstHalfGoalsScoredPerc = Math.round((matchesWithFirstHalfGoalsScored / Math.max(matches, 1)) * 100);
        
        // Matches where team kept clean sheet in first half
        const cleanSheetHT = statistics.seasonCSHT_overall || 0;
        matchesWithFirstHalfGoalsConceded = matches - cleanSheetHT;
        firstHalfGoalsConcededPerc = Math.round((matchesWithFirstHalfGoalsConceded / Math.max(matches, 1)) * 100);
      } else if (filter === 'home') {
        const failedToScoreHT = statistics.seasonFTSHT_home || 0;
        matchesWithFirstHalfGoalsScored = matches - failedToScoreHT;
        firstHalfGoalsScoredPerc = Math.round((matchesWithFirstHalfGoalsScored / Math.max(matches, 1)) * 100);
        
        const cleanSheetHT = statistics.seasonCSHT_home || 0;
        matchesWithFirstHalfGoalsConceded = matches - cleanSheetHT;
        firstHalfGoalsConcededPerc = Math.round((matchesWithFirstHalfGoalsConceded / Math.max(matches, 1)) * 100);
      } else if (filter === 'away') {
        const failedToScoreHT = statistics.seasonFTSHT_away || 0;
        matchesWithFirstHalfGoalsScored = matches - failedToScoreHT;
        firstHalfGoalsScoredPerc = Math.round((matchesWithFirstHalfGoalsScored / Math.max(matches, 1)) * 100);
        
        const cleanSheetHT = statistics.seasonCSHT_away || 0;
        matchesWithFirstHalfGoalsConceded = matches - cleanSheetHT;
        firstHalfGoalsConcededPerc = Math.round((matchesWithFirstHalfGoalsConceded / Math.max(matches, 1)) * 100);
      }
      
      this.updateElement('firstHalfGoalsScored', matchesWithFirstHalfGoalsScored);
      this.updateElement('firstHalfGoalsScoredMatches', matches);
      this.updateElement('firstHalfGoalsScoredPerc', firstHalfGoalsScoredPerc + '%');
      
      this.updateElement('firstHalfGoalsConceded', matchesWithFirstHalfGoalsConceded);
      this.updateElement('firstHalfGoalsConcededMatches', matches);
      this.updateElement('firstHalfGoalsConcededPerc', firstHalfGoalsConcededPerc + '%');
      
      this.updateElement('leadingAtHT', leadingAtHT);
      this.updateElement('leadingAtHTMatches', matches);
      this.updateElement('leadingAtHTPerc', leadingAtHTPercentage + '%');
      
      this.updateElement('drawingAtHT', drawingAtHT);
      this.updateElement('drawingAtHTMatches', matches);
      this.updateElement('drawingAtHTPerc', drawingAtHTPercentage + '%');
      
      this.updateElement('losingAtHT', losingAtHT);
      this.updateElement('losingAtHTMatches', matches);
      this.updateElement('losingAtHTPerc', losingAtHTPercentage + '%');
      
      // Update column header
      this.updateElement('halftimeColumnHeader', filter.charAt(0).toUpperCase() + filter.slice(1));
      
      // Update Scored 1st Half section
      // goals1H already calculated above as const
      let matches1H = matches;
      let scored1HAvgSecond = 0;  // Renamed to avoid duplicate declaration
      let scored1HPercentage = 0;
      // failedToScore1HPercentage already declared above
      // matchesWithGoals1H already declared above
      
      if (filter === 'overall') {
        // goals1H already calculated above as const
        const seasonFTSHT = statistics.seasonFTSHT_overall || 0;
        matchesWithGoals1H = matches - seasonFTSHT;
        scored1HAvgSecond = statistics.seasonScoredAVGHT_overall || statistics.scoredAVGHT_overall || 0;
        scored1HPercentage = matches > 0 ? Math.round((matchesWithGoals1H / matches) * 100) : 0;
        failedToScore1HPercentage = matches > 0 ? Math.round((seasonFTSHT / matches) * 100) : 0;
      } else if (filter === 'home') {
        // goals1H already calculated above as const
        const seasonFTSHT = statistics.seasonFTSHT_home || 0;
        matchesWithGoals1H = matches - seasonFTSHT;
        scored1HAvgSecond = statistics.seasonScoredAVGHT_home || statistics.scoredAVGHT_home || 0;
        scored1HPercentage = matches > 0 ? Math.round((matchesWithGoals1H / matches) * 100) : 0;
        failedToScore1HPercentage = matches > 0 ? Math.round((seasonFTSHT / matches) * 100) : 0;
      } else if (filter === 'away') {
        // goals1H already calculated above as const
        const seasonFTSHT = statistics.seasonFTSHT_away || 0;
        matchesWithGoals1H = matches - seasonFTSHT;
        scored1HAvgSecond = statistics.seasonScoredAVGHT_away || statistics.scoredAVGHT_away || 0;
        scored1HPercentage = matches > 0 ? Math.round((matchesWithGoals1H / matches) * 100) : 0;
        failedToScore1HPercentage = matches > 0 ? Math.round((seasonFTSHT / matches) * 100) : 0;
      }
      
      // Update Scored 1st Half elements
      this.updateElement('scoredAvg1H', scored1HAvgSecond.toFixed(2));
      this.updateElement('scoredIn1H', scored1HPercentage + '%');
      this.updateElement('failedToScore1H', failedToScore1HPercentage + '%');
      this.updateElement('goals1HScored', `${goals1H} in ${matchesWithGoals1H}`);
      
      // Update Scored 2nd Half section
      // goals2H already calculated above as const
      let matches2H = matches;
      // scored2HAvg already declared above
      let scored2HPercentage = 0;
      // failedToScore2HPercentage already declared above  
      // matchesWithGoals2H already declared above
      
      if (filter === 'overall') {
        // goals2H already calculated above as const
        const seasonFTS2H = statistics.seasonFTS2H_overall || 0;
        matchesWithGoals2H = matches - seasonFTS2H;
        // scored2HAvg already calculated above
        scored2HPercentage = matches > 0 ? Math.round((matchesWithGoals2H / matches) * 100) : 0;
        // failedToScore2HPercentage already calculated above
      } else if (filter === 'home') {
        // goals2H already calculated above as const
        const seasonFTS2H = statistics.seasonFTS2H_home || 0;
        matchesWithGoals2H = matches - seasonFTS2H;
        // scored2HAvg already calculated above
        scored2HPercentage = matches > 0 ? Math.round((matchesWithGoals2H / matches) * 100) : 0;
        // failedToScore2HPercentage already calculated above
      } else if (filter === 'away') {
        // goals2H already calculated above as const
        const seasonFTS2H = statistics.seasonFTS2H_away || 0;
        matchesWithGoals2H = matches - seasonFTS2H;
        // scored2HAvg already calculated above
        scored2HPercentage = matches > 0 ? Math.round((matchesWithGoals2H / matches) * 100) : 0;
        // failedToScore2HPercentage already calculated above
      }
      
      // Update Scored 2nd Half elements
      this.updateElement('scoredAvg2H', scored2HAvg.toFixed(2));
      this.updateElement('scoredIn2H', scored2HPercentage + '%');
      this.updateElement('failedToScore2H', failedToScore2HPercentage + '%');
      this.updateElement('goals2HScored', `${goals2H} in ${matchesWithGoals2H}`);
    }

    /**
     * Update Over/Under Goals section
     */
    updateOverUnderSection(statistics, filter) {
      // Update Match Goals AVG for Full Time
      let matchGoalsAvgFT = 0;
      if (filter === 'overall') {
        const totalGoals = (statistics.goalsFor || 0) + (statistics.goalsAgainst || 0);
        const totalMatches = statistics.totalMatches || statistics.matches || 1;
        matchGoalsAvgFT = totalMatches > 0 ? totalGoals / totalMatches : 0;
      } else if (filter === 'home') {
        const totalGoals = (statistics.homeGoalsFor || 0) + (statistics.homeGoalsAgainst || 0);
        const totalMatches = statistics.homeMatches || 1;
        matchGoalsAvgFT = totalMatches > 0 ? totalGoals / totalMatches : 0;
      } else if (filter === 'away') {
        const totalGoals = (statistics.awayGoalsFor || 0) + (statistics.awayGoalsAgainst || 0);
        const totalMatches = statistics.awayMatches || 1;
        matchGoalsAvgFT = totalMatches > 0 ? totalGoals / totalMatches : 0;
      }
      this.updateElement('matchGoalsAvgFT', matchGoalsAvgFT.toFixed(2));
      
      // Update Match Goals AVG for Half Time
      let matchGoalsAvgHT = 0;
      if (filter === 'overall') {
        matchGoalsAvgHT = statistics.scoredAVGHT_overall || statistics.firstHalfGoalsAVG || statistics.matchGoalsAvgHT || 0;
      } else if (filter === 'home') {
        matchGoalsAvgHT = statistics.scoredAVGHT_home || statistics.firstHalfGoalsAVG_home || 0;
      } else if (filter === 'away') {
        matchGoalsAvgHT = statistics.scoredAVGHT_away || statistics.firstHalfGoalsAVG_away || 0;
      }
      this.updateElement('matchGoalsAvgHT', matchGoalsAvgHT.toFixed(2));
      
      // Update Match Goals AVG for 2nd Half
      let matchGoalsAvg2H = 0;
      if (filter === 'overall') {
        matchGoalsAvg2H = statistics.scored_2hg_avg_overall || statistics.secondHalfGoalsAVG || statistics.matchGoalsAvg2H || 0;
      } else if (filter === 'home') {
        matchGoalsAvg2H = statistics.scored_2hg_avg_home || statistics.secondHalfGoalsAVG_home || 0;
      } else if (filter === 'away') {
        matchGoalsAvg2H = statistics.scored_2hg_avg_away || statistics.secondHalfGoalsAVG_away || 0;
      }
      this.updateElement('matchGoalsAvg2H', matchGoalsAvg2H.toFixed(2));
      
      // Full Time Over/Under
      const ftThresholds = ['05', '15', '25', '35', '45'];
      ftThresholds.forEach(threshold => {
        let value;
        if (filter === 'overall') {
          value = statistics[`over${threshold}GoalsPercentage`] || 
                  statistics[`over${threshold}Goals`] || 
                  statistics[`seasonOver${threshold}Percentage_overall`] || 0;
        } else if (filter === 'home') {
          value = statistics[`homeOver${threshold}GoalsPercentage`] || 
                  statistics[`over${threshold}GoalsPercentage_home`] || 0;
        } else if (filter === 'away') {
          value = statistics[`awayOver${threshold}GoalsPercentage`] || 
                  statistics[`over${threshold}GoalsPercentage_away`] || 0;
        }
        
        this.updateElement(`over${threshold}FT`, value + '%');
        
        // Calculate and update Under values
        const underValue = 100 - value;
        this.updateElement(`under${threshold}FT`, underValue + '%');
      });
      
      // Half Time Over/Under
      const htThresholds = ['05', '15', '25'];
      htThresholds.forEach(threshold => {
        let value;
        if (filter === 'overall') {
          value = statistics[`seasonOver${threshold}PercentageHT_overall`] || 
                  statistics[`over${threshold}GoalsHT`] || 0;
        } else if (filter === 'home') {
          value = statistics[`seasonOver${threshold}PercentageHT_home`] || 0;
        } else if (filter === 'away') {
          value = statistics[`seasonOver${threshold}PercentageHT_away`] || 0;
        }
        
        this.updateElement(`over${threshold}HT`, value + '%');
        
        // Calculate and update Under values for HT
        const underValue = 100 - value;
        this.updateElement(`under${threshold}HT`, underValue + '%');
      });
      
      // Second Half Over/Under
      const shThresholds = ['05', '15', '25'];
      shThresholds.forEach(threshold => {
        let value;
        if (filter === 'overall') {
          value = statistics[`over${threshold}_2hg_percentage_overall`] || 
                  statistics[`over${threshold}Goals2H`] || 0;
        } else if (filter === 'home') {
          value = statistics[`over${threshold}_2hg_percentage_home`] || 0;
        } else if (filter === 'away') {
          value = statistics[`over${threshold}_2hg_percentage_away`] || 0;
        }
        
        this.updateElement(`over${threshold}2H`, value + '%');
        
        // Calculate and update Under values for 2H
        const underValue = 100 - value;
        this.updateElement(`under${threshold}2H`, underValue + '%');
      });
    }

    /**
     * Render Over/Under statistics
     */
    renderOverUnderStats(container, overUnderData) {
      const card = this.createElement('div', {
        className: 'bg-white rounded-lg shadow-md p-6',
        parent: container
      });

      this.createElement('h4', {
        className: 'text-md font-semibold mb-4',
        textContent: 'Over/Under Goals',
        parent: card
      });

      const thresholds = ['0.5', '1.5', '2.5', '3.5', '4.5'];
      
      const list = this.createElement('div', {
        className: 'space-y-2',
        parent: card
      });

      thresholds.forEach(threshold => {
        const percentage = overUnderData[`over${threshold.replace('.', '')}Percentage`] || 0;
        this.renderProgressBar(list, `Over ${threshold}`, percentage);
      });
    }

    /**
     * Render BTTS statistics
     */
    renderBTTSStats(container, bttsData) {
      const card = this.createElement('div', {
        className: 'bg-white rounded-lg shadow-md p-6',
        parent: container
      });

      this.createElement('h4', {
        className: 'text-md font-semibold mb-4',
        textContent: 'Both Teams to Score',
        parent: card
      });

      const stats = [
        { label: 'BTTS Yes', value: bttsData.bttsPercentage, color: this.config.chartColors.goals },
        { label: 'BTTS & Win', value: bttsData.bttsAndWinPercentage, color: this.config.chartColors.home },
        { label: 'BTTS & Draw', value: bttsData.bttsAndDrawPercentage, color: '#6b7280' },
        { label: 'BTTS & Lose', value: bttsData.bttsAndLosePercentage, color: this.config.chartColors.conceded }
      ];

      const list = this.createElement('div', {
        className: 'space-y-2',
        parent: card
      });

      stats.forEach(stat => {
        this.renderProgressBar(list, stat.label, stat.value, stat.color);
      });
    }

    /**
     * Render progress bar
     */
    renderProgressBar(container, label, percentage, color = this.config.chartColors.goals) {
      const wrapper = this.createElement('div', {
        className: 'space-y-1',
        parent: container
      });

      const header = this.createElement('div', {
        className: 'flex justify-between text-sm',
        parent: wrapper
      });

      this.createElement('span', {
        className: 'text-gray-600',
        textContent: label,
        parent: header
      });

      this.createElement('span', {
        className: 'font-semibold',
        textContent: `${percentage}%`,
        parent: header
      });

      const barBg = this.createElement('div', {
        className: 'w-full bg-gray-200 rounded-full h-2',
        parent: wrapper
      });

      const bar = this.createElement('div', {
        className: 'h-2 rounded-full transition-all duration-500',
        style: {
          width: '0%',
          backgroundColor: color
        },
        parent: barBg
      });

      // Animate bar
      setTimeout(() => {
        bar.style.width = `${percentage}%`;
      }, 100);
    }

    /**
     * Render chart type selector
     */
    renderChartTypeSelector(container) {
      const selector = this.createElement('div', {
        className: 'flex gap-2',
        parent: container
      });

      const types = [
        { value: 'bar', icon: '📊' },
        { value: 'line', icon: '📈' },
        { value: 'pie', icon: '🥧' }
      ];

      types.forEach(type => {
        const button = this.createElement('button', {
          className: `px-3 py-1 rounded ${this.state.chartType === type.value ? 'bg-blue-500 text-white' : 'bg-gray-200'}`,
          textContent: type.icon,
          parent: selector
        });

        button.addEventListener('click', () => {
          this.state.chartType = type.value;
          // Re-render chart
        });
      });
    }

    /**
     * Render defensive patterns
     */
    renderDefensivePatterns(container, patterns) {
      const card = this.createElement('div', {
        className: 'bg-white rounded-lg shadow-md p-6',
        parent: container
      });

      this.createElement('h4', {
        className: 'text-md font-semibold mb-4',
        textContent: 'Defensive Patterns',
        parent: card
      });

      const items = [
        { label: 'Clean Sheet Rate', value: `${patterns.cleanSheetPercentage}%`, icon: '🛡️' },
        { label: 'Goals Conceded First Half', value: `${patterns.firstHalfConcededPercentage}%`, icon: '1️⃣' },
        { label: 'Goals Conceded Second Half', value: `${patterns.secondHalfConcededPercentage}%`, icon: '2️⃣' },
        { label: 'Most Vulnerable Period', value: patterns.mostVulnerablePeriod, icon: '⚠️' }
      ];

      const list = this.createElement('div', {
        className: 'space-y-3',
        parent: card
      });

      items.forEach(item => {
        this.renderPatternItem(list, item);
      });
    }

    /**
     * Destroy the module
     */
    destroy() {
      log('[GoalsDisplay] Destroying module...');
      
      // Remove event listeners
      if (global.TeamStatsEventBus) {
        global.TeamStatsEventBus.off('data:goals:updated');
        global.TeamStatsEventBus.off('filter:changed');
      }

      // Clear state
      this.state = {
        activeFilter: 'overall',
        activeTimeFrame: 'all',
        comparisonMode: false,
        chartType: 'bar'
      };

      this.initialized = false;
      log('[GoalsDisplay] ✓ Module destroyed');
    }
    
    /**
     * Update scored top stats cards
     */
    updateScoredTopStats(statistics, filter) {
      log('[GoalsDisplay] Updating scored top stats with filter:', filter);
      
      // Scored per match
      let scoredPerMatch;
      if (filter === 'overall') {
        scoredPerMatch = statistics.averageGoalsFor || statistics.goalsForPerMatch || statistics.seasonScoredAVG_overall || 0;
      } else if (filter === 'home') {
        scoredPerMatch = statistics.homeGoalsForPerMatch || statistics.seasonScoredAVG_home || 0;
      } else if (filter === 'away') {
        scoredPerMatch = statistics.awayGoalsForPerMatch || statistics.seasonScoredAVG_away || 0;
      }
      
      this.updateElement('scoredPerMatchCard', scoredPerMatch.toFixed(2));
      
      // 1st Half Scored
      let scored1H;
      if (filter === 'overall') {
        scored1H = statistics.scoredAVGHT_overall || statistics.goalsFor1H_AVG_overall || 0;
      } else if (filter === 'home') {
        scored1H = statistics.scoredAVGHT_home || statistics.goalsFor1H_AVG_home || 0;
      } else if (filter === 'away') {
        scored1H = statistics.scoredAVGHT_away || statistics.goalsFor1H_AVG_away || 0;
      }
      
      this.updateElement('scoredAvg1HCard', scored1H.toFixed(2));
      
      // 2nd Half Scored
      let scored2H;
      if (filter === 'overall') {
        scored2H = statistics.scored_2hg_avg_overall || statistics.goalsFor2H_AVG_overall || statistics.scored2H_AVG_overall || 0;
      } else if (filter === 'home') {
        scored2H = statistics.scored_2hg_avg_home || statistics.goalsFor2H_AVG_home || statistics.scored2H_AVG_home || 0;
      } else if (filter === 'away') {
        scored2H = statistics.scored_2hg_avg_away || statistics.goalsFor2H_AVG_away || statistics.scored2H_AVG_away || 0;
      }
      
      this.updateElement('scoredAvg2HCard', scored2H.toFixed(2));
    }
    
    /**
     * Update conceded top stats cards
     */
    updateConcededTopStats(statistics, filter) {
      log('[GoalsDisplay] Updating conceded top stats with filter:', filter);
      
      // Conceded per match
      let concededPerMatch;
      if (filter === 'overall') {
        concededPerMatch = statistics.averageGoalsAgainst || statistics.goalsAgainstPerMatch || statistics.seasonConcededAVG_overall || 0;
      } else if (filter === 'home') {
        concededPerMatch = statistics.homeGoalsAgainstPerMatch || statistics.seasonConcededAVG_home || 0;
      } else if (filter === 'away') {
        concededPerMatch = statistics.awayGoalsAgainstPerMatch || statistics.seasonConcededAVG_away || 0;
      }
      
      this.updateElement('concededPerMatchCard', concededPerMatch.toFixed(2));
      
      // 1st Half Conceded
      let conceded1H;
      if (filter === 'overall') {
        conceded1H = statistics.concededAVGHT_overall || statistics.goalsAgainst1H_AVG_overall || 0;
      } else if (filter === 'home') {
        conceded1H = statistics.concededAVGHT_home || statistics.goalsAgainst1H_AVG_home || 0;
      } else if (filter === 'away') {
        conceded1H = statistics.concededAVGHT_away || statistics.goalsAgainst1H_AVG_away || 0;
      }
      
      this.updateElement('concededAvg1HCard', conceded1H.toFixed(2));
      
      // 2nd Half Conceded  
      let conceded2H;
      if (filter === 'overall') {
        conceded2H = statistics.conceded_2hg_avg_overall || statistics.goalsAgainst2H_AVG_overall || statistics.conceded2H_AVG_overall || 0;
      } else if (filter === 'home') {
        conceded2H = statistics.conceded_2hg_avg_home || statistics.goalsAgainst2H_AVG_home || statistics.conceded2H_AVG_home || 0;
      } else if (filter === 'away') {
        conceded2H = statistics.conceded_2hg_avg_away || statistics.goalsAgainst2H_AVG_away || statistics.conceded2H_AVG_away || 0;
      }
      
      this.updateElement('concededAvg2HCard', conceded2H.toFixed(2));
    }

    /**
     * Export display configuration
     */
    exportConfig() {
      return {
        name: this.name,
        version: this.version,
        config: this.config,
        state: this.state
      };
    }

    /**
     * Import display configuration
     */
    importConfig(config) {
      if (config.config) {
        this.config = { ...this.config, ...config.config };
      }
      if (config.state) {
        this.state = { ...this.state, ...config.state };
      }
    }
  }

  // Create singleton instance
  const goalsDisplay = new GoalsDisplay();

  // Auto-initialize if DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => goalsDisplay.initialize());
  } else {
    goalsDisplay.initialize();
  }

  // Export to global scope
  global.TeamStatsGoalsDisplay = goalsDisplay;

  log('[GoalsDisplay] Module loaded successfully');

})(window);