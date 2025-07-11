/**
 * Lineup Display Module
 * Handles rendering lineup predictions and injuries in the UI
 */

class LineupDisplay {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.container = null;
    
    this.initialize();
  }

  initialize() {
    console.log('[LineupDisplay] Initializing...');
    
    // Listen for lineup predictions data
    this.eventBus.on('lineup-predictions-calculated', data => {
      console.log('[LineupDisplay] Received lineup data:', data);
      this.renderLineupPredictions(data);
    });
    
    // Listen for tab switches to initialize container
    this.eventBus.on('tab-switched', tabName => {
      console.log('[LineupDisplay] Tab switched to:', tabName);
      if (tabName === 'lineups') {
        console.log('[LineupDisplay] Lineups tab selected, initializing container');
        this.initializeContainer();
      }
    });
  }

  initializeContainer() {
    if (!this.container) {
      const lineupsTab = document.querySelector('#lineupsTab .lineups-container');
      if (lineupsTab) {
        this.container = lineupsTab;
      }
    }
  }

  renderLineupPredictions(data) {
    this.initializeContainer();
    if (!this.container) {
      console.error('[LineupDisplay] Container not found');
      return;
    }
    
    const { homeTeam, awayTeam } = data;
    
    const html = `
      <div class="stat-card lineup-predictions-card">
        <h3 class="card-title">
          <i class="fas fa-users"></i>
          Lineup Predictions & Injuries
        </h3>
        <p class="lineup-info">
          Showing the most recently used lineup for ${homeTeam.name} and ${awayTeam.name}.
        </p>
        
        <div class="lineup-teams-container">
          <!-- Home Team Lineup -->
          <div class="team-lineup-section">
            <div class="team-header">
              <img src="${this.getTeamLogoUrl(homeTeam.logo)}" alt="${homeTeam.name}" class="team-logo">
              <h4 class="team-name">${homeTeam.name}</h4>
            </div>
            
            <div class="lineup-content">
              <!-- Starting 11 -->
              <div class="lineup-group">
                <h5 class="group-title">#Starting 11</h5>
                
                ${this.renderPositionGroup('Forwards', homeTeam.starting11.forwards)}
                ${this.renderPositionGroup('Midfielders', homeTeam.starting11.midfielders)}
                ${this.renderPositionGroup('Defenders', homeTeam.starting11.defenders)}
                ${this.renderPositionGroup('Goalkeeper', homeTeam.starting11.goalkeeper)}
              </div>
              
              <!-- Substitutes -->
              <div class="lineup-group">
                <h5 class="group-title">#Substitutes</h5>
                
                ${this.renderPositionGroup('Forwards', homeTeam.substitutes.forwards, true)}
                ${this.renderPositionGroup('Midfielders', homeTeam.substitutes.midfielders, true)}
                ${this.renderPositionGroup('Defenders', homeTeam.substitutes.defenders, true)}
                ${this.renderPositionGroup('Goalkeeper', homeTeam.substitutes.goalkeeper, true)}
              </div>
              
              ${this.renderInjuriesAndSuspensions(homeTeam.injuries, homeTeam.suspensions)}
            </div>
          </div>
          
          <!-- Away Team Lineup -->
          <div class="team-lineup-section">
            <div class="team-header">
              <img src="${this.getTeamLogoUrl(awayTeam.logo)}" alt="${awayTeam.name}" class="team-logo">
              <h4 class="team-name">${awayTeam.name}</h4>
            </div>
            
            <div class="lineup-content">
              <!-- Starting 11 -->
              <div class="lineup-group">
                <h5 class="group-title">#Starting 11</h5>
                
                ${this.renderPositionGroup('Forwards', awayTeam.starting11.forwards)}
                ${this.renderPositionGroup('Midfielders', awayTeam.starting11.midfielders)}
                ${this.renderPositionGroup('Defenders', awayTeam.starting11.defenders)}
                ${this.renderPositionGroup('Goalkeeper', awayTeam.starting11.goalkeeper)}
              </div>
              
              <!-- Substitutes -->
              <div class="lineup-group">
                <h5 class="group-title">#Substitutes</h5>
                
                ${this.renderPositionGroup('Forwards', awayTeam.substitutes.forwards, true)}
                ${this.renderPositionGroup('Midfielders', awayTeam.substitutes.midfielders, true)}
                ${this.renderPositionGroup('Defenders', awayTeam.substitutes.defenders, true)}
                ${this.renderPositionGroup('Goalkeeper', awayTeam.substitutes.goalkeeper, true)}
              </div>
              
              ${this.renderInjuriesAndSuspensions(awayTeam.injuries, awayTeam.suspensions)}
            </div>
          </div>
        </div>
      </div>
    `;
    
    this.container.innerHTML = html;
  }

  renderPositionGroup(position, players, isSubstitute = false) {
    if (!players || players.length === 0) {
      return '';
    }
    
    return `
      <div class="position-group">
        <h6 class="position-title">${position}</h6>
        <div class="players-list">
          ${players.map(player => this.renderPlayer(player, isSubstitute)).join('')}
        </div>
      </div>
    `;
  }

  renderPlayer(player, isSubstitute = false) {
    const number = player.number || '-';
    const name = player.name || 'Unknown Player';
    const substituteIcon = isSubstitute && player.recentlyUsed ? '↑' : '';
    const flagUrl = player.nationality ? `https://cdn.footystats.org/img/flags/${player.nationality.toLowerCase()}.png` : '';
    
    return `
      <div class="player-row ${player.injured ? 'injured' : ''} ${player.suspended ? 'suspended' : ''}">
        <span class="player-number">${number}</span>
        <div class="player-info">
          ${flagUrl ? `<img class="player-flag" src="${flagUrl}" alt="${player.nationality}" title="${player.nationality}">` : ''}
          <span class="player-name">${name}${substituteIcon}</span>
        </div>
      </div>
    `;
  }

  renderInjuriesAndSuspensions(injuries, suspensions) {
    if ((!injuries || injuries.length === 0) && (!suspensions || suspensions.length === 0)) {
      return '';
    }
    
    return `
      <div class="injuries-suspensions">
        ${injuries && injuries.length > 0 ? `
          <div class="injury-list">
            <h6 class="injury-title"><i class="fas fa-medkit"></i> Injuries</h6>
            ${injuries.map(injury => `
              <div class="injury-item">
                <span class="player-name">${injury.playerName}</span>
                <span class="injury-type">${injury.type}</span>
              </div>
            `).join('')}
          </div>
        ` : ''}
        
        ${suspensions && suspensions.length > 0 ? `
          <div class="suspension-list">
            <h6 class="suspension-title"><i class="fas fa-ban"></i> Suspensions</h6>
            ${suspensions.map(suspension => `
              <div class="suspension-item">
                <span class="player-name">${suspension.playerName}</span>
                <span class="suspension-reason">${suspension.reason}</span>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }

  getTeamLogoUrl(logo) {
    if (!logo) {
      return 'https://cdn.footystats.org/img/teams/default.png';
    }
    
    if (logo.startsWith('http')) {
      return logo;
    }
    
    if (logo.startsWith('teams/')) {
      return `https://cdn.footystats.org/img/${logo}`;
    }
    
    return `https://cdn.footystats.org/img/teams/${logo}`;
  }
}

// Create and export singleton instance
(function(global) {
  if (global.TeamStatsEventBus) {
    const lineupDisplay = new LineupDisplay(global.TeamStatsEventBus);
    global.TeamStatsLineupDisplay = lineupDisplay;
    console.log('[LineupDisplay] Module loaded and initialized');
  } else {
    console.error('[LineupDisplay] TeamStatsEventBus not found');
  }
})(window);