/**
 * Form Display Module
 * Handles the visualization and rendering of team form and performance statistics
 * 
 * Features:
 * - Recent form visualization
 * - Performance metrics
 * - Home/Away form comparison
 * - Form trends and patterns
 * - Win/Draw/Loss streaks
 * - Points per game analysis
 * - Interactive form timeline
 */

(function(global) {
  'use strict';

  // Module dependencies check
  const requiredModules = ['TeamStatsEventBus', 'TeamStatsStateManager'];
  const missingModules = requiredModules.filter(module => !global[module]);
  
  if (missingModules.length > 0) {
  }

  class FormDisplay {
    constructor() {
      this.name = 'FormDisplay';
      this.version = '1.0.0';
      this.initialized = false;
      this.config = {
        animationDuration: 300,
        formLength: 5, // Last 5 matches for form
        colors: {
          win: '#22c55e',
          draw: '#f59e0b',
          loss: '#ef4444',
          home: '#06b6d4',
          away: '#8b5cf6',
          positive: '#10b981',
          negative: '#f87171',
          neutral: '#6b7280'
        },
        icons: {
          win: 'W',
          draw: 'D',
          loss: 'L',
          trend: {
            up: '↑',
            down: '↓',
            stable: '→'
          }
        }
      };
      this.state = {
        activeFilter: 'overall',
        timeFrame: 'last10',
        viewMode: 'overview' // overview, detailed, comparison
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
        this.eventBus.on('filter:change', this.handleFilterChange.bind(this));
        this.eventBus.on('data:form:updated', this.handleDataUpdate.bind(this));
        this.eventBus.on('view:form:modeChange', this.handleViewModeChange.bind(this));
      }
    }

    /**
     * Handle filter change
     */
    handleFilterChange(data) {
      if (data.filterType === 'form' || data.filterType === 'venue') {
        this.state.activeFilter = data.value;
        this.eventBus?.emit('form:display:filterChanged', { filter: data.value });
      }
    }

    /**
     * Handle data update
     */
    handleDataUpdate(data) {
    }

    /**
     * Handle view mode change
     */
    handleViewModeChange(mode) {
      this.state.viewMode = mode;
    }

    /**
     * Main render method for form section
     */
    renderFormSection(container, statistics, options = {}) {
      if (!container) {
        return null;
      }

      const {
        filter = 'overall',
        showCharts = true,
        showDetails = true,
        showTimeline = true,
        animated = true
      } = options;

      // Clear container
      this.clearContainer(container);

      // Create main section
      const section = this.createElement('div', {
        className: 'form-section',
        parent: container
      });

      // Render overview cards
      this.renderOverviewCards(section, statistics, filter);

      // Render form string
      this.renderFormString(section, statistics, filter);

      // Render performance chart
      if (showCharts) {
        this.renderPerformanceChart(section, statistics, filter);
      }

      // Render detailed statistics
      if (showDetails) {
        this.renderDetailedStats(section, statistics, filter);
      }

      // Render form timeline
      if (showTimeline) {
        this.renderFormTimeline(section, statistics, filter);
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
        className: 'form-overview-cards',
        parent: container
      });

      // Calculate statistics based on filter
      const stats = this.calculateFormStats(statistics, filter);

      // Points Per Game card
      this.createOverviewCard(cardsContainer, {
        icon: '📊',
        value: stats.ppg.toFixed(2),
        label: 'Points Per Game',
        subtitle: `${stats.points} pts from ${stats.matches} matches`,
        trend: this.calculateTrend(stats.ppg, stats.leagueAvgPPG),
        valueColor: this.getPPGColor(stats.ppg)
      });

      // Win Rate card
      this.createOverviewCard(cardsContainer, {
        icon: '🏆',
        value: `${stats.winRate}%`,
        label: 'Win Rate',
        subtitle: `${stats.wins} wins`,
        trend: this.calculateTrend(stats.winRate, stats.leagueAvgWinRate),
        valueColor: this.getWinRateColor(stats.winRate)
      });

      // Current Streak card
      this.createOverviewCard(cardsContainer, {
        icon: '🔥',
        value: stats.currentStreak.count,
        label: `Current ${stats.currentStreak.type} Streak`,
        subtitle: stats.currentStreak.description,
        valueColor: this.getStreakColor(stats.currentStreak.type)
      });

      // Form Rating card
      this.createOverviewCard(cardsContainer, {
        icon: '📈',
        value: stats.formRating,
        label: 'Form Rating',
        subtitle: stats.formDescription,
        valueColor: this.getFormRatingColor(stats.formRating)
      });
    }

    /**
     * Create overview card
     */
    createOverviewCard(container, data) {
      const card = this.createElement('div', {
        className: 'form-overview-card',
        parent: container
      });

      // Icon
      this.createElement('div', {
        className: 'card-icon',
        textContent: data.icon,
        parent: card
      });

      // Value
      const valueColor = data.valueColor || '#1f2937';
      this.createElement('div', {
        className: 'stat-value',
        textContent: data.value,
        style: { color: valueColor },
        parent: card
      });

      // Label
      this.createElement('div', {
        className: 'stat-label',
        textContent: data.label,
        parent: card
      });

      // Subtitle
      if (data.subtitle) {
        this.createElement('div', {
          className: 'stat-subtitle',
          textContent: data.subtitle,
          parent: card
        });
      }

      // Trend indicator
      if (data.trend) {
        const trendClass = data.trend === 'up' ? 'trend-up' : data.trend === 'down' ? 'trend-down' : 'trend-stable';
        const trendIcon = this.config.icons.trend[data.trend] || '→';
        this.createElement('div', {
          className: `trend-indicator ${trendClass}`,
          textContent: trendIcon,
          parent: card
        });
      }

      return card;
    }

    /**
     * Render form string visualization
     */
    renderFormString(container, statistics, filter) {
      const formWrapper = this.createElement('div', {
        className: 'form-string-wrapper',
        parent: container
      });

      this.createElement('h3', {
        className: 'form-title',
        textContent: 'Recent Form',
        parent: formWrapper
      });

      const formContainer = this.createElement('div', {
        className: 'form-string-container',
        parent: formWrapper
      });

      // Get form string
      const formString = this.getFormString(statistics, filter);
      
      // Render each match result
      formString.split('').forEach((result, index) => {
        const resultElement = this.createElement('div', {
          className: `form-result form-${result.toLowerCase()}`,
          parent: formContainer
        });

        // Result circle
        const circle = this.createElement('div', {
          className: 'result-circle',
          textContent: result,
          style: {
            backgroundColor: this.getResultColor(result),
            color: 'white',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            fontSize: '16px',
            margin: '0 5px',
            opacity: '0',
            transform: 'scale(0)',
            animation: `popIn 0.3s ease ${index * 0.1}s forwards`
          },
          parent: resultElement
        });

        // Match details (on hover)
        const tooltip = this.createElement('div', {
          className: 'result-tooltip',
          innerHTML: this.getMatchTooltip(statistics, filter, formString.length - index - 1),
          parent: resultElement
        });
      });

      // Add legend
      this.renderFormLegend(formWrapper);
    }

    /**
     * Render form legend
     */
    renderFormLegend(container) {
      const legend = this.createElement('div', {
        className: 'form-legend',
        parent: container
      });

      const legendItems = [
        { symbol: 'W', label: 'Win', color: this.config.colors.win },
        { symbol: 'D', label: 'Draw', color: this.config.colors.draw },
        { symbol: 'L', label: 'Loss', color: this.config.colors.loss }
      ];

      legendItems.forEach(item => {
        const legendItem = this.createElement('div', {
          className: 'legend-item',
          parent: legend
        });

        this.createElement('span', {
          className: 'legend-symbol',
          textContent: item.symbol,
          style: {
            backgroundColor: item.color,
            color: 'white',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            marginRight: '5px'
          },
          parent: legendItem
        });

        this.createElement('span', {
          textContent: item.label,
          parent: legendItem
        });
      });
    }

    /**
     * Render performance chart
     */
    renderPerformanceChart(container, statistics, filter) {
      const chartWrapper = this.createElement('div', {
        className: 'performance-chart-wrapper',
        parent: container
      });

      this.createElement('h3', {
        className: 'chart-title',
        textContent: 'Points Progression',
        parent: chartWrapper
      });

      const chartContainer = this.createElement('div', {
        className: 'line-chart-container',
        parent: chartWrapper
      });

      // Get matches data
      const matches = this.getFilteredMatches(statistics, filter);
      if (!matches || matches.length === 0) {
        this.createElement('p', {
          className: 'no-data-message',
          textContent: 'No match data available',
          parent: chartContainer
        });
        return;
      }

      // Calculate cumulative points
      const pointsData = this.calculateCumulativePoints(matches);
      
      // Create simple line chart
      this.renderLineChart(chartContainer, pointsData);
    }

    /**
     * Render line chart
     */
    renderLineChart(container, data) {
      const maxPoints = Math.max(...data.map(d => d.cumulative));
      const chartHeight = 200;
      const chartWidth = container.offsetWidth || 600;
      const padding = 40;

      // Create SVG
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', chartWidth);
      svg.setAttribute('height', chartHeight);
      svg.style.width = '100%';
      svg.style.height = `${chartHeight}px`;

      // Create path
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const pathData = data.map((point, index) => {
        const x = (index / (data.length - 1)) * (chartWidth - 2 * padding) + padding;
        const y = chartHeight - ((point.cumulative / maxPoints) * (chartHeight - 2 * padding) + padding);
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
      }).join(' ');

      path.setAttribute('d', pathData);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', this.config.colors.home);
      path.setAttribute('stroke-width', '2');

      // Add points
      data.forEach((point, index) => {
        const x = (index / (data.length - 1)) * (chartWidth - 2 * padding) + padding;
        const y = chartHeight - ((point.cumulative / maxPoints) * (chartHeight - 2 * padding) + padding);

        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', x);
        circle.setAttribute('cy', y);
        circle.setAttribute('r', '4');
        circle.setAttribute('fill', this.getResultColor(point.result));
        circle.setAttribute('stroke', 'white');
        circle.setAttribute('stroke-width', '2');

        svg.appendChild(circle);
      });

      svg.appendChild(path);
      container.appendChild(svg);
    }

    /**
     * Render detailed statistics
     */
    renderDetailedStats(container, statistics, filter) {
      const detailsGrid = this.createElement('div', {
        className: 'form-details-grid',
        parent: container
      });

      // Results breakdown
      this.renderResultsBreakdown(detailsGrid, statistics, filter);

      // Streaks analysis
      this.renderStreaksAnalysis(detailsGrid, statistics, filter);

      // Home vs Away comparison
      this.renderVenueComparison(detailsGrid, statistics);

      // Goals form
      this.renderGoalsForm(detailsGrid, statistics, filter);
    }

    /**
     * Render results breakdown
     */
    renderResultsBreakdown(container, statistics, filter) {
      const card = this.createElement('div', {
        className: 'detail-card',
        parent: container
      });

      this.createElement('h4', {
        className: 'detail-card-title',
        textContent: 'Results Breakdown',
        parent: card
      });

      const stats = this.calculateResultsBreakdown(statistics, filter);

      // Wins
      this.createStatRow(card, 'Wins', `${stats.wins} (${stats.winPercentage}%)`, {
        progressBar: true,
        percentage: stats.winPercentage,
        color: this.config.colors.win
      });

      // Draws
      this.createStatRow(card, 'Draws', `${stats.draws} (${stats.drawPercentage}%)`, {
        progressBar: true,
        percentage: stats.drawPercentage,
        color: this.config.colors.draw
      });

      // Losses
      this.createStatRow(card, 'Losses', `${stats.losses} (${stats.lossPercentage}%)`, {
        progressBar: true,
        percentage: stats.lossPercentage,
        color: this.config.colors.loss
      });

      // Points efficiency
      const efficiency = this.createElement('div', {
        className: 'stat-row highlight',
        parent: card
      });
      this.createElement('span', {
        textContent: 'Points Efficiency',
        parent: efficiency
      });
      this.createElement('span', {
        className: 'stat-value',
        textContent: `${stats.pointsEfficiency}% of possible points`,
        parent: efficiency
      });
    }

    /**
     * Render streaks analysis
     */
    renderStreaksAnalysis(container, statistics, filter) {
      const card = this.createElement('div', {
        className: 'detail-card',
        parent: container
      });

      this.createElement('h4', {
        className: 'detail-card-title',
        textContent: 'Streaks Analysis',
        parent: card
      });

      const streaks = this.analyzeStreaks(statistics, filter);

      // Current streak
      this.createStatRow(card, 'Current Streak', 
        `${streaks.current.count} ${streaks.current.type}${streaks.current.count > 1 ? 's' : ''}`);

      // Longest win streak
      this.createStatRow(card, 'Longest Win Streak', streaks.longestWin);

      // Longest unbeaten
      this.createStatRow(card, 'Longest Unbeaten', streaks.longestUnbeaten);

      // Longest without win
      this.createStatRow(card, 'Longest Without Win', streaks.longestWithoutWin);
    }

    /**
     * Render venue comparison
     */
    renderVenueComparison(container, statistics) {
      const card = this.createElement('div', {
        className: 'detail-card',
        parent: container
      });

      this.createElement('h4', {
        className: 'detail-card-title',
        textContent: 'Home vs Away Form',
        parent: card
      });

      // Home PPG
      const homePPG = statistics.homePointsPerGame || 0;
      const awayPPG = statistics.awayPointsPerGame || 0;

      this.createStatRow(card, 'Home PPG', homePPG.toFixed(2), {
        progressBar: true,
        percentage: (homePPG / 3) * 100,
        color: this.config.colors.home
      });

      // Away PPG
      this.createStatRow(card, 'Away PPG', awayPPG.toFixed(2), {
        progressBar: true,
        percentage: (awayPPG / 3) * 100,
        color: this.config.colors.away
      });

      // Home form
      const homeForm = statistics.homeForm || '';
      this.createElement('div', {
        className: 'venue-form-row',
        innerHTML: `<span>Home Form:</span> ${this.renderMiniForm(homeForm)}`,
        parent: card
      });

      // Away form
      const awayForm = statistics.awayForm || '';
      this.createElement('div', {
        className: 'venue-form-row',
        innerHTML: `<span>Away Form:</span> ${this.renderMiniForm(awayForm)}`,
        parent: card
      });
    }

    /**
     * Render goals form
     */
    renderGoalsForm(container, statistics, filter) {
      const card = this.createElement('div', {
        className: 'detail-card',
        parent: container
      });

      this.createElement('h4', {
        className: 'detail-card-title',
        textContent: 'Goals Form',
        parent: card
      });

      const goalsStats = this.calculateGoalsForm(statistics, filter);

      // Scoring form
      this.createStatRow(card, 'Matches Scored', 
        `${goalsStats.matchesScored}/${goalsStats.matches} (${goalsStats.scoringPercentage}%)`);

      // Goals per match when scoring
      this.createStatRow(card, 'Goals When Scoring', 
        `${goalsStats.goalsWhenScoring.toFixed(2)} per match`);

      // Clean sheets
      this.createStatRow(card, 'Clean Sheets', 
        `${goalsStats.cleanSheets} (${goalsStats.cleanSheetPercentage}%)`);

      // Both teams scored
      this.createStatRow(card, 'Both Teams Scored', 
        `${goalsStats.btts} (${goalsStats.bttsPercentage}%)`);
    }

    /**
     * Render form timeline
     */
    renderFormTimeline(container, statistics, filter) {
      const timelineCard = this.createElement('div', {
        className: 'form-timeline-card',
        parent: container
      });

      this.createElement('h3', {
        className: 'timeline-title',
        textContent: '📅 Match Timeline',
        parent: timelineCard
      });

      const matches = this.getFilteredMatches(statistics, filter);
      const recentMatches = matches.slice(-10).reverse(); // Last 10 matches, newest first

      const timeline = this.createElement('div', {
        className: 'form-timeline',
        parent: timelineCard
      });

      recentMatches.forEach((match, index) => {
        const matchElement = this.createElement('div', {
          className: 'timeline-match',
          parent: timeline
        });

        // Date
        this.createElement('div', {
          className: 'match-date',
          textContent: this.formatMatchDate(match.date),
          parent: matchElement
        });

        // Match info
        const matchInfo = this.createElement('div', {
          className: 'match-info',
          parent: matchElement
        });

        // Teams
        this.createElement('div', {
          className: 'match-teams',
          textContent: `${match.homeTeam.name} ${match.homeScore} - ${match.awayScore} ${match.awayTeam.name}`,
          parent: matchInfo
        });

        // Result indicator
        const result = this.getMatchResult(match, statistics.teamId);
        const resultBadge = this.createElement('div', {
          className: 'result-badge',
          textContent: result,
          style: {
            backgroundColor: this.getResultColor(result),
            color: 'white',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 'bold'
          },
          parent: matchInfo
        });

        // Animation
        matchElement.style.opacity = '0';
        matchElement.style.transform = 'translateX(-20px)';
        setTimeout(() => {
          matchElement.style.transition = 'all 0.3s ease';
          matchElement.style.opacity = '1';
          matchElement.style.transform = 'translateX(0)';
        }, index * 50);
      });
    }

    /**
     * Helper: Create stat row
     */
    createStatRow(container, label, value, options = {}) {
      const row = this.createElement('div', {
        className: 'stat-row',
        parent: container
      });

      this.createElement('span', {
        textContent: label,
        parent: row
      });

      if (options.progressBar) {
        const progressContainer = this.createElement('div', {
          className: 'progress-container',
          parent: row
        });

        const progressBar = this.createElement('div', {
          className: 'progress-bar',
          parent: progressContainer
        });

        const progressFill = this.createElement('div', {
          className: 'progress-fill',
          style: {
            width: '0%',
            backgroundColor: options.color || '#3b82f6',
            transition: 'width 0.5s ease'
          },
          parent: progressBar
        });

        // Animate progress
        setTimeout(() => {
          progressFill.style.width = `${Math.min(options.percentage, 100)}%`;
        }, 100);
      }

      this.createElement('span', {
        className: 'stat-value',
        textContent: value,
        parent: row
      });
    }

    /**
     * Calculate form statistics
     */
    calculateFormStats(statistics, filter) {
      const suffix = filter === 'home' ? '_home' : filter === 'away' ? '_away' : '';
      
      const matches = statistics[`matches${suffix}`] || statistics[`${filter}Matches`] || statistics.totalMatches || statistics.matches || 0;
      const wins = statistics[`wins${suffix}`] || statistics[`${filter}Wins`] || statistics.wins || 0;
      const draws = statistics[`draws${suffix}`] || statistics[`${filter}Draws`] || statistics.draws || 0;
      const losses = statistics[`losses${suffix}`] || statistics[`${filter}Losses`] || statistics.losses || 0;
      const points = statistics[`points${suffix}`] || statistics[`${filter}Points`] || statistics.points || 0;
      const ppg = statistics[`pointsPerGame${suffix}`] || statistics[`${filter}PointsPerGame`] || statistics.pointsPerGame || 0;

      // Get form string
      const formString = this.getFormString(statistics, filter);
      const currentStreak = this.getCurrentStreak(formString);
      const formRating = this.calculateFormRating(formString);

      return {
        matches,
        wins,
        draws,
        losses,
        points,
        ppg,
        winRate: matches > 0 ? Math.round((wins / matches) * 100) : 0,
        currentStreak,
        formRating: formRating.rating,
        formDescription: formRating.description,
        leagueAvgPPG: 1.5, // League average
        leagueAvgWinRate: 35
      };
    }

    /**
     * Get form string
     */
    getFormString(statistics, filter) {
      if (filter === 'home') {
        return statistics.homeForm || '';
      } else if (filter === 'away') {
        return statistics.awayForm || '';
      }
      return statistics.recentForm || '';
    }

    /**
     * Get current streak
     */
    getCurrentStreak(formString) {
      if (!formString || formString.length === 0) {
        return { type: 'None', count: 0, description: 'No recent matches' };
      }

      const lastResult = formString[formString.length - 1].toUpperCase();
      let count = 0;
      
      // Count consecutive results from the end
      for (let i = formString.length - 1; i >= 0; i--) {
        if (formString[i].toUpperCase() === lastResult) {
          count++;
        } else {
          break;
        }
      }

      const typeMap = {
        'W': 'Win',
        'D': 'Draw',
        'L': 'Loss'
      };

      return {
        type: typeMap[lastResult] || 'Unknown',
        count,
        description: `Last ${count} ${count === 1 ? 'match' : 'matches'}`
      };
    }

    /**
     * Calculate form rating
     */
    calculateFormRating(formString) {
      if (!formString || formString.length === 0) {
        return { rating: 'N/A', description: 'No recent form' };
      }

      const last5 = formString.slice(-5);
      let points = 0;

      last5.split('').forEach(result => {
        if (result.toUpperCase() === 'W') points += 3;
        else if (result.toUpperCase() === 'D') points += 1;
      });

      const percentage = (points / 15) * 100;

      if (percentage >= 80) return { rating: 'A+', description: 'Excellent form' };
      if (percentage >= 65) return { rating: 'A', description: 'Very good form' };
      if (percentage >= 50) return { rating: 'B', description: 'Good form' };
      if (percentage >= 35) return { rating: 'C', description: 'Average form' };
      if (percentage >= 20) return { rating: 'D', description: 'Poor form' };
      return { rating: 'F', description: 'Very poor form' };
    }

    /**
     * Get result color
     */
    getResultColor(result) {
      const upperResult = result.toUpperCase();
      if (upperResult === 'W') return this.config.colors.win;
      if (upperResult === 'D') return this.config.colors.draw;
      if (upperResult === 'L') return this.config.colors.loss;
      return this.config.colors.neutral;
    }

    /**
     * Get PPG color
     */
    getPPGColor(ppg) {
      if (ppg >= 2.0) return this.config.colors.positive;
      if (ppg >= 1.5) return this.config.colors.win;
      if (ppg >= 1.0) return this.config.colors.draw;
      return this.config.colors.negative;
    }

    /**
     * Get win rate color
     */
    getWinRateColor(winRate) {
      if (winRate >= 60) return this.config.colors.positive;
      if (winRate >= 40) return this.config.colors.win;
      if (winRate >= 25) return this.config.colors.draw;
      return this.config.colors.negative;
    }

    /**
     * Get streak color
     */
    getStreakColor(streakType) {
      if (streakType === 'Win') return this.config.colors.win;
      if (streakType === 'Draw') return this.config.colors.draw;
      if (streakType === 'Loss') return this.config.colors.loss;
      return this.config.colors.neutral;
    }

    /**
     * Get form rating color
     */
    getFormRatingColor(rating) {
      const ratingColors = {
        'A+': this.config.colors.positive,
        'A': this.config.colors.win,
        'B': '#06b6d4',
        'C': this.config.colors.draw,
        'D': '#f97316',
        'F': this.config.colors.loss
      };
      return ratingColors[rating] || this.config.colors.neutral;
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
     * Get filtered matches
     */
    getFilteredMatches(statistics, filter) {
      const allMatches = statistics.allMatches || statistics.recentMatches || [];
      
      if (filter === 'home') {
        return allMatches.filter(m => m.homeTeam.id === statistics.teamId);
      } else if (filter === 'away') {
        return allMatches.filter(m => m.awayTeam.id === statistics.teamId);
      }
      
      return allMatches;
    }

    /**
     * Get match result
     */
    getMatchResult(match, teamId) {
      const isHome = match.homeTeam.id === teamId;
      const teamScore = isHome ? match.homeScore : match.awayScore;
      const oppScore = isHome ? match.awayScore : match.homeScore;
      
      if (teamScore > oppScore) return 'W';
      if (teamScore < oppScore) return 'L';
      return 'D';
    }

    /**
     * Get match tooltip
     */
    getMatchTooltip(statistics, filter, matchIndex) {
      const matches = this.getFilteredMatches(statistics, filter);
      const match = matches[matches.length - 1 - matchIndex];
      
      if (!match) return '';
      
      return `
        <div class="tooltip-content">
          <div>${this.formatMatchDate(match.date)}</div>
          <div>${match.homeTeam.name} ${match.homeScore} - ${match.awayScore} ${match.awayTeam.name}</div>
        </div>
      `;
    }

    /**
     * Format match date
     */
    formatMatchDate(dateString) {
      const date = new Date(dateString);
      const day = date.getDate();
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    }

    /**
     * Calculate cumulative points
     */
    calculateCumulativePoints(matches) {
      let cumulative = 0;
      return matches.map(match => {
        const result = this.getMatchResult(match, match.homeTeam.id);
        if (result === 'W') cumulative += 3;
        else if (result === 'D') cumulative += 1;
        
        return {
          match,
          result,
          points: result === 'W' ? 3 : result === 'D' ? 1 : 0,
          cumulative
        };
      });
    }

    /**
     * Calculate results breakdown
     */
    calculateResultsBreakdown(statistics, filter) {
      const suffix = filter === 'home' ? '_home' : filter === 'away' ? '_away' : '';
      
      const matches = statistics[`matches${suffix}`] || statistics[`${filter}Matches`] || statistics.totalMatches || 0;
      const wins = statistics[`wins${suffix}`] || statistics[`${filter}Wins`] || statistics.wins || 0;
      const draws = statistics[`draws${suffix}`] || statistics[`${filter}Draws`] || statistics.draws || 0;
      const losses = statistics[`losses${suffix}`] || statistics[`${filter}Losses`] || statistics.losses || 0;
      const points = statistics[`points${suffix}`] || statistics[`${filter}Points`] || statistics.points || 0;

      const maxPossiblePoints = matches * 3;
      const pointsEfficiency = maxPossiblePoints > 0 ? Math.round((points / maxPossiblePoints) * 100) : 0;

      return {
        matches,
        wins,
        draws,
        losses,
        winPercentage: matches > 0 ? Math.round((wins / matches) * 100) : 0,
        drawPercentage: matches > 0 ? Math.round((draws / matches) * 100) : 0,
        lossPercentage: matches > 0 ? Math.round((losses / matches) * 100) : 0,
        pointsEfficiency
      };
    }

    /**
     * Analyze streaks
     */
    analyzeStreaks(statistics, filter) {
      const formString = this.getFormString(statistics, filter);
      const current = this.getCurrentStreak(formString);
      
      // Calculate longest streaks
      let longestWin = 0, longestUnbeaten = 0, longestWithoutWin = 0;
      let currentWin = 0, currentUnbeaten = 0, currentWithoutWin = 0;
      
      formString.split('').forEach(result => {
        const upperResult = result.toUpperCase();
        
        // Win streak
        if (upperResult === 'W') {
          currentWin++;
          currentUnbeaten++;
          currentWithoutWin = 0;
        } else if (upperResult === 'D') {
          currentWin = 0;
          currentUnbeaten++;
          currentWithoutWin++;
        } else {
          currentWin = 0;
          currentUnbeaten = 0;
          currentWithoutWin++;
        }
        
        longestWin = Math.max(longestWin, currentWin);
        longestUnbeaten = Math.max(longestUnbeaten, currentUnbeaten);
        longestWithoutWin = Math.max(longestWithoutWin, currentWithoutWin);
      });
      
      return {
        current,
        longestWin,
        longestUnbeaten,
        longestWithoutWin
      };
    }

    /**
     * Calculate goals form
     */
    calculateGoalsForm(statistics, filter) {
      const suffix = filter === 'home' ? '_home' : filter === 'away' ? '_away' : '';
      
      const matches = statistics[`matches${suffix}`] || statistics[`${filter}Matches`] || statistics.totalMatches || 0;
      const failedToScore = statistics[`failedToScore${suffix}`] || statistics[`${filter}FailedToScore`] || statistics.failedToScore || 0;
      const cleanSheets = statistics[`cleanSheets${suffix}`] || statistics[`${filter}CleanSheets`] || statistics.cleanSheets || 0;
      const btts = statistics[`bothTeamsScored${suffix}`] || statistics[`${filter}BothTeamsScored`] || statistics.bothTeamsScoredPercentage || 0;
      const goalsFor = statistics[`goalsFor${suffix}`] || statistics[`${filter}GoalsFor`] || statistics.goalsFor || 0;
      
      const matchesScored = matches - failedToScore;
      const goalsWhenScoring = matchesScored > 0 ? goalsFor / matchesScored : 0;
      
      return {
        matches,
        matchesScored,
        scoringPercentage: matches > 0 ? Math.round((matchesScored / matches) * 100) : 0,
        goalsWhenScoring,
        cleanSheets,
        cleanSheetPercentage: matches > 0 ? Math.round((cleanSheets / matches) * 100) : 0,
        btts: Math.round((matches * btts) / 100),
        bttsPercentage: btts
      };
    }

    /**
     * Render mini form
     */
    renderMiniForm(formString) {
      if (!formString) return 'No data';
      
      return formString.split('').slice(-5).map(result => {
        const color = this.getResultColor(result);
        return `<span style="
          display: inline-block;
          width: 20px;
          height: 20px;
          line-height: 20px;
          text-align: center;
          background-color: ${color};
          color: white;
          border-radius: 50%;
          margin: 0 2px;
          font-size: 11px;
          font-weight: bold;
        ">${result.toUpperCase()}</span>`;
      }).join('');
    }

    /**
     * Animate section elements
     */
    animateSection(section) {
      const elements = section.querySelectorAll('.form-overview-card, .detail-card, .form-timeline-card');
      
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
        this.eventBus.off('data:form:updated', this.handleDataUpdate.bind(this));
        this.eventBus.off('view:form:modeChange', this.handleViewModeChange.bind(this));
      }

      this.initialized = false;
    }
  }

  // Create and export singleton instance
  const formDisplay = new FormDisplay();
  
  // Auto-initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => formDisplay.init());
  } else {
    formDisplay.init();
  }

  // Export to global scope
  global.TeamStatsFormDisplay = formDisplay;

})(window);