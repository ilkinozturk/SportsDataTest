/**
 * Corners Display Module
 * Handles the visualization and rendering of corners statistics
 *
 * Features:
 * - Corners overview cards
 * - Corners timing charts
 * - Home/Away corners comparison
 * - Corners by period display
 * - Corners patterns analysis
 * - First/Last corner statistics
 * - Interactive charts and animations
 */

(function (global) {
  'use strict';

  // Module dependencies check
  const requiredModules = [
    'TeamStatsCornersStatistics',
    'TeamStatsEventBus',
    'TeamStatsStateManager',
  ];
  const missingModules = requiredModules.filter(module => !global[module]);

  if (missingModules.length > 0) {
    // Missing optional modules
  }

  class CornersDisplay {
    constructor() {
      this.name = 'CornersDisplay';
      this.version = '1.0.0';
      this.initialized = false;
      this.config = {
        animationDuration: 300,
        chartColors: {
          team: '#3b82f6',
          opponent: '#ef4444',
          home: '#06b6d4',
          away: '#8b5cf6',
          firstHalf: '#10b981',
          secondHalf: '#f59e0b',
          over: '#22c55e',
          under: '#f87171',
        },
        thresholds: {
          highCorners: 10,
          lowCorners: 6,
          highCornersPerMatch: 5.5,
          lowCornersPerMatch: 3.5,
        },
      };
      this.state = {
        activeFilter: 'overall',
        activeTimeFrame: 'all',
        cornerType: 'all', // all, team, opponent
        viewMode: 'overview', // overview, timing, comparison, patterns
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
     * Get CornersStatistics module
     */
    get cornersStats() {
      return global.TeamStatsCornersStatistics;
    }

    /**
     * Get EventBus module
     */
    get eventBus() {
      return global.TeamStatsEventBus;
    }

    /**
     * Get StateManager module
     */
    get stateManager() {
      return global.TeamStatsStateManager;
    }

    /**
     * Initialize module
     */
    init() {
      if (this.initialized) {
        return;
      }

      // Setup event listeners
      this.setupEventListeners();

      this.initialized = true;
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
      if (this.eventBus) {
        this.eventBus.on('filters:change', this.handleFilterChange.bind(this));
        this.eventBus.on('data:corners:updated', this.handleDataUpdate.bind(this));
        this.eventBus.on('view:corners:modeChange', this.handleViewModeChange.bind(this));

        // Listen for initial team data load
        this.eventBus.on('data:team:loaded', data => {
          if (data.data && data.data.statistics) {
            this.lastStatistics = data.data.statistics;
            // Update with current filter
            const currentFilter = this.stateManager?.get('filters.current') || 'overall';
            this.updateCornersStatistics(data.data.statistics, currentFilter);
          }
        });
      }
    }

    /**
     * Handle filter change
     */
    handleFilterChange(filter) {
      // Handle both direct filter value and object with value property
      const filterValue =
        typeof filter === 'string' ? filter : filter.value || filter.venue || 'overall';
      this.state.activeFilter = filterValue;

      // Update corners statistics if data exists
      if (this.lastStatistics) {
        this.updateCornersStatistics(this.lastStatistics, filterValue);
      }

      this.eventBus?.emit('corners:display:filterChanged', { filter: filterValue });
    }

    /**
     * Handle data update
     */
    handleDataUpdate(data) {
      this.lastStatistics = data.statistics;
    }

    /**
     * Update corners statistics based on filter
     */
    updateCornersStatistics(statistics, filter) {
      const suffix = filter === 'overall' ? '_overall' : `_${filter}`;

      // Check actual field names in team-stats page
      // const cornerFields = Object.keys(statistics).filter(key =>
      //   key.toLowerCase().includes('corner')
      // );

      // Update top stats cards
      this.updateCornersTopStats(statistics, filter);

      // Update total corners
      const totalCorners =
        filter === 'overall'
          ? statistics.cornersTotal || statistics.cornersTotal_overall || 0
          : statistics[`cornersTotal${suffix}`] || 0;

      this.updateElement('totalCorners', totalCorners);

      // Calculate matches based on filter
      const matches =
        filter === 'overall'
          ? statistics.totalMatches || statistics.matches || 0
          : (filter === 'home' ? statistics.homeMatches : statistics.awayMatches) || 0;

      // Update corners earned per match (corners for)
      let cornersForPerMatch;
      if (filter === 'overall') {
        cornersForPerMatch =
          statistics.cornersEarnedPerMatch ||
          statistics.cornersAVG ||
          statistics.cornersForPerMatch ||
          0;
      } else if (filter === 'home') {
        cornersForPerMatch = statistics.homeCornersAVG || statistics.homeCornersForPerMatch || 0;
      } else if (filter === 'away') {
        cornersForPerMatch = statistics.awayCornersAVG || statistics.awayCornersForPerMatch || 0;
      }

      this.updateElement('cornersEarnedPerMatch', cornersForPerMatch.toFixed(2));
      this.updateElement('filter-cornersEarnedPerMatch', cornersForPerMatch.toFixed(2));

      // Update corners against per match
      let cornersAgainstPerMatch;
      if (filter === 'overall') {
        cornersAgainstPerMatch =
          statistics.cornersAgainstPerMatch || statistics.cornersAgainstAVG || 0;
      } else if (filter === 'home') {
        cornersAgainstPerMatch =
          statistics.homeCornersAgainstAVG || statistics.homeCornersAgainstPerMatch || 0;
      } else if (filter === 'away') {
        cornersAgainstPerMatch =
          statistics.awayCornersAgainstAVG || statistics.awayCornersAgainstPerMatch || 0;
      }

      this.updateElement('cornersAgainstPerMatch', cornersAgainstPerMatch.toFixed(2));
      this.updateElement('filter-cornersAgainstPerMatch', cornersAgainstPerMatch.toFixed(2));

      // Update total corners per match
      let totalCornersPerMatch;
      if (filter === 'overall') {
        totalCornersPerMatch =
          statistics.totalCornersPerMatch ||
          statistics.cornersTotalAVG ||
          parseFloat(cornersForPerMatch) + parseFloat(cornersAgainstPerMatch);
      } else if (filter === 'home') {
        totalCornersPerMatch =
          statistics.homeCornersTotalAVG ||
          parseFloat(cornersForPerMatch) + parseFloat(cornersAgainstPerMatch);
      } else if (filter === 'away') {
        totalCornersPerMatch =
          statistics.awayCornersTotalAVG ||
          parseFloat(cornersForPerMatch) + parseFloat(cornersAgainstPerMatch);
      }

      this.updateElement('totalCornersPerMatch', totalCornersPerMatch.toFixed(2));
      this.updateElement('filter-totalCornersPerMatch', totalCornersPerMatch.toFixed(2));

      // Update corners per match (average)
      this.updateElement('cornersPerMatch', cornersForPerMatch.toFixed(2));
      this.updateElement('avgCorners', cornersForPerMatch.toFixed(2));

      // Update corners for/against totals
      const cornersFor = cornersForPerMatch * matches;
      const cornersAgainst = cornersAgainstPerMatch * matches;
      this.updateElement('cornersFor', Math.round(cornersFor));
      this.updateElement('cornersAgainst', Math.round(cornersAgainst));

      // Update corners over percentages - all thresholds
      const overFields = ['65', '75', '85', '95', '105', '115', '125', '135'];
      overFields.forEach(threshold => {
        let overValue;

        if (filter === 'overall') {
          // Try multiple field name patterns for overall
          overValue =
            statistics[`cornersOver${threshold}`] ||
            statistics[`over${threshold}Corners`] ||
            statistics[`over${threshold}CornersPercentage_overall`] ||
            statistics[`cornersOver${threshold}Percentage_overall`] ||
            0;
        } else if (filter === 'home') {
          overValue =
            statistics[`over${threshold}CornersPercentage_home`] ||
            statistics[`homeOver${threshold}Corners`] ||
            0;
        } else if (filter === 'away') {
          overValue =
            statistics[`over${threshold}CornersPercentage_away`] ||
            statistics[`awayOver${threshold}Corners`] ||
            0;
        }

        // Update multiple element patterns
        this.updateElement(`over${threshold}Corners`, `${overValue}%`);
        this.updateElement(`cornersOver${threshold}`, overValue > 0 ? `${overValue}%` : '-');
        this.updateElement(`filter-cornersOver${threshold}`, overValue > 0 ? `${overValue}%` : '-');
      });
    }

    /**
     * Update element helper
     */
    updateElement(id, value) {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = value;
      }
    }

    /**
     * Update Team Corners section specifically
     */
    updateTeamCornersSection(statistics, filter) {
      // Update corners earned stats
      let cornersEarnedPerMatch, cornersAgainstPerMatch;

      if (filter === 'overall') {
        cornersEarnedPerMatch =
          statistics.cornersAVG ||
          statistics.cornersForPerMatch ||
          statistics.cornersEarnedPerMatch ||
          0;
        cornersAgainstPerMatch =
          statistics.cornersAgainstAVG || statistics.cornersAgainstPerMatch || 0;
      } else if (filter === 'home') {
        cornersEarnedPerMatch =
          statistics.homeCornersAVG ||
          statistics.cornersForPerMatch_home ||
          statistics.homeCornersForPerMatch ||
          0;
        cornersAgainstPerMatch =
          statistics.homeCornersAgainstAVG ||
          statistics.cornersAgainstPerMatch_home ||
          statistics.homeCornersAgainstPerMatch ||
          0;
      } else if (filter === 'away') {
        cornersEarnedPerMatch =
          statistics.awayCornersAVG ||
          statistics.cornersForPerMatch_away ||
          statistics.awayCornersForPerMatch ||
          0;
        cornersAgainstPerMatch =
          statistics.awayCornersAgainstAVG ||
          statistics.cornersAgainstPerMatch_away ||
          statistics.awayCornersAgainstPerMatch ||
          0;
      }

      // Update earned per match
      this.updateElement('teamCorners-avgEarned', cornersEarnedPerMatch.toFixed(2));

      // Update against per match
      this.updateElement('teamCorners-avgAgainst', cornersAgainstPerMatch.toFixed(2));

      // Calculate total corners
      const matches =
        filter === 'overall'
          ? statistics.totalMatches || statistics.matches || 0
          : (filter === 'home' ? statistics.homeMatches : statistics.awayMatches) || 0;

      const totalEarned = Math.round(cornersEarnedPerMatch * matches);
      const totalAgainst = Math.round(cornersAgainstPerMatch * matches);

      this.updateElement('teamCorners-totalEarned', totalEarned);
      this.updateElement('teamCorners-totalAgainst', totalAgainst);

      // Update more corners than opponent percentage
      let moreThanOpponent;
      if (filter === 'overall') {
        moreThanOpponent =
          statistics.winMostCornersPercentage || statistics.winMostCornersPercentage_overall || 0;
      } else if (filter === 'home') {
        moreThanOpponent = statistics.winMostCornersPercentage_home || 0;
      } else if (filter === 'away') {
        moreThanOpponent = statistics.winMostCornersPercentage_away || 0;
      }
      this.updateElement('teamCorners-moreThanOpponent', moreThanOpponent + '%');

      // Update corners earned over percentages
      const earnedThresholds = ['25', '35', '45', '55', '65', '75', '85'];
      earnedThresholds.forEach(threshold => {
        let value;
        if (filter === 'overall') {
          value =
            statistics[`over${threshold}CornersForPercentage_overall`] ||
            statistics[`over${threshold}CornersForPercentage`] ||
            0;
        } else if (filter === 'home') {
          value = statistics[`over${threshold}CornersForPercentage_home`] || 0;
        } else if (filter === 'away') {
          value = statistics[`over${threshold}CornersForPercentage_away`] || 0;
        }
        this.updateElement(`teamCorners-earnedOver${threshold}`, value + '%');
      });

      // Update corners against over percentages
      const againstThresholds = ['25', '35', '45', '55', '65', '75', '85'];
      againstThresholds.forEach(threshold => {
        let value;
        if (filter === 'overall') {
          value =
            statistics[`over${threshold}CornersAgainstPercentage_overall`] ||
            statistics[`over${threshold}CornersAgainstPercentage`] ||
            0;
        } else if (filter === 'home') {
          value = statistics[`over${threshold}CornersAgainstPercentage_home`] || 0;
        } else if (filter === 'away') {
          value = statistics[`over${threshold}CornersAgainstPercentage_away`] || 0;
        }
        this.updateElement(`teamCorners-againstOver${threshold}`, value + '%');
      });
    }

    /**
     * Update corners top stats cards
     */
    updateCornersTopStats(statistics, filter) {
      // Total corners per match
      let totalCornersPerMatch, cornersEarnedPerMatch, cornersAgainstPerMatch;

      if (filter === 'overall') {
        cornersEarnedPerMatch =
          statistics.cornersAVG ||
          statistics.cornersForPerMatch ||
          statistics.cornersEarnedPerMatch ||
          0;
        cornersAgainstPerMatch =
          statistics.cornersAgainstAVG || statistics.cornersAgainstPerMatch || 0;
        totalCornersPerMatch =
          statistics.cornersTotalAVG ||
          statistics.totalCornersPerMatch ||
          parseFloat(cornersEarnedPerMatch) + parseFloat(cornersAgainstPerMatch);
      } else if (filter === 'home') {
        cornersEarnedPerMatch =
          statistics.homeCornersAVG ||
          statistics.cornersForPerMatch_home ||
          statistics.homeCornersForPerMatch ||
          0;
        cornersAgainstPerMatch =
          statistics.homeCornersAgainstAVG ||
          statistics.cornersAgainstPerMatch_home ||
          statistics.homeCornersAgainstPerMatch ||
          0;
        totalCornersPerMatch =
          statistics.homeCornersTotalAVG ||
          statistics.totalCornersPerMatch_home ||
          parseFloat(cornersEarnedPerMatch) + parseFloat(cornersAgainstPerMatch);
      } else if (filter === 'away') {
        cornersEarnedPerMatch =
          statistics.awayCornersAVG ||
          statistics.cornersForPerMatch_away ||
          statistics.awayCornersForPerMatch ||
          0;
        cornersAgainstPerMatch =
          statistics.awayCornersAgainstAVG ||
          statistics.cornersAgainstPerMatch_away ||
          statistics.awayCornersAgainstPerMatch ||
          0;
        totalCornersPerMatch =
          statistics.awayCornersTotalAVG ||
          statistics.totalCornersPerMatch_away ||
          parseFloat(cornersEarnedPerMatch) + parseFloat(cornersAgainstPerMatch);
      }

      this.updateElement('cornersPerMatchCard', totalCornersPerMatch.toFixed(2));
      this.updateElement('cornersEarnedPerMatchCard', cornersEarnedPerMatch.toFixed(2));
      this.updateElement('cornersAgainstPerMatchCard', cornersAgainstPerMatch.toFixed(2));
    }

    /**
     * Handle view mode change
     */
    handleViewModeChange(mode) {
      this.state.viewMode = mode;
    }

    /**
     * Main render method for corners section
     */
    renderCornersSection(container, statistics, options = {}) {
      if (!container) {
        return null;
      }

      const {
        filter = 'overall',
        showCharts = true,
        showDetails = true,
        showPatterns = true,
        animated = true,
      } = options;

      // Clear container
      this.clearContainer(container);

      // Create main section
      const section = this.createElement('div', {
        className: 'corners-section',
        parent: container,
      });

      // Render overview cards
      this.renderOverviewCards(section, statistics, filter);

      // Render corners chart
      if (showCharts) {
        this.renderCornersChart(section, statistics, filter);
      }

      // Render detailed statistics
      if (showDetails) {
        this.renderDetailedStats(section, statistics, filter);
      }

      // Render corners patterns
      if (showPatterns) {
        this.renderCornerPatterns(section, statistics, filter);
      }

      // Apply animations if enabled
      if (animated) {
        this.animateSection(section);
      }

      return section;
    }

    /**
     * Render overview cards
     */
    renderOverviewCards(container, statistics, filter) {
      const cardsContainer = this.createElement('div', {
        className: 'corners-overview-cards',
        parent: container,
      });

      // Calculate statistics based on filter
      const stats = this.calculateCornerStats(statistics, filter);

      // Total Corners card
      this.createOverviewCard(cardsContainer, {
        icon: '📐',
        value: stats.totalCorners,
        label: 'Total Corners',
        subtitle: `${stats.cornersPerMatch} per match`,
        trend: this.calculateTrend(stats.cornersPerMatch, stats.avgCornersPerMatch),
      });

      // Team Corners card
      this.createOverviewCard(cardsContainer, {
        icon: '🎯',
        value: stats.teamCorners,
        label: 'Team Corners',
        subtitle: `${stats.teamCornersPerMatch} per match`,
        trend: this.calculateTrend(stats.teamCornersPerMatch, stats.avgTeamCornersPerMatch),
      });

      // Opponent Corners card
      this.createOverviewCard(cardsContainer, {
        icon: '🛡️',
        value: stats.opponentCorners,
        label: 'Opponent Corners',
        subtitle: `${stats.opponentCornersPerMatch} per match`,
        trend: this.calculateTrend(stats.avgOpponentCornersPerMatch, stats.opponentCornersPerMatch),
      });

      // Corners Difference card
      this.createOverviewCard(cardsContainer, {
        icon: '📊',
        value:
          stats.cornersDifference > 0 ? `+${stats.cornersDifference}` : stats.cornersDifference,
        label: 'Corners Difference',
        subtitle: `${stats.cornersDiffPerMatch > 0 ? '+' : ''}${stats.cornersDiffPerMatch} per match`,
        valueColor:
          stats.cornersDifference > 0
            ? '#22c55e'
            : stats.cornersDifference < 0
              ? '#ef4444'
              : '#6b7280',
      });
    }

    /**
     * Create overview card
     */
    createOverviewCard(container, data) {
      const card = this.createElement('div', {
        className: 'corners-overview-card',
        parent: container,
      });

      // Icon
      this.createElement('div', {
        className: 'card-icon',
        textContent: data.icon,
        parent: card,
      });

      // Value
      const valueColor = data.valueColor || '#1f2937';
      this.createElement('div', {
        className: 'stat-value',
        textContent: data.value,
        style: { color: valueColor },
        parent: card,
      });

      // Label
      this.createElement('div', {
        className: 'stat-label',
        textContent: data.label,
        parent: card,
      });

      // Subtitle
      if (data.subtitle) {
        this.createElement('div', {
          className: 'stat-subtitle',
          textContent: data.subtitle,
          parent: card,
        });
      }

      // Trend indicator
      if (data.trend) {
        const trendClass =
          data.trend === 'up' ? 'trend-up' : data.trend === 'down' ? 'trend-down' : 'trend-stable';
        const trendIcon = data.trend === 'up' ? '↑' : data.trend === 'down' ? '↓' : '→';
        this.createElement('div', {
          className: `trend-indicator ${trendClass}`,
          textContent: trendIcon,
          parent: card,
        });
      }

      return card;
    }

    /**
     * Render corners chart
     */
    renderCornersChart(container, statistics, filter) {
      const chartWrapper = this.createElement('div', {
        className: 'corners-chart-wrapper',
        parent: container,
      });

      this.createElement('h3', {
        className: 'chart-title',
        textContent: 'Corners Timeline',
        parent: chartWrapper,
      });

      const chartContainer = this.createElement('div', {
        className: 'bar-chart-container',
        parent: chartWrapper,
      });

      // Get matches data
      const matches = this.getFilteredMatches(statistics, filter);
      if (!matches || matches.length === 0) {
        this.createElement('p', {
          className: 'no-data-message',
          textContent: 'No match data available',
          parent: chartContainer,
        });
        return;
      }

      // Create bars for last 10 matches
      const recentMatches = matches.slice(-10);
      const maxCorners = Math.max(
        ...recentMatches.map(m => (m.teamCorners || 0) + (m.opponentCorners || 0))
      );

      recentMatches.forEach(match => {
        const teamCorners = match.teamCorners || 0;
        const oppCorners = match.opponentCorners || 0;
        const totalCorners = teamCorners + oppCorners;

        const barWrapper = this.createElement('div', {
          className: 'bar-wrapper',
          parent: chartContainer,
        });

        // Create stacked bar
        const bar = this.createElement('div', {
          className: 'stacked-bar',
          style: {
            height: '0px',
            transition: 'height 0.5s ease',
          },
          parent: barWrapper,
        });

        // Team corners part
        const teamHeight = maxCorners > 0 ? (teamCorners / maxCorners) * 150 : 0;
        this.createElement('div', {
          className: 'bar-segment team-corners',
          style: {
            height: `${teamHeight}px`,
            backgroundColor: this.config.chartColors.team,
          },
          parent: bar,
        });

        // Opponent corners part
        const oppHeight = maxCorners > 0 ? (oppCorners / maxCorners) * 150 : 0;
        this.createElement('div', {
          className: 'bar-segment opponent-corners',
          style: {
            height: `${oppHeight}px`,
            backgroundColor: this.config.chartColors.opponent,
          },
          parent: bar,
        });

        // Value label
        this.createElement('div', {
          className: 'bar-value',
          textContent: totalCorners,
          parent: barWrapper,
        });

        // Match label
        this.createElement('div', {
          className: 'bar-label',
          textContent: this.formatMatchLabel(match),
          parent: barWrapper,
        });

        // Animate bar
        setTimeout(() => {
          bar.style.height = `${teamHeight + oppHeight}px`;
        }, 100);
      });

      // Add legend
      this.renderChartLegend(chartWrapper);
    }

    /**
     * Render chart legend
     */
    renderChartLegend(container) {
      const legend = this.createElement('div', {
        className: 'chart-legend',
        parent: container,
      });

      // Team corners
      const teamLegend = this.createElement('div', {
        className: 'legend-item',
        parent: legend,
      });
      this.createElement('span', {
        className: 'legend-color',
        style: { backgroundColor: this.config.chartColors.team },
        parent: teamLegend,
      });
      this.createElement('span', {
        textContent: 'Team Corners',
        parent: teamLegend,
      });

      // Opponent corners
      const oppLegend = this.createElement('div', {
        className: 'legend-item',
        parent: legend,
      });
      this.createElement('span', {
        className: 'legend-color',
        style: { backgroundColor: this.config.chartColors.opponent },
        parent: oppLegend,
      });
      this.createElement('span', {
        textContent: 'Opponent Corners',
        parent: oppLegend,
      });
    }

    /**
     * Render detailed statistics
     */
    renderDetailedStats(container, statistics, filter) {
      const detailsGrid = this.createElement('div', {
        className: 'corners-details-grid',
        parent: container,
      });

      // Corners by half
      this.renderHalfTimeStats(detailsGrid, statistics, filter);

      // Over/Under corners
      this.renderOverUnderStats(detailsGrid, statistics, filter);

      // First/Last corner stats
      this.renderFirstLastCornerStats(detailsGrid, statistics, filter);

      // Corners timing distribution
      this.renderTimingDistribution(detailsGrid, statistics, filter);
    }

    /**
     * Render half time statistics
     */
    renderHalfTimeStats(container, statistics, filter) {
      const card = this.createElement('div', {
        className: 'detail-card',
        parent: container,
      });

      this.createElement('h4', {
        className: 'detail-card-title',
        textContent: 'Corners by Half',
        parent: card,
      });

      const stats = this.calculateHalfTimeStats(statistics, filter);

      // First half
      const firstHalf = this.createElement('div', {
        className: 'stat-row',
        parent: card,
      });
      this.createElement('span', {
        textContent: '1st Half',
        parent: firstHalf,
      });
      this.createElement('span', {
        className: 'stat-value',
        textContent: `${stats.firstHalfCorners} (${stats.firstHalfPercentage}%)`,
        parent: firstHalf,
      });

      // Second half
      const secondHalf = this.createElement('div', {
        className: 'stat-row',
        parent: card,
      });
      this.createElement('span', {
        textContent: '2nd Half',
        parent: secondHalf,
      });
      this.createElement('span', {
        className: 'stat-value',
        textContent: `${stats.secondHalfCorners} (${stats.secondHalfPercentage}%)`,
        parent: secondHalf,
      });

      // Average per half
      const avgRow = this.createElement('div', {
        className: 'stat-row highlight',
        parent: card,
      });
      this.createElement('span', {
        textContent: 'Average',
        parent: avgRow,
      });
      this.createElement('span', {
        className: 'stat-value',
        textContent: `1H: ${stats.avgFirstHalf} | 2H: ${stats.avgSecondHalf}`,
        parent: avgRow,
      });
    }

    /**
     * Render over/under statistics
     */
    renderOverUnderStats(container, statistics, filter) {
      const card = this.createElement('div', {
        className: 'detail-card',
        parent: container,
      });

      this.createElement('h4', {
        className: 'detail-card-title',
        textContent: 'Over/Under Corners',
        parent: card,
      });

      const overUnderLines = [7.5, 8.5, 9.5, 10.5, 11.5, 12.5];
      const stats = this.calculateOverUnderStats(statistics, filter);

      overUnderLines.forEach(line => {
        const row = this.createElement('div', {
          className: 'stat-row',
          parent: card,
        });

        this.createElement('span', {
          textContent: `Over ${line}`,
          parent: row,
        });

        const percentage = stats[`over${line.toString().replace('.', '')}`] || 0;
        const progressBar = this.createElement('div', {
          className: 'progress-bar',
          parent: row,
        });

        const progress = this.createElement('div', {
          className: 'progress-fill',
          style: {
            width: '0%',
            backgroundColor:
              percentage > 50 ? this.config.chartColors.over : this.config.chartColors.under,
          },
          parent: progressBar,
        });

        this.createElement('span', {
          className: 'stat-value',
          textContent: `${percentage}%`,
          parent: row,
        });

        // Animate progress bar
        setTimeout(() => {
          progress.style.width = `${percentage}%`;
        }, 100);
      });
    }

    /**
     * Render first/last corner statistics
     */
    renderFirstLastCornerStats(container, statistics, filter) {
      const card = this.createElement('div', {
        className: 'detail-card',
        parent: container,
      });

      this.createElement('h4', {
        className: 'detail-card-title',
        textContent: 'First & Last Corner',
        parent: card,
      });

      const stats = this.calculateFirstLastStats(statistics, filter);

      // First corner
      const firstRow = this.createElement('div', {
        className: 'stat-row',
        parent: card,
      });
      this.createElement('span', {
        textContent: 'First Corner (Team)',
        parent: firstRow,
      });
      this.createElement('span', {
        className: 'stat-value',
        textContent: `${stats.firstCornerTeam}%`,
        style: { color: stats.firstCornerTeam > 50 ? this.config.chartColors.team : '#6b7280' },
        parent: firstRow,
      });

      // Last corner
      const lastRow = this.createElement('div', {
        className: 'stat-row',
        parent: card,
      });
      this.createElement('span', {
        textContent: 'Last Corner (Team)',
        parent: lastRow,
      });
      this.createElement('span', {
        className: 'stat-value',
        textContent: `${stats.lastCornerTeam}%`,
        style: { color: stats.lastCornerTeam > 50 ? this.config.chartColors.team : '#6b7280' },
        parent: lastRow,
      });

      // Average time
      const timeRow = this.createElement('div', {
        className: 'stat-row highlight',
        parent: card,
      });
      this.createElement('span', {
        textContent: 'Avg First Corner Time',
        parent: timeRow,
      });
      this.createElement('span', {
        className: 'stat-value',
        textContent: `${stats.avgFirstCornerTime}'`,
        parent: timeRow,
      });
    }

    /**
     * Render timing distribution
     */
    renderTimingDistribution(container, statistics, filter) {
      const card = this.createElement('div', {
        className: 'detail-card',
        parent: container,
      });

      this.createElement('h4', {
        className: 'detail-card-title',
        textContent: 'Corners Timing',
        parent: card,
      });

      const timePeriods = [
        { label: '0-15 min', key: 'corners0to15' },
        { label: '16-30 min', key: 'corners16to30' },
        { label: '31-45 min', key: 'corners31to45' },
        { label: '46-60 min', key: 'corners46to60' },
        { label: '61-75 min', key: 'corners61to75' },
        { label: '76-90 min', key: 'corners76to90' },
      ];

      const stats = this.calculateTimingStats(statistics, filter);
      const maxCorners = Math.max(...timePeriods.map(p => stats[p.key] || 0));

      timePeriods.forEach(period => {
        const row = this.createElement('div', {
          className: 'timing-row',
          parent: card,
        });

        this.createElement('span', {
          className: 'timing-label',
          textContent: period.label,
          parent: row,
        });

        const barContainer = this.createElement('div', {
          className: 'timing-bar-container',
          parent: row,
        });

        const percentage = maxCorners > 0 ? ((stats[period.key] || 0) / maxCorners) * 100 : 0;
        const bar = this.createElement('div', {
          className: 'timing-bar',
          style: {
            width: '0%',
            backgroundColor: this.config.chartColors.team,
            transition: 'width 0.5s ease',
          },
          parent: barContainer,
        });

        this.createElement('span', {
          className: 'timing-value',
          textContent: stats[period.key] || 0,
          parent: row,
        });

        // Animate bar
        setTimeout(() => {
          bar.style.width = `${percentage}%`;
        }, 100);
      });
    }

    /**
     * Render corner patterns analysis
     */
    renderCornerPatterns(container, statistics, filter) {
      const analysisCard = this.createElement('div', {
        className: 'corners-patterns-analysis',
        parent: container,
      });

      this.createElement('h3', {
        className: 'analysis-title',
        textContent: '📊 Corners Analysis & Patterns',
        parent: analysisCard,
      });

      const stats = this.calculateCornerStats(statistics, filter);
      const patterns = this.analyzeCornerPatterns(statistics, filter);

      // Summary section
      const summary = this.createElement('div', {
        className: 'analysis-summary',
        parent: analysisCard,
      });

      this.createElement('p', {
        innerHTML: `
          <strong>Corners Performance:</strong> ${this.getPerformanceLevel(stats.cornersPerMatch)}<br>
          <strong>Dominance:</strong> ${stats.cornersDifference > 0 ? 'Positive' : stats.cornersDifference < 0 ? 'Negative' : 'Balanced'} 
          (${stats.cornersDiffPerMatch > 0 ? '+' : ''}${stats.cornersDiffPerMatch} per match)
        `,
        parent: summary,
      });

      // Key insights
      const insights = this.createElement('div', {
        className: 'analysis-insights',
        parent: analysisCard,
      });

      patterns.forEach(pattern => {
        const insight = this.createElement('div', {
          className: `insight-item ${pattern.type}`,
          parent: insights,
        });

        this.createElement('span', {
          className: 'insight-icon',
          textContent: pattern.icon,
          parent: insight,
        });

        this.createElement('span', {
          className: 'insight-text',
          textContent: pattern.text,
          parent: insight,
        });
      });

      // Recommendations
      if (patterns.length > 0) {
        this.renderRecommendations(analysisCard, stats, patterns);
      }
    }

    /**
     * Render recommendations based on patterns
     */
    renderRecommendations(container, stats, patterns) {
      const recommendations = this.createElement('div', {
        className: 'corner-recommendations',
        parent: container,
      });

      this.createElement('h4', {
        textContent: '💡 Strategic Insights',
        parent: recommendations,
      });

      const recs = this.generateRecommendations(stats, patterns);
      const list = this.createElement('ul', {
        className: 'recommendations-list',
        parent: recommendations,
      });

      recs.forEach(rec => {
        this.createElement('li', {
          textContent: rec,
          parent: list,
        });
      });
    }

    /**
     * Calculate corner statistics
     */
    calculateCornerStats(statistics, filter) {
      const suffix = filter === 'home' ? '_home' : filter === 'away' ? '_away' : '';

      const matches =
        statistics[`matches${suffix}`] ||
        statistics[`${filter}Matches`] ||
        statistics.totalMatches ||
        statistics.matches ||
        0;

      // Handle different API field names for corners
      let totalCorners, teamCorners, opponentCorners;

      if (filter === 'home') {
        totalCorners = statistics.homeCornersTotalAVG
          ? statistics.homeCornersTotalAVG * matches
          : statistics.homeCornersTotal || 0;
        teamCorners = statistics.homeCornersAVG
          ? statistics.homeCornersAVG * matches
          : statistics.homeCornersFor || 0;
        opponentCorners = statistics.homeCornersAgainstAVG
          ? statistics.homeCornersAgainstAVG * matches
          : statistics.homeCornersAgainst || 0;
      } else if (filter === 'away') {
        totalCorners = statistics.awayCornersTotalAVG
          ? statistics.awayCornersTotalAVG * matches
          : statistics.awayCornersTotal || 0;
        teamCorners = statistics.awayCornersAVG
          ? statistics.awayCornersAVG * matches
          : statistics.awayCornersFor || 0;
        opponentCorners = statistics.awayCornersAgainstAVG
          ? statistics.awayCornersAgainstAVG * matches
          : statistics.awayCornersAgainst || 0;
      } else {
        // For overall, use average values if totals not available
        totalCorners = statistics.cornersTotalAVG
          ? statistics.cornersTotalAVG * matches
          : statistics.cornersTotal || 0;
        teamCorners = statistics.cornersAVG
          ? statistics.cornersAVG * matches
          : statistics.cornersFor || 0;
        opponentCorners = statistics.cornersAgainstAVG
          ? statistics.cornersAgainstAVG * matches
          : statistics.cornersAgainst || 0;
      }

      return {
        matches,
        totalCorners,
        teamCorners,
        opponentCorners,
        cornersDifference: teamCorners - opponentCorners,
        cornersPerMatch: matches > 0 ? (totalCorners / matches).toFixed(2) : '0.00',
        teamCornersPerMatch: matches > 0 ? (teamCorners / matches).toFixed(2) : '0.00',
        opponentCornersPerMatch: matches > 0 ? (opponentCorners / matches).toFixed(2) : '0.00',
        cornersDiffPerMatch:
          matches > 0 ? ((teamCorners - opponentCorners) / matches).toFixed(2) : '0.00',
        avgCornersPerMatch: 9.5, // League average
        avgTeamCornersPerMatch: 4.8,
        avgOpponentCornersPerMatch: 4.7,
      };
    }

    /**
     * Calculate half time statistics
     */
    calculateHalfTimeStats(statistics, filter) {
      const suffix = filter === 'home' ? '_home' : filter === 'away' ? '_away' : '';

      const firstHalfCorners =
        statistics[`corners1H_total${suffix}`] || statistics.corners1H_total || 0;
      const secondHalfCorners =
        statistics[`corners2H_total${suffix}`] || statistics.corners2H_total || 0;
      const totalCorners = firstHalfCorners + secondHalfCorners || 1;
      const matches =
        statistics[`matches${suffix}`] ||
        statistics[`${filter}Matches`] ||
        statistics.totalMatches ||
        statistics.matches ||
        0;

      return {
        firstHalfCorners,
        secondHalfCorners,
        firstHalfPercentage: Math.round((firstHalfCorners / totalCorners) * 100),
        secondHalfPercentage: Math.round((secondHalfCorners / totalCorners) * 100),
        avgFirstHalf: matches > 0 ? (firstHalfCorners / matches).toFixed(2) : '0.00',
        avgSecondHalf: matches > 0 ? (secondHalfCorners / matches).toFixed(2) : '0.00',
      };
    }

    /**
     * Calculate over/under statistics
     */
    calculateOverUnderStats(statistics, filter) {
      const suffix = filter === 'home' ? '_home' : filter === 'away' ? '_away' : '';

      return {
        over75: statistics[`over75Corners${suffix}`] || statistics.over75CornersPercentage || 0,
        over85: statistics[`over85Corners${suffix}`] || statistics.over85CornersPercentage || 0,
        over95: statistics[`over95Corners${suffix}`] || statistics.over95CornersPercentage || 0,
        over105: statistics[`over105Corners${suffix}`] || statistics.over105CornersPercentage || 0,
        over115: statistics[`over115Corners${suffix}`] || statistics.over115CornersPercentage || 0,
        over125: statistics[`over125Corners${suffix}`] || statistics.over125CornersPercentage || 0,
      };
    }

    /**
     * Calculate first/last corner statistics
     */
    calculateFirstLastStats(statistics, filter) {
      const suffix = filter === 'home' ? '_home' : filter === 'away' ? '_away' : '';

      const firstCornerTeam =
        statistics[`firstCornerFor${suffix}`] || statistics.firstCornerForPercentage || 0;
      const lastCornerTeam =
        statistics[`lastCornerFor${suffix}`] || statistics.lastCornerForPercentage || 0;
      const avgFirstCornerTime =
        statistics[`avgFirstCornerTime${suffix}`] || statistics.avgFirstCornerTime || 25;

      return {
        firstCornerTeam,
        lastCornerTeam,
        avgFirstCornerTime: Math.round(avgFirstCornerTime),
      };
    }

    /**
     * Calculate timing statistics
     */
    calculateTimingStats(statistics, filter) {
      const suffix = filter === 'home' ? '_home' : filter === 'away' ? '_away' : '';

      return {
        corners0to15: statistics[`corners0to15${suffix}`] || statistics.corners0to15 || 0,
        corners16to30: statistics[`corners16to30${suffix}`] || statistics.corners16to30 || 0,
        corners31to45: statistics[`corners31to45${suffix}`] || statistics.corners31to45 || 0,
        corners46to60: statistics[`corners46to60${suffix}`] || statistics.corners46to60 || 0,
        corners61to75: statistics[`corners61to75${suffix}`] || statistics.corners61to75 || 0,
        corners76to90: statistics[`corners76to90${suffix}`] || statistics.corners76to90 || 0,
      };
    }

    /**
     * Get filtered matches
     */
    getFilteredMatches(statistics, filter) {
      const allMatches = statistics.recentMatches || [];

      if (filter === 'home') {
        return allMatches.filter(m => m.venue === 'home');
      } else if (filter === 'away') {
        return allMatches.filter(m => m.venue === 'away');
      }

      return allMatches;
    }

    /**
     * Format match label
     */
    formatMatchLabel(match) {
      if (!match) return '';

      const date = new Date(match.date);
      const day = date.getDate();
      const month = date.getMonth() + 1;

      return `${day}/${month}`;
    }

    /**
     * Calculate trend
     */
    calculateTrend(current, average) {
      const diff = current - average;
      const threshold = average * 0.1; // 10% threshold

      if (diff > threshold) return 'up';
      if (diff < -threshold) return 'down';
      return 'stable';
    }

    /**
     * Get performance level
     */
    getPerformanceLevel(cornersPerMatch) {
      if (cornersPerMatch >= this.config.thresholds.highCornersPerMatch) return 'High Activity';
      if (cornersPerMatch <= this.config.thresholds.lowCornersPerMatch) return 'Low Activity';
      return 'Average Activity';
    }

    /**
     * Analyze corner patterns
     */
    analyzeCornerPatterns(statistics, filter) {
      const patterns = [];
      const stats = this.calculateCornerStats(statistics, filter);
      const halfStats = this.calculateHalfTimeStats(statistics, filter);
      const firstLastStats = this.calculateFirstLastStats(statistics, filter);

      // Corner dominance pattern
      if (stats.cornersDifference > stats.matches * 1.5) {
        patterns.push({
          type: 'positive',
          icon: '✅',
          text: 'Strong corner dominance over opponents',
        });
      } else if (stats.cornersDifference < -stats.matches) {
        patterns.push({
          type: 'negative',
          icon: '⚠️',
          text: 'Opponents dominate in corner count',
        });
      }

      // Second half pattern
      if (halfStats.secondHalfPercentage > 60) {
        patterns.push({
          type: 'neutral',
          icon: '📈',
          text: 'Significantly more corners in second half',
        });
      }

      // First corner success
      if (firstLastStats.firstCornerTeam > 60) {
        patterns.push({
          type: 'positive',
          icon: '🎯',
          text: 'Excellent first corner winning rate',
        });
      }

      // High corner matches
      const overStats = this.calculateOverUnderStats(statistics, filter);
      if (overStats.over105 > 60) {
        patterns.push({
          type: 'neutral',
          icon: '📊',
          text: 'Majority of matches see 11+ corners',
        });
      }

      return patterns;
    }

    /**
     * Generate recommendations
     */
    generateRecommendations(stats, patterns) {
      const recommendations = [];

      if (parseFloat(stats.teamCornersPerMatch) > this.config.thresholds.highCornersPerMatch) {
        recommendations.push('Team generates high corner frequency - consider set piece focus');
      }

      if (parseFloat(stats.opponentCornersPerMatch) > this.config.thresholds.highCornersPerMatch) {
        recommendations.push(
          'Opponents win many corners - defensive positioning may need adjustment'
        );
      }

      const hasSecondHalfPattern = patterns.some(p => p.text.includes('second half'));
      if (hasSecondHalfPattern) {
        recommendations.push(
          'Second half sees more corner activity - fitness and pressing factors'
        );
      }

      if (recommendations.length === 0) {
        recommendations.push('Corner statistics show balanced performance across all metrics');
      }

      return recommendations;
    }

    /**
     * Animate section elements
     */
    animateSection(section) {
      const elements = section.querySelectorAll(
        '.corners-overview-card, .detail-card, .corners-patterns-analysis'
      );

      elements.forEach((element, index) => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';

        setTimeout(() => {
          element.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
          element.style.opacity = '1';
          element.style.transform = 'translateY(0)';
        }, index * 100);
      });
    }

    /**
     * Destroy module
     */
    destroy() {
      if (this.eventBus) {
        this.eventBus.off('filter:change', this.handleFilterChange.bind(this));
        this.eventBus.off('data:corners:updated', this.handleDataUpdate.bind(this));
        this.eventBus.off('view:corners:modeChange', this.handleViewModeChange.bind(this));
      }

      this.initialized = false;
    }
  }

  // Create and export singleton instance
  const cornersDisplay = new CornersDisplay();

  // Auto-initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => cornersDisplay.init());
  } else {
    cornersDisplay.init();
  }

  // Export to global scope
  global.TeamStatsCornersDisplay = cornersDisplay;
})(window);
