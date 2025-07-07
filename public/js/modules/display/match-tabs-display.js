/**
 * Match Tabs Display Module
 * Handles rendering of all tab content for match details
 */

export class MatchTabsDisplay {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.attachEventListeners();
  }

  attachEventListeners() {
    // Overview tab events
    this.eventBus.on('overview-key-stats', (stats) => this.renderKeyStats(stats));
    this.eventBus.on('overview-recent-form', (form) => this.renderRecentForm(form));
    this.eventBus.on('overview-goal-timing', (timing) => this.renderGoalTiming(timing));
    
    // H2H tab events
    this.eventBus.on('h2h-data', (data) => this.renderH2H(data));
    
    // Statistics tab events
    this.eventBus.on('match-statistics', (stats) => this.renderStatistics(stats));
    
    // Lineups tab events
    this.eventBus.on('lineups-data', (data) => this.renderLineups(data));
    
    // Events tab events
    this.eventBus.on('match-events', (events) => this.renderEvents(events));
    
    // Odds tab events
    this.eventBus.on('odds-data', (odds) => this.renderOdds(odds));
    
    // Loading and error events
    this.eventBus.on('data-loading', (isLoading) => this.showLoading(isLoading));
    this.eventBus.on('data-error', (error) => this.showError(error.message));
  }

  // Overview tab renderers
  renderKeyStats(stats) {
    const container = document.getElementById('keyStats');
    if (!container) return;
    
    if (!stats || !stats.length) {
      container.innerHTML = '<p class="no-data">Statistics not available yet</p>';
      return;
    }
    
    container.innerHTML = stats.map(stat => `
      <div class="key-stat">
        <span class="key-stat-label">${stat.label}</span>
        <span class="key-stat-value">${stat.home}${stat.suffix || ''} - ${stat.away}${stat.suffix || ''}</span>
      </div>
    `).join('');
  }

  renderRecentForm(formData) {
    if (!formData) return;
    
    // Home team
    const homeTitle = document.getElementById('homeFormTitle');
    if (homeTitle) homeTitle.textContent = formData.home.teamName;
    
    this.renderRecentMatches('homeRecentForm', formData.home.matches);
    
    // Away team
    const awayTitle = document.getElementById('awayFormTitle');
    if (awayTitle) awayTitle.textContent = formData.away.teamName;
    
    this.renderRecentMatches('awayRecentForm', formData.away.matches);
  }

  renderRecentMatches(elementId, matches) {
    const container = document.getElementById(elementId);
    if (!container) return;
    
    if (!matches || !matches.length) {
      container.innerHTML = '<p class="no-data">No recent matches data</p>';
      return;
    }
    
    container.innerHTML = matches.slice(0, 5).map(match => `
      <div class="recent-match">
        <span class="match-teams">${match.homeTeam} vs ${match.awayTeam}</span>
        <span class="match-result">${match.homeScore} - ${match.awayScore}</span>
      </div>
    `).join('');
  }

  renderGoalTiming(timing) {
    const container = document.getElementById('goalTiming');
    if (!container) return;
    
    if (!timing || Object.keys(timing).length === 0) {
      container.innerHTML = '<p class="no-data">Goal timing data not available</p>';
      return;
    }
    
    container.innerHTML = `
      <div class="timing-periods">
        <div class="timing-period">
          <span class="period-label">0-15'</span>
          <span class="period-value">${timing['0-15'] || 0}</span>
        </div>
        <div class="timing-period">
          <span class="period-label">16-30'</span>
          <span class="period-value">${timing['16-30'] || 0}</span>
        </div>
        <div class="timing-period">
          <span class="period-label">31-45'</span>
          <span class="period-value">${timing['31-45'] || 0}</span>
        </div>
        <div class="timing-period">
          <span class="period-label">46-60'</span>
          <span class="period-value">${timing['46-60'] || 0}</span>
        </div>
        <div class="timing-period">
          <span class="period-label">61-75'</span>
          <span class="period-value">${timing['61-75'] || 0}</span>
        </div>
        <div class="timing-period">
          <span class="period-label">76-90'</span>
          <span class="period-value">${timing['76-90'] || 0}</span>
        </div>
      </div>
    `;
  }

  // H2H tab renderer
  renderH2H(data) {
    const summaryContainer = document.getElementById('h2hSummary');
    const matchesContainer = document.getElementById('h2hMatches');
    
    if (!data) {
      if (summaryContainer) summaryContainer.innerHTML = '<p class="no-data">H2H data not available</p>';
      if (matchesContainer) matchesContainer.innerHTML = '<p class="no-data">No previous meetings found</p>';
      return;
    }
    
    // Render summary
    if (summaryContainer && data.summary) {
      summaryContainer.innerHTML = `
        <div class="h2h-team-stats">
          <div class="h2h-wins">${data.summary.homeWins}</div>
          <div class="h2h-team-name">${data.summary.homeTeamName} Wins</div>
        </div>
        <div class="h2h-draws">
          <div class="h2h-draws-count">${data.summary.draws}</div>
          <div class="h2h-draws-label">Draws</div>
        </div>
        <div class="h2h-team-stats">
          <div class="h2h-wins">${data.summary.awayWins}</div>
          <div class="h2h-team-name">${data.summary.awayTeamName} Wins</div>
        </div>
      `;
    }
    
    // Render matches
    if (matchesContainer && data.matches) {
      if (!data.matches.length) {
        matchesContainer.innerHTML = '<p class="no-data">No previous meetings found</p>';
      } else {
        matchesContainer.innerHTML = data.matches.map(match => `
          <div class="h2h-match">
            <span class="h2h-date">${this.formatDate(match.date)}</span>
            <span class="h2h-team">${match.homeTeam}</span>
            <span class="h2h-score">${match.homeScore} - ${match.awayScore}</span>
            <span class="h2h-team">${match.awayTeam}</span>
            <span class="h2h-venue">${match.venue || ''}</span>
          </div>
        `).join('');
      }
    }
  }

  // Statistics tab renderer
  renderStatistics(stats) {
    const container = document.getElementById('matchStatistics');
    if (!container) return;
    
    if (!stats || !stats.length) {
      container.innerHTML = '<p class="no-data">Match statistics not available yet</p>';
      return;
    }
    
    container.innerHTML = stats.map(stat => {
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
    }).join('');
  }

  // Lineups tab renderer
  renderLineups(data) {
    const formationsContainer = document.getElementById('formations');
    const startingContainer = document.getElementById('startingLineups');
    const substitutesContainer = document.getElementById('substitutes');
    
    if (!data) {
      if (formationsContainer) formationsContainer.innerHTML = '<p class="no-data">Lineups not available yet</p>';
      if (startingContainer) startingContainer.innerHTML = '<p class="no-data">Starting XI will be announced 1 hour before kickoff</p>';
      if (substitutesContainer) substitutesContainer.innerHTML = '<p class="no-data">Substitutes not available yet</p>';
      return;
    }
    
    // Render formations
    if (formationsContainer && data.formations) {
      formationsContainer.innerHTML = `
        <div class="formations-grid">
          <div class="formation">
            <h4>${data.formations.home.teamName}</h4>
            <div class="formation-display">${data.formations.home.formation}</div>
          </div>
          <div class="formation">
            <h4>${data.formations.away.teamName}</h4>
            <div class="formation-display">${data.formations.away.formation}</div>
          </div>
        </div>
      `;
    }
    
    // Render starting XI
    if (startingContainer && data.startingXI) {
      startingContainer.innerHTML = `
        <div class="lineups-grid">
          <div class="team-lineup">
            <h4>${data.startingXI.home.teamName}</h4>
            <div class="player-list">
              ${this.renderPlayerList(data.startingXI.home.players)}
            </div>
          </div>
          <div class="team-lineup">
            <h4>${data.startingXI.away.teamName}</h4>
            <div class="player-list">
              ${this.renderPlayerList(data.startingXI.away.players)}
            </div>
          </div>
        </div>
      `;
    }
    
    // Render substitutes
    if (substitutesContainer && data.substitutes) {
      substitutesContainer.innerHTML = `
        <div class="lineups-grid">
          <div class="team-lineup">
            <h4>${data.substitutes.home.teamName}</h4>
            <div class="player-list">
              ${this.renderPlayerList(data.substitutes.home.players)}
            </div>
          </div>
          <div class="team-lineup">
            <h4>${data.substitutes.away.teamName}</h4>
            <div class="player-list">
              ${this.renderPlayerList(data.substitutes.away.players)}
            </div>
          </div>
        </div>
      `;
    }
  }

  renderPlayerList(players) {
    if (!players || !players.length) {
      return '<p class="no-data">Not announced yet</p>';
    }
    
    return players.map(player => `
      <div class="player">
        <span class="player-number">${player.number}</span>
        <span class="player-name">${player.name}</span>
        <span class="player-position">${player.position}</span>
      </div>
    `).join('');
  }

  // Events tab renderer
  renderEvents(events) {
    const container = document.getElementById('matchEvents');
    if (!container) return;
    
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
      penalty: 'penalty'
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
      penalty: '🎯'
    };
    return icons[type] || '📝';
  }

  // Odds tab renderer
  renderOdds(odds) {
    const container = document.getElementById('oddsComparison');
    if (!container) return;
    
    if (!odds || !odds.length) {
      container.innerHTML = '<p class="no-data">Odds comparison not available</p>';
      return;
    }
    
    container.innerHTML = odds.map(provider => `
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
    `).join('');
  }

  // Utility methods
  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
      overlay.style.display = show ? 'flex' : 'none';
    }
  }

  showError(message) {
    alert(`Error: ${message}`);
  }
}

// Module export
export default MatchTabsDisplay;