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
    
    // Listen for tab switch events
    this.eventBus.on('switch-tab', (tabName) => {
      console.log('Display module received switch-tab event:', tabName);
      this.switchTab(tabName);
    });
    
    // Tab click listeners - using event delegation for reliability
    const navTabsContainer = document.querySelector('.nav-tabs');
    if (navTabsContainer) {
      navTabsContainer.addEventListener('click', (e) => {
        const tab = e.target.closest('.nav-tab');
        if (tab) {
          const tabName = tab.dataset.tab;
          console.log('Tab clicked:', tabName);
          this.eventBus.emit('switch-tab', tabName);
        }
      });
    }
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
        // Handle league logo path
        let logoUrl = league.logo;
        if (!logoUrl.startsWith('http')) {
          if (logoUrl.startsWith('leagues/')) {
            logoUrl = `https://cdn.footystats.org/img/${logoUrl}`;
          } else {
            logoUrl = `https://cdn.footystats.org/img/leagues/${logoUrl}`;
          }
        }
        this.elements.leagueLogo.src = logoUrl;
        this.elements.leagueLogo.alt = league.name;
        this.elements.leagueLogo.onerror = () => {
          this.elements.leagueLogo.style.display = 'none';
        };
      }
      if (this.elements.leagueName) {
        this.elements.leagueName.textContent = league.name || 'Unknown League';
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
        // Handle different logo path formats
        let logoUrl = homeTeam.logo;
        if (!logoUrl.startsWith('http')) {
          // If it's a relative path like 'teams/t836.png'
          if (logoUrl.startsWith('teams/')) {
            logoUrl = `https://cdn.footystats.org/img/${logoUrl}`;
          } else {
            // If it's just the filename
            logoUrl = `https://cdn.footystats.org/img/teams/${logoUrl}`;
          }
        }
        this.elements.homeTeamLogo.src = logoUrl;
        this.elements.homeTeamLogo.style.display = 'block';
        this.elements.homeTeamLogo.onerror = () => {
          console.error('Failed to load home team logo:', logoUrl);
          this.elements.homeTeamLogo.style.display = 'none';
        };
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
        // Handle different logo path formats
        let logoUrl = awayTeam.logo;
        if (!logoUrl.startsWith('http')) {
          // If it's a relative path like 'teams/t836.png'
          if (logoUrl.startsWith('teams/')) {
            logoUrl = `https://cdn.footystats.org/img/${logoUrl}`;
          } else {
            // If it's just the filename
            logoUrl = `https://cdn.footystats.org/img/teams/${logoUrl}`;
          }
        }
        this.elements.awayTeamLogo.src = logoUrl;
        this.elements.awayTeamLogo.style.display = 'block';
        this.elements.awayTeamLogo.onerror = () => {
          console.error('Failed to load away team logo:', logoUrl);
          this.elements.awayTeamLogo.style.display = 'none';
        };
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
      const homePPG = parseFloat(homeTeam.homePPG || '1.85');
      this.elements.homeTeamPPG.textContent = homePPG.toFixed(2);
      
      // Add color class based on PPG value
      this.elements.homeTeamPPG.className = 'ppg-value';
      if (homePPG >= 2.0) {
        this.elements.homeTeamPPG.classList.add('high');
      } else if (homePPG >= 1.5) {
        this.elements.homeTeamPPG.classList.add('medium');
      } else {
        this.elements.homeTeamPPG.classList.add('low');
      }
      
      // Update progress bar (max 3 points)
      const homeProgressBar = document.getElementById('homeTeamPPGBar');
      if (homeProgressBar) {
        const progressPercentage = Math.min((homePPG / 3) * 100, 100);
        homeProgressBar.style.width = `${progressPercentage}%`;
      }
    }
    
    // Away team PPG
    if (this.elements.awayTeamPPG && awayTeam) {
      const awayPPG = parseFloat(awayTeam.awayPPG || '1.42');
      this.elements.awayTeamPPG.textContent = awayPPG.toFixed(2);
      
      // Add color class based on PPG value
      this.elements.awayTeamPPG.className = 'ppg-value';
      if (awayPPG >= 2.0) {
        this.elements.awayTeamPPG.classList.add('high');
      } else if (awayPPG >= 1.5) {
        this.elements.awayTeamPPG.classList.add('medium');
      } else {
        this.elements.awayTeamPPG.classList.add('low');
      }
      
      // Update progress bar (max 3 points)
      const awayProgressBar = document.getElementById('awayTeamPPGBar');
      if (awayProgressBar) {
        const progressPercentage = Math.min((awayPPG / 3) * 100, 100);
        awayProgressBar.style.width = `${progressPercentage}%`;
      }
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
    console.log('Switching tab to:', tabName);
    
    // Re-query elements in case they were dynamically updated
    const navTabs = document.querySelectorAll('.nav-tab');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    // Update tab buttons
    navTabs.forEach(tab => {
      if (tab.dataset.tab === tabName) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });
    
    // Update tab content
    tabPanes.forEach(pane => {
      if (pane.dataset.tab === tabName) {
        pane.classList.add('active');
        pane.style.display = 'block';
      } else {
        pane.classList.remove('active');
        pane.style.display = 'none';
      }
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