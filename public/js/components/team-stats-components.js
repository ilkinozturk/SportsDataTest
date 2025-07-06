/**
 * Team Stats Specific Components
 * Custom components for the team statistics application
 */

(function(global) {
  'use strict';

  // Check dependencies
  if (!global.TeamStatsComponents) {
    throw new Error('Team Stats Components requires Components module');
  }

  /**
   * Stats Card Component
   * Displays a single statistic with label and value
   */
  TeamStatsComponents.register('stats-card', {
    template: `
      <div class="stats-card {{variant}}" data-stat="{{statKey}}">
        <div class="stat-header">
          {{#if icon}}<span class="stat-icon">{{icon}}</span>{{/if}}
          <span class="stat-label">{{label}}</span>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{value}}</div>
          {{#if subValue}}
            <div class="stat-subvalue">{{subValue}}</div>
          {{/if}}
          {{#if change}}
            <div class="stat-change {{changeType}}">
              {{#if (eq changeType 'positive')}}↑{{/if}}
              {{#if (eq changeType 'negative')}}↓{{/if}}
              {{change}}
            </div>
          {{/if}}
        </div>
        {{#if showTrend}}
          <div class="stat-trend">
            <canvas id="trend-{{statKey}}" width="100" height="30"></canvas>
          </div>
        {{/if}}
      </div>
    `,
    styles: `
      .stats-card {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        padding: 16px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        transition: all 0.3s ease;
      }
      .stats-card:hover {
        background: rgba(255, 255, 255, 0.08);
        transform: translateY(-2px);
      }
      .stat-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 12px;
      }
      .stat-icon {
        font-size: 20px;
      }
      .stat-label {
        color: #999;
        font-size: 14px;
        text-transform: uppercase;
      }
      .stat-value {
        font-size: 32px;
        font-weight: bold;
        color: #fff;
        line-height: 1;
      }
      .stat-subvalue {
        color: #666;
        font-size: 14px;
        margin-top: 4px;
      }
      .stat-change {
        display: inline-block;
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 12px;
        margin-top: 8px;
      }
      .stat-change.positive {
        background: rgba(76, 175, 80, 0.2);
        color: #4CAF50;
      }
      .stat-change.negative {
        background: rgba(244, 67, 54, 0.2);
        color: #f44336;
      }
      .stats-card.primary { border-color: #2196F3; }
      .stats-card.success { border-color: #4CAF50; }
      .stats-card.warning { border-color: #ff9800; }
      .stats-card.danger { border-color: #f44336; }
    `,
    props: {
      label: 'Statistic',
      value: '0',
      subValue: null,
      icon: null,
      change: null,
      changeType: null,
      variant: 'default',
      statKey: '',
      showTrend: false
    }
  });

  /**
   * Match Row Component
   * Displays a single match result
   */
  TeamStatsComponents.register('match-row', {
    template: `
      <div class="match-row {{resultClass}}" data-match-id="{{match.id}}">
        <div class="match-date">{{formatDate match.date}}</div>
        <div class="match-teams">
          <span class="home-team {{#if match.isHome}}strong{{/if}}">
            {{match.homeTeam}}
          </span>
          <span class="match-score">{{match.score}}</span>
          <span class="away-team {{#unless match.isHome}}strong{{/if}}">
            {{match.awayTeam}}
          </span>
        </div>
        <div class="match-result">
          <span class="result-badge {{resultClass}}">{{result}}</span>
        </div>
        {{#if showDetails}}
          <div class="match-details">
            <button class="details-btn" data-action="toggle-details">
              <span class="icon">📊</span>
            </button>
          </div>
        {{/if}}
      </div>
    `,
    styles: `
      .match-row {
        display: grid;
        grid-template-columns: 100px 1fr 80px 50px;
        gap: 16px;
        padding: 12px 16px;
        background: rgba(255, 255, 255, 0.02);
        border-radius: 8px;
        align-items: center;
        transition: all 0.2s ease;
        cursor: pointer;
      }
      .match-row:hover {
        background: rgba(255, 255, 255, 0.05);
      }
      .match-date {
        color: #999;
        font-size: 14px;
      }
      .match-teams {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .home-team, .away-team {
        flex: 1;
      }
      .home-team {
        text-align: right;
      }
      .home-team.strong, .away-team.strong {
        font-weight: bold;
        color: #fff;
      }
      .match-score {
        padding: 4px 12px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 4px;
        font-weight: bold;
      }
      .result-badge {
        padding: 4px 12px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: bold;
        text-transform: uppercase;
      }
      .result-badge.win {
        background: rgba(76, 175, 80, 0.2);
        color: #4CAF50;
      }
      .result-badge.draw {
        background: rgba(255, 152, 0, 0.2);
        color: #ff9800;
      }
      .result-badge.loss {
        background: rgba(244, 67, 54, 0.2);
        color: #f44336;
      }
      .details-btn {
        background: none;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 4px;
        padding: 4px 8px;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .details-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        border-color: rgba(255, 255, 255, 0.3);
      }
    `,
    props: {
      match: null,
      showDetails: true
    },
    computed: {
      result() {
        const match = this.props.match;
        if (!match) return '';
        
        const [homeScore, awayScore] = match.score.split('-').map(Number);
        if (match.isHome) {
          return homeScore > awayScore ? 'WIN' : homeScore < awayScore ? 'LOSS' : 'DRAW';
        } else {
          return awayScore > homeScore ? 'WIN' : awayScore < homeScore ? 'LOSS' : 'DRAW';
        }
      },
      resultClass() {
        const result = this.result;
        return result.toLowerCase();
      }
    },
    mounted() {
      // Add click handler for details toggle
      TeamStatsUIEvents.on(this.element, 'click', '[data-action="toggle-details"]', (e) => {
        e.stopPropagation();
        TeamStatsEventBus.emit('match:toggle-details', this.props.match);
      });
    }
  });

  /**
   * Filter Button Group Component
   * Reusable filter buttons for different statistics
   */
  TeamStatsComponents.register('filter-group', {
    template: `
      <div class="filter-group" data-filter-type="{{filterType}}">
        {{#each filters}}
          <button class="filter-btn {{#if (eq ../activeFilter value)}}active{{/if}}" 
                  data-filter="{{value}}">
            {{label}}
          </button>
        {{/each}}
      </div>
    `,
    styles: `
      .filter-group {
        display: flex;
        gap: 8px;
        margin-bottom: 16px;
      }
      .filter-btn {
        padding: 8px 16px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 4px;
        color: #999;
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: 14px;
      }
      .filter-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
      }
      .filter-btn.active {
        background: #2196F3;
        border-color: #2196F3;
        color: #fff;
      }
    `,
    props: {
      filterType: 'current',
      filters: [
        { label: 'Overall', value: 'overall' },
        { label: 'Home', value: 'home' },
        { label: 'Away', value: 'away' }
      ],
      activeFilter: 'overall'
    },
    mounted() {
      // Subscribe to filter changes
      this.unsubscribe = TeamStatsStateManager.subscribe('filters', (filters) => {
        this.update({ activeFilter: filters[this.props.filterType] });
      });

      // Add click handlers
      TeamStatsUIEvents.delegate(this.element, 'click', '.filter-btn', (e) => {
        const value = e.target.dataset.filter;
        TeamStatsEventBus.emit('filter:change', {
          type: this.props.filterType,
          value: value
        });
      });
    },
    destroyed() {
      if (this.unsubscribe) this.unsubscribe();
    }
  });

  /**
   * Stats Grid Component
   * Grid layout for statistics cards
   */
  TeamStatsComponents.register('stats-grid', {
    template: `
      <div class="stats-grid {{columns}}">
        {{#each stats}}
          <div class="grid-item">
            {{> statsCard this}}
          </div>
        {{/each}}
      </div>
    `,
    styles: `
      .stats-grid {
        display: grid;
        gap: 16px;
        margin-bottom: 24px;
      }
      .stats-grid.two-columns {
        grid-template-columns: repeat(2, 1fr);
      }
      .stats-grid.three-columns {
        grid-template-columns: repeat(3, 1fr);
      }
      .stats-grid.four-columns {
        grid-template-columns: repeat(4, 1fr);
      }
      @media (max-width: 768px) {
        .stats-grid {
          grid-template-columns: 1fr !important;
        }
      }
    `,
    props: {
      stats: [],
      columns: 'four-columns'
    },
    beforeMount() {
      // Register stats card as partial
      TeamStatsRenderer.registerPartial('statsCard', 
        TeamStatsComponents.get('stats-card').template
      );
    }
  });

  /**
   * Progress Ring Component
   * Circular progress indicator
   */
  TeamStatsComponents.register('progress-ring', {
    template: `
      <div class="progress-ring">
        <svg width="{{size}}" height="{{size}}">
          <circle
            class="progress-ring-bg"
            cx="{{halfSize}}"
            cy="{{halfSize}}"
            r="{{radius}}"
            stroke-width="{{strokeWidth}}"
          />
          <circle
            class="progress-ring-fill"
            cx="{{halfSize}}"
            cy="{{halfSize}}"
            r="{{radius}}"
            stroke-width="{{strokeWidth}}"
            stroke-dasharray="{{circumference}}"
            stroke-dashoffset="{{dashOffset}}"
            stroke="{{color}}"
          />
        </svg>
        <div class="progress-ring-content">
          <div class="progress-value">{{value}}{{unit}}</div>
          {{#if label}}<div class="progress-label">{{label}}</div>{{/if}}
        </div>
      </div>
    `,
    styles: `
      .progress-ring {
        position: relative;
        display: inline-block;
      }
      .progress-ring svg {
        transform: rotate(-90deg);
      }
      .progress-ring-bg {
        fill: none;
        stroke: rgba(255, 255, 255, 0.1);
      }
      .progress-ring-fill {
        fill: none;
        transition: stroke-dashoffset 0.5s ease;
      }
      .progress-ring-content {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        text-align: center;
      }
      .progress-value {
        font-size: 24px;
        font-weight: bold;
        color: #fff;
      }
      .progress-label {
        font-size: 12px;
        color: #999;
        margin-top: 4px;
      }
    `,
    props: {
      value: 0,
      max: 100,
      size: 120,
      strokeWidth: 8,
      color: '#2196F3',
      label: '',
      unit: '%'
    },
    computed: {
      halfSize() {
        return this.props.size / 2;
      },
      radius() {
        return (this.props.size - this.props.strokeWidth) / 2;
      },
      circumference() {
        return 2 * Math.PI * this.radius;
      },
      dashOffset() {
        const progress = Math.min(this.props.value / this.props.max, 1);
        return this.circumference * (1 - progress);
      }
    }
  });

  console.log('Team Stats Components registered');

})(window);