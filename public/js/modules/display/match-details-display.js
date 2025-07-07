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
    
    // H2H Statistics elements
    this.elements.h2hHomeTeamLogo = document.getElementById('h2hHomeTeamLogo');
    this.elements.h2hHomeTeamName = document.getElementById('h2hHomeTeamName');
    this.elements.h2hHomeWins = document.getElementById('h2hHomeWins');
    this.elements.h2hAwayTeamLogo = document.getElementById('h2hAwayTeamLogo');
    this.elements.h2hAwayTeamName = document.getElementById('h2hAwayTeamName');
    this.elements.h2hAwayWins = document.getElementById('h2hAwayWins');
    this.elements.h2hDraws = document.getElementById('h2hDraws');
    this.elements.h2hTotalMatches = document.getElementById('h2hTotalMatches');
    this.elements.h2hProgressHome = document.getElementById('h2hProgressHome');
    this.elements.h2hProgressDraw = document.getElementById('h2hProgressDraw');
    this.elements.h2hProgressAway = document.getElementById('h2hProgressAway');
    this.elements.h2hProgressHomeLabel = document.getElementById('h2hProgressHomeLabel');
    this.elements.h2hProgressDrawLabel = document.getElementById('h2hProgressDrawLabel');
    this.elements.h2hProgressAwayLabel = document.getElementById('h2hProgressAwayLabel');
    
    // Initialize H2H stat positions (all visible by default)
    this.positionH2HStats(33.33, 33.33, 33.33, 1, 1, 1);
  }

  attachEventListeners() {
    // Listen for match data updates
    this.eventBus.on('match-data-loaded', (data) => this.updateMatchDisplay(data));
    
    // Listen for H2H data updates from H2H module
    this.eventBus.on('h2h-data-loaded', (h2hData) => this.updateH2HStatistics(h2hData));
    
    // Listen for H2H loading state
    this.eventBus.on('h2h-loading', (isLoading) => this.setH2HLoadingState(isLoading));
    
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
    
    // H2H statistics will be updated when h2h-data-loaded event is fired
    // No longer updating H2H here with match data
    
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
  
  updateH2HStatistics(h2hData) {
    if (!h2hData) {
      this.showNoH2HData();
      return;
    }
    
    const { summary, homeTeam, awayTeam, hasData } = h2hData;
    
    // If no real data available, show appropriate message
    if (!hasData || !summary || summary.totalMatches === 0) {
      this.showNoH2HData();
      return;
    }
    
    // Update team logos and names
    if (homeTeam) {
      if (this.elements.h2hHomeTeamLogo && homeTeam.logo) {
        let logoUrl = homeTeam.logo;
        if (!logoUrl.startsWith('http')) {
          if (logoUrl.startsWith('teams/')) {
            logoUrl = `https://cdn.footystats.org/img/${logoUrl}`;
          } else {
            logoUrl = `https://cdn.footystats.org/img/teams/${logoUrl}`;
          }
        }
        this.elements.h2hHomeTeamLogo.src = logoUrl;
        this.elements.h2hHomeTeamLogo.onerror = () => {
          this.elements.h2hHomeTeamLogo.style.display = 'none';
        };
      }
      if (this.elements.h2hHomeTeamName) {
        this.elements.h2hHomeTeamName.textContent = homeTeam.name;
      }
    }
    
    if (awayTeam) {
      if (this.elements.h2hAwayTeamLogo && awayTeam.logo) {
        let logoUrl = awayTeam.logo;
        if (!logoUrl.startsWith('http')) {
          if (logoUrl.startsWith('teams/')) {
            logoUrl = `https://cdn.footystats.org/img/${logoUrl}`;
          } else {
            logoUrl = `https://cdn.footystats.org/img/teams/${logoUrl}`;
          }
        }
        this.elements.h2hAwayTeamLogo.src = logoUrl;
        this.elements.h2hAwayTeamLogo.onerror = () => {
          this.elements.h2hAwayTeamLogo.style.display = 'none';
        };
      }
      if (this.elements.h2hAwayTeamName) {
        this.elements.h2hAwayTeamName.textContent = awayTeam.name;
      }
    }
    
    // Update H2H statistics from API data only
    const homeWins = summary.homeWins || 0;
    const awayWins = summary.awayWins || 0;
    const draws = summary.draws || 0;
    const totalMatches = summary.totalMatches || (homeWins + awayWins + draws);
    
    // Update win counts
    if (this.elements.h2hHomeWins) {
      this.elements.h2hHomeWins.textContent = homeWins;
    }
    if (this.elements.h2hAwayWins) {
      this.elements.h2hAwayWins.textContent = awayWins;
    }
    if (this.elements.h2hDraws) {
      this.elements.h2hDraws.textContent = draws;
    }
    if (this.elements.h2hTotalMatches) {
      this.elements.h2hTotalMatches.textContent = totalMatches;
    }
    
    // Calculate percentages and handle 0 values
    if (totalMatches > 0) {
      const homePercentage = (homeWins / totalMatches) * 100;
      const drawPercentage = (draws / totalMatches) * 100;
      const awayPercentage = (awayWins / totalMatches) * 100;
      
      // Hide stat items with 0 values
      const homeStatItem = document.getElementById('h2hHomeStatItem');
      const drawStatItem = document.getElementById('h2hDrawStatItem');
      const awayStatItem = document.getElementById('h2hAwayStatItem');
      
      if (homeStatItem) {
        homeStatItem.style.display = homeWins > 0 ? 'block' : 'none';
      }
      if (drawStatItem) {
        drawStatItem.style.display = draws > 0 ? 'block' : 'none';
      }
      if (awayStatItem) {
        awayStatItem.style.display = awayWins > 0 ? 'block' : 'none';
      }
      
      // Update progress bars - hide sections with 0 values
      if (this.elements.h2hProgressHome) {
        this.elements.h2hProgressHome.style.width = homeWins > 0 ? `${homePercentage}%` : '0%';
        this.elements.h2hProgressHome.style.display = homeWins > 0 ? 'flex' : 'none';
      }
      if (this.elements.h2hProgressDraw) {
        this.elements.h2hProgressDraw.style.width = draws > 0 ? `${drawPercentage}%` : '0%';
        this.elements.h2hProgressDraw.style.display = draws > 0 ? 'flex' : 'none';
      }
      if (this.elements.h2hProgressAway) {
        this.elements.h2hProgressAway.style.width = awayWins > 0 ? `${awayPercentage}%` : '0%';
        this.elements.h2hProgressAway.style.display = awayWins > 0 ? 'flex' : 'none';
      }
      
      // Update progress labels
      if (this.elements.h2hProgressHomeLabel) {
        this.elements.h2hProgressHomeLabel.textContent = homeWins > 0 ? `${Math.round(homePercentage)}%` : '';
      }
      if (this.elements.h2hProgressDrawLabel) {
        this.elements.h2hProgressDrawLabel.textContent = draws > 0 ? `${Math.round(drawPercentage)}%` : '';
      }
      if (this.elements.h2hProgressAwayLabel) {
        this.elements.h2hProgressAwayLabel.textContent = awayWins > 0 ? `${Math.round(awayPercentage)}%` : '';
      }
      
      // Position stats above progress bars dynamically
      this.positionH2HStats(homePercentage, drawPercentage, awayPercentage, homeWins, draws, awayWins);
    }
  }
  
  positionH2HStats(homePercentage, drawPercentage, awayPercentage, homeWins, draws, awayWins) {
    const homeStatItem = document.getElementById('h2hHomeStatItem');
    const drawStatItem = document.getElementById('h2hDrawStatItem');
    const awayStatItem = document.getElementById('h2hAwayStatItem');
    
    // Only position visible stats
    if (homeStatItem && homeWins > 0) {
      const homeCenter = homePercentage / 2;
      homeStatItem.style.left = `${homeCenter}%`;
    }
    
    if (drawStatItem && draws > 0) {
      const drawCenter = homePercentage + (drawPercentage / 2);
      drawStatItem.style.left = `${drawCenter}%`;
    }
    
    if (awayStatItem && awayWins > 0) {
      const awayCenter = homePercentage + drawPercentage + (awayPercentage / 2);
      awayStatItem.style.left = `${awayCenter}%`;
    }
  }
  
  showNoH2HData() {
    // Reset all H2H values to show no data available
    if (this.elements.h2hHomeWins) this.elements.h2hHomeWins.textContent = '-';
    if (this.elements.h2hAwayWins) this.elements.h2hAwayWins.textContent = '-';
    if (this.elements.h2hDraws) this.elements.h2hDraws.textContent = '-';
    if (this.elements.h2hTotalMatches) this.elements.h2hTotalMatches.textContent = '0';
    
    // Hide progress bars
    if (this.elements.h2hProgressHome) this.elements.h2hProgressHome.style.width = '0%';
    if (this.elements.h2hProgressDraw) this.elements.h2hProgressDraw.style.width = '0%';
    if (this.elements.h2hProgressAway) this.elements.h2hProgressAway.style.width = '0%';
    
    // Show "No data" in progress labels
    if (this.elements.h2hProgressHomeLabel) this.elements.h2hProgressHomeLabel.textContent = 'No data';
    if (this.elements.h2hProgressDrawLabel) this.elements.h2hProgressDrawLabel.textContent = '';
    if (this.elements.h2hProgressAwayLabel) this.elements.h2hProgressAwayLabel.textContent = '';
    
    // Reset stat positions
    this.positionH2HStats(33.33, 33.33, 33.33, 0, 0, 0);
  }
  
  setH2HLoadingState(isLoading) {
    const h2hCard = document.querySelector('.h2h-stats-card');
    if (!h2hCard) return;
    
    if (isLoading) {
      h2hCard.classList.add('loading');
      // Optionally add a loading spinner
      const existingSpinner = h2hCard.querySelector('.h2h-loading-spinner');
      if (!existingSpinner) {
        const spinner = document.createElement('div');
        spinner.className = 'h2h-loading-spinner';
        spinner.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading H2H data...';
        h2hCard.querySelector('.h2h-stats-content').prepend(spinner);
      }
    } else {
      h2hCard.classList.remove('loading');
      const spinner = h2hCard.querySelector('.h2h-loading-spinner');
      if (spinner) spinner.remove();
    }
  }
}

// Module export
export default MatchDetailsDisplay;