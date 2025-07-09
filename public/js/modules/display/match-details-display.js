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

    // H2H Over/Under and BTTS elements
    this.elements.h2hOver15 = document.querySelector('#h2hOver15 .percentage-value');
    this.elements.h2hOver15Count = document.getElementById('h2hOver15Count');
    this.elements.h2hOver15Total = document.getElementById('h2hOver15Total');

    this.elements.h2hOver25 = document.querySelector('#h2hOver25 .percentage-value');
    this.elements.h2hOver25Count = document.getElementById('h2hOver25Count');
    this.elements.h2hOver25Total = document.getElementById('h2hOver25Total');

    this.elements.h2hOver35 = document.querySelector('#h2hOver35 .percentage-value');
    this.elements.h2hOver35Count = document.getElementById('h2hOver35Count');
    this.elements.h2hOver35Total = document.getElementById('h2hOver35Total');

    this.elements.h2hBTTS = document.querySelector('#h2hBTTS .percentage-value');
    this.elements.h2hBTTSYes = document.getElementById('h2hBTTSYes');
    this.elements.h2hBTTSNo = document.getElementById('h2hBTTSNo');

    // H2H Recent Matches element
    this.elements.h2hRecentMatches = document.getElementById('h2hRecentMatches');

    // Initialize H2H stat positions (all visible by default)
    this.positionH2HStats(33.33, 33.33, 33.33, 1, 1, 1);
  }

  attachEventListeners() {
    // Listen for match data updates
    this.eventBus.on('match-data-loaded', data => {
      this.updateMatchDisplay(data);
    });

    // Listen for H2H data updates from H2H module
    this.eventBus.on('h2h-data-loaded', h2hData => this.updateH2HStatistics(h2hData));

    // Listen for H2H loading state
    this.eventBus.on('h2h-loading', isLoading => this.setH2HLoadingState(isLoading));

    // Listen for team statistics data
    this.eventBus.on('team-stats-loaded', teamData => {
      this.updateTeamComparisonCards(teamData);
    });

    // Listen for form prediction data
    this.eventBus.on('form-prediction-calculated', prediction => {
      this.updateFormPrediction(prediction);
    });

    // Listen for goals comparison data
    this.eventBus.on('goals-comparison-calculated', comparison => {
      this.updateGoalsComparison(comparison);
    });

    // Listen for goals conceded comparison data
    this.eventBus.on('goals-conceded-comparison-calculated', comparison => {
      this.updateGoalsConcededComparison(comparison);
    });

    // Listen for over 2.5 & BTTS comparison data
    this.eventBus.on('over-btts-comparison-calculated', comparison => {
      this.updateOverBTTSComparison(comparison);
    });

    // Listen for tab switch events
    this.eventBus.on('switch-tab', tabName => {
      this.switchTab(tabName);
    });

    // Tab click listeners - using event delegation for reliability
    const navTabsContainer = document.querySelector('.nav-tabs');
    if (navTabsContainer) {
      navTabsContainer.addEventListener('click', e => {
        const tab = e.target.closest('.nav-tab');
        if (tab) {
          const tabName = tab.dataset.tab;
          this.eventBus.emit('switch-tab', tabName);
        }
      });
    }
  }

  updateMatchDisplay(matchData) {
    if (!matchData) {
      return;
    }

    // Store match data for later use
    this.eventBus._lastMatchData = matchData;

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

    // Request team statistics for comparison
    if (matchData.homeTeam && matchData.awayTeam) {
      this.eventBus.emit('request-team-stats', {
        homeTeamId: matchData.homeTeam.id,
        awayTeamId: matchData.awayTeam.id,
      });
    }
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
          day: 'numeric',
        });
      }
      if (this.elements.matchTimeDisplay) {
        this.elements.matchTimeDisplay.textContent = matchDate.toLocaleTimeString('tr-TR', {
          hour: '2-digit',
          minute: '2-digit',
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
    // Sadece son 5 karakteri al
    const last5Form = formString.slice(-5);

    container.innerHTML = last5Form
      .split('')
      .map(result => {
        const upperResult = result.toUpperCase();
        const className = upperResult === 'W' ? 'win' : upperResult === 'D' ? 'draw' : 'loss';
        return `<span class="form-result ${className}">${upperResult}</span>`;
      })
      .join('');
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
    const totalMatches = summary.totalMatches || homeWins + awayWins + draws;

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
        this.elements.h2hProgressHomeLabel.textContent =
          homeWins > 0 ? `${Math.round(homePercentage)}%` : '';
      }
      if (this.elements.h2hProgressDrawLabel) {
        this.elements.h2hProgressDrawLabel.textContent =
          draws > 0 ? `${Math.round(drawPercentage)}%` : '';
      }
      if (this.elements.h2hProgressAwayLabel) {
        this.elements.h2hProgressAwayLabel.textContent =
          awayWins > 0 ? `${Math.round(awayPercentage)}%` : '';
      }

      // Position stats above progress bars dynamically
      this.positionH2HStats(
        homePercentage,
        drawPercentage,
        awayPercentage,
        homeWins,
        draws,
        awayWins
      );
    }

    // Update Over/Under and BTTS statistics
    this.updateH2HOverUnderStats(h2hData.overUnderStats);
    this.updateH2HBTTSStats(h2hData.bttsStats);

    // Update Recent H2H Matches
    this.updateH2HRecentMatches(h2hData.matches, homeTeam, awayTeam, h2hData.teamNames);
  }

  updateH2HOverUnderStats(overUnderStats) {
    if (!overUnderStats) {
      return;
    }

    // Update Over 1.5
    if (this.elements.h2hOver15) {
      this.elements.h2hOver15.textContent = overUnderStats.over15?.percentage || 0;
    }
    if (this.elements.h2hOver15Count) {
      this.elements.h2hOver15Count.textContent = overUnderStats.over15?.count || 0;
    }
    if (this.elements.h2hOver15Total) {
      this.elements.h2hOver15Total.textContent = overUnderStats.over15?.total || 0;
    }

    // Update Over 2.5
    if (this.elements.h2hOver25) {
      this.elements.h2hOver25.textContent = overUnderStats.over25?.percentage || 0;
    }
    if (this.elements.h2hOver25Count) {
      this.elements.h2hOver25Count.textContent = overUnderStats.over25?.count || 0;
    }
    if (this.elements.h2hOver25Total) {
      this.elements.h2hOver25Total.textContent = overUnderStats.over25?.total || 0;
    }

    // Update Over 3.5
    if (this.elements.h2hOver35) {
      this.elements.h2hOver35.textContent = overUnderStats.over35?.percentage || 0;
    }
    if (this.elements.h2hOver35Count) {
      this.elements.h2hOver35Count.textContent = overUnderStats.over35?.count || 0;
    }
    if (this.elements.h2hOver35Total) {
      this.elements.h2hOver35Total.textContent = overUnderStats.over35?.total || 0;
    }
  }

  updateH2HBTTSStats(bttsStats) {
    if (!bttsStats) {
      return;
    }

    if (this.elements.h2hBTTS) {
      this.elements.h2hBTTS.textContent = bttsStats.percentage || 0;
    }
    if (this.elements.h2hBTTSYes) {
      this.elements.h2hBTTSYes.textContent = bttsStats.yes || 0;
    }
    if (this.elements.h2hBTTSNo) {
      this.elements.h2hBTTSNo.textContent = bttsStats.no || 0;
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
      const drawCenter = homePercentage + drawPercentage / 2;
      drawStatItem.style.left = `${drawCenter}%`;
    }

    if (awayStatItem && awayWins > 0) {
      const awayCenter = homePercentage + drawPercentage + awayPercentage / 2;
      awayStatItem.style.left = `${awayCenter}%`;
    }
  }

  updateH2HRecentMatches(matches, homeTeam, awayTeam) {
    if (!this.elements.h2hRecentMatches) {
      return;
    }

    // If no matches available
    if (!matches || matches.length === 0) {
      this.elements.h2hRecentMatches.innerHTML = `
        <div class="no-h2h-matches">
          <p>No recent H2H matches available</p>
        </div>
      `;
      return;
    }

    // Create carousel structure
    const carouselHTML = `
      <div class="h2h-carousel-container">
        <button class="h2h-carousel-btn h2h-carousel-prev" aria-label="Previous matches">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <div class="h2h-carousel-wrapper">
          <div class="h2h-carousel-track">
            ${this.renderH2HMatches(matches, homeTeam, awayTeam)}
          </div>
        </div>
        <button class="h2h-carousel-btn h2h-carousel-next" aria-label="Next matches">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      </div>
    `;

    this.elements.h2hRecentMatches.innerHTML = carouselHTML;

    // Initialize carousel functionality
    this.initializeH2HCarousel();
  }

  renderH2HMatches(matches, homeTeam, awayTeam) {
    return matches
      .map(match => {
        const homeGoals =
          match.homeGoalCount ||
          match.home_scored ||
          match.homeScore ||
          match.team_a_goals ||
          match.homeGoals ||
          0;
        const awayGoals =
          match.awayGoalCount ||
          match.away_scored ||
          match.awayScore ||
          match.team_b_goals ||
          match.awayGoals ||
          0;
        const matchDate = match.date
          ? new Date(match.date).toLocaleDateString()
          : match.date_unix
            ? new Date(match.date_unix * 1000).toLocaleDateString()
            : 'Date N/A';

        // Determine winner for styling
        // Since team IDs can change across seasons, we'll use name matching as fallback
        let resultClass = 'draw';

        // Get current team names from parameters
        const homeTeamName = homeTeam?.name || '';
        const awayTeamName = awayTeam?.name || '';

        // For previous_matches_ids, use the team IDs to show which team played where
        let matchHomeName = match.home_name || `Team ${match.homeID || match.team_a_id}`;
        let matchAwayName = match.away_name || `Team ${match.awayID || match.team_b_id}`;

        // If we have current team info from the match data, use it
        if (match.currentTeamA && match.currentTeamB) {
          if (match.homeID === match.currentTeamAId) {
            matchHomeName = match.currentTeamA;
          } else if (match.homeID === match.currentTeamBId) {
            matchHomeName = match.currentTeamB;
          }

          if (match.awayID === match.currentTeamAId) {
            matchAwayName = match.currentTeamA;
          } else if (match.awayID === match.currentTeamBId) {
            matchAwayName = match.currentTeamB;
          }
        }

        // Final fallback - if still showing "Team ID", try to match with current teams
        if (matchHomeName.startsWith('Team ') && homeTeam && awayTeam) {
          // Get the team ID from the string "Team 123"
          const _homeId = parseInt(match.homeID || match.team_a_id, 10);

          // Check if these IDs match our current teams
          if (_homeId === homeTeam.id) {
            matchHomeName = homeTeamName;
          } else if (_homeId === awayTeam.id) {
            matchHomeName = awayTeamName;
          }
        }

        if (matchAwayName.startsWith('Team ') && homeTeam && awayTeam) {
          const _awayId = parseInt(match.awayID || match.team_b_id, 10);

          if (_awayId === homeTeam.id) {
            matchAwayName = homeTeamName;
          } else if (_awayId === awayTeam.id) {
            matchAwayName = awayTeamName;
          }
        }

        // Try to determine which team is which by name or ID
        const isHomeTeamPlayingHome =
          match.homeID === homeTeam?.id ||
          matchHomeName.includes(homeTeamName) ||
          homeTeamName.includes(matchHomeName.replace(' (Historical)', ''));
        const isAwayTeamPlayingAway =
          match.awayID === awayTeam?.id ||
          matchAwayName.includes(awayTeamName) ||
          awayTeamName.includes(matchAwayName.replace(' (Historical)', ''));

        if (homeGoals > awayGoals) {
          // Home team won the match
          if (isHomeTeamPlayingHome) {
            resultClass = 'home-win';
          } else if (isAwayTeamPlayingAway) {
            resultClass = 'away-loss';
          } else {
            resultClass = 'neutral';
          }
        } else if (awayGoals > homeGoals) {
          // Away team won the match
          if (isAwayTeamPlayingAway) {
            resultClass = 'away-win';
          } else if (isHomeTeamPlayingHome) {
            resultClass = 'home-loss';
          } else {
            resultClass = 'neutral';
          }
        }

        return `
          <div class="h2h-match-card ${resultClass}">
            <div class="h2h-match-date">${matchDate}</div>
            <div class="h2h-match-content">
              <div class="h2h-team-row">
                <span class="h2h-team-name ${match.homeID === homeTeam?.id ? 'current-team' : ''}">
                  ${matchHomeName}
                </span>
                <span class="h2h-team-score">${homeGoals}</span>
              </div>
              <div class="h2h-team-row">
                <span class="h2h-team-name ${match.awayID === awayTeam?.id ? 'current-team' : ''}">
                  ${matchAwayName}
                </span>
                <span class="h2h-team-score">${awayGoals}</span>
              </div>
            </div>
          </div>
        `;
      })
      .join('');
  }

  initializeH2HCarousel() {
    const container = document.querySelector('.h2h-carousel-container');
    if (!container) {
      return;
    }

    const track = container.querySelector('.h2h-carousel-track');
    const prevBtn = container.querySelector('.h2h-carousel-prev');
    const nextBtn = container.querySelector('.h2h-carousel-next');
    const cards = track.querySelectorAll('.h2h-match-card');

    if (cards.length === 0) {
      return;
    }

    let currentIndex = 0;
    let touchStartX = 0;
    let touchEndX = 0;

    // Responsive cards per view
    const getCardsPerView = () => {
      const width = window.innerWidth;
      if (width < 600) {
        return 1;
      }
      if (width < 900) {
        return 2;
      }
      return 3;
    };

    let cardsPerView = getCardsPerView();
    const cardWidth = 220; // card width + gap
    let maxIndex = Math.max(0, cards.length - cardsPerView);

    // Update carousel position
    const updateCarousel = () => {
      const offset = -currentIndex * cardWidth;
      track.style.transform = `translateX(${offset}px)`;

      // Update button states
      prevBtn.disabled = currentIndex === 0;
      nextBtn.disabled = currentIndex >= maxIndex;
    };

    // Handle swipe gestures
    const handleSwipe = () => {
      const swipeThreshold = 50;
      const diff = touchStartX - touchEndX;

      if (Math.abs(diff) > swipeThreshold) {
        if (diff > 0 && currentIndex < maxIndex) {
          // Swipe left - next
          currentIndex++;
          updateCarousel();
        } else if (diff < 0 && currentIndex > 0) {
          // Swipe right - prev
          currentIndex--;
          updateCarousel();
        }
      }
    };

    // Update on window resize
    window.addEventListener('resize', () => {
      cardsPerView = getCardsPerView();
      maxIndex = Math.max(0, cards.length - cardsPerView);
      currentIndex = Math.min(currentIndex, maxIndex);
      updateCarousel();
    });

    // Button click handlers
    prevBtn.addEventListener('click', () => {
      if (currentIndex > 0) {
        currentIndex--;
        updateCarousel();
      }
    });

    nextBtn.addEventListener('click', () => {
      if (currentIndex < maxIndex) {
        currentIndex++;
        updateCarousel();
      }
    });

    // Touch/swipe support
    track.addEventListener(
      'touchstart',
      e => {
        touchStartX = e.changedTouches[0].screenX;
      },
      { passive: true }
    );

    track.addEventListener(
      'touchend',
      e => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
      },
      { passive: true }
    );

    // Initialize
    updateCarousel();
  }

  showNoH2HData() {
    // Reset all H2H values to show no data available
    if (this.elements.h2hHomeWins) {
      this.elements.h2hHomeWins.textContent = '-';
    }
    if (this.elements.h2hAwayWins) {
      this.elements.h2hAwayWins.textContent = '-';
    }
    if (this.elements.h2hDraws) {
      this.elements.h2hDraws.textContent = '-';
    }
    if (this.elements.h2hTotalMatches) {
      this.elements.h2hTotalMatches.textContent = '0';
    }

    // Hide progress bars
    if (this.elements.h2hProgressHome) {
      this.elements.h2hProgressHome.style.width = '0%';
    }
    if (this.elements.h2hProgressDraw) {
      this.elements.h2hProgressDraw.style.width = '0%';
    }
    if (this.elements.h2hProgressAway) {
      this.elements.h2hProgressAway.style.width = '0%';
    }

    // Show "No data" in progress labels
    if (this.elements.h2hProgressHomeLabel) {
      this.elements.h2hProgressHomeLabel.textContent = 'No data';
    }
    if (this.elements.h2hProgressDrawLabel) {
      this.elements.h2hProgressDrawLabel.textContent = '';
    }
    if (this.elements.h2hProgressAwayLabel) {
      this.elements.h2hProgressAwayLabel.textContent = '';
    }

    // Reset stat positions
    this.positionH2HStats(33.33, 33.33, 33.33, 0, 0, 0);

    // Reset Over/Under stats
    if (this.elements.h2hOver15) {
      this.elements.h2hOver15.textContent = '-';
    }
    if (this.elements.h2hOver15Count) {
      this.elements.h2hOver15Count.textContent = '-';
    }
    if (this.elements.h2hOver15Total) {
      this.elements.h2hOver15Total.textContent = '-';
    }

    if (this.elements.h2hOver25) {
      this.elements.h2hOver25.textContent = '-';
    }
    if (this.elements.h2hOver25Count) {
      this.elements.h2hOver25Count.textContent = '-';
    }
    if (this.elements.h2hOver25Total) {
      this.elements.h2hOver25Total.textContent = '-';
    }

    if (this.elements.h2hOver35) {
      this.elements.h2hOver35.textContent = '-';
    }
    if (this.elements.h2hOver35Count) {
      this.elements.h2hOver35Count.textContent = '-';
    }
    if (this.elements.h2hOver35Total) {
      this.elements.h2hOver35Total.textContent = '-';
    }

    // Reset BTTS stats
    if (this.elements.h2hBTTS) {
      this.elements.h2hBTTS.textContent = '-';
    }
    if (this.elements.h2hBTTSYes) {
      this.elements.h2hBTTSYes.textContent = '-';
    }
    if (this.elements.h2hBTTSNo) {
      this.elements.h2hBTTSNo.textContent = '-';
    }
  }

  setH2HLoadingState(isLoading) {
    const h2hCard = document.querySelector('.h2h-stats-card');
    if (!h2hCard) {
      return;
    }

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
      if (spinner) {
        spinner.remove();
      }
    }
  }

  /**
   * Update team comparison cards
   * @param {Object} teamData - Team statistics data
   */
  updateTeamComparisonCards(teamData) {
    if (!teamData || !teamData.homeTeam || !teamData.awayTeam) {
      this.showNoTeamDataMessage();
      return;
    }

    // Update home team card
    this.updateTeamCard('home', teamData.homeTeam);

    // Update away team card
    this.updateTeamCard('away', teamData.awayTeam);
  }

  /**
   * Update individual team card
   * @param {string} side - 'home' or 'away'
   * @param {Object} teamData - Team data object
   */
  updateTeamCard(side, teamData) {
    const prefix = side === 'home' ? 'homeTeam' : 'awayTeam';

    // Update team header
    const logoEl = document.getElementById(`${prefix}CardLogo`);
    const nameEl = document.getElementById(`${prefix}CardName`);
    const leagueEl = document.getElementById(`${prefix}CardLeague`);
    const positionEl = document.getElementById(`${prefix}CardPosition`);

    if (logoEl && teamData.logo) {
      const logoUrl = this.getTeamLogoUrl(teamData.logo);
      logoEl.src = logoUrl;
      logoEl.style.display = 'block';
      logoEl.onerror = () => {
        logoEl.style.display = 'none';
      };
    } else if (logoEl) {
      logoEl.style.display = 'none';
    }

    if (nameEl) {
      nameEl.textContent = teamData.name || '-';
    }

    if (leagueEl) {
      leagueEl.textContent = teamData.league || '-';
    }

    if (positionEl && teamData.position) {
      positionEl.textContent = `Position: ${teamData.position}`;
    }

    // Update form data
    this.updateTeamFormData(prefix, teamData);

    // Update statistics
    this.updateTeamStatistics(prefix, teamData.stats || {});
  }

  /**
   * Update team form data
   * @param {string} prefix - Element ID prefix
   * @param {Object} teamData - Team data
   */
  updateTeamFormData(prefix, teamData) {
    // Overall form
    const overallFormEl = document.getElementById(`${prefix}OverallForm`);
    const overallPPGEl = document.getElementById(`${prefix}OverallPPG`);

    if (overallFormEl && teamData.form) {
      this.renderFormBadges(overallFormEl, teamData.form);
    }

    if (overallPPGEl) {
      const ppg = teamData.stats?.ppg || teamData.ppg || 0;
      overallPPGEl.textContent = parseFloat(ppg).toFixed(2);
      this.applyPPGClass(overallPPGEl, ppg);
    }

    // Home form
    const homeFormEl = document.getElementById(`${prefix}HomeForm`);
    const homePPGEl = document.getElementById(`${prefix}HomePPG`);

    if (homeFormEl && teamData.homeForm) {
      this.renderFormBadges(homeFormEl, teamData.homeForm);
    }

    if (homePPGEl) {
      const homePPG = teamData.stats?.homePPG || teamData.homePPG || 0;
      homePPGEl.textContent = parseFloat(homePPG).toFixed(2);
      this.applyPPGClass(homePPGEl, homePPG);
    }

    // Away form
    const awayFormEl = document.getElementById(`${prefix}AwayForm`);
    const awayPPGEl = document.getElementById(`${prefix}AwayPPG`);

    if (awayFormEl && teamData.awayForm) {
      this.renderFormBadges(awayFormEl, teamData.awayForm);
    }

    if (awayPPGEl) {
      const awayPPG = teamData.stats?.awayPPG || teamData.awayPPG || 0;
      awayPPGEl.textContent = parseFloat(awayPPG).toFixed(2);
      this.applyPPGClass(awayPPGEl, awayPPG);
    }
  }

  /**
   * Update team statistics
   * @param {string} prefix - Element ID prefix
   * @param {Object} stats - Statistics object
   */
  updateTeamStatistics(prefix, stats) {
    const statMappings = [
      {
        stat: 'Win',
        fields: ['winPercentage', 'homeWinPercentage', 'awayWinPercentage'],
        suffix: '%',
      },
      { stat: 'Avg', fields: ['goalsPerMatch', 'homeGoalsPerMatch', 'awayGoalsPerMatch'] },
      { stat: 'Scored', fields: ['goalsScored', 'homeGoalsScored', 'awayGoalsScored'] },
      { stat: 'Conceded', fields: ['goalsConceded', 'homeGoalsConceded', 'awayGoalsConceded'] },
      {
        stat: 'BTTS',
        fields: ['bttsPercentage', 'homeBTTSPercentage', 'awayBTTSPercentage'],
        suffix: '%',
      },
      {
        stat: 'CS',
        fields: ['cleanSheetPercentage', 'homeCleanSheetPercentage', 'awayCleanSheetPercentage'],
        suffix: '%',
      },
      {
        stat: 'FTS',
        fields: [
          'failedToScorePercentage',
          'homeFailedToScorePercentage',
          'awayFailedToScorePercentage',
        ],
        suffix: '%',
      },
      { stat: 'XG', fields: ['xGFor', 'homeXGFor', 'awayXGFor'] },
      { stat: 'XGA', fields: ['xGAgainst', 'homeXGAgainst', 'awayXGAgainst'] },
    ];

    statMappings.forEach(({ stat, fields, suffix = '' }) => {
      const overallEl = document.getElementById(`${prefix}${stat}Overall`);
      const homeEl = document.getElementById(`${prefix}${stat}Home`);
      const awayEl = document.getElementById(`${prefix}${stat}Away`);

      if (overallEl) {
        const value = stats[fields[0]] || 0;
        overallEl.textContent = this.formatStatValue(value, suffix);
        this.applyStatClass(overallEl, stat, value);
      }

      if (homeEl) {
        const value = stats[fields[1]] || 0;
        homeEl.textContent = this.formatStatValue(value, suffix);
        this.applyStatClass(homeEl, stat, value);
      }

      if (awayEl) {
        const value = stats[fields[2]] || 0;
        awayEl.textContent = this.formatStatValue(value, suffix);
        this.applyStatClass(awayEl, stat, value);
      }
    });
  }

  /**
   * Render form badges
   * @param {HTMLElement} container - Container element
   * @param {string} formString - Form string (e.g., "WWDLW")
   */
  renderFormBadges(container, formString) {
    container.innerHTML = '';
    const results = formString.split('').slice(-5); // Last 5 matches

    results.forEach(result => {
      const badge = document.createElement('span');
      badge.className = `form-badge ${result.toLowerCase()}`;
      badge.textContent = result;
      container.appendChild(badge);
    });
  }

  /**
   * Apply PPG class based on value
   * @param {HTMLElement} element - Element to apply class to
   * @param {number} ppg - Points per game value
   */
  applyPPGClass(element, ppg) {
    element.classList.remove('high', 'medium', 'low');

    if (ppg >= 2.0) {
      element.classList.add('high');
    } else if (ppg >= 1.5) {
      element.classList.add('medium');
    } else {
      element.classList.add('low');
    }
  }

  /**
   * Apply stat class based on value and type
   * @param {HTMLElement} element - Element to apply class to
   * @param {string} statType - Type of statistic
   * @param {number} value - Statistic value
   */
  applyStatClass(element, statType, value) {
    element.classList.remove('good', 'average', 'poor');

    const thresholds = {
      Win: { good: 50, average: 33 },
      Avg: { good: 2.0, average: 1.5 },
      Scored: { good: 2.0, average: 1.5 },
      Conceded: { good: 1.0, average: 1.5, inverse: true },
      BTTS: { good: 60, average: 40 },
      CS: { good: 40, average: 25 },
      FTS: { good: 20, average: 35, inverse: true },
      XG: { good: 2.0, average: 1.5 },
      XGA: { good: 1.0, average: 1.5, inverse: true },
    };

    const threshold = thresholds[statType];
    if (!threshold) {
      return;
    }

    if (threshold.inverse) {
      if (value <= threshold.good) {
        element.classList.add('good');
      } else if (value <= threshold.average) {
        element.classList.add('average');
      } else {
        element.classList.add('poor');
      }
    } else {
      if (value >= threshold.good) {
        element.classList.add('good');
      } else if (value >= threshold.average) {
        element.classList.add('average');
      } else {
        element.classList.add('poor');
      }
    }
  }

  /**
   * Format statistic value
   * @param {number} value - Value to format
   * @param {string} suffix - Suffix to add
   * @returns {string} - Formatted value
   */
  formatStatValue(value, suffix = '') {
    const numValue = parseFloat(value) || 0;

    if (suffix === '%') {
      return `${numValue.toFixed(0)}${suffix}`;
    }

    // For averages and xG values, show 2 decimal places
    if (numValue % 1 !== 0) {
      return numValue.toFixed(2);
    }

    return numValue.toString();
  }

  /**
   * Get team logo URL
   * @param {string} logo - Logo path or URL
   * @returns {string} - Full logo URL
   */
  getTeamLogoUrl(logo) {
    if (!logo) {
      return '';
    }

    if (logo.startsWith('http')) {
      return logo;
    }

    if (logo.startsWith('teams/')) {
      return `https://cdn.footystats.org/img/${logo}`;
    }

    return `https://cdn.footystats.org/img/teams/${logo}`;
  }

  /**
   * Show no team data message
   */
  showNoTeamDataMessage() {
    const container = document.querySelector('.team-comparison-grid');
    if (container) {
      container.innerHTML = `
        <div class="no-data-message">
          <i class="fas fa-info-circle"></i>
          <p>Team statistics data is not available yet.</p>
        </div>
      `;
    }
  }

  /**
   * Update form prediction display
   * @param {Object} prediction - Form prediction data
   */
  updateFormPrediction(prediction) {
    const container = document.getElementById('formPredictionContent');
    if (!container) {
      return;
    }

    if (!prediction) {
      container.innerHTML = `
        <div class="no-data-message">
          <i class="fas fa-info-circle"></i>
          <p>Form verisi bekleniyor...</p>
        </div>
      `;
      return;
    }

    const { homeTeam, awayTeam, drawProbability, confidence, analysis } = prediction;

    container.innerHTML = `
      <!-- Win Probability Circles -->
      <div class="prediction-circles-container">
        <div class="prediction-circle-group">
          <div class="circle-progress-wrapper">
            <svg class="circle-progress" viewBox="0 0 120 120">
              <circle class="circle-bg" cx="60" cy="60" r="54"></circle>
              <circle class="circle-fill home-circle" cx="60" cy="60" r="54" 
                style="stroke-dashoffset: ${339.292 - (339.292 * homeTeam.winProbability) / 100}"></circle>
            </svg>
            <div class="circle-content">
              <span class="circle-percentage">${homeTeam.winProbability}%</span>
              <span class="circle-label">Kazanır</span>
            </div>
          </div>
          <div class="circle-team-info">
            <h5>${homeTeam.name}</h5>
            <span class="team-type">Ev Sahibi</span>
          </div>
        </div>

        <div class="prediction-circle-group draw-group">
          <div class="circle-progress-wrapper small">
            <svg class="circle-progress" viewBox="0 0 120 120">
              <circle class="circle-bg" cx="60" cy="60" r="54"></circle>
              <circle class="circle-fill draw-circle" cx="60" cy="60" r="54" 
                style="stroke-dashoffset: ${339.292 - (339.292 * drawProbability) / 100}"></circle>
            </svg>
            <div class="circle-content">
              <span class="circle-percentage">${drawProbability}%</span>
            </div>
          </div>
          <div class="circle-team-info">
            <span class="team-type">Beraberlik</span>
          </div>
        </div>

        <div class="prediction-circle-group">
          <div class="circle-progress-wrapper">
            <svg class="circle-progress" viewBox="0 0 120 120">
              <circle class="circle-bg" cx="60" cy="60" r="54"></circle>
              <circle class="circle-fill away-circle" cx="60" cy="60" r="54" 
                style="stroke-dashoffset: ${339.292 - (339.292 * awayTeam.winProbability) / 100}"></circle>
            </svg>
            <div class="circle-content">
              <span class="circle-percentage">${awayTeam.winProbability}%</span>
              <span class="circle-label">Kazanır</span>
            </div>
          </div>
          <div class="circle-team-info">
            <h5>${awayTeam.name}</h5>
            <span class="team-type">Deplasman</span>
          </div>
        </div>
      </div>

      <!-- Form Comparison -->
      <div class="form-comparison-container">
        <div class="form-comparison-header">
          <h4>Form Durumu Analizi</h4>
          <div class="confidence-badge confidence-${confidence}">
            <i class="fas fa-shield-alt"></i>
            <span>Güvenilirlik: ${this.getConfidenceText(confidence)}</span>
          </div>
        </div>
        
        <div class="form-comparison-grid">
          <!-- Home Team Form -->
          <div class="form-team-card">
            <div class="form-team-header">
              <div class="form-team-title">
                <img class="form-team-logo" src="${this.getTeamLogo(homeTeam)}" alt="${homeTeam.name}" 
                  onerror="this.style.display='none'">
                <h5>${homeTeam.name}</h5>
              </div>
              <span class="form-ppg">${homeTeam.formPercentage}%</span>
            </div>
            <div class="form-info">
              <div class="form-row">
                <span class="form-label">Son 5 Ev Maçı:</span>
                <div class="form-badges">${this.renderFormBadgesHTML(homeTeam.form)}</div>
              </div>
              <div class="form-stats">
                <span class="form-stat">
                  <i class="fas fa-trophy"></i>
                  ${homeTeam.formPoints} puan
                </span>
                <span class="form-stat">
                  <i class="fas fa-home"></i>
                  Ev formu
                </span>
              </div>
            </div>
          </div>

          <!-- VS Divider -->
          <div class="vs-divider">
            <div class="vs-circle">VS</div>
          </div>

          <!-- Away Team Form -->
          <div class="form-team-card">
            <div class="form-team-header">
              <div class="form-team-title">
                <img class="form-team-logo" src="${this.getTeamLogo(awayTeam)}" alt="${awayTeam.name}" 
                  onerror="this.style.display='none'">
                <h5>${awayTeam.name}</h5>
              </div>
              <span class="form-ppg">${awayTeam.formPercentage}%</span>
            </div>
            <div class="form-info">
              <div class="form-row">
                <span class="form-label">Son 5 Deplasman Maçı:</span>
                <div class="form-badges">${this.renderFormBadgesHTML(awayTeam.form)}</div>
              </div>
              <div class="form-stats">
                <span class="form-stat">
                  <i class="fas fa-trophy"></i>
                  ${awayTeam.formPoints} puan
                </span>
                <span class="form-stat">
                  <i class="fas fa-plane"></i>
                  Deplasman formu
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Analysis Summary -->
        <div class="prediction-summary">
          <div class="summary-icon">
            <i class="fas fa-chart-line"></i>
          </div>
          <div class="summary-content">
            <p class="summary-text">${analysis.summary}</p>
            <div class="summary-factors">
              ${analysis.keyFactors
                .map(
                  factor => `
                <span class="factor-badge">
                  <i class="fas fa-check-circle"></i>
                  ${factor}
                </span>
              `
                )
                .join('')}
            </div>
          </div>
        </div>
      </div>
    `;

    // Add animation after render - Circle animation is handled by CSS transition
  }

  /**
   * Render form badges as HTML string
   * @param {string} formString - Form string like "WWDLW"
   * @returns {string} HTML string
   */
  renderFormBadgesHTML(formString) {
    if (!formString) {
      return '<span class="no-form">Veri yok</span>';
    }

    const last5 = formString.replace(/[-\s]/g, '').slice(-5);

    return last5
      .split('')
      .map(result => {
        const upperResult = result.toUpperCase();
        const className = upperResult === 'W' ? 'win' : upperResult === 'D' ? 'draw' : 'loss';
        return `<span class="form-result ${className}">${upperResult}</span>`;
      })
      .join('');
  }

  /**
   * Get confidence text in Turkish
   * @param {string} confidence - Confidence level
   * @returns {string} Turkish text
   */
  getConfidenceText(confidence) {
    const texts = {
      high: 'Yüksek',
      medium: 'Orta',
      low: 'Düşük',
    };
    return texts[confidence] || 'Bilinmiyor';
  }

  /**
   * Get team logo URL from prediction data
   * @param {Object} team - Team object from prediction
   * @returns {string} Logo URL
   */
  getTeamLogo(team) {
    // Try to get logo from match data first
    const matchData = this.eventBus._lastMatchData;
    if (matchData) {
      if (team.name === matchData.homeTeam?.name) {
        return this.getTeamLogoUrl(matchData.homeTeam.logo);
      } else if (team.name === matchData.awayTeam?.name) {
        return this.getTeamLogoUrl(matchData.awayTeam.logo);
      }
    }
    return '';
  }

  /**
   * Update goals comparison display
   * @param {Object} comparison - Goals comparison data
   */
  updateGoalsComparison(comparison) {
    const container = document.getElementById('goalsComparisonContent');
    if (!container) {
      return;
    }

    if (!comparison || !comparison.homeTeam || !comparison.awayTeam) {
      container.innerHTML = `
        <div class="no-data-message">
          <i class="fas fa-info-circle"></i>
          <p>Gol istatistikleri bekleniyor...</p>
        </div>
      `;
      return;
    }

    const { homeTeam, awayTeam } = comparison;

    container.innerHTML = `
      <!-- Goals Comparison Grid -->
      <div class="goals-comparison-grid">
        <!-- Home Team Goals -->
        <div class="goals-team-section">
          <div class="goals-team-header">
            ${homeTeam.logo ? `<img src="${this.getTeamLogoUrl(homeTeam.logo)}" alt="${homeTeam.name}" class="goals-team-logo">` : ''}
            <h4>${homeTeam.name}</h4>
            <span class="venue-badge home">Ev Sahibi</span>
          </div>
          
          <!-- Average Goals Per Match -->
          <div class="goals-stat-row">
            <div class="goals-stat-label">Maç Başı Gol</div>
            <div class="goals-stat-value">${homeTeam.stats.goalsPerMatch}</div>
            <div class="goals-progress-bar">
              <div class="goals-progress-fill" style="width: ${this.calculateGoalsPercentage(homeTeam.stats.goalsPerMatch, 4)}%"></div>
            </div>
          </div>
          
          <!-- Total Goals -->
          <div class="goals-stat-row">
            <div class="goals-stat-label">Toplam Gol</div>
            <div class="goals-stat-value">${homeTeam.stats.totalGoals}</div>
            <div class="goals-progress-bar">
              <div class="goals-progress-fill" style="width: ${this.calculateGoalsPercentage(homeTeam.stats.totalGoals, 100)}%"></div>
            </div>
          </div>
          
          <!-- First Half Average -->
          <div class="goals-stat-row">
            <div class="goals-stat-label">İlk Yarı Ort.</div>
            <div class="goals-stat-value">${homeTeam.stats.firstHalfAvg}</div>
            <div class="goals-progress-bar">
              <div class="goals-progress-fill" style="width: ${this.calculateGoalsPercentage(homeTeam.stats.firstHalfAvg, 2)}%"></div>
            </div>
          </div>
          
          <!-- Second Half Average -->
          <div class="goals-stat-row">
            <div class="goals-stat-label">İkinci Yarı Ort.</div>
            <div class="goals-stat-value">${homeTeam.stats.secondHalfAvg}</div>
            <div class="goals-progress-bar">
              <div class="goals-progress-fill" style="width: ${this.calculateGoalsPercentage(homeTeam.stats.secondHalfAvg, 2)}%"></div>
            </div>
          </div>
          
          <!-- Failed to Score -->
          <div class="goals-stat-row fts-row">
            <div class="goals-stat-label">Gol Atamama</div>
            <div class="goals-stat-value ${this.getFTSClass(homeTeam.stats.failedToScore)}">${homeTeam.stats.failedToScore}%</div>
            <div class="goals-progress-bar fts-bar">
              <div class="goals-progress-fill" style="width: ${homeTeam.stats.failedToScore}%"></div>
            </div>
          </div>
          
          <!-- Over/Under Stats -->
          <div class="goals-over-under-section">
            <h5>Takım Attığı Gol - Üst/Alt</h5>
            <div class="goals-over-under-grid">
              <div class="over-under-stat">
                <span class="ou-label">0.5+</span>
                <span class="ou-value ${this.getOverUnderClass(homeTeam.stats.over05)}">${homeTeam.stats.over05}%</span>
              </div>
              <div class="over-under-stat">
                <span class="ou-label">1.5+</span>
                <span class="ou-value ${this.getOverUnderClass(homeTeam.stats.over15)}">${homeTeam.stats.over15}%</span>
              </div>
              <div class="over-under-stat">
                <span class="ou-label">2.5+</span>
                <span class="ou-value ${this.getOverUnderClass(homeTeam.stats.over25)}">${homeTeam.stats.over25}%</span>
              </div>
              <div class="over-under-stat">
                <span class="ou-label">3.5+</span>
                <span class="ou-value ${this.getOverUnderClass(homeTeam.stats.over35)}">${homeTeam.stats.over35}%</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Away Team Goals -->
        <div class="goals-team-section">
          <div class="goals-team-header">
            ${awayTeam.logo ? `<img src="${this.getTeamLogoUrl(awayTeam.logo)}" alt="${awayTeam.name}" class="goals-team-logo">` : ''}
            <h4>${awayTeam.name}</h4>
            <span class="venue-badge away">Deplasman</span>
          </div>
          
          <!-- Average Goals Per Match -->
          <div class="goals-stat-row">
            <div class="goals-stat-label">Maç Başı Gol</div>
            <div class="goals-stat-value">${awayTeam.stats.goalsPerMatch}</div>
            <div class="goals-progress-bar">
              <div class="goals-progress-fill" style="width: ${this.calculateGoalsPercentage(awayTeam.stats.goalsPerMatch, 4)}%"></div>
            </div>
          </div>
          
          <!-- Total Goals -->
          <div class="goals-stat-row">
            <div class="goals-stat-label">Toplam Gol</div>
            <div class="goals-stat-value">${awayTeam.stats.totalGoals}</div>
            <div class="goals-progress-bar">
              <div class="goals-progress-fill" style="width: ${this.calculateGoalsPercentage(awayTeam.stats.totalGoals, 100)}%"></div>
            </div>
          </div>
          
          <!-- First Half Average -->
          <div class="goals-stat-row">
            <div class="goals-stat-label">İlk Yarı Ort.</div>
            <div class="goals-stat-value">${awayTeam.stats.firstHalfAvg}</div>
            <div class="goals-progress-bar">
              <div class="goals-progress-fill" style="width: ${this.calculateGoalsPercentage(awayTeam.stats.firstHalfAvg, 2)}%"></div>
            </div>
          </div>
          
          <!-- Second Half Average -->
          <div class="goals-stat-row">
            <div class="goals-stat-label">İkinci Yarı Ort.</div>
            <div class="goals-stat-value">${awayTeam.stats.secondHalfAvg}</div>
            <div class="goals-progress-bar">
              <div class="goals-progress-fill" style="width: ${this.calculateGoalsPercentage(awayTeam.stats.secondHalfAvg, 2)}%"></div>
            </div>
          </div>
          
          <!-- Failed to Score -->
          <div class="goals-stat-row fts-row">
            <div class="goals-stat-label">Gol Atamama</div>
            <div class="goals-stat-value ${this.getFTSClass(awayTeam.stats.failedToScore)}">${awayTeam.stats.failedToScore}%</div>
            <div class="goals-progress-bar fts-bar">
              <div class="goals-progress-fill" style="width: ${awayTeam.stats.failedToScore}%"></div>
            </div>
          </div>
          
          <!-- Over/Under Stats -->
          <div class="goals-over-under-section">
            <h5>Takım Attığı Gol - Üst/Alt</h5>
            <div class="goals-over-under-grid">
              <div class="over-under-stat">
                <span class="ou-label">0.5+</span>
                <span class="ou-value ${this.getOverUnderClass(awayTeam.stats.over05)}">${awayTeam.stats.over05}%</span>
              </div>
              <div class="over-under-stat">
                <span class="ou-label">1.5+</span>
                <span class="ou-value ${this.getOverUnderClass(awayTeam.stats.over15)}">${awayTeam.stats.over15}%</span>
              </div>
              <div class="over-under-stat">
                <span class="ou-label">2.5+</span>
                <span class="ou-value ${this.getOverUnderClass(awayTeam.stats.over25)}">${awayTeam.stats.over25}%</span>
              </div>
              <div class="over-under-stat">
                <span class="ou-label">3.5+</span>
                <span class="ou-value ${this.getOverUnderClass(awayTeam.stats.over35 || 0)}">${awayTeam.stats.over35 || 0}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Calculate percentage for progress bar
   * @param {number} value - Current value
   * @param {number} max - Maximum value
   * @returns {number} Percentage
   */
  calculateGoalsPercentage(value, max) {
    const percentage = (parseFloat(value) / max) * 100;
    return Math.min(percentage, 100);
  }

  /**
   * Get class for over/under values
   * @param {number} value - Percentage value
   * @returns {string} CSS class
   */
  getOverUnderClass(value) {
    if (value >= 70) {
      return 'high';
    }
    if (value >= 50) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Get class for failed to score values
   * @param {number} value - Percentage value
   * @returns {string} CSS class
   */
  getFTSClass(value) {
    if (value >= 40) {
      return 'poor';
    }
    if (value >= 25) {
      return 'average';
    }
    return 'good';
  }

  /**
   * Update goals conceded comparison display
   * @param {Object} comparison - Goals conceded comparison data
   */
  updateGoalsConcededComparison(comparison) {
    const container = document.getElementById('goalsConcededComparisonContent');
    if (!container) {
      return;
    }

    if (!comparison || !comparison.homeTeam || !comparison.awayTeam) {
      container.innerHTML = `
        <div class="no-data-message">
          <i class="fas fa-info-circle"></i>
          <p>Yenilen gol istatistikleri bekleniyor...</p>
        </div>
      `;
      return;
    }

    const { homeTeam, awayTeam } = comparison;

    container.innerHTML = `
      <!-- Goals Conceded Comparison Grid -->
      <div class="goals-comparison-grid">
        <!-- Home Team Goals Conceded -->
        <div class="goals-team-section">
          <div class="goals-team-header">
            ${homeTeam.logo ? `<img src="${this.getTeamLogoUrl(homeTeam.logo)}" alt="${homeTeam.name}" class="goals-team-logo">` : ''}
            <h4>${homeTeam.name}</h4>
            <span class="venue-badge home">Ev Sahibi</span>
          </div>
          
          <!-- Goals Conceded Per Match -->
          <div class="goals-stat-row">
            <div class="goals-stat-label">Maç Başı Yenilen Gol</div>
            <div class="goals-stat-value">${homeTeam.stats.concededPerMatch || homeTeam.stats.goalsAgainstPerMatch || '0.00'}</div>
            <div class="goals-progress-bar">
              <div class="goals-progress-fill" style="width: ${this.calculateGoalsPercentage(homeTeam.stats.concededPerMatch || homeTeam.stats.goalsAgainstPerMatch || 0, 4)}%"></div>
            </div>
          </div>
          
          <!-- Total Goals Conceded -->
          <div class="goals-stat-row">
            <div class="goals-stat-label">Toplam Yenilen Gol</div>
            <div class="goals-stat-value">${homeTeam.stats.totalGoalsConceded || 0}</div>
            <div class="goals-progress-bar">
              <div class="goals-progress-fill" style="width: ${this.calculateGoalsPercentage(homeTeam.stats.totalGoalsConceded || 0, 100)}%"></div>
            </div>
          </div>
          
          <!-- First Half Conceded Average -->
          <div class="goals-stat-row">
            <div class="goals-stat-label">İlk Yarı Yenilen Ort.</div>
            <div class="goals-stat-value">${homeTeam.stats.firstHalfConcededAvg || '0.00'}</div>
            <div class="goals-progress-bar">
              <div class="goals-progress-fill" style="width: ${this.calculateGoalsPercentage(homeTeam.stats.firstHalfConcededAvg || 0, 2)}%"></div>
            </div>
          </div>
          
          <!-- Second Half Conceded Average -->
          <div class="goals-stat-row">
            <div class="goals-stat-label">İkinci Yarı Yenilen Ort.</div>
            <div class="goals-stat-value">${homeTeam.stats.secondHalfConcededAvg || '0.00'}</div>
            <div class="goals-progress-bar">
              <div class="goals-progress-fill" style="width: ${this.calculateGoalsPercentage(homeTeam.stats.secondHalfConcededAvg || 0, 2)}%"></div>
            </div>
          </div>
          
          <!-- Clean Sheet Percentage -->
          <div class="goals-stat-row cs-row">
            <div class="goals-stat-label">Clean Sheet</div>
            <div class="goals-stat-value ${this.getCSClass(homeTeam.stats.cleanSheetPercentage)}">${homeTeam.stats.cleanSheetPercentage}%</div>
            <div class="goals-progress-bar cs-bar">
              <div class="goals-progress-fill" style="width: ${homeTeam.stats.cleanSheetPercentage}%"></div>
            </div>
          </div>
          
          <!-- Over/Under Conceded Stats -->
          <div class="goals-over-under-section">
            <h5>Takım Yediği Gol - Üst/Alt</h5>
            <div class="goals-over-under-grid">
              <div class="over-under-stat">
                <span class="ou-label">0.5+</span>
                <span class="ou-value ${this.getOverUnderClass(homeTeam.stats.over05Conceded)}">${homeTeam.stats.over05Conceded}%</span>
              </div>
              <div class="over-under-stat">
                <span class="ou-label">1.5+</span>
                <span class="ou-value ${this.getOverUnderClass(homeTeam.stats.over15Conceded)}">${homeTeam.stats.over15Conceded}%</span>
              </div>
              <div class="over-under-stat">
                <span class="ou-label">2.5+</span>
                <span class="ou-value ${this.getOverUnderClass(homeTeam.stats.over25Conceded)}">${homeTeam.stats.over25Conceded}%</span>
              </div>
              <div class="over-under-stat">
                <span class="ou-label">3.5+</span>
                <span class="ou-value ${this.getOverUnderClass(homeTeam.stats.over35Conceded)}">${homeTeam.stats.over35Conceded}%</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Away Team Goals Conceded -->
        <div class="goals-team-section">
          <div class="goals-team-header">
            ${awayTeam.logo ? `<img src="${this.getTeamLogoUrl(awayTeam.logo)}" alt="${awayTeam.name}" class="goals-team-logo">` : ''}
            <h4>${awayTeam.name}</h4>
            <span class="venue-badge away">Deplasman</span>
          </div>
          
          <!-- Goals Conceded Per Match -->
          <div class="goals-stat-row">
            <div class="goals-stat-label">Maç Başı Yenilen Gol</div>
            <div class="goals-stat-value">${awayTeam.stats.concededPerMatch || awayTeam.stats.goalsAgainstPerMatch || '0.00'}</div>
            <div class="goals-progress-bar">
              <div class="goals-progress-fill" style="width: ${this.calculateGoalsPercentage(awayTeam.stats.concededPerMatch || awayTeam.stats.goalsAgainstPerMatch || 0, 4)}%"></div>
            </div>
          </div>
          
          <!-- Total Goals Conceded -->
          <div class="goals-stat-row">
            <div class="goals-stat-label">Toplam Yenilen Gol</div>
            <div class="goals-stat-value">${awayTeam.stats.totalGoalsConceded || 0}</div>
            <div class="goals-progress-bar">
              <div class="goals-progress-fill" style="width: ${this.calculateGoalsPercentage(awayTeam.stats.totalGoalsConceded || 0, 100)}%"></div>
            </div>
          </div>
          
          <!-- First Half Conceded Average -->
          <div class="goals-stat-row">
            <div class="goals-stat-label">İlk Yarı Yenilen Ort.</div>
            <div class="goals-stat-value">${awayTeam.stats.firstHalfConcededAvg || '0.00'}</div>
            <div class="goals-progress-bar">
              <div class="goals-progress-fill" style="width: ${this.calculateGoalsPercentage(awayTeam.stats.firstHalfConcededAvg || 0, 2)}%"></div>
            </div>
          </div>
          
          <!-- Second Half Conceded Average -->
          <div class="goals-stat-row">
            <div class="goals-stat-label">İkinci Yarı Yenilen Ort.</div>
            <div class="goals-stat-value">${awayTeam.stats.secondHalfConcededAvg || '0.00'}</div>
            <div class="goals-progress-bar">
              <div class="goals-progress-fill" style="width: ${this.calculateGoalsPercentage(awayTeam.stats.secondHalfConcededAvg || 0, 2)}%"></div>
            </div>
          </div>
          
          <!-- Clean Sheet Percentage -->
          <div class="goals-stat-row cs-row">
            <div class="goals-stat-label">Clean Sheet</div>
            <div class="goals-stat-value ${this.getCSClass(awayTeam.stats.cleanSheetPercentage)}">${awayTeam.stats.cleanSheetPercentage}%</div>
            <div class="goals-progress-bar cs-bar">
              <div class="goals-progress-fill" style="width: ${awayTeam.stats.cleanSheetPercentage}%"></div>
            </div>
          </div>
          
          <!-- Over/Under Conceded Stats -->
          <div class="goals-over-under-section">
            <h5>Takım Yediği Gol - Üst/Alt</h5>
            <div class="goals-over-under-grid">
              <div class="over-under-stat">
                <span class="ou-label">0.5+</span>
                <span class="ou-value ${this.getOverUnderClass(awayTeam.stats.over05Conceded)}">${awayTeam.stats.over05Conceded}%</span>
              </div>
              <div class="over-under-stat">
                <span class="ou-label">1.5+</span>
                <span class="ou-value ${this.getOverUnderClass(awayTeam.stats.over15Conceded)}">${awayTeam.stats.over15Conceded}%</span>
              </div>
              <div class="over-under-stat">
                <span class="ou-label">2.5+</span>
                <span class="ou-value ${this.getOverUnderClass(awayTeam.stats.over25Conceded)}">${awayTeam.stats.over25Conceded}%</span>
              </div>
              <div class="over-under-stat">
                <span class="ou-label">3.5+</span>
                <span class="ou-value ${this.getOverUnderClass(awayTeam.stats.over35Conceded)}">${awayTeam.stats.over35Conceded}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Get class for clean sheet values
   * @param {number} value - Percentage value
   * @returns {string} CSS class
   */
  getCSClass(value) {
    if (value >= 40) {
      return 'excellent';
    }
    if (value >= 25) {
      return 'good';
    }
    return 'poor';
  }

  /**
   * Get class for BTTS values
   * @param {number} value - Percentage value
   * @returns {string} CSS class
   */
  getBTTSClass(value) {
    if (value >= 65) {
      return 'very-high';
    }
    if (value >= 50) {
      return 'high';
    }
    if (value >= 40) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Update Over 2.5 & BTTS comparison display
   * @param {Object} comparison - Over 2.5 & BTTS comparison data
   */
  updateOverBTTSComparison(comparison) {
    const container = document.getElementById('overBTTSComparisonContent');
    if (!container) {
      return;
    }

    if (!comparison || !comparison.homeTeam || !comparison.awayTeam || !comparison.averages) {
      container.innerHTML = `
        <div class="no-data-message">
          <i class="fas fa-info-circle"></i>
          <p>Üst/Alt ve BTTS istatistikleri bekleniyor...</p>
        </div>
      `;
      return;
    }

    const { homeTeam, awayTeam, averages } = comparison;

    container.innerHTML = `
      <!-- Over 2.5 & BTTS Modern Design -->
      <div class="over-btts-modern">
        <!-- Section Header -->
        <div class="section-header">
          <h4 class="section-title">Maç Golleri İstatistikleri</h4>
        </div>
        
        <!-- Statistics Table -->
        <div class="stats-table-container">
          <table class="stats-table">
            <thead>
              <tr>
                <th class="stat-name-col">İstatistik</th>
                <th class="team-col home-col">${homeTeam.name}</th>
                <th class="team-col away-col">${awayTeam.name}</th>
                <th class="average-col">Ortalama</th>
              </tr>
            </thead>
            <tbody>
              <!-- Over Statistics -->
              <tr>
                <td class="stat-name">Over 0.5</td>
                <td class="stat-value">
                  <div class="value-container">
                    <span class="value ${this.getOverUnderClass(homeTeam.stats.over05)}">${Math.round(homeTeam.stats.over05)}%</span>
                    <div class="value-bar">
                      <div class="value-fill ${this.getOverUnderClass(homeTeam.stats.over05)}" style="width: ${homeTeam.stats.over05}%">
                        <span class="value-label">${Math.round(homeTeam.stats.over05)}%</span>
                      </div>
                    </div>
                  </div>
                </td>
                <td class="stat-value">
                  <div class="value-container">
                    <span class="value ${this.getOverUnderClass(awayTeam.stats.over05)}">${Math.round(awayTeam.stats.over05)}%</span>
                    <div class="value-bar">
                      <div class="value-fill ${this.getOverUnderClass(awayTeam.stats.over05)}" style="width: ${awayTeam.stats.over05}%"></div>
                    </div>
                  </div>
                </td>
                <td class="stat-value average">
                  <span class="value ${this.getOverUnderClass(averages.over05)}">${Math.round(averages.over05)}%</span>
                </td>
              </tr>
              
              <tr>
                <td class="stat-name">Over 1.5</td>
                <td class="stat-value">
                  <div class="value-container">
                    <span class="value ${this.getOverUnderClass(homeTeam.stats.over15)}">${Math.round(homeTeam.stats.over15)}%</span>
                    <div class="value-bar">
                      <div class="value-fill ${this.getOverUnderClass(homeTeam.stats.over15)}" style="width: ${homeTeam.stats.over15}%"></div>
                    </div>
                  </div>
                </td>
                <td class="stat-value">
                  <div class="value-container">
                    <span class="value ${this.getOverUnderClass(awayTeam.stats.over15)}">${Math.round(awayTeam.stats.over15)}%</span>
                    <div class="value-bar">
                      <div class="value-fill ${this.getOverUnderClass(awayTeam.stats.over15)}" style="width: ${awayTeam.stats.over15}%"></div>
                    </div>
                  </div>
                </td>
                <td class="stat-value average">
                  <span class="value ${this.getOverUnderClass(averages.over15)}">${Math.round(averages.over15)}%</span>
                </td>
              </tr>
              
              <tr class="highlight-row">
                <td class="stat-name">
                  <span class="highlight-badge">Over 2.5</span>
                </td>
                <td class="stat-value">
                  <div class="value-container">
                    <span class="value ${this.getOverUnderClass(homeTeam.stats.over25)}">${Math.round(homeTeam.stats.over25)}%</span>
                    <div class="value-bar">
                      <div class="value-fill ${this.getOverUnderClass(homeTeam.stats.over25)}" style="width: ${homeTeam.stats.over25}%"></div>
                    </div>
                  </div>
                </td>
                <td class="stat-value">
                  <div class="value-container">
                    <span class="value ${this.getOverUnderClass(awayTeam.stats.over25)}">${Math.round(awayTeam.stats.over25)}%</span>
                    <div class="value-bar">
                      <div class="value-fill ${this.getOverUnderClass(awayTeam.stats.over25)}" style="width: ${awayTeam.stats.over25}%"></div>
                    </div>
                  </div>
                </td>
                <td class="stat-value average">
                  <span class="value highlight ${this.getOverUnderClass(averages.over25)}">${Math.round(averages.over25)}%</span>
                </td>
              </tr>
              
              <tr>
                <td class="stat-name">Over 3.5</td>
                <td class="stat-value">
                  <div class="value-container">
                    <span class="value ${this.getOverUnderClass(homeTeam.stats.over35)}">${Math.round(homeTeam.stats.over35)}%</span>
                    <div class="value-bar">
                      <div class="value-fill ${this.getOverUnderClass(homeTeam.stats.over35)}" style="width: ${homeTeam.stats.over35}%"></div>
                    </div>
                  </div>
                </td>
                <td class="stat-value">
                  <div class="value-container">
                    <span class="value ${this.getOverUnderClass(awayTeam.stats.over35)}">${Math.round(awayTeam.stats.over35)}%</span>
                    <div class="value-bar">
                      <div class="value-fill ${this.getOverUnderClass(awayTeam.stats.over35)}" style="width: ${awayTeam.stats.over35}%"></div>
                    </div>
                  </div>
                </td>
                <td class="stat-value average">
                  <span class="value ${this.getOverUnderClass(averages.over35)}">${Math.round(averages.over35)}%</span>
                </td>
              </tr>
              
              <tr>
                <td class="stat-name">Over 4.5</td>
                <td class="stat-value">
                  <div class="value-container">
                    <span class="value ${this.getOverUnderClass(homeTeam.stats.over45)}">${Math.round(homeTeam.stats.over45)}%</span>
                    <div class="value-bar">
                      <div class="value-fill ${this.getOverUnderClass(homeTeam.stats.over45)}" style="width: ${homeTeam.stats.over45}%"></div>
                    </div>
                  </div>
                </td>
                <td class="stat-value">
                  <div class="value-container">
                    <span class="value ${this.getOverUnderClass(awayTeam.stats.over45)}">${Math.round(awayTeam.stats.over45)}%</span>
                    <div class="value-bar">
                      <div class="value-fill ${this.getOverUnderClass(awayTeam.stats.over45)}" style="width: ${awayTeam.stats.over45}%"></div>
                    </div>
                  </div>
                </td>
                <td class="stat-value average">
                  <span class="value ${this.getOverUnderClass(averages.over45)}">${Math.round(averages.over45)}%</span>
                </td>
              </tr>
              
              <!-- BTTS Statistics -->
              <tr class="section-divider">
                <td colspan="4"></td>
              </tr>
              
              <tr class="highlight-row">
                <td class="stat-name">
                  <span class="highlight-badge">BTTS</span>
                </td>
                <td class="stat-value">
                  <div class="value-container">
                    <span class="value ${this.getBTTSClass(homeTeam.stats.btts)}">${Math.round(homeTeam.stats.btts)}%</span>
                    <div class="value-bar">
                      <div class="value-fill ${this.getBTTSClass(homeTeam.stats.btts)}" style="width: ${homeTeam.stats.btts}%"></div>
                    </div>
                  </div>
                </td>
                <td class="stat-value">
                  <div class="value-container">
                    <span class="value ${this.getBTTSClass(awayTeam.stats.btts)}">${Math.round(awayTeam.stats.btts)}%</span>
                    <div class="value-bar">
                      <div class="value-fill ${this.getBTTSClass(awayTeam.stats.btts)}" style="width: ${awayTeam.stats.btts}%"></div>
                    </div>
                  </div>
                </td>
                <td class="stat-value average">
                  <span class="value highlight ${this.getBTTSClass(averages.btts)}">${Math.round(averages.btts)}%</span>
                </td>
              </tr>
              
              <tr>
                <td class="stat-name">BTTS & Win</td>
                <td class="stat-value">
                  <div class="value-container">
                    <span class="value ${this.getBTTSClass(homeTeam.stats.bttsWin)}">${Math.round(homeTeam.stats.bttsWin)}%</span>
                    <div class="value-bar">
                      <div class="value-fill ${this.getBTTSClass(homeTeam.stats.bttsWin)}" style="width: ${homeTeam.stats.bttsWin}%"></div>
                    </div>
                  </div>
                </td>
                <td class="stat-value">
                  <div class="value-container">
                    <span class="value ${this.getBTTSClass(awayTeam.stats.bttsWin)}">${Math.round(awayTeam.stats.bttsWin)}%</span>
                    <div class="value-bar">
                      <div class="value-fill ${this.getBTTSClass(awayTeam.stats.bttsWin)}" style="width: ${awayTeam.stats.bttsWin}%"></div>
                    </div>
                  </div>
                </td>
                <td class="stat-value average">
                  <span class="value ${this.getBTTSClass(averages.bttsWin)}">${Math.round(averages.bttsWin)}%</span>
                </td>
              </tr>
              
              <tr>
                <td class="stat-name">BTTS & Draw</td>
                <td class="stat-value">
                  <div class="value-container">
                    <span class="value ${this.getBTTSClass(homeTeam.stats.bttsDraw)}">${Math.round(homeTeam.stats.bttsDraw)}%</span>
                    <div class="value-bar">
                      <div class="value-fill ${this.getBTTSClass(homeTeam.stats.bttsDraw)}" style="width: ${homeTeam.stats.bttsDraw}%"></div>
                    </div>
                  </div>
                </td>
                <td class="stat-value">
                  <div class="value-container">
                    <span class="value ${this.getBTTSClass(awayTeam.stats.bttsDraw)}">${Math.round(awayTeam.stats.bttsDraw)}%</span>
                    <div class="value-bar">
                      <div class="value-fill ${this.getBTTSClass(awayTeam.stats.bttsDraw)}" style="width: ${awayTeam.stats.bttsDraw}%"></div>
                    </div>
                  </div>
                </td>
                <td class="stat-value average">
                  <span class="value ${this.getBTTSClass(averages.bttsDraw)}">${Math.round(averages.bttsDraw)}%</span>
                </td>
              </tr>
              
              <tr>
                <td class="stat-name">BTTS & Over 2.5</td>
                <td class="stat-value">
                  <div class="value-container">
                    <span class="value ${this.getBTTSClass(homeTeam.stats.bttsOver25)}">${Math.round(homeTeam.stats.bttsOver25)}%</span>
                    <div class="value-bar">
                      <div class="value-fill ${this.getBTTSClass(homeTeam.stats.bttsOver25)}" style="width: ${homeTeam.stats.bttsOver25}%"></div>
                    </div>
                  </div>
                </td>
                <td class="stat-value">
                  <div class="value-container">
                    <span class="value ${this.getBTTSClass(awayTeam.stats.bttsOver25)}">${Math.round(awayTeam.stats.bttsOver25)}%</span>
                    <div class="value-bar">
                      <div class="value-fill ${this.getBTTSClass(awayTeam.stats.bttsOver25)}" style="width: ${awayTeam.stats.bttsOver25}%"></div>
                    </div>
                  </div>
                </td>
                <td class="stat-value average">
                  <span class="value ${this.getBTTSClass(averages.bttsOver25)}">${Math.round(averages.bttsOver25)}%</span>
                </td>
              </tr>
              
              <tr>
                <td class="stat-name">BTTS No & Over 2.5</td>
                <td class="stat-value">
                  <div class="value-container">
                    <span class="value ${this.getBTTSClass(homeTeam.stats.bttsNoOver25)}">${Math.round(homeTeam.stats.bttsNoOver25)}%</span>
                    <div class="value-bar">
                      <div class="value-fill ${this.getBTTSClass(homeTeam.stats.bttsNoOver25)}" style="width: ${homeTeam.stats.bttsNoOver25}%"></div>
                    </div>
                  </div>
                </td>
                <td class="stat-value">
                  <div class="value-container">
                    <span class="value ${this.getBTTSClass(awayTeam.stats.bttsNoOver25)}">${Math.round(awayTeam.stats.bttsNoOver25)}%</span>
                    <div class="value-bar">
                      <div class="value-fill ${this.getBTTSClass(awayTeam.stats.bttsNoOver25)}" style="width: ${awayTeam.stats.bttsNoOver25}%"></div>
                    </div>
                  </div>
                </td>
                <td class="stat-value average">
                  <span class="value ${this.getBTTSClass(averages.bttsNoOver25)}">${Math.round(averages.bttsNoOver25)}%</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <!-- Prediction Summary -->
        <div class="prediction-summary">
          <div class="prediction-card">
            <div class="card-header">
              <i class="fas fa-chart-line"></i>
              <h5>Over 2.5 Analizi</h5>
            </div>
            <div class="card-content">
              <div class="main-stat">
                <span class="stat-value ${averages.over25Class}">${Math.round(averages.over25)}%</span>
                <span class="stat-label">${averages.over25Strength}</span>
              </div>
              <div class="sub-stats">
                <div class="sub-stat">
                  <i class="fas fa-futbol"></i>
                  <span>Beklenen: ${averages.totalGoalsExpected} gol</span>
                </div>
              </div>
            </div>
          </div>
          
          <div class="prediction-card">
            <div class="card-header">
              <i class="fas fa-arrows-alt-h"></i>
              <h5>BTTS Analizi</h5>
            </div>
            <div class="card-content">
              <div class="main-stat">
                <span class="stat-value ${averages.bttsClass}">${Math.round(averages.btts)}%</span>
                <span class="stat-label">${averages.bttsStrength}</span>
              </div>
              <div class="sub-stats">
                <div class="sub-stat">
                  <i class="fas fa-percentage"></i>
                  <span>İki takım gol: ${Math.round(averages.bothTeamsLikelyToScore)}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

// Module export
export default MatchDetailsDisplay;
