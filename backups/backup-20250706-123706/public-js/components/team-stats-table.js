/**
 * Team Stats Table Component
 * Displays detailed statistics in table format
 */

(function(global) {
  'use strict';

  // Register main stats table component
  TeamStatsComponents.register('team-stats-table', {
    template: `
      <div class="stats-table-container">
        {{#if loading}}
          <div class="loading-state">
            <div class="skeleton-box" style="height: 40px; margin-bottom: 8px;"></div>
            <div class="skeleton-box" style="height: 40px; margin-bottom: 8px;"></div>
            <div class="skeleton-box" style="height: 40px;"></div>
          </div>
        {{else}}
          <table class="stats-table">
            <thead>
              <tr>
                <th>Statistic</th>
                <th class="text-center">Overall</th>
                <th class="text-center">Home</th>
                <th class="text-center">Away</th>
              </tr>
            </thead>
            <tbody>
              {{#each rows}}
                <tr class="{{rowClass}}">
                  <td class="stat-name">
                    {{#if icon}}<span class="stat-icon">{{icon}}</span>{{/if}}
                    {{label}}
                  </td>
                  <td class="text-center {{getValueClass overall}}">{{formatValue overall type}}</td>
                  <td class="text-center {{getValueClass home}}">{{formatValue home type}}</td>
                  <td class="text-center {{getValueClass away}}">{{formatValue away type}}</td>
                </tr>
              {{/each}}
            </tbody>
          </table>
        {{/if}}
      </div>
    `,
    styles: `
      .stats-table-container {
        overflow-x: auto;
      }
      .stats-table {
        width: 100%;
        border-collapse: collapse;
      }
      .stats-table th,
      .stats-table td {
        padding: 12px 16px;
        text-align: left;
        border-bottom: 1px solid rgba(255,255,255,0.05);
      }
      .stats-table th {
        background: rgba(255,255,255,0.03);
        font-weight: 600;
        color: #999;
        text-transform: uppercase;
        font-size: 12px;
        letter-spacing: 0.5px;
      }
      .stats-table td {
        color: #fff;
      }
      .stat-name {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .stat-icon {
        font-size: 16px;
      }
      .text-center {
        text-align: center;
      }
      .value-high {
        color: #4CAF50;
        font-weight: 600;
      }
      .value-low {
        color: #f44336;
        font-weight: 600;
      }
      .value-neutral {
        color: #ff9800;
      }
      .stats-table tr:hover {
        background: rgba(255,255,255,0.02);
      }
      .row-header {
        background: rgba(255,255,255,0.03);
        font-weight: 600;
      }
      .loading-state {
        padding: 20px;
      }
    `,
    props: {
      loading: false,
      rows: []
    },
    mounted() {
      // Subscribe to statistics updates
      this.unsubscribe = TeamStatsStateManager.subscribe('globalStatistics', (stats) => {
        if (stats) {
          this.updateTableData(stats);
        }
      });

      // Initial load
      const stats = TeamStatsStateManager.getState().globalStatistics;
      if (stats) {
        this.updateTableData(stats);
      }
    },
    methods: {
      updateTableData(stats) {
        const rows = [
          {
            label: 'Matches Played',
            overall: stats.matches,
            home: stats.homeMatches,
            away: stats.awayMatches,
            type: 'number',
            rowClass: 'row-header'
          },
          {
            label: 'Wins',
            overall: stats.wins,
            home: stats.homeWins,
            away: stats.awayWins,
            type: 'number',
            icon: '✅'
          },
          {
            label: 'Draws',
            overall: stats.draws,
            home: stats.homeDraws,
            away: stats.awayDraws,
            type: 'number',
            icon: '🤝'
          },
          {
            label: 'Losses',
            overall: stats.losses,
            home: stats.homeLosses,
            away: stats.awayLosses,
            type: 'number',
            icon: '❌'
          },
          {
            label: 'Win Rate',
            overall: (stats.wins / stats.matches * 100),
            home: (stats.homeWins / stats.homeMatches * 100),
            away: (stats.awayWins / stats.awayMatches * 100),
            type: 'percentage',
            icon: '📊'
          },
          {
            label: 'Points Per Game',
            overall: stats.ppg,
            home: stats.homePpg,
            away: stats.awayPpg,
            type: 'decimal',
            icon: '📈'
          },
          {
            label: 'Goals Scored',
            overall: stats.goalsFor,
            home: stats.homeGoalsFor,
            away: stats.awayGoalsFor,
            type: 'number',
            rowClass: 'row-header'
          },
          {
            label: 'Goals Conceded',
            overall: stats.goalsAgainst,
            home: stats.homeGoalsAgainst,
            away: stats.awayGoalsAgainst,
            type: 'number'
          },
          {
            label: 'Goals Per Match',
            overall: stats.goalsFor / stats.matches,
            home: stats.homeGoalsFor / stats.homeMatches,
            away: stats.awayGoalsFor / stats.awayMatches,
            type: 'decimal'
          },
          {
            label: 'Clean Sheets',
            overall: stats.cleanSheets,
            home: stats.homeCleanSheets,
            away: stats.awayCleanSheets,
            type: 'number',
            icon: '🛡️'
          },
          {
            label: 'Failed to Score',
            overall: stats.failedToScore,
            home: stats.homeFailedToScore,
            away: stats.awayFailedToScore,
            type: 'number'
          }
        ];

        this.update({ rows, loading: false });
      }
    },
    destroyed() {
      if (this.unsubscribe) this.unsubscribe();
    }
  });

  // Register table helpers
  TeamStatsRenderer.registerHelper('formatValue', (value, type) => {
    if (value === null || value === undefined) return '-';
    
    switch (type) {
      case 'percentage':
        return Math.round(value) + '%';
      case 'decimal':
        return value.toFixed(2);
      case 'number':
      default:
        return value.toString();
    }
  });

  TeamStatsRenderer.registerHelper('getValueClass', (value) => {
    if (!value && value !== 0) return '';
    
    // Context-specific logic could go here
    // For now, return neutral
    return '';
  });

  // Goal Statistics Table Component
  TeamStatsComponents.register('goal-stats-table', {
    template: `
      <div class="goal-stats-section">
        <div class="section-header">
          <h3 class="section-title">Goal Statistics</h3>
          <div class="filter-container">
            {{> filterGroup filterType="goals" activeFilter=activeFilter}}
          </div>
        </div>
        <div class="stats-grid three-columns">
          {{#each goalStats}}
            <div class="stat-card mini">
              <div class="stat-label">{{label}}</div>
              <div class="stat-value">{{value}}</div>
              {{#if percentage}}
                <div class="stat-percentage">{{percentage}}%</div>
              {{/if}}
            </div>
          {{/each}}
        </div>
      </div>
    `,
    styles: `
      .goal-stats-section {
        margin-bottom: 24px;
      }
      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }
      .section-title {
        font-size: 18px;
        font-weight: 600;
        margin: 0;
      }
      .stat-card.mini {
        padding: 12px;
        text-align: center;
      }
      .stat-card.mini .stat-label {
        font-size: 12px;
        margin-bottom: 8px;
      }
      .stat-card.mini .stat-value {
        font-size: 24px;
        margin-bottom: 4px;
      }
      .stat-percentage {
        font-size: 14px;
        color: #999;
      }
    `,
    props: {
      activeFilter: 'overall',
      goalStats: []
    },
    mounted() {
      // Subscribe to filter changes
      this.filterUnsub = TeamStatsStateManager.subscribe('filters', (filters) => {
        this.update({ activeFilter: filters.goals || 'overall' });
        this.updateGoalStats();
      });

      // Subscribe to statistics
      this.statsUnsub = TeamStatsStateManager.subscribe('globalStatistics', () => {
        this.updateGoalStats();
      });

      // Register filter group partial
      TeamStatsRenderer.registerPartial('filterGroup',
        TeamStatsComponents.get('filter-group').template
      );

      this.updateGoalStats();
    },
    methods: {
      updateGoalStats() {
        const stats = TeamStatsStateManager.getState().globalStatistics;
        const filter = this.props.activeFilter;
        
        if (!stats) return;

        const prefix = filter === 'home' ? 'home' : filter === 'away' ? 'away' : '';
        const getStatValue = (stat) => {
          return prefix ? stats[prefix + stat.charAt(0).toUpperCase() + stat.slice(1)] : stats[stat];
        };

        const matches = getStatValue('matches');
        const goalsFor = getStatValue('goalsFor');
        const goalsAgainst = getStatValue('goalsAgainst');

        const goalStats = [
          {
            label: 'Total Goals',
            value: goalsFor + goalsAgainst
          },
          {
            label: 'Goals For',
            value: goalsFor,
            percentage: Math.round((goalsFor / (goalsFor + goalsAgainst)) * 100)
          },
          {
            label: 'Goals Against',
            value: goalsAgainst,
            percentage: Math.round((goalsAgainst / (goalsFor + goalsAgainst)) * 100)
          },
          {
            label: 'Avg Goals For',
            value: (goalsFor / matches).toFixed(2)
          },
          {
            label: 'Avg Goals Against',
            value: (goalsAgainst / matches).toFixed(2)
          },
          {
            label: 'Goal Difference',
            value: goalsFor - goalsAgainst > 0 ? `+${goalsFor - goalsAgainst}` : goalsFor - goalsAgainst
          }
        ];

        this.update({ goalStats });
      }
    },
    destroyed() {
      if (this.filterUnsub) this.filterUnsub();
      if (this.statsUnsub) this.statsUnsub();
    }
  });

  console.log('Team Stats Table Components registered');

})(window);