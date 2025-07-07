/**
 * Match Details Display Module
 * Handles display logic for match details page
 * Compatible with existing modular architecture
 */

export class MatchDetailsDisplay {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.elements = {};
    this.initializeElements();
    this.attachEventListeners();
  }

  initializeElements() {
    // Match score elements
    this.elements.homeTeamLogo = document.getElementById('homeTeamLogo');
    this.elements.homeTeamName = document.getElementById('homeTeamName');
    this.elements.homeTeamForm = document.getElementById('homeTeamForm');
    this.elements.homeTeamPPG = document.getElementById('homeTeamPPG');
    this.elements.homeScore = document.getElementById('homeScore');
    
    this.elements.awayTeamLogo = document.getElementById('awayTeamLogo');
    this.elements.awayTeamName = document.getElementById('awayTeamName');
    this.elements.awayTeamForm = document.getElementById('awayTeamForm');
    this.elements.awayTeamPPG = document.getElementById('awayTeamPPG');
    this.elements.awayScore = document.getElementById('awayScore');
    
    this.elements.matchStatus = document.getElementById('matchStatus');
    this.elements.matchTime = document.getElementById('matchTime');
    this.elements.matchDateDisplay = document.getElementById('matchDateDisplay');
    this.elements.matchTimeDisplay = document.getElementById('matchTimeDisplay');
    
    // Header elements
    this.elements.leagueLogo = document.getElementById('leagueLogo');
    this.elements.leagueName = document.getElementById('leagueName');
    this.elements.matchDate = document.getElementById('matchDate');
    
    // Tab elements
    this.elements.navTabs = document.querySelectorAll('.nav-tab');
    this.elements.tabPanes = document.querySelectorAll('.tab-pane');
  }

  attachEventListeners() {
    // Listen for match data updates
    this.eventBus.on('match-data-loaded', (data) => this.updateMatchDisplay(data));
    this.eventBus.on('tab-switched', (tabName) => this.switchTab(tabName));
    
    // Tab click listeners
    this.elements.navTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        this.eventBus.emit('switch-tab', tabName);
      });
    });
  }

  updateMatchDisplay(matchData) {
    if (!matchData) return;
    
    // Update header
    this.updateHeader(matchData);
    
    // Update match score
    this.updateMatchScore(matchData);
    
    // Update team forms
    this.updateTeamForms(matchData);
    
    // Update team PPG
    this.updateTeamPPG(matchData);
    
    // Emit event for tab content update
    this.eventBus.emit('match-display-updated', matchData);
  }

  updateHeader(matchData) {
    const { league, date } = matchData;
    
    if (league) {
      if (league.logo && this.elements.leagueLogo) {
        this.elements.leagueLogo.src = league.logo;
        this.elements.leagueLogo.alt = league.name;
      }
      if (this.elements.leagueName) {
        this.elements.leagueName.textContent = league.name;
      }
    }
    
    if (this.elements.matchDate && date) {
      this.elements.matchDate.textContent = this.formatDate(date);
    }
  }

  updateMatchScore(matchData) {
    const { homeTeam, awayTeam, homeScore, awayScore, status, minute, date } = matchData;
    
    // Update date and time display
    if (date) {
      const matchDate = new Date(date);
      if (this.elements.matchDateDisplay) {
        this.elements.matchDateDisplay.textContent = matchDate.toLocaleDateString('tr-TR', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }
      if (this.elements.matchTimeDisplay) {
        this.elements.matchTimeDisplay.textContent = matchDate.toLocaleTimeString('tr-TR', {
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    }
    
    // Update home team
    if (homeTeam) {
      if (this.elements.homeTeamLogo && homeTeam.logo) {
        this.elements.homeTeamLogo.src = homeTeam.logo.startsWith('http') 
          ? homeTeam.logo 
          : `https://cdn.footystats.org/img/${homeTeam.logo}`;
        this.elements.homeTeamLogo.style.display = 'block';
      } else if (this.elements.homeTeamLogo) {
        this.elements.homeTeamLogo.style.display = 'none';
      }
      
      if (this.elements.homeTeamName) {
        this.elements.homeTeamName.textContent = homeTeam.name;
      }
      
      if (this.elements.homeScore) {
        this.elements.homeScore.textContent = homeScore !== null ? homeScore : '-';
      }
    }
    
    // Update away team
    if (awayTeam) {
      if (this.elements.awayTeamLogo && awayTeam.logo) {
        this.elements.awayTeamLogo.src = awayTeam.logo.startsWith('http') 
          ? awayTeam.logo 
          : `https://cdn.footystats.org/img/${awayTeam.logo}`;
        this.elements.awayTeamLogo.style.display = 'block';
      } else if (this.elements.awayTeamLogo) {
        this.elements.awayTeamLogo.style.display = 'none';
      }
      
      if (this.elements.awayTeamName) {
        this.elements.awayTeamName.textContent = awayTeam.name;
      }
      
      if (this.elements.awayScore) {
        this.elements.awayScore.textContent = awayScore !== null ? awayScore : '-';
      }
    }
    
    // Update match status
    if (this.elements.matchStatus && status) {
      this.elements.matchStatus.textContent = this.getStatusText(status);
      this.elements.matchStatus.className = `match-status ${status.toLowerCase()}`;
    }
    
    // Update match time
    if (this.elements.matchTime) {
      if (status === 'live' && minute) {
        this.elements.matchTime.textContent = `${minute}'`;
      } else if (status === 'scheduled' && date) {
        this.elements.matchTime.textContent = this.formatTime(date);
      } else {
        this.elements.matchTime.textContent = '';
      }
    }
  }

  updateTeamForms(matchData) {
    const { homeTeam, awayTeam } = matchData;
    
    // Home team form
    if (this.elements.homeTeamForm && homeTeam) {
      const homeFormData = homeTeam.homeForm || 'WWDLW'; // Test data if no real data
      this.renderFormString(this.elements.homeTeamForm, homeFormData);
      this.addFormLabel(this.elements.homeTeamForm, 'Home Form');
    }
    
    // Away team form
    if (this.elements.awayTeamForm && awayTeam) {
      const awayFormData = awayTeam.awayForm || 'LDWLL'; // Test data if no real data
      this.renderFormString(this.elements.awayTeamForm, awayFormData);
      this.addFormLabel(this.elements.awayTeamForm, 'Away Form');
    }
  }

  updateTeamPPG(matchData) {
    const { homeTeam, awayTeam } = matchData;
    
    // Home team PPG
    if (this.elements.homeTeamPPG && homeTeam) {
      const homePPG = homeTeam.homePPG || '1.85'; // Test data if no real data
      this.elements.homeTeamPPG.textContent = parseFloat(homePPG).toFixed(2);
    }
    
    // Away team PPG
    if (this.elements.awayTeamPPG && awayTeam) {
      const awayPPG = awayTeam.awayPPG || '1.42'; // Test data if no real data
      this.elements.awayTeamPPG.textContent = parseFloat(awayPPG).toFixed(2);
    }
  }

  renderFormString(container, formString) {
    container.innerHTML = formString.split('').map(result => {
      const className = result === 'W' ? 'win' : result === 'D' ? 'draw' : 'loss';
      return `<span class="form-result ${className}">${result}</span>`;
    }).join('');
  }

  addFormLabel(container, labelText) {
    let label = container.nextElementSibling;
    if (!label || !label.classList.contains('form-label')) {
      label = document.createElement('div');
      label.className = 'form-label';
      container.parentNode.appendChild(label);
    }
    label.textContent = labelText;
  }

  switchTab(tabName) {
    // Update tab buttons
    this.elements.navTabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
    
    // Update tab content
    this.elements.tabPanes.forEach(pane => {
      pane.classList.toggle('active', pane.dataset.tab === tabName);
    });
    
    // Emit event for content loading
    this.eventBus.emit('tab-content-requested', tabName);
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

  formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit'
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
      complete: 'FINISHED'
    };
    return statusTexts[status.toLowerCase()] || status.toUpperCase();
  }

  showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
      overlay.style.display = show ? 'flex' : 'none';
    }
  }

  showError(message) {
    // Emit error event for other modules to handle
    this.eventBus.emit('display-error', { message, type: 'match-details' });
  }
}

// Module export
export default MatchDetailsDisplay;