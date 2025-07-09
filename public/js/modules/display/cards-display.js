/**
 * Cards Display Module
 * Handles the visualization and rendering of cards statistics
 *
 * Features:
 * - Cards overview cards
 * - Cards timing charts
 * - Home/Away cards comparison
 * - Cards by period display
 * - Player cards visualization
 * - Referee statistics
 * - Interactive charts and animations
 */

(function (global) {
  'use strict';

  // Module dependencies check
  const requiredModules = [
    'TeamStatsCardsStatistics',
    'TeamStatsEventBus',
    'TeamStatsStateManager',
  ];
  const missingModules = requiredModules.filter(module => !global[module]);

  if (missingModules.length > 0) {
    console.warn('[CardsDisplay] Missing optional modules:', missingModules);
  }

  class CardsDisplay {
    constructor() {
      this.name = 'CardsDisplay';
      this.version = '1.0.0';
      this.initialized = false;
      this.config = {
        animationDuration: 300,
        chartColors: {
          yellow: '#fbbf24',
          red: '#ef4444',
          yellowRed: '#f97316',
          home: '#06b6d4',
          away: '#8b5cf6',
          firstHalf: '#10b981',
          secondHalf: '#3b82f6',
        },
        thresholds: {
          highCards: 3.5,
          lowCards: 2.0,
          highRed: 0.2,
          disciplineIssue: 4.0,
        },
      };
      this.state = {
        activeFilter: 'overall',
        activeTimeFrame: 'all',
        cardType: 'all', // all, yellow, red
        viewMode: 'overview', // overview, timing, players, referees
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
     * Get CardsStatistics module
     */
    get cardsStats() {
      return global.TeamStatsCardsStatistics;
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
     * Initialize the display module
     */
    initialize() {
      if (this.initialized) {
        return;
      }

      this.setupEventListeners();
      this.initialized = true;
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
      // Listen for data updates
      if (this.eventBus) {
        this.eventBus.on('data:cards:updated', data => {
          this.handleDataUpdate(data);
        });

        this.eventBus.on('filters:change', filter => {
          this.handleFilterChange(filter);
        });

        // Listen for initial team data load
        this.eventBus.on('data:team:loaded', data => {
          if (data.data && data.data.statistics) {
            this.lastStatistics = data.data.statistics;
            // Update with current filter
            const currentFilter = this.stateManager?.get('filters.current') || 'overall';
            this.updateCardsStatistics(data.data.statistics, currentFilter);
          }
        });
      }
    }

    /**
     * Render cards statistics section
     */
    renderCardsSection(container, statistics, options = {}) {
      if (!container || !statistics) {
        return;
      }

      const {
        filter = 'overall',
        showCharts = true,
        showDetails = true,
        animated = true,
      } = options;

      // Clear container
      this.clearContainer(container);

      // Create section structure
      const section = this.createSectionStructure(container);

      // Render components
      this.renderOverviewCards(section.overview, statistics, filter);

      if (showCharts) {
        this.renderCardsChart(section.chart, statistics, filter);
      }

      if (showDetails) {
        this.renderCardsDetails(section.details, statistics, filter);
        this.renderCardPatterns(section.patterns, statistics, filter);
      }

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
          className: 'cards-overview-cards',
          parent: container,
        }),
        chart: this.createElement('div', {
          className: 'cards-chart-container',
          parent: container,
        }),
        details: this.createElement('div', {
          className: 'cards-details-grid',
          parent: container,
        }),
        patterns: this.createElement('div', {
          className: 'cards-patterns-analysis',
          parent: container,
        }),
      };

      return structure;
    }

    /**
     * Render overview cards
     */
    renderOverviewCards(container, statistics, filter) {
      // Extract data based on filter
      let totalCards, yellowCards, redCards, cardsPerMatch, matches;

      if (filter === 'home') {
        totalCards = statistics.homeCardsTotal || statistics.homeTotalCards || 0;
        yellowCards = statistics.homeYellowCards || 0;
        redCards = statistics.homeRedCards || 0;
        matches = statistics.homeMatches || 0;
      } else if (filter === 'away') {
        totalCards = statistics.awayCardsTotal || statistics.awayTotalCards || 0;
        yellowCards = statistics.awayYellowCards || 0;
        redCards = statistics.awayRedCards || 0;
        matches = statistics.awayMatches || 0;
      } else {
        totalCards = statistics.cardsTotal || statistics.totalCards || 0;
        yellowCards = statistics.yellowCards || 0;
        redCards = statistics.redCards || 0;
        matches = statistics.matches || statistics.totalMatches || 0;
      }

      // Calculate derived values
      cardsPerMatch = matches > 0 ? (totalCards / matches).toFixed(2) : '0.00';
      const yellowPerMatch = matches > 0 ? (yellowCards / matches).toFixed(2) : '0.00';
      const redPerMatch = matches > 0 ? (redCards / matches).toFixed(2) : '0.00';
      const disciplineRating = this.calculateDisciplineRating(cardsPerMatch);

      const cards = [
        {
          title: 'Total Cards',
          value: totalCards.toString(),
          subtitle: `${cardsPerMatch} per match`,
          color: this.config.chartColors.yellow,
          icon: '🟨',
          trend: this.getDisciplineTrend(cardsPerMatch),
        },
        {
          title: 'Yellow Cards',
          value: yellowCards.toString(),
          subtitle: `${yellowPerMatch} per match`,
          color: this.config.chartColors.yellow,
          icon: '🟡',
          trend: 'stable',
        },
        {
          title: 'Red Cards',
          value: redCards.toString(),
          subtitle: `${redPerMatch} per match`,
          color: this.config.chartColors.red,
          icon: '🔴',
          trend: redCards > 0 ? 'down' : 'stable',
        },
        {
          title: 'Discipline Rating',
          value: disciplineRating.rating,
          subtitle: disciplineRating.description,
          color: disciplineRating.color,
          icon: disciplineRating.icon,
          trend: disciplineRating.trend,
        },
      ];

      const grid = this.createElement('div', {
        className: 'grid grid-cols-2 md:grid-cols-4 gap-4',
        parent: container,
      });

      cards.forEach((card, index) => {
        this.renderOverviewCard(grid, card, index);
      });
    }

    /**
     * Render single overview card
     */
    renderOverviewCard(container, cardData, index) {
      const cardElement = this.createElement('div', {
        className: 'cards-overview-card',
        style: {
          '--card-color': cardData.color,
          'animation-delay': `${index * 100}ms`,
          padding: '1.5rem',
          borderRadius: '0.5rem',
          backgroundColor: 'white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          transition: 'all 0.3s ease',
        },
        parent: container,
      });

      // Add card content
      this.createElement('div', {
        className: 'card-icon',
        innerHTML: cardData.icon,
        style: { fontSize: '2rem', marginBottom: '0.5rem' },
        parent: cardElement,
      });

      this.createElement('div', {
        className: 'stat-value',
        textContent: cardData.value,
        style: { fontSize: '1.5rem', fontWeight: 'bold', color: '#333' },
        parent: cardElement,
      });

      this.createElement('div', {
        className: 'stat-label',
        textContent: cardData.title,
        style: { fontSize: '0.875rem', color: '#666' },
        parent: cardElement,
      });

      if (cardData.subtitle) {
        this.createElement('div', {
          className: 'stat-subtitle',
          textContent: cardData.subtitle,
          style: { fontSize: '0.75rem', color: '#999', marginTop: '0.25rem' },
          parent: cardElement,
        });
      }

      if (cardData.trend) {
        const trendIcon = cardData.trend === 'up' ? '↑' : cardData.trend === 'down' ? '↓' : '→';
        const trendColor =
          cardData.trend === 'up' ? '#ef4444' : cardData.trend === 'down' ? '#10b981' : '#6b7280';
        this.createElement('div', {
          className: 'stat-trend',
          innerHTML: trendIcon,
          style: { color: trendColor, fontSize: '1.2rem', marginTop: '0.25rem' },
          parent: cardElement,
        });
      }

      // Add hover effects
      this.addCardHoverEffects(cardElement);

      return cardElement;
    }

    /**
     * Render cards chart
     */
    renderCardsChart(container, statistics, filter) {
      const chartWrapper = this.createElement('div', {
        className: 'cards-chart-wrapper bg-white rounded-lg shadow-md p-6',
        parent: container,
      });

      // Chart header
      const header = this.createElement('div', {
        className: 'chart-header flex justify-between items-center mb-4',
        parent: chartWrapper,
      });

      this.createElement('h3', {
        className: 'text-lg font-semibold',
        textContent: 'Cards Distribution',
        parent: header,
      });

      // Chart type selector
      this.renderChartTypeSelector(header);

      // Render chart based on type
      const chartData = this.prepareChartData(statistics, filter);

      if (this.state.viewMode === 'timing') {
        this.renderTimingChart(chartWrapper, chartData);
      } else {
        this.renderBarChart(chartWrapper, chartData);
      }
    }

    /**
     * Render bar chart
     */
    renderBarChart(container, data) {
      const chartContainer = this.createElement('div', {
        className: 'bar-chart-container',
        style: {
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-around',
          height: '200px',
          padding: '1rem',
        },
        parent: container,
      });

      const maxValue = Math.max(...data.values, 1);

      data.labels.forEach((label, index) => {
        const value = data.values[index];
        const percentage = (value / maxValue) * 100;
        const barHeight = (percentage / 100) * 180;

        const barWrapper = this.createElement('div', {
          className: 'bar-wrapper',
          style: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.5rem',
          },
          parent: chartContainer,
        });

        const bar = this.createElement('div', {
          className: 'bar',
          style: {
            width: '60px',
            height: `${barHeight}px`,
            backgroundColor: data.colors[index],
            borderRadius: '4px 4px 0 0',
            transition: 'height 0.5s ease-out',
            transitionDelay: `${index * 100}ms`,
          },
          parent: barWrapper,
        });

        // Value label
        this.createElement('div', {
          className: 'bar-value',
          textContent: value,
          style: { fontWeight: 'bold', fontSize: '0.875rem' },
          parent: barWrapper,
        });

        // Label
        this.createElement('div', {
          className: 'bar-label',
          textContent: label,
          style: { fontSize: '0.75rem', textAlign: 'center', color: '#6b7280' },
          parent: barWrapper,
        });
      });
    }

    /**
     * Render cards details
     */
    renderCardsDetails(container, statistics, filter) {
      const grid = this.createElement('div', {
        className: 'grid grid-cols-1 md:grid-cols-2 gap-6',
        parent: container,
      });

      // Cards by period
      this.renderCardsByPeriod(grid, statistics, filter);

      // Cards by type
      this.renderCardsByType(grid, statistics, filter);

      // Team comparison
      this.renderTeamComparison(grid, statistics, filter);

      // Referee statistics
      this.renderRefereeStats(grid, statistics, filter);
    }

    /**
     * Render cards by period
     */
    renderCardsByPeriod(container, statistics, filter) {
      const card = this.createElement('div', {
        className: 'bg-white rounded-lg shadow-md p-6',
        parent: container,
      });

      this.createElement('h4', {
        className: 'text-md font-semibold mb-4',
        textContent: 'Cards by Period',
        parent: card,
      });

      // Extract period data
      const firstHalfCards =
        filter === 'home'
          ? statistics.homeCards1H || 0
          : filter === 'away'
            ? statistics.awayCards1H || 0
            : statistics.cards1H || 0;

      const secondHalfCards =
        filter === 'home'
          ? statistics.homeCards2H || 0
          : filter === 'away'
            ? statistics.awayCards2H || 0
            : statistics.cards2H || 0;

      const items = [
        {
          label: 'First Half',
          value: firstHalfCards,
          icon: '1️⃣',
          color: this.config.chartColors.firstHalf,
        },
        {
          label: 'Second Half',
          value: secondHalfCards,
          icon: '2️⃣',
          color: this.config.chartColors.secondHalf,
        },
        { label: 'Extra Time', value: 0, icon: '⏱️', color: '#6b7280' },
      ];

      const list = this.createElement('div', {
        className: 'space-y-3',
        parent: card,
      });

      items.forEach(item => {
        this.renderPeriodItem(list, item);
      });
    }

    /**
     * Render period item
     */
    renderPeriodItem(container, item) {
      const row = this.createElement('div', {
        className: 'flex items-center justify-between p-2 hover:bg-gray-50 rounded',
        parent: container,
      });

      const label = this.createElement('div', {
        className: 'flex items-center gap-2',
        parent: row,
      });

      this.createElement('span', {
        className: 'text-xl',
        textContent: item.icon,
        parent: label,
      });

      this.createElement('span', {
        className: 'text-sm text-gray-600',
        textContent: item.label,
        parent: label,
      });

      const valueContainer = this.createElement('div', {
        className: 'flex items-center gap-2',
        parent: row,
      });

      this.createElement('span', {
        className: 'font-semibold',
        textContent: item.value.toString(),
        style: { color: item.color },
        parent: valueContainer,
      });

      // Progress bar
      const progressWidth = Math.min((item.value / 10) * 100, 100);
      const progressBg = this.createElement('div', {
        className: 'w-20 bg-gray-200 rounded-full h-2',
        parent: valueContainer,
      });

      this.createElement('div', {
        className: 'h-2 rounded-full transition-all duration-500',
        style: {
          width: `${progressWidth}%`,
          backgroundColor: item.color,
        },
        parent: progressBg,
      });
    }

    /**
     * Render card patterns
     */
    renderCardPatterns(container, statistics, filter) {
      const card = this.createElement('div', {
        className: 'bg-white rounded-lg shadow-md p-6',
        parent: container,
      });

      this.createElement('h3', {
        className: 'text-lg font-semibold mb-4',
        textContent: 'Card Patterns Analysis',
        parent: card,
      });

      // Calculate patterns
      const patterns = this.analyzeCardPatterns(statistics, filter);

      // Render pattern insights
      this.renderPatternInsights(card, patterns);
    }

    /**
     * Analyze card patterns
     */
    analyzeCardPatterns(statistics, filter) {
      const matches =
        filter === 'home'
          ? statistics.homeMatches
          : filter === 'away'
            ? statistics.awayMatches
            : statistics.matches || 0;

      const totalCards =
        filter === 'home'
          ? statistics.homeCardsTotal || 0
          : filter === 'away'
            ? statistics.awayCardsTotal || 0
            : statistics.cardsTotal || 0;

      const cardsPerMatch = matches > 0 ? totalCards / matches : 0;

      return {
        cardsPerMatch,
        disciplineLevel:
          cardsPerMatch > this.config.thresholds.highCards
            ? 'Poor'
            : cardsPerMatch < this.config.thresholds.lowCards
              ? 'Good'
              : 'Average',
        trend: 'stable',
        insights: this.generateCardInsights(statistics, filter),
      };
    }

    /**
     * Generate card insights
     */
    generateCardInsights(statistics, filter) {
      const insights = [];
      const cardsPerMatch = this.getCardsPerMatch(statistics, filter);

      if (cardsPerMatch >= this.config.thresholds.disciplineIssue) {
        insights.push({
          type: 'negative',
          icon: '⚠️',
          text: `High card rate of <strong>${cardsPerMatch.toFixed(2)}</strong> cards per match indicates discipline issues`,
        });
      } else if (cardsPerMatch <= this.config.thresholds.lowCards) {
        insights.push({
          type: 'positive',
          icon: '✅',
          text: `Excellent discipline with only <strong>${cardsPerMatch.toFixed(2)}</strong> cards per match`,
        });
      }

      const redCards =
        filter === 'home'
          ? statistics.homeRedCards || 0
          : filter === 'away'
            ? statistics.awayRedCards || 0
            : statistics.redCards || 0;

      if (redCards > 0) {
        insights.push({
          type: 'negative',
          icon: '🔴',
          text: `<strong>${redCards}</strong> red card${redCards > 1 ? 's' : ''} received this season`,
        });
      }

      return insights;
    }

    /**
     * Render pattern insights
     */
    renderPatternInsights(container, patterns) {
      const insightsList = this.createElement('div', {
        className: 'space-y-3',
        parent: container,
      });

      patterns.insights.forEach(insight => {
        const item = this.createElement('div', {
          className: `p-3 rounded-lg ${insight.type === 'positive' ? 'bg-green-50' : 'bg-red-50'}`,
          parent: insightsList,
        });

        this.createElement('p', {
          className: `text-sm ${insight.type === 'positive' ? 'text-green-700' : 'text-red-700'}`,
          innerHTML: `${insight.icon} ${insight.text}`,
          parent: item,
        });
      });

      // Add summary
      const summary = this.createElement('div', {
        className: 'mt-4 p-4 bg-gray-50 rounded-lg',
        parent: container,
      });

      this.createElement('p', {
        className: 'text-sm text-gray-700',
        innerHTML: `Overall discipline level: <strong>${patterns.disciplineLevel}</strong> (${patterns.cardsPerMatch.toFixed(2)} cards/match)`,
        parent: summary,
      });
    }

    /**
     * Helper methods
     */
    calculateDisciplineRating(cardsPerMatch) {
      const cpm = parseFloat(cardsPerMatch);

      if (cpm <= 2.0) {
        return {
          rating: 'A+',
          description: 'Excellent discipline',
          color: '#10b981',
          icon: '⭐',
          trend: 'stable',
        };
      } else if (cpm <= 3.0) {
        return {
          rating: 'B',
          description: 'Good discipline',
          color: '#3b82f6',
          icon: '👍',
          trend: 'stable',
        };
      } else if (cpm <= 4.0) {
        return {
          rating: 'C',
          description: 'Average discipline',
          color: '#f59e0b',
          icon: '⚠️',
          trend: 'down',
        };
      } else {
        return {
          rating: 'D',
          description: 'Poor discipline',
          color: '#ef4444',
          icon: '❌',
          trend: 'down',
        };
      }
    }

    getDisciplineTrend(cardsPerMatch) {
      const cpm = parseFloat(cardsPerMatch);
      if (cpm > this.config.thresholds.highCards) return 'up';
      if (cpm < this.config.thresholds.lowCards) return 'down';
      return 'stable';
    }

    getCardsPerMatch(statistics, filter) {
      const matches =
        filter === 'home'
          ? statistics.homeMatches
          : filter === 'away'
            ? statistics.awayMatches
            : statistics.matches || 0;

      const totalCards =
        filter === 'home'
          ? statistics.homeCardsTotal || 0
          : filter === 'away'
            ? statistics.awayCardsTotal || 0
            : statistics.cardsTotal || 0;

      return matches > 0 ? totalCards / matches : 0;
    }

    prepareChartData(statistics, filter) {
      if (this.state.viewMode === 'timing') {
        return {
          labels: ['0-15', '16-30', '31-45', '46-60', '61-75', '76-90'],
          values: [2, 3, 4, 5, 4, 6], // Example timing data
          colors: Array(6).fill(this.config.chartColors.yellow),
        };
      } else {
        return {
          labels: ['Yellow', 'Red', 'Second Yellow'],
          values: [
            statistics.yellowCards || 0,
            statistics.redCards || 0,
            statistics.secondYellowCards || 0,
          ],
          colors: [
            this.config.chartColors.yellow,
            this.config.chartColors.red,
            this.config.chartColors.yellowRed,
          ],
        };
      }
    }

    renderChartTypeSelector(container) {
      const selector = this.createElement('div', {
        className: 'flex gap-2',
        parent: container,
      });

      const types = [
        { value: 'overview', label: 'Overview' },
        { value: 'timing', label: 'Timing' },
      ];

      types.forEach(type => {
        const button = this.createElement('button', {
          className: `px-3 py-1 rounded text-sm ${this.state.viewMode === type.value ? 'bg-blue-500 text-white' : 'bg-gray-200'}`,
          textContent: type.label,
          parent: selector,
        });

        button.addEventListener('click', () => {
          this.state.viewMode = type.value;
          // Re-render chart
          const chartContainer = container.parentElement.querySelector('.cards-chart-wrapper');
          if (chartContainer) {
            this.clearContainer(chartContainer);
            this.renderCardsChart(
              chartContainer.parentElement,
              this.lastStatistics,
              this.lastFilter
            );
          }
        });
      });
    }

    renderTimingChart(container, data) {
      const chartContainer = this.createElement('div', {
        className: 'timing-chart-container',
        style: {
          padding: '1rem',
        },
        parent: container,
      });

      this.createElement('h4', {
        className: 'text-sm text-gray-600 mb-4',
        textContent: 'Cards by Time Period (minutes)',
        parent: chartContainer,
      });

      const barsContainer = this.createElement('div', {
        className: 'flex items-end justify-between',
        style: { height: '150px' },
        parent: chartContainer,
      });

      data.labels.forEach((label, index) => {
        const value = data.values[index];
        const maxValue = Math.max(...data.values, 1);
        const height = (value / maxValue) * 100;

        const bar = this.createElement('div', {
          className: 'flex flex-col items-center',
          style: { flex: 1 },
          parent: barsContainer,
        });

        this.createElement('div', {
          className: 'text-xs font-semibold mb-1',
          textContent: value,
          parent: bar,
        });

        this.createElement('div', {
          className: 'w-full mx-1',
          style: {
            height: `${height}%`,
            backgroundColor: data.colors[index],
            borderRadius: '4px 4px 0 0',
            transition: 'height 0.5s ease-out',
            transitionDelay: `${index * 50}ms`,
          },
          parent: bar,
        });

        this.createElement('div', {
          className: 'text-xs text-gray-600 mt-1',
          textContent: label,
          parent: bar,
        });
      });
    }

    renderCardsByType(container, statistics, filter) {
      const card = this.createElement('div', {
        className: 'bg-white rounded-lg shadow-md p-6',
        parent: container,
      });

      this.createElement('h4', {
        className: 'text-md font-semibold mb-4',
        textContent: 'Cards by Type',
        parent: card,
      });

      const yellowCards =
        filter === 'home'
          ? statistics.homeYellowCards || 0
          : filter === 'away'
            ? statistics.awayYellowCards || 0
            : statistics.yellowCards || 0;

      const redCards =
        filter === 'home'
          ? statistics.homeRedCards || 0
          : filter === 'away'
            ? statistics.awayRedCards || 0
            : statistics.redCards || 0;

      const total = yellowCards + redCards;
      const yellowPercentage = total > 0 ? Math.round((yellowCards / total) * 100) : 0;
      const redPercentage = total > 0 ? Math.round((redCards / total) * 100) : 0;

      // Pie chart representation
      const pieContainer = this.createElement('div', {
        className: 'flex justify-center mb-4',
        parent: card,
      });

      const pieSize = 120;
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', pieSize);
      svg.setAttribute('height', pieSize);
      svg.setAttribute('viewBox', `0 0 ${pieSize} ${pieSize}`);
      pieContainer.appendChild(svg);

      // Draw pie slices
      if (total > 0) {
        let currentAngle = -90;

        // Yellow slice
        if (yellowCards > 0) {
          const yellowAngle = (yellowCards / total) * 360;
          this.drawPieSlice(
            svg,
            pieSize / 2,
            pieSize / 2,
            pieSize / 2 - 10,
            currentAngle,
            currentAngle + yellowAngle,
            this.config.chartColors.yellow
          );
          currentAngle += yellowAngle;
        }

        // Red slice
        if (redCards > 0) {
          const redAngle = (redCards / total) * 360;
          this.drawPieSlice(
            svg,
            pieSize / 2,
            pieSize / 2,
            pieSize / 2 - 10,
            currentAngle,
            currentAngle + redAngle,
            this.config.chartColors.red
          );
        }
      } else {
        // Empty state
        this.drawPieSlice(svg, pieSize / 2, pieSize / 2, pieSize / 2 - 10, 0, 360, '#e5e7eb');
      }

      // Legend
      const legend = this.createElement('div', {
        className: 'space-y-2',
        parent: card,
      });

      [
        {
          label: 'Yellow Cards',
          value: yellowCards,
          percentage: yellowPercentage,
          color: this.config.chartColors.yellow,
        },
        {
          label: 'Red Cards',
          value: redCards,
          percentage: redPercentage,
          color: this.config.chartColors.red,
        },
      ].forEach(item => {
        const row = this.createElement('div', {
          className: 'flex items-center justify-between',
          parent: legend,
        });

        const labelDiv = this.createElement('div', {
          className: 'flex items-center gap-2',
          parent: row,
        });

        this.createElement('div', {
          className: 'w-3 h-3 rounded',
          style: { backgroundColor: item.color },
          parent: labelDiv,
        });

        this.createElement('span', {
          className: 'text-sm text-gray-600',
          textContent: item.label,
          parent: labelDiv,
        });

        this.createElement('span', {
          className: 'text-sm font-semibold',
          textContent: `${item.value} (${item.percentage}%)`,
          parent: row,
        });
      });
    }

    drawPieSlice(svg, cx, cy, r, startAngle, endAngle, color) {
      const start = this.polarToCartesian(cx, cy, r, endAngle);
      const end = this.polarToCartesian(cx, cy, r, startAngle);
      const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

      const d = [
        'M',
        cx,
        cy,
        'L',
        start.x,
        start.y,
        'A',
        r,
        r,
        0,
        largeArcFlag,
        0,
        end.x,
        end.y,
        'Z',
      ].join(' ');

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d);
      path.setAttribute('fill', color);
      path.setAttribute('stroke', 'white');
      path.setAttribute('stroke-width', '2');
      svg.appendChild(path);
    }

    polarToCartesian(centerX, centerY, radius, angleInDegrees) {
      const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
      return {
        x: centerX + radius * Math.cos(angleInRadians),
        y: centerY + radius * Math.sin(angleInRadians),
      };
    }

    renderTeamComparison(container, statistics, filter) {
      const card = this.createElement('div', {
        className: 'bg-white rounded-lg shadow-md p-6',
        parent: container,
      });

      this.createElement('h4', {
        className: 'text-md font-semibold mb-4',
        textContent: 'Team vs Opponents',
        parent: card,
      });

      const teamCards = statistics.cardsFor || statistics.teamCards || 0;
      const opponentCards = statistics.cardsAgainst || statistics.opponentCards || 0;

      const items = [
        { label: 'Team Cards', value: teamCards, color: this.config.chartColors.home },
        { label: 'Opponent Cards', value: opponentCards, color: this.config.chartColors.away },
      ];

      items.forEach(item => {
        const row = this.createElement('div', {
          className: 'mb-4',
          parent: card,
        });

        const header = this.createElement('div', {
          className: 'flex justify-between mb-1',
          parent: row,
        });

        this.createElement('span', {
          className: 'text-sm text-gray-600',
          textContent: item.label,
          parent: header,
        });

        this.createElement('span', {
          className: 'text-sm font-semibold',
          textContent: item.value,
          parent: header,
        });

        const progressBg = this.createElement('div', {
          className: 'w-full bg-gray-200 rounded-full h-2',
          parent: row,
        });

        const maxCards = Math.max(teamCards, opponentCards, 1);
        const width = (item.value / maxCards) * 100;

        this.createElement('div', {
          className: 'h-2 rounded-full transition-all duration-500',
          style: {
            width: `${width}%`,
            backgroundColor: item.color,
          },
          parent: progressBg,
        });
      });
    }

    renderRefereeStats(container, statistics, filter) {
      const card = this.createElement('div', {
        className: 'bg-white rounded-lg shadow-md p-6',
        parent: container,
      });

      this.createElement('h4', {
        className: 'text-md font-semibold mb-4',
        textContent: 'Common Referees',
        parent: card,
      });

      // Mock referee data - in real implementation, this would come from statistics
      const referees = [
        { name: 'John Smith', matches: 5, cards: 12, avgCards: 2.4 },
        { name: 'Mike Johnson', matches: 4, cards: 15, avgCards: 3.75 },
        { name: 'David Williams', matches: 3, cards: 7, avgCards: 2.33 },
      ];

      const table = this.createElement('div', {
        className: 'overflow-x-auto',
        parent: card,
      });

      const tableElement = this.createElement('table', {
        className: 'min-w-full text-sm',
        parent: table,
      });

      // Header
      const thead = this.createElement('thead', {
        parent: tableElement,
      });

      const headerRow = this.createElement('tr', {
        parent: thead,
      });

      ['Referee', 'Matches', 'Cards', 'Avg'].forEach(header => {
        this.createElement('th', {
          className: 'text-left p-2 text-gray-600',
          textContent: header,
          parent: headerRow,
        });
      });

      // Body
      const tbody = this.createElement('tbody', {
        parent: tableElement,
      });

      referees.forEach(ref => {
        const row = this.createElement('tr', {
          className: 'border-t',
          parent: tbody,
        });

        this.createElement('td', {
          className: 'p-2',
          textContent: ref.name,
          parent: row,
        });

        this.createElement('td', {
          className: 'p-2',
          textContent: ref.matches,
          parent: row,
        });

        this.createElement('td', {
          className: 'p-2',
          textContent: ref.cards,
          parent: row,
        });

        this.createElement('td', {
          className: 'p-2 font-semibold',
          textContent: ref.avgCards.toFixed(2),
          style: { color: ref.avgCards > 3 ? '#ef4444' : '#10b981' },
          parent: row,
        });
      });
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
        card.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
      });
    }

    /**
     * Animate section
     */
    animateSection(section) {
      const elements = section.container.querySelectorAll(
        '.cards-overview-card, .bar, .timing-bar'
      );

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
     * Handle data update
     */
    handleDataUpdate(data) {
      // Store for re-rendering
      this.lastStatistics = data.statistics;
      this.lastFilter = data.filter;
    }

    /**
     * Handle filter change
     */
    handleFilterChange(filter) {
      // Handle both direct filter value and object with value property
      const filterValue =
        typeof filter === 'string' ? filter : filter.value || filter.venue || 'overall';
      this.state.activeFilter = filterValue;

      // Update card statistics if data exists
      if (this.lastStatistics) {
        this.updateCardsStatistics(this.lastStatistics, filterValue);
      }
    }

    /**
     * Update cards statistics based on filter
     */
    updateCardsStatistics(statistics, filter) {
      // Update Card & Discipline Statistics section
      this.updateCardDisciplineSection(statistics, filter);

      // Update Match Cards section
      this.updateMatchCardsSection(statistics, filter);

      // Update Team Cards section
      this.updateTeamCardsSection(statistics, filter);

      // Update Cards Over percentages
      this.updateCardsOverSection(statistics, filter);

      // Update Cards top stats
      this.updateCardsTopStats(statistics, filter);
    }

    /**
     * Update Card & Discipline Statistics section
     */
    updateCardDisciplineSection(statistics, filter) {
      // Total cards
      let totalCardsValue = 0;
      if (filter === 'overall') {
        totalCardsValue =
          statistics.totalCards || statistics.cardsTotal_overall || statistics.cardsTotal || 0;
      } else if (filter === 'home') {
        totalCardsValue =
          statistics.homeCards || statistics.homeTotalCards || statistics.cardsTotal_home || 0;
      } else if (filter === 'away') {
        totalCardsValue =
          statistics.awayCards || statistics.awayTotalCards || statistics.cardsTotal_away || 0;
      }

      this.updateElement('totalCards', totalCardsValue);

      // Cards per match
      let cardsPerMatchValue = 0;
      if (filter === 'overall') {
        cardsPerMatchValue = statistics.cardsPerMatch || statistics.cardsAVG_overall || 0;
      } else if (filter === 'home') {
        cardsPerMatchValue =
          statistics.homeCardsPerMatch ||
          statistics.cardsPerMatch_home ||
          statistics.cardsAVG_home ||
          0;
      } else if (filter === 'away') {
        cardsPerMatchValue =
          statistics.awayCardsPerMatch ||
          statistics.cardsPerMatch_away ||
          statistics.cardsAVG_away ||
          0;
      }

      this.updateElement('cardsPerMatch', cardsPerMatchValue.toFixed(2));

      // Home/Away cards and per match values
      this.updateElement('homeCards', statistics.homeCards || 0);
      this.updateElement('awayCards', statistics.awayCards || 0);
      this.updateElement('homeCardsPerMatch', (statistics.homeCardsPerMatch || 0).toFixed(2));
      this.updateElement('awayCardsPerMatch', (statistics.awayCardsPerMatch || 0).toFixed(2));

      // Highest/Lowest cards
      this.updateElement('cardsHighest', statistics.cardsHighest || 0);
      this.updateElement('cardsLowest', statistics.cardsLowest || 0);

      // Show/hide home/away rows based on filter
      this.updateCardRowsVisibility(filter);

      // Update cards over statistics
      this.updateCardsOverPercentages(statistics, filter);
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
     * Update card rows visibility
     */
    updateCardRowsVisibility(filter) {
      const homeCardsRow = document.getElementById('homeCards')?.closest('.stat-row');
      const awayCardsRow = document.getElementById('awayCards')?.closest('.stat-row');
      const homeCardsPerMatchRow = document
        .getElementById('homeCardsPerMatch')
        ?.closest('.stat-row');
      const awayCardsPerMatchRow = document
        .getElementById('awayCardsPerMatch')
        ?.closest('.stat-row');

      if (filter === 'overall') {
        // Show both home and away rows
        if (homeCardsRow) homeCardsRow.style.display = 'flex';
        if (awayCardsRow) awayCardsRow.style.display = 'flex';
        if (homeCardsPerMatchRow) homeCardsPerMatchRow.style.display = 'flex';
        if (awayCardsPerMatchRow) awayCardsPerMatchRow.style.display = 'flex';
      } else if (filter === 'home') {
        // Show home, hide away
        if (homeCardsRow) homeCardsRow.style.display = 'flex';
        if (awayCardsRow) awayCardsRow.style.display = 'none';
        if (homeCardsPerMatchRow) homeCardsPerMatchRow.style.display = 'flex';
        if (awayCardsPerMatchRow) awayCardsPerMatchRow.style.display = 'none';
      } else if (filter === 'away') {
        // Show away, hide home
        if (homeCardsRow) homeCardsRow.style.display = 'none';
        if (awayCardsRow) awayCardsRow.style.display = 'flex';
        if (homeCardsPerMatchRow) homeCardsPerMatchRow.style.display = 'none';
        if (awayCardsPerMatchRow) awayCardsPerMatchRow.style.display = 'flex';
      }
    }

    /**
     * Update cards over percentages
     */
    updateCardsOverPercentages(statistics, filter) {
      const cardOverFields = ['05', '15', '25', '35', '45', '55'];
      cardOverFields.forEach(field => {
        const elementId = `cardsOver${field}`;
        if (document.getElementById(elementId)) {
          let cardOverValue = 0;
          if (filter === 'overall') {
            cardOverValue =
              statistics[`over${field}CardsPercentage_overall`] ||
              statistics[`cardsOver${field}_overall`] ||
              statistics[`cardsOver${field}`] ||
              0;
          } else if (filter === 'home') {
            cardOverValue =
              statistics[`over${field}CardsPercentage_home`] ||
              statistics[`cardsOver${field}_home`] ||
              statistics[`homeCardsOver${field}`] ||
              0;
          } else if (filter === 'away') {
            cardOverValue =
              statistics[`over${field}CardsPercentage_away`] ||
              statistics[`cardsOver${field}_away`] ||
              statistics[`awayCardsOver${field}`] ||
              0;
          }
          this.updateElement(elementId, `${cardOverValue}%`);
        }
      });
    }

    /**
     * Update Match Cards section
     */
    updateMatchCardsSection(statistics, filter) {
      // Update Match Cards AVG
      let matchCardsAvg = 0;
      if (filter === 'overall') {
        // Also check for matchCardsAVG field specifically
        matchCardsAvg =
          statistics.matchCardsAVG_overall ||
          statistics.matchCardsAVG ||
          statistics.cardsPerMatch ||
          statistics.cardsAVG_overall ||
          statistics.cardsAVG ||
          0;
      } else if (filter === 'home') {
        matchCardsAvg =
          statistics.matchCardsAVG_home ||
          statistics.homeCardsPerMatch ||
          statistics.cardsAVG_home ||
          0;
      } else if (filter === 'away') {
        matchCardsAvg =
          statistics.matchCardsAVG_away ||
          statistics.awayCardsPerMatch ||
          statistics.cardsAVG_away ||
          0;
      }
      this.updateElement('matchCardsAvg', matchCardsAvg.toFixed(2));

      // Update Highest/Lowest in a Match
      let highestCards = 0;
      let lowestCards = 0;
      if (filter === 'overall') {
        highestCards = statistics.cardsHighest_overall || statistics.cardsHighest || 0;
        lowestCards = statistics.cardsLowest_overall || statistics.cardsLowest || 0;
      } else if (filter === 'home') {
        highestCards = statistics.cardsHighest_home || 0;
        lowestCards = statistics.cardsLowest_home || 0;
      } else if (filter === 'away') {
        highestCards = statistics.cardsHighest_away || 0;
        lowestCards = statistics.cardsLowest_away || 0;
      }
      this.updateElement('matchCardsHighest', highestCards);
      this.updateElement('matchCardsLowest', lowestCards);

      // Match cards over percentages
      const cardOverFields = ['05', '15', '25', '35', '45', '55'];
      cardOverFields.forEach(field => {
        const elementId = `matchCardsOver${field}`;
        if (document.getElementById(elementId)) {
          let cardOverValue = 0;
          if (filter === 'overall') {
            cardOverValue =
              statistics[`over${field}CardsPercentage_overall`] ||
              statistics[`cardsOver${field}_overall`] ||
              statistics[`cardsOver${field}`] ||
              0;
          } else if (filter === 'home') {
            cardOverValue =
              statistics[`over${field}CardsPercentage_home`] ||
              statistics[`cardsOver${field}_home`] ||
              statistics[`homeCardsOver${field}`] ||
              0;
          } else if (filter === 'away') {
            cardOverValue =
              statistics[`over${field}CardsPercentage_away`] ||
              statistics[`cardsOver${field}_away`] ||
              statistics[`awayCardsOver${field}`] ||
              0;
          }
          this.updateElement(elementId, `${cardOverValue}%`);
        }
      });

      // Update 1st Half Cards
      let cards1HAvg = 0;
      if (filter === 'overall') {
        cards1HAvg =
          statistics.cards1H_AVG_overall ||
          statistics.cards1H_AVG ||
          statistics.fh_cards_avg_overall ||
          0;
      } else if (filter === 'home') {
        cards1HAvg = statistics.cards1H_AVG_home || statistics.fh_cards_avg_home || 0;
      } else if (filter === 'away') {
        cards1HAvg = statistics.cards1H_AVG_away || statistics.fh_cards_avg_away || 0;
      }
      this.updateElement('cards1HAvg', cards1HAvg.toFixed(2));

      // Update 1st Half Cards percentages
      let cards1HUnder2 = 0;
      let cards1H2to3 = 0;
      let cards1HOver3 = 0;

      if (filter === 'overall') {
        cards1HUnder2 =
          statistics.cards1H_under2_percentage_overall ||
          statistics.fh_total_cards_under2_percentage_overall ||
          0;
        cards1H2to3 =
          statistics.cards1H_2to3_percentage_overall ||
          statistics.fh_total_cards_2to3_percentage_overall ||
          0;
        cards1HOver3 =
          statistics.cards1H_over3_percentage_overall ||
          statistics.fh_total_cards_over3_percentage_overall ||
          0;
      } else if (filter === 'home') {
        cards1HUnder2 =
          statistics.cards1H_under2_percentage_home ||
          statistics.fh_total_cards_under2_percentage_home ||
          0;
        cards1H2to3 =
          statistics.cards1H_2to3_percentage_home ||
          statistics.fh_total_cards_2to3_percentage_home ||
          0;
        cards1HOver3 =
          statistics.cards1H_over3_percentage_home ||
          statistics.fh_total_cards_over3_percentage_home ||
          0;
      } else if (filter === 'away') {
        cards1HUnder2 =
          statistics.cards1H_under2_percentage_away ||
          statistics.fh_total_cards_under2_percentage_away ||
          0;
        cards1H2to3 =
          statistics.cards1H_2to3_percentage_away ||
          statistics.fh_total_cards_2to3_percentage_away ||
          0;
        cards1HOver3 =
          statistics.cards1H_over3_percentage_away ||
          statistics.fh_total_cards_over3_percentage_away ||
          0;
      }

      this.updateElement('cards1HUnder2', `${cards1HUnder2}%`);
      this.updateElement('cards1H2to3', `${cards1H2to3}%`);
      this.updateElement('cards1HOver3', `${cards1HOver3}%`);

      // Update 2nd Half Cards
      let cards2HAvg = 0;
      if (filter === 'overall') {
        cards2HAvg =
          statistics.cards2H_AVG_overall ||
          statistics.cards2H_AVG ||
          statistics['2h_cards_avg_overall'] ||
          0;
      } else if (filter === 'home') {
        cards2HAvg = statistics.cards2H_AVG_home || statistics['2h_cards_avg_home'] || 0;
      } else if (filter === 'away') {
        cards2HAvg = statistics.cards2H_AVG_away || statistics['2h_cards_avg_away'] || 0;
      }
      this.updateElement('cards2HAvg', cards2HAvg.toFixed(2));

      // Update 2nd Half Cards percentages
      let cards2HUnder2 = 0;
      let cards2H2to3 = 0;
      let cards2HOver3 = 0;

      if (filter === 'overall') {
        cards2HUnder2 =
          statistics.cards2H_under2_percentage_overall ||
          statistics['2h_total_cards_under2_percentage_overall'] ||
          0;
        cards2H2to3 =
          statistics.cards2H_2to3_percentage_overall ||
          statistics['2h_total_cards_2to3_percentage_overall'] ||
          0;
        cards2HOver3 =
          statistics.cards2H_over3_percentage_overall ||
          statistics['2h_total_cards_over3_percentage_overall'] ||
          0;
      } else if (filter === 'home') {
        cards2HUnder2 =
          statistics.cards2H_under2_percentage_home ||
          statistics['2h_total_cards_under2_percentage_home'] ||
          0;
        cards2H2to3 =
          statistics.cards2H_2to3_percentage_home ||
          statistics['2h_total_cards_2to3_percentage_home'] ||
          0;
        cards2HOver3 =
          statistics.cards2H_over3_percentage_home ||
          statistics['2h_total_cards_over3_percentage_home'] ||
          0;
      } else if (filter === 'away') {
        cards2HUnder2 =
          statistics.cards2H_under2_percentage_away ||
          statistics['2h_total_cards_under2_percentage_away'] ||
          0;
        cards2H2to3 =
          statistics.cards2H_2to3_percentage_away ||
          statistics['2h_total_cards_2to3_percentage_away'] ||
          0;
        cards2HOver3 =
          statistics.cards2H_over3_percentage_away ||
          statistics['2h_total_cards_over3_percentage_away'] ||
          0;
      }

      this.updateElement('cards2HUnder2', `${cards2HUnder2}%`);
      this.updateElement('cards2H2to3', `${cards2H2to3}%`);
      this.updateElement('cards2HOver3', `${cards2HOver3}%`);
    }

    /**
     * Update Team Cards section
     */
    updateTeamCardsSection(statistics, filter) {
      // Cards For values
      let avgCardsFor = 0;
      let totalCardsFor = 0;
      let cardsForOver05 = 0;
      let cardsForOver15 = 0;
      let cardsForOver25 = 0;
      let cardsForOver35 = 0;
      let cardsForOver45 = 0;
      let cardsForOver55 = 0;
      let cardsForOver65 = 0;
      let highestCardsFor = 0;

      // Cards Against values
      let avgCardsAgainst = 0;
      let totalCardsAgainst = 0;
      let cardsAgainstOver05 = 0;
      let cardsAgainstOver15 = 0;
      let cardsAgainstOver25 = 0;
      let cardsAgainstOver35 = 0;
      let cardsAgainstOver45 = 0;
      let cardsAgainstOver55 = 0;
      let cardsAgainstOver65 = 0;
      let highestCardsAgainst = 0;

      if (filter === 'overall') {
        // Cards For
        avgCardsFor = statistics.cardsForPerMatch || statistics.cardsFor_avg_overall || 0;
        totalCardsFor = statistics.cardsFor || statistics.cardsFor_overall || 0;
        cardsForOver05 =
          statistics.over05CardsForPercentage_overall || statistics.over05CardsForPercentage || 0;
        cardsForOver15 =
          statistics.over15CardsForPercentage_overall || statistics.over15CardsForPercentage || 0;
        cardsForOver25 =
          statistics.over25CardsForPercentage_overall || statistics.over25CardsForPercentage || 0;
        cardsForOver35 =
          statistics.over35CardsForPercentage_overall || statistics.over35CardsForPercentage || 0;
        cardsForOver45 =
          statistics.over45CardsForPercentage_overall || statistics.over45CardsForPercentage || 0;
        cardsForOver55 =
          statistics.over55CardsForPercentage_overall || statistics.over55CardsForPercentage || 0;
        cardsForOver65 =
          statistics.over65CardsForPercentage_overall || statistics.over65CardsForPercentage || 0;
        highestCardsFor = statistics.cardsForHighest_overall || statistics.cardsForHighest || 0;

        // Cards Against
        avgCardsAgainst =
          statistics.cardsAgainstPerMatch || statistics.cardsAgainst_avg_overall || 0;
        totalCardsAgainst = statistics.cardsAgainst || statistics.cardsAgainst_overall || 0;
        cardsAgainstOver05 =
          statistics.over05CardsAgainstPercentage_overall ||
          statistics.over05CardsAgainstPercentage ||
          0;
        cardsAgainstOver15 =
          statistics.over15CardsAgainstPercentage_overall ||
          statistics.over15CardsAgainstPercentage ||
          0;
        cardsAgainstOver25 =
          statistics.over25CardsAgainstPercentage_overall ||
          statistics.over25CardsAgainstPercentage ||
          0;
        cardsAgainstOver35 =
          statistics.over35CardsAgainstPercentage_overall ||
          statistics.over35CardsAgainstPercentage ||
          0;
        cardsAgainstOver45 =
          statistics.over45CardsAgainstPercentage_overall ||
          statistics.over45CardsAgainstPercentage ||
          0;
        cardsAgainstOver55 =
          statistics.over55CardsAgainstPercentage_overall ||
          statistics.over55CardsAgainstPercentage ||
          0;
        cardsAgainstOver65 =
          statistics.over65CardsAgainstPercentage_overall ||
          statistics.over65CardsAgainstPercentage ||
          0;
        highestCardsAgainst =
          statistics.cardsAgainstHighest_overall || statistics.cardsAgainstHighest || 0;
      } else if (filter === 'home') {
        // Cards For
        avgCardsFor =
          statistics.cardsForPerMatch_home ||
          statistics.cards_for_avg_home ||
          statistics.homeCardsForPerMatch ||
          (statistics.homeCardsFor && statistics.homeMatches
            ? statistics.homeCardsFor / statistics.homeMatches
            : 0) ||
          0;
        totalCardsFor =
          statistics.homeCardsFor || statistics.cardsFor_home || statistics.cards_for_home || 0;
        cardsForOver05 =
          statistics.homeOver05CardsForPercentage || statistics.over05CardsForPercentage_home || 0;
        cardsForOver15 =
          statistics.homeOver15CardsForPercentage || statistics.over15CardsForPercentage_home || 0;
        cardsForOver25 =
          statistics.homeOver25CardsForPercentage || statistics.over25CardsForPercentage_home || 0;
        cardsForOver35 =
          statistics.homeOver35CardsForPercentage || statistics.over35CardsForPercentage_home || 0;
        cardsForOver45 =
          statistics.homeOver45CardsForPercentage || statistics.over45CardsForPercentage_home || 0;
        cardsForOver55 =
          statistics.homeOver55CardsForPercentage || statistics.over55CardsForPercentage_home || 0;
        cardsForOver65 =
          statistics.homeOver65CardsForPercentage || statistics.over65CardsForPercentage_home || 0;
        highestCardsFor = statistics.cardsForHighest_home || 0;

        // Cards Against
        avgCardsAgainst =
          statistics.cardsAgainstPerMatch_home ||
          statistics.cards_against_avg_home ||
          statistics.homeCardsAgainstPerMatch ||
          (statistics.homeCardsAgainst && statistics.homeMatches
            ? statistics.homeCardsAgainst / statistics.homeMatches
            : 0) ||
          0;
        totalCardsAgainst =
          statistics.homeCardsAgainst ||
          statistics.cardsAgainst_home ||
          statistics.cards_against_home ||
          0;
        cardsAgainstOver05 =
          statistics.homeOver05CardsAgainstPercentage ||
          statistics.over05CardsAgainstPercentage_home ||
          0;
        cardsAgainstOver15 =
          statistics.homeOver15CardsAgainstPercentage ||
          statistics.over15CardsAgainstPercentage_home ||
          0;
        cardsAgainstOver25 =
          statistics.homeOver25CardsAgainstPercentage ||
          statistics.over25CardsAgainstPercentage_home ||
          0;
        cardsAgainstOver35 =
          statistics.homeOver35CardsAgainstPercentage ||
          statistics.over35CardsAgainstPercentage_home ||
          0;
        cardsAgainstOver45 =
          statistics.homeOver45CardsAgainstPercentage ||
          statistics.over45CardsAgainstPercentage_home ||
          0;
        cardsAgainstOver55 =
          statistics.homeOver55CardsAgainstPercentage ||
          statistics.over55CardsAgainstPercentage_home ||
          0;
        cardsAgainstOver65 =
          statistics.homeOver65CardsAgainstPercentage ||
          statistics.over65CardsAgainstPercentage_home ||
          0;
        highestCardsAgainst = statistics.cardsAgainstHighest_home || 0;
      } else if (filter === 'away') {
        // Cards For
        avgCardsFor =
          statistics.cardsForPerMatch_away ||
          statistics.cards_for_avg_away ||
          statistics.awayCardsForPerMatch ||
          (statistics.awayCardsFor && statistics.awayMatches
            ? statistics.awayCardsFor / statistics.awayMatches
            : 0) ||
          0;
        totalCardsFor =
          statistics.awayCardsFor || statistics.cardsFor_away || statistics.cards_for_away || 0;
        cardsForOver05 =
          statistics.awayOver05CardsForPercentage || statistics.over05CardsForPercentage_away || 0;
        cardsForOver15 =
          statistics.awayOver15CardsForPercentage || statistics.over15CardsForPercentage_away || 0;
        cardsForOver25 =
          statistics.awayOver25CardsForPercentage || statistics.over25CardsForPercentage_away || 0;
        cardsForOver35 =
          statistics.awayOver35CardsForPercentage || statistics.over35CardsForPercentage_away || 0;
        cardsForOver45 =
          statistics.awayOver45CardsForPercentage || statistics.over45CardsForPercentage_away || 0;
        cardsForOver55 =
          statistics.awayOver55CardsForPercentage || statistics.over55CardsForPercentage_away || 0;
        cardsForOver65 =
          statistics.awayOver65CardsForPercentage || statistics.over65CardsForPercentage_away || 0;
        highestCardsFor = statistics.cardsForHighest_away || 0;

        // Cards Against
        avgCardsAgainst =
          statistics.cardsAgainstPerMatch_away ||
          statistics.cards_against_avg_away ||
          statistics.awayCardsAgainstPerMatch ||
          (statistics.awayCardsAgainst && statistics.awayMatches
            ? statistics.awayCardsAgainst / statistics.awayMatches
            : 0) ||
          0;
        totalCardsAgainst =
          statistics.awayCardsAgainst ||
          statistics.cardsAgainst_away ||
          statistics.cards_against_away ||
          0;
        cardsAgainstOver05 =
          statistics.awayOver05CardsAgainstPercentage ||
          statistics.over05CardsAgainstPercentage_away ||
          0;
        cardsAgainstOver15 =
          statistics.awayOver15CardsAgainstPercentage ||
          statistics.over15CardsAgainstPercentage_away ||
          0;
        cardsAgainstOver25 =
          statistics.awayOver25CardsAgainstPercentage ||
          statistics.over25CardsAgainstPercentage_away ||
          0;
        cardsAgainstOver35 =
          statistics.awayOver35CardsAgainstPercentage ||
          statistics.over35CardsAgainstPercentage_away ||
          0;
        cardsAgainstOver45 =
          statistics.awayOver45CardsAgainstPercentage ||
          statistics.over45CardsAgainstPercentage_away ||
          0;
        cardsAgainstOver55 =
          statistics.awayOver55CardsAgainstPercentage ||
          statistics.over55CardsAgainstPercentage_away ||
          0;
        cardsAgainstOver65 =
          statistics.awayOver65CardsAgainstPercentage ||
          statistics.over65CardsAgainstPercentage_away ||
          0;
        highestCardsAgainst = statistics.cardsAgainstHighest_away || 0;
      }

      // Update Cards For elements
      this.updateElement('teamCards-avgFor', avgCardsFor.toFixed(2));
      this.updateElement('teamCards-totalFor', totalCardsFor);
      this.updateElement('teamCards-forOver05', `${cardsForOver05}%`);
      this.updateElement('teamCards-forOver15', `${cardsForOver15}%`);
      this.updateElement('teamCards-forOver25', `${cardsForOver25}%`);
      this.updateElement('teamCards-forOver35', `${cardsForOver35}%`);
      this.updateElement('teamCards-forOver45', `${cardsForOver45}%`);
      this.updateElement('teamCards-forOver55', `${cardsForOver55}%`);
      this.updateElement('teamCards-forOver65', `${cardsForOver65}%`);
      this.updateElement('teamCards-highestFor', highestCardsFor);

      // Update Cards Against elements
      this.updateElement('teamCards-avgAgainst', avgCardsAgainst.toFixed(2));
      this.updateElement('teamCards-totalAgainst', totalCardsAgainst);
      this.updateElement('teamCards-againstOver05', `${cardsAgainstOver05}%`);
      this.updateElement('teamCards-againstOver15', `${cardsAgainstOver15}%`);
      this.updateElement('teamCards-againstOver25', `${cardsAgainstOver25}%`);
      this.updateElement('teamCards-againstOver35', `${cardsAgainstOver35}%`);
      this.updateElement('teamCards-againstOver45', `${cardsAgainstOver45}%`);
      this.updateElement('teamCards-againstOver55', `${cardsAgainstOver55}%`);
      this.updateElement('teamCards-againstOver65', `${cardsAgainstOver65}%`);
      this.updateElement('teamCards-highestAgainst', highestCardsAgainst);
    }

    /**
     * Update Cards Over section
     */
    updateCardsOverSection(statistics, filter) {
      // Already handled in updateCardsOverPercentages
    }

    /**
     * Update Cards top stats
     */
    updateCardsTopStats(statistics, filter) {
      // Get values based on filter
      let cardsForOver15 = 0;
      let teamBookedAvg = 0;
      let opponentsBookedAvg = 0;

      if (filter === 'overall') {
        cardsForOver15 =
          statistics.over15CardsForPercentage_overall || statistics.over15CardsForPercentage || 0;
        teamBookedAvg = statistics.cardsForPerMatch || statistics.cardsFor_avg_overall || 0;
        opponentsBookedAvg =
          statistics.cardsAgainstPerMatch || statistics.cardsAgainst_avg_overall || 0;
      } else if (filter === 'home') {
        cardsForOver15 = statistics.over15CardsForPercentage_home || 0;
        teamBookedAvg = statistics.cardsForPerMatch_home || statistics.cardsFor_avg_home || 0;
        opponentsBookedAvg =
          statistics.cardsAgainstPerMatch_home || statistics.cardsAgainst_avg_home || 0;
      } else if (filter === 'away') {
        cardsForOver15 = statistics.over15CardsForPercentage_away || 0;
        teamBookedAvg = statistics.cardsForPerMatch_away || statistics.cardsFor_avg_away || 0;
        opponentsBookedAvg =
          statistics.cardsAgainstPerMatch_away || statistics.cardsAgainst_avg_away || 0;
      }

      // Update elements
      this.updateElement('cardsForOver15Value', `${cardsForOver15}%`);
      this.updateElement('teamBookedAvgValue', teamBookedAvg.toFixed(2));
      this.updateElement('opponentsBookedAvgValue', opponentsBookedAvg.toFixed(2));
    }

    /**
     * Destroy the module
     */
    destroy() {
      // Remove event listeners
      if (this.eventBus) {
        this.eventBus.off('data:cards:updated');
        this.eventBus.off('filter:changed');
      }

      // Clear state
      this.state = {
        activeFilter: 'overall',
        activeTimeFrame: 'all',
        cardType: 'all',
        viewMode: 'overview',
      };

      this.initialized = false;
    }

    /**
     * Export display configuration
     */
    exportConfig() {
      return {
        name: this.name,
        version: this.version,
        config: this.config,
        state: this.state,
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
  const cardsDisplay = new CardsDisplay();

  // Auto-initialize if DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => cardsDisplay.initialize());
  } else {
    cardsDisplay.initialize();
  }

  // Export to global scope
  global.TeamStatsCardsDisplay = cardsDisplay;
})(window);
