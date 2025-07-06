/**
 * Match List Component
 * Displays team's recent matches with filtering and details
 */

(function(global) {
  'use strict';

  // Main Match List Component
  TeamStatsComponents.register('match-list', {
    template: `
      <div class="match-list-component">
        <div class="match-list-header">
          <div class="filter-section">
            <select class="match-filter" data-filter="competition">
              <option value="all">All Competitions</option>
              {{#each competitions}}
                <option value="{{id}}">{{name}}</option>
              {{/each}}
            </select>
            <select class="match-filter" data-filter="result">
              <option value="all">All Results</option>
              <option value="win">Wins</option>
              <option value="draw">Draws</option>
              <option value="loss">Losses</option>
            </select>
          </div>
          <div class="match-stats">
            <span class="stat">
              <strong>{{filteredMatches.length}}</strong> matches
            </span>
            <span class="stat">
              <strong>{{stats.wins}}</strong> W
            </span>
            <span class="stat">
              <strong>{{stats.draws}}</strong> D
            </span>
            <span class="stat">
              <strong>{{stats.losses}}</strong> L
            </span>
          </div>
        </div>
        
        {{#if loading}}
          <div class="loading-matches">
            {{#each [1,2,3,4,5]}}
              <div class="skeleton-box" style="height: 60px; margin-bottom: 8px;"></div>
            {{/each}}
          </div>
        {{else if error}}
          <div class="error-state">
            <p>Failed to load matches: {{error}}</p>
            <button class="retry-btn" data-action="retry">Retry</button>
          </div>
        {{else if (eq filteredMatches.length 0)}}
          <div class="empty-state">
            <p>No matches found with current filters</p>
          </div>
        {{else}}
          <div class="matches-container">
            {{#each filteredMatches}}
              {{> matchRow match=this showDetails=../showDetails}}
            {{/each}}
          </div>
          {{#if hasMore}}
            <div class="load-more">
              <button class="load-more-btn" data-action="load-more">
                Load More Matches
              </button>
            </div>
          {{/if}}
        {{/if}}
        
        <!-- Match Details Modal -->
        {{#if selectedMatch}}
          <div class="match-details-modal" data-match-id="{{selectedMatch.id}}">
            {{> matchDetails match=selectedMatch}}
          </div>
        {{/if}}
      </div>
    `,
    styles: `
      .match-list-component {
        position: relative;
      }
      .match-list-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        flex-wrap: wrap;
        gap: 16px;
      }
      .filter-section {
        display: flex;
        gap: 12px;
      }
      .match-filter {
        padding: 8px 12px;
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 4px;
        color: #fff;
        cursor: pointer;
      }
      .match-filter:hover {
        background: rgba(255,255,255,0.1);
      }
      .match-stats {
        display: flex;
        gap: 16px;
        font-size: 14px;
        color: #999;
      }
      .match-stats .stat strong {
        color: #fff;
      }
      .matches-container {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .loading-matches {
        padding: 20px 0;
      }
      .error-state,
      .empty-state {
        text-align: center;
        padding: 40px;
        color: #999;
      }
      .retry-btn,
      .load-more-btn {
        padding: 10px 20px;
        background: #2196F3;
        border: none;
        border-radius: 4px;
        color: #fff;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .retry-btn:hover,
      .load-more-btn:hover {
        background: #1976D2;
      }
      .load-more {
        text-align: center;
        margin-top: 20px;
      }
      .match-details-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        animation: fadeIn 0.2s ease;
      }
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
    `,
    props: {
      matches: [],
      loading: false,
      error: null,
      showDetails: true,
      limit: 20,
      filters: {
        competition: 'all',
        result: 'all'
      }
    },
    state: {
      filteredMatches: [],
      displayedCount: 20,
      selectedMatch: null,
      competitions: [],
      stats: { wins: 0, draws: 0, losses: 0 }
    },
    computed: {
      hasMore() {
        return this.state.filteredMatches.length > this.state.displayedCount;
      }
    },
    mounted() {
      // Register partials
      TeamStatsRenderer.registerPartial('matchRow',
        TeamStatsComponents.get('match-row').template
      );
      
      // Subscribe to team data
      this.unsubscribe = TeamStatsStateManager.subscribe('globalStatistics', (stats) => {
        if (stats && stats.matches) {
          this.loadMatches();
        }
      });

      // Event listeners
      TeamStatsEventBus.on('match:toggle-details', this.handleMatchDetails.bind(this));
      
      // Filter change handlers
      TeamStatsUIEvents.delegate(this.element, 'change', '.match-filter', (e) => {
        const filterType = e.target.dataset.filter;
        const value = e.target.value;
        this.updateFilter(filterType, value);
      });

      // Action handlers
      TeamStatsUIEvents.delegate(this.element, 'click', '[data-action]', (e) => {
        const action = e.target.dataset.action;
        this.handleAction(action);
      });

      // Click outside to close modal
      TeamStatsUIEvents.on(this.element, 'click', '.match-details-modal', (e) => {
        if (e.target.classList.contains('match-details-modal')) {
          this.setState({ selectedMatch: null });
        }
      });

      // Initial load
      this.loadMatches();
    },
    methods: {
      async loadMatches() {
        try {
          this.update({ loading: true, error: null });
          
          // Get matches from state or API
          const teamId = TeamStatsStateManager.getState().teamId;
          const statistics = TeamStatsStateManager.getState().globalStatistics;
          
          // In production, matches would come from API
          // For now, show empty state
          const matches = [];
          
          this.update({ matches, loading: false });
          this.filterMatches();
          this.extractCompetitions();
        } catch (error) {
          this.update({ loading: false, error: error.message });
        }
      },

      filterMatches() {
        let filtered = [...this.props.matches];
        const { competition, result } = this.props.filters;

        // Filter by competition
        if (competition !== 'all') {
          filtered = filtered.filter(m => m.competitionId === competition);
        }

        // Filter by result
        if (result !== 'all') {
          filtered = filtered.filter(m => {
            const matchResult = this.getMatchResult(m);
            return matchResult.toLowerCase() === result;
          });
        }

        // Calculate stats
        const stats = {
          wins: filtered.filter(m => this.getMatchResult(m) === 'win').length,
          draws: filtered.filter(m => this.getMatchResult(m) === 'draw').length,
          losses: filtered.filter(m => this.getMatchResult(m) === 'loss').length
        };

        // Update state
        this.setState({ 
          filteredMatches: filtered,
          displayedCount: Math.min(this.props.limit, filtered.length),
          stats
        });
      },

      getMatchResult(match) {
        const [homeScore, awayScore] = match.score.split('-').map(Number);
        if (match.isHome) {
          return homeScore > awayScore ? 'win' : homeScore < awayScore ? 'loss' : 'draw';
        } else {
          return awayScore > homeScore ? 'win' : awayScore < homeScore ? 'loss' : 'draw';
        }
      },

      extractCompetitions() {
        const competitions = [];
        const seen = new Set();
        
        this.props.matches.forEach(match => {
          if (!seen.has(match.competitionId)) {
            seen.add(match.competitionId);
            competitions.push({
              id: match.competitionId,
              name: match.competition
            });
          }
        });
        
        this.setState({ competitions });
      },

      updateFilter(type, value) {
        const filters = { ...this.props.filters, [type]: value };
        this.update({ filters });
        this.filterMatches();
      },

      handleAction(action) {
        switch (action) {
          case 'retry':
            this.loadMatches();
            break;
          case 'load-more':
            this.setState({ 
              displayedCount: Math.min(
                this.state.displayedCount + this.props.limit,
                this.state.filteredMatches.length
              )
            });
            break;
        }
      },

      handleMatchDetails(match) {
        this.setState({ selectedMatch: match });
      }
    },
    destroyed() {
      if (this.unsubscribe) this.unsubscribe();
    }
  });

  // Match Details Component
  TeamStatsComponents.register('match-details', {
    template: `
      <div class="match-details">
        <div class="details-header">
          <h3>Match Details</h3>
          <button class="close-btn" data-action="close">×</button>
        </div>
        <div class="details-content">
          <div class="teams-score">
            <div class="team home">
              <span class="team-name">{{match.homeTeam}}</span>
              <span class="score">{{homeScore}}</span>
            </div>
            <div class="vs">VS</div>
            <div class="team away">
              <span class="score">{{awayScore}}</span>
              <span class="team-name">{{match.awayTeam}}</span>
            </div>
          </div>
          <div class="match-info">
            <div class="info-item">
              <span class="label">Date:</span>
              <span class="value">{{formatDate match.date}}</span>
            </div>
            <div class="info-item">
              <span class="label">Competition:</span>
              <span class="value">{{match.competition}}</span>
            </div>
            <div class="info-item">
              <span class="label">Attendance:</span>
              <span class="value">{{formatNumber match.attendance}}</span>
            </div>
            <div class="info-item">
              <span class="label">Referee:</span>
              <span class="value">{{match.referee}}</span>
            </div>
          </div>
        </div>
      </div>
    `,
    styles: `
      .match-details {
        background: #1a1a1a;
        border-radius: 8px;
        padding: 24px;
        max-width: 600px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
      }
      .details-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
      }
      .details-header h3 {
        margin: 0;
        font-size: 20px;
      }
      .close-btn {
        background: none;
        border: none;
        font-size: 24px;
        color: #999;
        cursor: pointer;
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .close-btn:hover {
        color: #fff;
      }
      .teams-score {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 24px;
        margin-bottom: 32px;
        padding: 24px;
        background: rgba(255,255,255,0.02);
        border-radius: 8px;
      }
      .team {
        text-align: center;
      }
      .team-name {
        display: block;
        font-size: 18px;
        margin-bottom: 8px;
      }
      .score {
        display: block;
        font-size: 36px;
        font-weight: bold;
        color: #2196F3;
      }
      .vs {
        color: #666;
        font-size: 14px;
      }
      .match-info {
        display: grid;
        gap: 16px;
      }
      .info-item {
        display: flex;
        justify-content: space-between;
        padding: 12px 0;
        border-bottom: 1px solid rgba(255,255,255,0.05);
      }
      .info-item .label {
        color: #999;
      }
      .info-item .value {
        color: #fff;
        font-weight: 500;
      }
    `,
    props: {
      match: null
    },
    computed: {
      homeScore() {
        return this.props.match?.score.split('-')[0] || '0';
      },
      awayScore() {
        return this.props.match?.score.split('-')[1] || '0';
      }
    }
  });

  // Register formatDate helper
  TeamStatsRenderer.registerHelper('formatDate', (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  });

  // Register formatNumber helper
  TeamStatsRenderer.registerHelper('formatNumber', (num) => {
    return num?.toLocaleString() || '0';
  });

  console.log('Match List Components registered');

})(window);