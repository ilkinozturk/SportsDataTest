/**
 * Statistics Display Module
 * Handles the visualization and rendering of comprehensive team statistics
 * 
 * Features:
 * - Season overview statistics
 * - Performance metrics visualization
 * - League position and standings
 * - Head-to-head comparisons
 * - Statistical trends and analysis
 * - Interactive charts and visualizations
 * - Detailed breakdowns by competition phase
 */

(function(global) {
  'use strict';

  // Module dependencies check
  const requiredModules = ['TeamStatsEventBus', 'TeamStatsStateManager'];
  const missingModules = requiredModules.filter(module => !global[module]);
  
  if (missingModules.length > 0) {
  }

  class StatisticsDisplay {
    constructor() {
      this.name = 'StatisticsDisplay';
      this.version = '1.0.0';
      this.initialized = false;
      this.config = {
        animationDuration: 300,
        chartHeight: 200,
        colors: {
          primary: '#3b82f6',
          secondary: '#8b5cf6',
          success: '#10b981',
          warning: '#f59e0b',
          danger: '#ef4444',
          neutral: '#6b7280',
          background: '#f3f4f6',
          border: '#e5e7eb'
        },
        icons: {
          position: '🏆',
          matches: '⚽',
          points: '📊',
          goals: '🥅',
          defense: '🛡️',
          possession: '🎯',
          efficiency: '⚡',
          trend: {
            up: '📈',
            down: '📉',
            stable: '➡️'
          }
        }
      };
      this.state = {
        activeFilter: 'overall',
        selectedMetric: 'performance',
        comparisonMode: false,
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
    initialize() {
      if (this.initialized) return;

      // Set up event listeners if EventBus is available
      if (this.eventBus) {
        this.eventBus.on('filter:changed', this.handleFilterChange.bind(this));
        this.eventBus.on('data:statistics:updated', this.handleDataUpdate.bind(this));
        this.eventBus.on('view:statistics:metric', this.handleMetricChange.bind(this));
      }

      this.initialized = true;
    }

    /**
     * Render statistics section
     */
    renderStatisticsSection(container, statistics, options = {}) {
      if (!container) {
        return;
      }

      // Clear existing content
      this.clearContainer(container);

      // Initialize if not already done
      if (!this.initialized) {
        this.initialize();
      }

      // Merge options with defaults
      const config = {
        filter: options.filter || this.state.activeFilter,
        showCharts: options.showCharts !== false,
        showDetails: options.showDetails !== false,
        showComparison: options.showComparison || false,
        animated: options.animated !== false
      };

      // Create main wrapper
      const wrapper = this.createElement('div', {
        className: 'statistics-display-wrapper',
        parent: container
      });

      // Add animation class if enabled
      if (config.animated) {
        wrapper.classList.add('animated');
      }

      // Render components
      this.renderOverviewCards(wrapper, statistics, config.filter);
      this.renderLeaguePosition(wrapper, statistics, config.filter);
      
      if (config.showCharts) {
        this.renderPerformanceChart(wrapper, statistics, config.filter);
        this.renderMetricsRadar(wrapper, statistics, config.filter);
      }
      
      if (config.showDetails) {
        this.renderDetailedStats(wrapper, statistics, config.filter);
        this.renderPhaseBreakdown(wrapper, statistics, config.filter);
      }
      
      if (config.showComparison && statistics.h2hData) {
        this.renderHeadToHead(wrapper, statistics, config.filter);
      }

      // Emit render complete event
      if (this.eventBus) {
        this.eventBus.emit('display:statistics:rendered', {
          container,
          filter: config.filter
        });
      }

      return wrapper;
    }

    /**
     * Render overview cards
     */
    renderOverviewCards(container, statistics, filter) {
      const cardsContainer = this.createElement('div', {
        className: 'statistics-overview-cards',
        parent: container
      });

      const stats = this.getFilteredStats(statistics, filter);
      
      const cards = [
        {
          icon: this.config.icons.position,
          label: 'League Position',
          value: stats.leaguePosition || '-',
          subtitle: `of ${stats.totalTeams || '-'} teams`,
          trend: this.getPositionTrend(stats),
          color: this.getPositionColor(stats.leaguePosition)
        },
        {
          icon: this.config.icons.points,
          label: 'Points',
          value: stats.points || 0,
          subtitle: `${stats.pointsPerGame || 0} per game`,
          trend: this.getPointsTrend(stats),
          color: this.config.colors.primary
        },
        {
          icon: this.config.icons.efficiency,
          label: 'Win Rate',
          value: `${this.calculateWinRate(stats)}%`,
          subtitle: `${stats.wins || 0}W ${stats.draws || 0}D ${stats.losses || 0}L`,
          trend: this.getWinRateTrend(stats),
          color: this.getWinRateColor(this.calculateWinRate(stats))
        },
        {
          icon: this.config.icons.goals,
          label: 'Goal Difference',
          value: this.formatGoalDifference(stats),
          subtitle: `${stats.goalsScored || 0} scored, ${stats.goalsConceded || 0} conceded`,
          trend: this.getGoalDifferenceTrend(stats),
          color: this.getGoalDifferenceColor(stats)
        }
      ];

      cards.forEach(card => {
        this.createOverviewCard(cardsContainer, card);
      });
    }

    /**
     * Create overview card
     */
    createOverviewCard(container, cardData) {
      const card = this.createElement('div', {
        className: 'statistics-overview-card',
        parent: container
      });

      // Icon
      this.createElement('div', {
        className: 'card-icon',
        textContent: cardData.icon,
        parent: card
      });

      // Value with color
      const valueEl = this.createElement('div', {
        className: 'stat-value',
        textContent: cardData.value,
        parent: card,
        style: { color: cardData.color }
      });

      // Label
      this.createElement('div', {
        className: 'stat-label',
        textContent: cardData.label,
        parent: card
      });

      // Subtitle
      this.createElement('div', {
        className: 'stat-subtitle',
        textContent: cardData.subtitle,
        parent: card
      });

      // Trend indicator
      if (cardData.trend) {
        this.createElement('div', {
          className: `trend-indicator trend-${cardData.trend.direction}`,
          innerHTML: `${cardData.trend.icon} ${cardData.trend.text}`,
          parent: card
        });
      }

      return card;
    }

    /**
     * Render league position section
     */
    renderLeaguePosition(container, statistics, filter) {
      const positionCard = this.createElement('div', {
        className: 'league-position-card',
        parent: container
      });

      const header = this.createElement('div', {
        className: 'card-header',
        parent: positionCard
      });

      this.createElement('h3', {
        textContent: 'League Standing',
        parent: header
      });

      const stats = this.getFilteredStats(statistics, filter);
      const position = stats.leaguePosition || '-';
      const totalTeams = stats.totalTeams || '-';

      // Position visual
      const positionVisual = this.createElement('div', {
        className: 'position-visual',
        parent: positionCard
      });

      // Create position indicator
      const positionIndicator = this.createElement('div', {
        className: 'position-indicator',
        parent: positionVisual
      });

      this.createElement('div', {
        className: 'position-number',
        textContent: position,
        parent: positionIndicator,
        style: {
          fontSize: '36px',
          fontWeight: 'bold',
          color: this.getPositionColor(position)
        }
      });

      this.createElement('div', {
        className: 'position-suffix',
        textContent: this.getPositionSuffix(position),
        parent: positionIndicator
      });

      // Position bar
      if (position !== '-' && totalTeams !== '-') {
        const progressBar = this.createElement('div', {
          className: 'position-progress',
          parent: positionVisual
        });

        const percentage = ((totalTeams - position + 1) / totalTeams) * 100;
        
        this.createElement('div', {
          className: 'position-progress-bar',
          parent: progressBar,
          style: {
            width: `${percentage}%`,
            backgroundColor: this.getPositionColor(position)
          }
        });

        // Position labels
        const labels = this.createElement('div', {
          className: 'position-labels',
          parent: positionVisual
        });

        this.createElement('span', {
          textContent: '1st',
          parent: labels
        });

        this.createElement('span', {
          textContent: `${totalTeams}th`,
          parent: labels
        });
      }

      // Additional position stats
      const positionStats = this.createElement('div', {
        className: 'position-stats',
        parent: positionCard
      });

      const positionInfo = [
        { label: 'Games Played', value: stats.totalMatches || 0 },
        { label: 'Points', value: stats.points || 0 },
        { label: 'Goal Difference', value: this.formatGoalDifference(stats) },
        { label: 'Form', value: stats.recentForm || 'N/A' }
      ];

      positionInfo.forEach(info => {
        const row = this.createElement('div', {
          className: 'position-stat-row',
          parent: positionStats
        });

        this.createElement('span', {
          className: 'stat-label',
          textContent: info.label,
          parent: row
        });

        this.createElement('span', {
          className: 'stat-value',
          textContent: info.value,
          parent: row
        });
      });
    }

    /**
     * Render performance chart
     */
    renderPerformanceChart(container, statistics, filter) {
      const chartCard = this.createElement('div', {
        className: 'performance-chart-card',
        parent: container
      });

      this.createElement('h3', {
        textContent: 'Performance Trend',
        parent: chartCard
      });

      const stats = this.getFilteredStats(statistics, filter);
      
      // Simple SVG line chart
      const chartContainer = this.createElement('div', {
        className: 'chart-container',
        parent: chartCard
      });

      // Get last 10 matches data
      const matches = stats.last10Matches || [];
      if (matches.length > 0) {
        this.createSimpleLineChart(chartContainer, matches);
      } else {
        this.createElement('div', {
          className: 'no-data',
          textContent: 'No match data available',
          parent: chartContainer
        });
      }
    }

    /**
     * Create simple line chart
     */
    createSimpleLineChart(container, matches) {
      const width = 400;
      const height = 200;
      const padding = 20;
      
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', width);
      svg.setAttribute('height', height);
      svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
      
      // Calculate points
      const points = matches.map((match, index) => {
        const x = (index / (matches.length - 1)) * (width - 2 * padding) + padding;
        const y = height - padding - (match.points / 3) * (height - 2 * padding);
        return { x, y, match };
      });
      
      // Create path
      const pathData = points.map((point, index) => 
        `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
      ).join(' ');
      
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', pathData);
      path.setAttribute('stroke', this.config.colors.primary);
      path.setAttribute('stroke-width', '2');
      path.setAttribute('fill', 'none');
      
      svg.appendChild(path);
      
      // Add points
      points.forEach(point => {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', point.x);
        circle.setAttribute('cy', point.y);
        circle.setAttribute('r', '4');
        circle.setAttribute('fill', this.getResultColor(point.match.result));
        svg.appendChild(circle);
      });
      
      container.appendChild(svg);
    }

    /**
     * Render metrics radar chart
     */
    renderMetricsRadar(container, statistics, filter) {
      const radarCard = this.createElement('div', {
        className: 'metrics-radar-card',
        parent: container
      });

      this.createElement('h3', {
        textContent: 'Team Performance Metrics',
        parent: radarCard
      });

      const stats = this.getFilteredStats(statistics, filter);
      
      const metrics = [
        { label: 'Attack', value: this.calculateAttackRating(stats) },
        { label: 'Defense', value: this.calculateDefenseRating(stats) },
        { label: 'Possession', value: stats.avgPossession || 50 },
        { label: 'Efficiency', value: this.calculateEfficiencyRating(stats) },
        { label: 'Discipline', value: this.calculateDisciplineRating(stats) },
        { label: 'Form', value: this.calculateFormRating(stats) }
      ];

      // Create radar visualization
      const radarContainer = this.createElement('div', {
        className: 'radar-container',
        parent: radarCard
      });

      this.createRadarChart(radarContainer, metrics);
    }

    /**
     * Create radar chart
     */
    createRadarChart(container, metrics) {
      const size = 250;
      const center = size / 2;
      const radius = size / 2 - 30;
      
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', size);
      svg.setAttribute('height', size);
      svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
      
      // Draw grid
      for (let i = 1; i <= 5; i++) {
        const r = (radius / 5) * i;
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', center);
        circle.setAttribute('cy', center);
        circle.setAttribute('r', r);
        circle.setAttribute('fill', 'none');
        circle.setAttribute('stroke', '#e5e7eb');
        circle.setAttribute('stroke-width', '1');
        svg.appendChild(circle);
      }
      
      // Draw axes and labels
      metrics.forEach((metric, index) => {
        const angle = (index / metrics.length) * 2 * Math.PI - Math.PI / 2;
        const x = center + radius * Math.cos(angle);
        const y = center + radius * Math.sin(angle);
        
        // Axis line
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', center);
        line.setAttribute('y1', center);
        line.setAttribute('x2', x);
        line.setAttribute('y2', y);
        line.setAttribute('stroke', '#e5e7eb');
        line.setAttribute('stroke-width', '1');
        svg.appendChild(line);
        
        // Label
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', center + (radius + 20) * Math.cos(angle));
        text.setAttribute('y', center + (radius + 20) * Math.sin(angle));
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'middle');
        text.setAttribute('font-size', '12');
        text.textContent = metric.label;
        svg.appendChild(text);
      });
      
      // Draw data polygon
      const points = metrics.map((metric, index) => {
        const angle = (index / metrics.length) * 2 * Math.PI - Math.PI / 2;
        const value = metric.value / 100; // Normalize to 0-1
        const x = center + radius * value * Math.cos(angle);
        const y = center + radius * value * Math.sin(angle);
        return `${x},${y}`;
      }).join(' ');
      
      const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      polygon.setAttribute('points', points);
      polygon.setAttribute('fill', this.config.colors.primary);
      polygon.setAttribute('fill-opacity', '0.3');
      polygon.setAttribute('stroke', this.config.colors.primary);
      polygon.setAttribute('stroke-width', '2');
      svg.appendChild(polygon);
      
      container.appendChild(svg);
    }

    /**
     * Render detailed statistics
     */
    renderDetailedStats(container, statistics, filter) {
      const detailsGrid = this.createElement('div', {
        className: 'statistics-details-grid',
        parent: container
      });

      const stats = this.getFilteredStats(statistics, filter);

      // Offensive Statistics
      const offensiveCard = this.createElement('div', {
        className: 'detail-card',
        parent: detailsGrid
      });

      this.createElement('h4', {
        textContent: '⚔️ Offensive Statistics',
        parent: offensiveCard
      });

      this.createStatRows(offensiveCard, [
        { label: 'Goals Scored', value: stats.goalsScored || 0, suffix: ` (${stats.goalsPerMatch || 0} per match)` },
        { label: 'Shots Per Game', value: stats.shotsPerGame || 0 },
        { label: 'Shots on Target', value: `${stats.shotsOnTargetPercentage || 0}%` },
        { label: 'Conversion Rate', value: `${stats.conversionRate || 0}%` },
        { label: 'Big Chances Created', value: stats.bigChancesCreated || 0 },
        { label: 'Average Possession', value: `${stats.avgPossession || 0}%` }
      ]);

      // Defensive Statistics
      const defensiveCard = this.createElement('div', {
        className: 'detail-card',
        parent: detailsGrid
      });

      this.createElement('h4', {
        textContent: '🛡️ Defensive Statistics',
        parent: defensiveCard
      });

      this.createStatRows(defensiveCard, [
        { label: 'Goals Conceded', value: stats.goalsConceded || 0, suffix: ` (${stats.goalsConcededPerMatch || 0} per match)` },
        { label: 'Clean Sheets', value: stats.cleanSheets || 0, suffix: ` (${stats.cleanSheetPercentage || 0}%)` },
        { label: 'Shots Conceded', value: stats.shotsConcededPerGame || 0 },
        { label: 'Tackles Per Game', value: stats.tacklesPerGame || 0 },
        { label: 'Interceptions', value: stats.interceptionsPerGame || 0 },
        { label: 'Fouls Committed', value: stats.foulsPerGame || 0 }
      ]);

      // Discipline Statistics  
      const disciplineCard = this.createElement('div', {
        className: 'detail-card',
        parent: detailsGrid
      });

      this.createElement('h4', {
        textContent: '📋 Discipline & Cards',
        parent: disciplineCard
      });

      this.createStatRows(disciplineCard, [
        { label: 'Yellow Cards', value: stats.yellowCards || 0, suffix: ` (${stats.yellowCardsPerMatch || 0} per match)` },
        { label: 'Red Cards', value: stats.redCards || 0 },
        { label: 'Fouls Per Game', value: stats.foulsPerGame || 0 },
        { label: 'Offsides Per Game', value: stats.offsidesPerGame || 0 },
        { label: 'Penalties Conceded', value: stats.penaltiesConceded || 0 },
        { label: 'Penalties Won', value: stats.penaltiesWon || 0 }
      ]);

      // Set Pieces Statistics
      const setPiecesCard = this.createElement('div', {
        className: 'detail-card',
        parent: detailsGrid
      });

      this.createElement('h4', {
        textContent: '🎯 Set Pieces',
        parent: setPiecesCard
      });

      this.createStatRows(setPiecesCard, [
        { label: 'Corners Won', value: stats.cornersWon || 0, suffix: ` (${stats.cornersPerMatch || 0} per match)` },
        { label: 'Corner Conversion', value: `${stats.cornerConversionRate || 0}%` },
        { label: 'Free Kicks Won', value: stats.freeKicksWon || 0 },
        { label: 'Penalties Scored', value: `${stats.penaltiesScored || 0}/${stats.penaltiesTaken || 0}` },
        { label: 'Set Piece Goals', value: stats.setPieceGoals || 0 },
        { label: 'Set Piece Success', value: `${stats.setPieceSuccessRate || 0}%` }
      ]);
    }

    /**
     * Create stat rows
     */
    createStatRows(container, stats) {
      stats.forEach((stat, index) => {
        const row = this.createElement('div', {
          className: `stat-row ${index === 0 ? 'highlight' : ''}`,
          parent: container
        });

        this.createElement('span', {
          className: 'stat-label',
          textContent: stat.label,
          parent: row
        });

        const valueContainer = this.createElement('span', {
          className: 'stat-value-container',
          parent: row
        });

        this.createElement('span', {
          className: 'stat-value',
          textContent: stat.value,
          parent: valueContainer
        });

        if (stat.suffix) {
          this.createElement('span', {
            className: 'stat-suffix',
            textContent: stat.suffix,
            parent: valueContainer
          });
        }
      });
    }

    /**
     * Render phase breakdown
     */
    renderPhaseBreakdown(container, statistics, filter) {
      const phaseCard = this.createElement('div', {
        className: 'phase-breakdown-card',
        parent: container
      });

      this.createElement('h3', {
        textContent: 'Performance by Competition Phase',
        parent: phaseCard
      });

      const stats = this.getFilteredStats(statistics, filter);
      
      // Monthly breakdown
      if (stats.monthlyBreakdown) {
        const monthlyGrid = this.createElement('div', {
          className: 'monthly-grid',
          parent: phaseCard
        });

        Object.entries(stats.monthlyBreakdown).forEach(([month, data]) => {
          const monthCard = this.createElement('div', {
            className: 'month-card',
            parent: monthlyGrid
          });

          this.createElement('h5', {
            textContent: month,
            parent: monthCard
          });

          this.createElement('div', {
            className: 'month-stats',
            innerHTML: `
              <div class="month-stat">
                <span>Matches:</span> <strong>${data.matches || 0}</strong>
              </div>
              <div class="month-stat">
                <span>Win Rate:</span> <strong>${data.winRate || 0}%</strong>
              </div>
              <div class="month-stat">
                <span>PPG:</span> <strong>${data.ppg || 0}</strong>
              </div>
            `,
            parent: monthCard
          });
        });
      }

      // Competition phase stats
      const phases = [
        { name: 'First 5 Games', stats: stats.first5Games },
        { name: 'Last 5 Games', stats: stats.last5Games },
        { name: 'First Half Season', stats: stats.firstHalfSeason },
        { name: 'Second Half Season', stats: stats.secondHalfSeason }
      ];

      const phasesGrid = this.createElement('div', {
        className: 'phases-grid',
        parent: phaseCard
      });

      phases.forEach(phase => {
        if (!phase.stats) return;
        
        const phaseItem = this.createElement('div', {
          className: 'phase-item',
          parent: phasesGrid
        });

        this.createElement('h5', {
          textContent: phase.name,
          parent: phaseItem
        });

        const phaseStats = this.createElement('div', {
          className: 'phase-stats',
          parent: phaseItem
        });

        this.createElement('div', {
          innerHTML: `W${phase.stats.wins || 0} D${phase.stats.draws || 0} L${phase.stats.losses || 0}`,
          parent: phaseStats
        });

        this.createElement('div', {
          innerHTML: `${phase.stats.points || 0} pts (${phase.stats.ppg || 0} PPG)`,
          parent: phaseStats
        });
      });
    }

    /**
     * Render head to head comparison
     */
    renderHeadToHead(container, statistics, filter) {
      if (!statistics.h2hData) return;

      const h2hCard = this.createElement('div', {
        className: 'h2h-comparison-card',
        parent: container
      });

      this.createElement('h3', {
        textContent: 'Head to Head Comparison',
        parent: h2hCard
      });

      const h2hGrid = this.createElement('div', {
        className: 'h2h-grid',
        parent: h2hCard
      });

      // Team comparison
      const teamA = this.createElement('div', {
        className: 'h2h-team',
        parent: h2hGrid
      });

      this.createElement('h4', {
        textContent: statistics.teamName || 'Team A',
        parent: teamA
      });

      const comparison = this.createElement('div', {
        className: 'h2h-comparison',
        parent: h2hGrid
      });

      const teamB = this.createElement('div', {
        className: 'h2h-team',
        parent: h2hGrid
      });

      this.createElement('h4', {
        textContent: statistics.h2hData.opponentName || 'Team B',
        parent: teamB
      });

      // Comparison metrics
      const metrics = [
        { label: 'Wins', teamA: statistics.h2hData.wins, teamB: statistics.h2hData.losses },
        { label: 'Draws', teamA: statistics.h2hData.draws, teamB: statistics.h2hData.draws },
        { label: 'Goals', teamA: statistics.h2hData.goalsFor, teamB: statistics.h2hData.goalsAgainst },
        { label: 'Clean Sheets', teamA: statistics.h2hData.cleanSheets, teamB: statistics.h2hData.cleanSheetsAgainst }
      ];

      metrics.forEach(metric => {
        this.createH2HRow(teamA, comparison, teamB, metric);
      });
    }

    /**
     * Create H2H comparison row
     */
    createH2HRow(teamA, comparison, teamB, metric) {
      const valueA = metric.teamA || 0;
      const valueB = metric.teamB || 0;
      const total = valueA + valueB || 1;
      const percentA = (valueA / total) * 100;
      const percentB = (valueB / total) * 100;

      this.createElement('div', {
        className: 'h2h-value',
        textContent: valueA,
        parent: teamA,
        style: {
          color: valueA > valueB ? this.config.colors.success : 
                 valueA < valueB ? this.config.colors.danger : 
                 this.config.colors.neutral
        }
      });

      const compRow = this.createElement('div', {
        className: 'h2h-comparison-row',
        parent: comparison
      });

      this.createElement('div', {
        className: 'h2h-bar-container',
        innerHTML: `
          <div class="h2h-bar h2h-bar-left" style="width: ${percentA}%; background-color: ${this.config.colors.primary}"></div>
          <div class="h2h-label">${metric.label}</div>
          <div class="h2h-bar h2h-bar-right" style="width: ${percentB}%; background-color: ${this.config.colors.secondary}"></div>
        `,
        parent: compRow
      });

      this.createElement('div', {
        className: 'h2h-value',
        textContent: valueB,
        parent: teamB,
        style: {
          color: valueB > valueA ? this.config.colors.success : 
                 valueB < valueA ? this.config.colors.danger : 
                 this.config.colors.neutral
        }
      });
    }

    /**
     * Get filtered statistics
     */
    getFilteredStats(statistics, filter) {
      if (!statistics) return {};
      
      // For overall, return base statistics
      if (filter === 'overall') {
        return statistics;
      }
      
      // For home/away, return filtered stats
      const prefix = filter === 'home' ? 'home' : 'away';
      const filtered = {};
      
      // Copy base stats
      Object.keys(statistics).forEach(key => {
        if (key.startsWith(prefix)) {
          const newKey = key.replace(prefix, '').charAt(0).toLowerCase() + key.replace(prefix, '').slice(1);
          filtered[newKey] = statistics[key];
        } else if (!key.includes('home') && !key.includes('away')) {
          filtered[key] = statistics[key];
        }
      });
      
      return filtered;
    }

    /**
     * Calculate win rate
     */
    calculateWinRate(stats) {
      const totalMatches = stats.totalMatches || 0;
      if (totalMatches === 0) return 0;
      return Math.round((stats.wins / totalMatches) * 100);
    }

    /**
     * Calculate attack rating
     */
    calculateAttackRating(stats) {
      const goalsPerMatch = stats.goalsPerMatch || 0;
      const shotsOnTarget = stats.shotsOnTargetPercentage || 0;
      const conversionRate = stats.conversionRate || 0;
      
      // Weighted average
      return Math.min(100, Math.round(
        (goalsPerMatch * 20) + 
        (shotsOnTarget * 0.5) + 
        (conversionRate * 1.5)
      ));
    }

    /**
     * Calculate defense rating
     */
    calculateDefenseRating(stats) {
      const cleanSheetPercentage = stats.cleanSheetPercentage || 0;
      const goalsConcededPerMatch = stats.goalsConcededPerMatch || 0;
      
      // Inverse rating for goals conceded
      const defenseScore = 100 - (goalsConcededPerMatch * 25);
      
      return Math.max(0, Math.min(100, Math.round(
        (defenseScore * 0.6) + (cleanSheetPercentage * 0.4)
      )));
    }

    /**
     * Calculate efficiency rating
     */
    calculateEfficiencyRating(stats) {
      const ppg = stats.pointsPerGame || 0;
      const conversionRate = stats.conversionRate || 0;
      
      return Math.min(100, Math.round(
        (ppg / 3 * 50) + (conversionRate * 0.5)
      ));
    }

    /**
     * Calculate discipline rating
     */
    calculateDisciplineRating(stats) {
      const yellowPerMatch = stats.yellowCardsPerMatch || 0;
      const redCards = stats.redCards || 0;
      const foulsPerGame = stats.foulsPerGame || 0;
      
      // Inverse rating - fewer cards/fouls = higher rating
      const disciplineScore = 100 - (yellowPerMatch * 15) - (redCards * 10) - (foulsPerGame * 2);
      
      return Math.max(0, Math.min(100, Math.round(disciplineScore)));
    }

    /**
     * Calculate form rating
     */
    calculateFormRating(stats) {
      const recentForm = stats.recentForm || '';
      const formArray = recentForm.split('').slice(0, 5);
      
      if (formArray.length === 0) return 50;
      
      let points = 0;
      formArray.forEach((result, index) => {
        const weight = 1 + (index * 0.2); // Recent matches weighted more
        if (result === 'W') points += 3 * weight;
        else if (result === 'D') points += 1 * weight;
      });
      
      const maxPoints = formArray.reduce((sum, _, index) => sum + 3 * (1 + index * 0.2), 0);
      return Math.round((points / maxPoints) * 100);
    }

    /**
     * Format goal difference
     */
    formatGoalDifference(stats) {
      const diff = (stats.goalsScored || 0) - (stats.goalsConceded || 0);
      return diff > 0 ? `+${diff}` : `${diff}`;
    }

    /**
     * Get position color
     */
    getPositionColor(position) {
      if (position === '-' || !position) return this.config.colors.neutral;
      const pos = parseInt(position);
      if (pos <= 3) return this.config.colors.success;
      if (pos <= 6) return this.config.colors.primary;
      if (pos >= 18) return this.config.colors.danger;
      return this.config.colors.neutral;
    }

    /**
     * Get position suffix
     */
    getPositionSuffix(position) {
      if (position === '-' || !position) return '';
      const pos = parseInt(position);
      if (pos === 1) return 'st';
      if (pos === 2) return 'nd';
      if (pos === 3) return 'rd';
      return 'th';
    }

    /**
     * Get win rate color
     */
    getWinRateColor(winRate) {
      if (winRate >= 60) return this.config.colors.success;
      if (winRate >= 40) return this.config.colors.warning;
      return this.config.colors.danger;
    }

    /**
     * Get goal difference color
     */
    getGoalDifferenceColor(stats) {
      const diff = (stats.goalsScored || 0) - (stats.goalsConceded || 0);
      if (diff > 0) return this.config.colors.success;
      if (diff < 0) return this.config.colors.danger;
      return this.config.colors.neutral;
    }

    /**
     * Get result color
     */
    getResultColor(result) {
      switch(result) {
        case 'W': return this.config.colors.success;
        case 'D': return this.config.colors.warning;
        case 'L': return this.config.colors.danger;
        default: return this.config.colors.neutral;
      }
    }

    /**
     * Get trend indicators
     */
    getPositionTrend(stats) {
      if (!stats.positionChange) return null;
      const change = stats.positionChange;
      if (change > 0) return { direction: 'up', icon: '↑', text: `+${change}` };
      if (change < 0) return { direction: 'down', icon: '↓', text: `${change}` };
      return { direction: 'stable', icon: '→', text: '0' };
    }

    getPointsTrend(stats) {
      const last5PPG = stats.last5PPG || 0;
      const seasonPPG = stats.pointsPerGame || 0;
      if (last5PPG > seasonPPG) return { direction: 'up', icon: '📈', text: 'Improving' };
      if (last5PPG < seasonPPG) return { direction: 'down', icon: '📉', text: 'Declining' };
      return { direction: 'stable', icon: '➡️', text: 'Stable' };
    }

    getWinRateTrend(stats) {
      const recentForm = stats.recentForm || '';
      const last5 = recentForm.slice(0, 5);
      const wins = (last5.match(/W/g) || []).length;
      const last5WinRate = (wins / 5) * 100;
      const seasonWinRate = this.calculateWinRate(stats);
      
      if (last5WinRate > seasonWinRate) return { direction: 'up', icon: '↑', text: 'Hot streak' };
      if (last5WinRate < seasonWinRate) return { direction: 'down', icon: '↓', text: 'Poor form' };
      return { direction: 'stable', icon: '→', text: 'Consistent' };
    }

    getGoalDifferenceTrend(stats) {
      const last5GD = stats.last5GoalDifference || 0;
      const seasonGD = (stats.goalsScored || 0) - (stats.goalsConceded || 0);
      const avgGD = stats.totalMatches ? seasonGD / stats.totalMatches : 0;
      const last5AvgGD = last5GD / 5;
      
      if (last5AvgGD > avgGD) return { direction: 'up', icon: '↑', text: 'Improving' };
      if (last5AvgGD < avgGD) return { direction: 'down', icon: '↓', text: 'Declining' };
      return { direction: 'stable', icon: '→', text: 'Stable' };
    }

    /**
     * Handle filter change
     */
    handleFilterChange(data) {
      if (data.filterType === 'statistics') {
        this.state.activeFilter = data.value;
      }
    }

    /**
     * Handle data update
     */
    handleDataUpdate(data) {
      // Re-render if we have an active container
      if (this.state.activeContainer && data.statistics) {
        this.renderStatisticsSection(
          this.state.activeContainer,
          data.statistics,
          { filter: data.filter || this.state.activeFilter }
        );
      }
    }

    /**
     * Handle metric change
     */
    handleMetricChange(data) {
      this.state.selectedMetric = data.metric;
    }

    /**
     * Export data
     */
    exportData(statistics, format = 'json') {
      const data = this.getFilteredStats(statistics, this.state.activeFilter);
      
      if (format === 'json') {
        return JSON.stringify(data, null, 2);
      } else if (format === 'csv') {
        // Convert to CSV format
        const rows = [];
        rows.push(['Metric', 'Value']);
        
        Object.entries(data).forEach(([key, value]) => {
          if (typeof value !== 'object') {
            rows.push([key, value]);
          }
        });
        
        return rows.map(row => row.join(',')).join('\n');
      }
      
      return data;
    }

    /**
     * Destroy module
     */
    destroy() {
      // Remove event listeners
      if (this.eventBus) {
        this.eventBus.off('filter:changed', this.handleFilterChange.bind(this));
        this.eventBus.off('data:statistics:updated', this.handleDataUpdate.bind(this));
        this.eventBus.off('view:statistics:metric', this.handleMetricChange.bind(this));
      }

      // Clear state
      this.state.activeContainer = null;
      this.initialized = false;
      
    }
  }

  // Create and export singleton instance
  const statisticsDisplay = new StatisticsDisplay();
  
  // Auto-initialize if dependencies are available
  if (global.TeamStatsEventBus && global.TeamStatsStateManager) {
    statisticsDisplay.initialize();
  }

  // Export to global scope
  global.TeamStatsStatisticsDisplay = statisticsDisplay;


})(window);