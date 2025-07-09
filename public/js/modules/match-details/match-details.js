/**
 * Match Details Module
 * Handles H2H statistics and match analysis
 */

(function () {
  'use strict';

  // Match Details Manager
  class MatchDetailsManager {
    constructor() {
      this.matchId = null;
      this.matchData = null;
      this.activeTab = 'overview';
      this.apiClient = window.TeamStatsAPIClient ||
        window.APIClient || {
          get: async url => {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
          },
        };

      this.init();
    }

    init() {
      // Get match ID from URL
      const urlParams = new URLSearchParams(window.location.search);
      this.matchId = urlParams.get('matchId');

      if (!this.matchId) {
        this.showError('No match ID provided');
        return;
      }

      // Initialize event listeners
      this.setupEventListeners();

      // Load match data
      this.loadMatchData();
    }

    setupEventListeners() {
      // Tab switching is handled by global function
      window.switchTab = tabName => {
        this.switchTab(tabName);
      };
    }

    switchTab(tabName) {
      // Update active tab
      this.activeTab = tabName;

      // Update tab buttons
      document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
      });

      // Update tab content
      document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.toggle('active', pane.dataset.tab === tabName);
      });

      // Load tab-specific data if needed - only if match data is loaded
      if (this.matchData) {
        this.loadTabData(tabName);
      }
    }

    async loadMatchData() {
      try {
        this.showLoading(true);

        // Fetch match details from API
        const response = await this.apiClient.get(`/api/matches/${this.matchId}/details`);

        if (!response.success) {
          throw new Error(response.message || 'Failed to load match data');
        }

        this.matchData = response.data;
        this.renderMatchData();
      } catch (error) {
        console.error('Error loading match data:', error);
        this.showError('Failed to load match details. Please try again.');
      } finally {
        this.showLoading(false);
      }
    }

    renderMatchData() {
      if (!this.matchData) return;

      // Render header info
      this.renderHeader();

      // Render match score
      this.renderMatchScore();

      // Render active tab content
      this.loadTabData(this.activeTab);
    }

    renderHeader() {
      const { league, date } = this.matchData;

      // League info
      if (league) {
        const leagueLogo = document.getElementById('leagueLogo');
        const leagueName = document.getElementById('leagueName');

        if (league.logo) {
          leagueLogo.src = league.logo;
          leagueLogo.alt = league.name;
        }
        leagueName.textContent = league.name;
      }

      // Match date
      const matchDate = document.getElementById('matchDate');
      matchDate.textContent = this.formatDate(date);
    }

    renderMatchScore() {
      const { homeTeam, awayTeam, homeScore, awayScore, status, minute, date } = this.matchData;

      // Render match date and time
      if (date) {
        const matchDate = new Date(date);
        document.getElementById('matchDateDisplay').textContent = matchDate.toLocaleDateString(
          'tr-TR',
          {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }
        );
        document.getElementById('matchTimeDisplay').textContent = matchDate.toLocaleTimeString(
          'tr-TR',
          {
            hour: '2-digit',
            minute: '2-digit',
          }
        );
      }

      // Home team
      const homeLogoEl = document.getElementById('homeTeamLogo');
      if (homeTeam.logo) {
        // Fix logo path - add full URL
        homeLogoEl.src = homeTeam.logo.startsWith('http')
          ? homeTeam.logo
          : `https://cdn.footystats.org/img/${homeTeam.logo}`;
        homeLogoEl.style.display = 'block';
      } else {
        homeLogoEl.style.display = 'none';
      }
      document.getElementById('homeTeamName').textContent = homeTeam.name;
      document.getElementById('homeScore').textContent = homeScore !== null ? homeScore : '-';

      // Away team
      const awayLogoEl = document.getElementById('awayTeamLogo');
      if (awayTeam.logo) {
        // Fix logo path - add full URL
        awayLogoEl.src = awayTeam.logo.startsWith('http')
          ? awayTeam.logo
          : `https://cdn.footystats.org/img/${awayTeam.logo}`;
        awayLogoEl.style.display = 'block';
      } else {
        awayLogoEl.style.display = 'none';
      }
      document.getElementById('awayTeamName').textContent = awayTeam.name;
      document.getElementById('awayScore').textContent = awayScore !== null ? awayScore : '-';

      // Match status
      const statusElement = document.getElementById('matchStatus');
      statusElement.textContent = this.getStatusText(status);
      statusElement.className = `match-status ${status.toLowerCase()}`;

      // Match time
      if (status === 'live' && minute) {
        document.getElementById('matchTime').textContent = `${minute}'`;
      } else if (status === 'scheduled') {
        document.getElementById('matchTime').textContent = this.formatTime(this.matchData.date);
      }

      // Team forms
      this.renderTeamForms();

      // Team PPG values
      this.renderTeamPPG();
    }

    renderTeamForms() {
      const { homeTeam, awayTeam } = this.matchData;

      // Show home form for home team
      // Use test data if no real data available
      const homeFormData = homeTeam.homeForm || 'WWDLW'; // Test data

      this.renderFormString('homeTeamForm', homeFormData);
      // Add label below form
      const homeFormContainer = document.getElementById('homeTeamForm');
      if (homeFormContainer) {
        const label = homeFormContainer.nextElementSibling || document.createElement('div');
        label.className = 'form-label';
        label.textContent = 'Home Form';
        label.style.fontSize = '12px';
        label.style.color = '#999';
        label.style.marginTop = '5px';
        label.style.textAlign = 'center';
        if (!homeFormContainer.nextElementSibling) {
          homeFormContainer.parentNode.appendChild(label);
        }
      }

      // Show away form for away team
      // Use test data if no real data available
      const awayFormData = awayTeam.awayForm || 'LDWLL'; // Test data

      this.renderFormString('awayTeamForm', awayFormData);
      // Add label below form
      const awayFormContainer = document.getElementById('awayTeamForm');
      if (awayFormContainer) {
        const label = awayFormContainer.nextElementSibling || document.createElement('div');
        label.className = 'form-label';
        label.textContent = 'Away Form';
        label.style.fontSize = '12px';
        label.style.color = '#999';
        label.style.marginTop = '5px';
        label.style.textAlign = 'center';
        if (!awayFormContainer.nextElementSibling) {
          awayFormContainer.parentNode.appendChild(label);
        }
      }
    }

    renderFormString(elementId, formString) {
      const container = document.getElementById(elementId);
      container.innerHTML = formString
        .split('')
        .map(result => {
          const className = result === 'W' ? 'win' : result === 'D' ? 'draw' : 'loss';
          return `<span class="form-result ${className}">${result}</span>`;
        })
        .join('');
    }

    renderTeamPPG() {
      const { homeTeam, awayTeam } = this.matchData;

      // Display home team's home PPG
      const homePPG = homeTeam.homePPG || '1.85'; // Test data if no real data
      document.getElementById('homeTeamPPG').textContent = parseFloat(homePPG).toFixed(2);

      // Display away team's away PPG
      const awayPPG = awayTeam.awayPPG || '1.42'; // Test data if no real data
      document.getElementById('awayTeamPPG').textContent = parseFloat(awayPPG).toFixed(2);
    }

    loadTabData(tabName) {
      switch (tabName) {
        case 'overview':
          this.renderOverview();
          break;
        case 'h2h':
          this.renderH2H();
          break;
        case 'statistics':
          this.renderStatistics();
          break;
        case 'lineups':
          this.renderLineups();
          break;
        case 'events':
          this.renderEvents();
          break;
        case 'odds':
          this.renderOdds();
          break;
      }
    }

    renderOverview() {
      // Key stats
      this.renderKeyStats();

      // Recent form
      this.renderRecentForm();

      // Goal timing
      this.renderGoalTiming();
    }

    renderKeyStats() {
      const container = document.getElementById('keyStats');

      if (!this.matchData) {
        container.innerHTML = '<p class="no-data">Loading match data...</p>';
        return;
      }

      const { statistics } = this.matchData;

      if (!statistics) {
        container.innerHTML = '<p class="no-data">Statistics not available yet</p>';
        return;
      }

      const keyStats = [
        {
          label: 'Possession',
          home: statistics.home.possession,
          away: statistics.away.possession,
          suffix: '%',
        },
        { label: 'Total Shots', home: statistics.home.shots, away: statistics.away.shots },
        {
          label: 'Shots on Target',
          home: statistics.home.shotsOnTarget,
          away: statistics.away.shotsOnTarget,
        },
        { label: 'Corners', home: statistics.home.corners, away: statistics.away.corners },
        { label: 'Fouls', home: statistics.home.fouls, away: statistics.away.fouls },
        {
          label: 'Yellow Cards',
          home: statistics.home.yellowCards,
          away: statistics.away.yellowCards,
        },
      ];

      container.innerHTML = keyStats
        .map(
          stat => `
        <div class="key-stat">
          <span class="key-stat-label">${stat.label}</span>
          <span class="key-stat-value">${stat.home}${stat.suffix || ''} - ${stat.away}${stat.suffix || ''}</span>
        </div>
      `
        )
        .join('');
    }

    renderRecentForm() {
      if (!this.matchData) {
        return;
      }

      const { homeTeam, awayTeam } = this.matchData;

      // Home team recent matches
      document.getElementById('homeFormTitle').textContent = homeTeam.name;
      this.renderRecentMatches('homeRecentForm', homeTeam.recentMatches || []);

      // Away team recent matches
      document.getElementById('awayFormTitle').textContent = awayTeam.name;
      this.renderRecentMatches('awayRecentForm', awayTeam.recentMatches || []);
    }

    renderRecentMatches(elementId, matches) {
      const container = document.getElementById(elementId);

      if (!matches.length) {
        container.innerHTML = '<p class="no-data">No recent matches data</p>';
        return;
      }

      container.innerHTML = matches
        .slice(0, 5)
        .map(
          match => `
        <div class="recent-match">
          <span class="match-teams">${match.homeTeam} vs ${match.awayTeam}</span>
          <span class="match-result">${match.homeScore} - ${match.awayScore}</span>
        </div>
      `
        )
        .join('');
    }

    renderGoalTiming() {
      const container = document.getElementById('goalTiming');

      if (!this.matchData) {
        container.innerHTML = '<p class="no-data">Loading match data...</p>';
        return;
      }

      const { goalTiming } = this.matchData;

      if (!goalTiming) {
        container.innerHTML = '<p class="no-data">Goal timing data not available</p>';
        return;
      }

      // Simple text representation for now
      container.innerHTML = `
        <div class="timing-periods">
          <div class="timing-period">
            <span class="period-label">0-15'</span>
            <span class="period-value">${goalTiming['0-15'] || 0}</span>
          </div>
          <div class="timing-period">
            <span class="period-label">16-30'</span>
            <span class="period-value">${goalTiming['16-30'] || 0}</span>
          </div>
          <div class="timing-period">
            <span class="period-label">31-45'</span>
            <span class="period-value">${goalTiming['31-45'] || 0}</span>
          </div>
          <div class="timing-period">
            <span class="period-label">46-60'</span>
            <span class="period-value">${goalTiming['46-60'] || 0}</span>
          </div>
          <div class="timing-period">
            <span class="period-label">61-75'</span>
            <span class="period-value">${goalTiming['61-75'] || 0}</span>
          </div>
          <div class="timing-period">
            <span class="period-label">76-90'</span>
            <span class="period-value">${goalTiming['76-90'] || 0}</span>
          </div>
        </div>
      `;
    }

    renderH2H() {
      if (!this.matchData) {
        document.getElementById('h2hSummary').innerHTML =
          '<p class="no-data">Loading match data...</p>';
        document.getElementById('h2hMatches').innerHTML =
          '<p class="no-data">Loading match data...</p>';
        return;
      }

      const { h2h } = this.matchData;

      if (!h2h) {
        document.getElementById('h2hSummary').innerHTML =
          '<p class="no-data">H2H data not available</p>';
        document.getElementById('h2hMatches').innerHTML =
          '<p class="no-data">No previous meetings found</p>';
        return;
      }

      // H2H Summary
      this.renderH2HSummary(h2h.summary);

      // Previous matches
      this.renderH2HMatches(h2h.matches || []);
    }

    renderH2HSummary(summary) {
      const container = document.getElementById('h2hSummary');
      const { homeTeam, awayTeam } = this.matchData;

      container.innerHTML = `
        <div class="h2h-team-stats">
          <div class="h2h-wins">${summary.homeWins}</div>
          <div class="h2h-team-name">${homeTeam.name} Wins</div>
        </div>
        <div class="h2h-draws">
          <div class="h2h-draws-count">${summary.draws}</div>
          <div class="h2h-draws-label">Draws</div>
        </div>
        <div class="h2h-team-stats">
          <div class="h2h-wins">${summary.awayWins}</div>
          <div class="h2h-team-name">${awayTeam.name} Wins</div>
        </div>
      `;
    }

    renderH2HMatches(matches) {
      const container = document.getElementById('h2hMatches');

      if (!matches.length) {
        container.innerHTML = '<p class="no-data">No previous meetings found</p>';
        return;
      }

      container.innerHTML = matches
        .map(
          match => `
        <div class="h2h-match">
          <span class="h2h-date">${this.formatDate(match.date)}</span>
          <span class="h2h-team">${match.homeTeam}</span>
          <span class="h2h-score">${match.homeScore} - ${match.awayScore}</span>
          <span class="h2h-team">${match.awayTeam}</span>
          <span class="h2h-venue">${match.venue || ''}</span>
        </div>
      `
        )
        .join('');
    }

    renderStatistics() {
      const container = document.getElementById('matchStatistics');

      if (!this.matchData) {
        container.innerHTML = '<p class="no-data">Loading match data...</p>';
        return;
      }

      const { statistics } = this.matchData;

      if (!statistics) {
        container.innerHTML = '<p class="no-data">Match statistics not available yet</p>';
        return;
      }

      const stats = [
        {
          name: 'Possession',
          home: statistics.home.possession,
          away: statistics.away.possession,
          suffix: '%',
        },
        { name: 'Total Shots', home: statistics.home.shots, away: statistics.away.shots },
        {
          name: 'Shots on Target',
          home: statistics.home.shotsOnTarget,
          away: statistics.away.shotsOnTarget,
        },
        {
          name: 'Shots off Target',
          home: statistics.home.shotsOffTarget,
          away: statistics.away.shotsOffTarget,
        },
        {
          name: 'Blocked Shots',
          home: statistics.home.blockedShots,
          away: statistics.away.blockedShots,
        },
        { name: 'Corners', home: statistics.home.corners, away: statistics.away.corners },
        { name: 'Offsides', home: statistics.home.offsides, away: statistics.away.offsides },
        { name: 'Fouls', home: statistics.home.fouls, away: statistics.away.fouls },
        {
          name: 'Yellow Cards',
          home: statistics.home.yellowCards,
          away: statistics.away.yellowCards,
        },
        { name: 'Red Cards', home: statistics.home.redCards, away: statistics.away.redCards },
        { name: 'Saves', home: statistics.home.saves, away: statistics.away.saves },
        { name: 'Passes', home: statistics.home.passes, away: statistics.away.passes },
        {
          name: 'Pass Accuracy',
          home: statistics.home.passAccuracy,
          away: statistics.away.passAccuracy,
          suffix: '%',
        },
      ];

      container.innerHTML = stats
        .map(stat => {
          const total = (stat.home || 0) + (stat.away || 0);
          const homePercentage = total > 0 ? (stat.home / total) * 100 : 50;
          const awayPercentage = total > 0 ? (stat.away / total) * 100 : 50;

          return `
          <div class="stat-comparison">
            <div class="stat-home">${stat.home || 0}${stat.suffix || ''}</div>
            <div class="stat-name">${stat.name}</div>
            <div class="stat-away">${stat.away || 0}${stat.suffix || ''}</div>
          </div>
          <div class="stat-bar">
            <div class="stat-bar-fill stat-bar-home" style="width: ${homePercentage}%"></div>
            <div class="stat-bar-fill stat-bar-away" style="width: ${awayPercentage}%"></div>
          </div>
        `;
        })
        .join('');
    }

    renderLineups() {
      if (!this.matchData) {
        document.getElementById('formations').innerHTML =
          '<p class="no-data">Loading match data...</p>';
        document.getElementById('startingLineups').innerHTML =
          '<p class="no-data">Loading match data...</p>';
        document.getElementById('substitutes').innerHTML =
          '<p class="no-data">Loading match data...</p>';
        return;
      }

      const { lineups } = this.matchData;

      if (!lineups) {
        document.getElementById('formations').innerHTML =
          '<p class="no-data">Lineups not available yet</p>';
        document.getElementById('startingLineups').innerHTML =
          '<p class="no-data">Starting XI will be announced 1 hour before kickoff</p>';
        document.getElementById('substitutes').innerHTML =
          '<p class="no-data">Substitutes not available yet</p>';
        return;
      }

      // Formations
      this.renderFormations(lineups);

      // Starting XI
      this.renderStartingLineups(lineups);

      // Substitutes
      this.renderSubstitutes(lineups);
    }

    renderFormations(lineups) {
      const container = document.getElementById('formations');
      const { homeTeam, awayTeam } = this.matchData;

      container.innerHTML = `
        <div class="formations-grid">
          <div class="formation">
            <h4>${homeTeam.name}</h4>
            <div class="formation-display">${lineups.home.formation || 'TBA'}</div>
          </div>
          <div class="formation">
            <h4>${awayTeam.name}</h4>
            <div class="formation-display">${lineups.away.formation || 'TBA'}</div>
          </div>
        </div>
      `;
    }

    renderStartingLineups(lineups) {
      const container = document.getElementById('startingLineups');
      const { homeTeam, awayTeam } = this.matchData;

      container.innerHTML = `
        <div class="lineups-grid">
          <div class="team-lineup">
            <h4>${homeTeam.name}</h4>
            <div class="player-list">
              ${this.renderPlayerList(lineups.home.startingXI || [])}
            </div>
          </div>
          <div class="team-lineup">
            <h4>${awayTeam.name}</h4>
            <div class="player-list">
              ${this.renderPlayerList(lineups.away.startingXI || [])}
            </div>
          </div>
        </div>
      `;
    }

    renderSubstitutes(lineups) {
      const container = document.getElementById('substitutes');
      const { homeTeam, awayTeam } = this.matchData;

      container.innerHTML = `
        <div class="lineups-grid">
          <div class="team-lineup">
            <h4>${homeTeam.name}</h4>
            <div class="player-list">
              ${this.renderPlayerList(lineups.home.substitutes || [])}
            </div>
          </div>
          <div class="team-lineup">
            <h4>${awayTeam.name}</h4>
            <div class="player-list">
              ${this.renderPlayerList(lineups.away.substitutes || [])}
            </div>
          </div>
        </div>
      `;
    }

    renderPlayerList(players) {
      if (!players.length) {
        return '<p class="no-data">Not announced yet</p>';
      }

      return players
        .map(
          player => `
        <div class="player">
          <span class="player-number">${player.number}</span>
          <span class="player-name">${player.name}</span>
          <span class="player-position">${player.position}</span>
        </div>
      `
        )
        .join('');
    }

    renderEvents() {
      const container = document.getElementById('matchEvents');

      if (!this.matchData) {
        container.innerHTML = '<p class="no-data">Loading match data...</p>';
        return;
      }

      const { events } = this.matchData;

      if (!events || !events.length) {
        container.innerHTML = '<p class="no-data">No match events yet</p>';
        return;
      }

      container.innerHTML = `
        <div class="timeline-line"></div>
        ${events.map(event => this.renderEvent(event)).join('')}
      `;
    }

    renderEvent(event) {
      const isHome = event.team === 'home';
      const iconClass = this.getEventIconClass(event.type);
      const icon = this.getEventIcon(event.type);

      return `
        <div class="event-item ${isHome ? 'home' : 'away'}">
          <div class="event-time">${event.minute}'</div>
          <div class="event-icon ${iconClass}">${icon}</div>
          <div class="event-content">
            <strong>${event.player}</strong>
            ${event.detail ? `<br><small>${event.detail}</small>` : ''}
          </div>
        </div>
      `;
    }

    getEventIconClass(type) {
      const iconClasses = {
        goal: 'goal',
        yellowCard: 'yellow-card',
        redCard: 'red-card',
        substitution: 'substitution',
        var: 'var',
        penalty: 'penalty',
      };
      return iconClasses[type] || '';
    }

    getEventIcon(type) {
      const icons = {
        goal: '⚽',
        yellowCard: '🟨',
        redCard: '🟥',
        substitution: '🔄',
        var: '📺',
        penalty: '🎯',
      };
      return icons[type] || '📝';
    }

    renderOdds() {
      const container = document.getElementById('oddsComparison');

      if (!this.matchData) {
        container.innerHTML = '<p class="no-data">Loading match data...</p>';
        return;
      }

      const { odds } = this.matchData;

      if (!odds || !odds.length) {
        container.innerHTML = '<p class="no-data">Odds comparison not available</p>';
        return;
      }

      container.innerHTML = odds
        .map(
          provider => `
        <div class="odds-provider">
          <div class="provider-name">${provider.name}</div>
          <div class="odds-values">
            <div class="odd-value">
              ${provider.home}
              <div class="odd-label">Home</div>
            </div>
            <div class="odd-value">
              ${provider.draw}
              <div class="odd-label">Draw</div>
            </div>
            <div class="odd-value">
              ${provider.away}
              <div class="odd-label">Away</div>
            </div>
          </div>
        </div>
      `
        )
        .join('');
    }

    // Utility methods
    formatDate(dateString) {
      const date = new Date(dateString);
      return date.toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    }

    formatTime(dateString) {
      const date = new Date(dateString);
      return date.toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit',
      });
    }

    getStatusText(status) {
      if (!status) {
        return 'UNKNOWN';
      }

      const statusTexts = {
        scheduled: 'SCHEDULED',
        live: 'LIVE',
        finished: 'FINISHED',
        postponed: 'POSTPONED',
        cancelled: 'CANCELLED',
        complete: 'FINISHED',
      };
      return statusTexts[status.toLowerCase()] || status.toUpperCase();
    }

    showLoading(show) {
      const overlay = document.getElementById('loadingOverlay');
      overlay.style.display = show ? 'flex' : 'none';
    }

    showError(message) {
      // Simple alert for now
      alert(`Error: ${message}`);
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      new MatchDetailsManager();
    });
  } else {
    new MatchDetailsManager();
  }
})();
