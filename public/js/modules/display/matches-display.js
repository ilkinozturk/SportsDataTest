/**
 * Matches Display Module
 * Handles the visualization and rendering of matches (scores & fixtures)
 *
 * Features:
 * - Recent match results
 * - Upcoming fixtures
 * - Match details (score, date, venue)
 * - Form visualization
 * - Competition info
 */

(function (global) {
  'use strict';

  // Module dependencies check
  const requiredModules = ['TeamStatsEventBus', 'TeamStatsStateManager'];
  const missingModules = requiredModules.filter(module => !global[module]);

  if (missingModules.length > 0) {
  }

  class MatchesDisplay {
    constructor() {
      this.name = 'MatchesDisplay';
      this.version = '1.0.0';
      this.initialized = false;
      this.config = {
        animationDuration: 300,
        resultColors: {
          win: '#10b981',
          draw: '#f59e0b',
          loss: '#ef4444',
        },
        maxMatchesToShow: 20,
      };
      this.state = {
        activeFilter: 'all', // all, home, away
        activeView: 'results', // results, fixtures, all
      };
    }

    /**
     * Initialize the module
     */
    initialize() {
      if (this.initialized) {
        return;
      }

      // Subscribe to events
      if (global.TeamStatsEventBus) {
        global.TeamStatsEventBus.on('data:loaded', data => this.handleDataLoaded(data));
        global.TeamStatsEventBus.on('filter:changed', filter => this.handleFilterChanged(filter));
        global.TeamStatsEventBus.on('matches:loaded', data => this.handleMatchesLoaded(data));
      }

      this.initialized = true;
    }

    /**
     * Handle data loaded event
     */
    handleDataLoaded(data) {
      // Handle nested data structure from API
      const actualData = data.data || data;

      if (actualData) {
        // Extract team info for fetching matches
        const teamId = actualData.teamInfo?.id || actualData.team?.id || actualData.teamId;
        const seasonId = actualData.seasonId || actualData.teamInfo?.seasonId;

        // Use matches service if available
        if (global.TeamStatsMatchesService && teamId) {
          global.TeamStatsMatchesService.fetchMatches(teamId, seasonId);
        } else {
          // Fallback to data from main response
          this.updateDisplay(actualData, this.state.activeFilter);
        }
      }
    }

    /**
     * Handle filter changed event
     */
    handleFilterChanged({ type, value }) {
      if (type === 'venue') {
        this.state.activeFilter = value;
        const state = global.TeamStatsStateManager?.getState();
        if (state && state.data) {
          this.updateDisplay(state.data, value);
        }
      }
    }

    /**
     * Handle matches loaded from service
     */
    handleMatchesLoaded(data) {
      if (data.matches && data.matches.length > 0) {
        // Get team ID from state or detect from matches
        const state = global.TeamStatsStateManager?.getState();
        const teamId =
          state?.data?.teamInfo?.id || state?.data?.teamId || this.detectTeamId(data.matches);

        // Create a data structure similar to main data
        const matchData = {
          allMatches: data.matches,
          teamId: teamId,
        };

        this.updateDisplay(matchData, this.state.activeFilter);
      }
    }

    /**
     * Update the display with new data
     */
    updateDisplay(data, filter = 'all') {
      const container = document.getElementById('matchesList');
      if (!container) {
        return;
      }

      // Clear existing content
      container.innerHTML = '';

      // Get matches data - prioritize allMatches for complete data
      const matches = data.allMatches || data.recentMatches || [];

      if (matches.length === 0) {
        container.innerHTML = '<p class="no-data">No match data available</p>';
        return;
      }

      // Get team ID from data - check multiple possible locations
      const teamId =
        data.teamInfo?.id ||
        data.team?.id ||
        data.teamId ||
        data.statistics?.teamId ||
        (matches.length > 0 ? this.detectTeamId(matches) : null);

      if (!teamId) {
        container.innerHTML =
          '<p class="no-data" style="color: #ef4444;">Error: Cannot determine team</p>';
        return;
      }

      // Filter matches based on venue
      const filteredMatches = this.filterMatches(matches, filter, teamId);

      // Separate past and future matches
      const now = new Date();
      const pastMatches = [];
      const futureMatches = [];

      filteredMatches.forEach(match => {
        const matchDate = new Date(match.date);
        if (match.status === 'complete' || matchDate < now) {
          pastMatches.push(match);
        } else {
          futureMatches.push(match);
        }
      });

      // Render sections
      if (pastMatches.length > 0) {
        this.renderMatchSection(container, 'Recent Results', pastMatches, true, teamId);
      }

      if (futureMatches.length > 0) {
        this.renderMatchSection(container, 'Upcoming Fixtures', futureMatches, false, teamId);
      }

      if (filteredMatches.length === 0) {
        container.innerHTML = '<p class="no-data">No matches found for the selected filter</p>';
      }
    }

    /**
     * Detect team ID from matches
     */
    detectTeamId(matches) {
      // Count occurrences of each team ID
      const teamCounts = {};

      matches.forEach(match => {
        if (match.homeTeam?.id) {
          teamCounts[match.homeTeam.id] = (teamCounts[match.homeTeam.id] || 0) + 1;
        }
        if (match.awayTeam?.id) {
          teamCounts[match.awayTeam.id] = (teamCounts[match.awayTeam.id] || 0) + 1;
        }
      });

      // Find the team that appears in all matches
      let mostFrequentTeamId = null;
      let maxCount = 0;

      for (const [teamId, count] of Object.entries(teamCounts)) {
        if (count > maxCount) {
          maxCount = count;
          mostFrequentTeamId = parseInt(teamId);
        }
      }

      return mostFrequentTeamId;
    }

    /**
     * Filter matches based on venue
     */
    filterMatches(matches, filter, teamId) {
      if (filter === 'all' || filter === 'overall') {
        return matches;
      }

      return matches.filter(match => {
        const isHome = match.homeTeam.id === teamId;
        return (filter === 'home' && isHome) || (filter === 'away' && !isHome);
      });
    }

    /**
     * Render a section of matches
     */
    renderMatchSection(container, title, matches, isPast, teamId) {
      // Section container
      const section = document.createElement('div');

      // Section title
      const sectionTitle = document.createElement('h3');
      sectionTitle.textContent = title;
      section.appendChild(sectionTitle);

      // Matches table
      const table = document.createElement('table');

      // Table header
      const thead = document.createElement('thead');
      const headerRow = document.createElement('tr');

      const headers = ['Date', 'Competition', 'Home', 'Score', 'Away', isPast ? 'Result' : 'Venue'];
      headers.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        headerRow.appendChild(th);
      });

      thead.appendChild(headerRow);
      table.appendChild(thead);

      // Table body
      const tbody = document.createElement('tbody');

      matches.forEach(match => {
        const row = this.createMatchRow(match, isPast, teamId);
        tbody.appendChild(row);
      });

      table.appendChild(tbody);
      section.appendChild(table);
      container.appendChild(section);
    }

    /**
     * Create a match row
     */
    createMatchRow(match, isPast, teamId) {
      const row = document.createElement('tr');

      const isHome = parseInt(match.homeTeam.id) === parseInt(teamId);

      // Date
      const dateCell = document.createElement('td');
      const matchDate = new Date(match.date);
      dateCell.textContent = matchDate.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      row.appendChild(dateCell);

      // Competition
      const competitionCell = document.createElement('td');
      competitionCell.className = 'competition-info';
      competitionCell.textContent = match.competition || 'League';
      row.appendChild(competitionCell);

      // Home team
      const homeCell = document.createElement('td');
      if (parseInt(match.homeTeam.id) === parseInt(teamId)) {
        homeCell.className = 'team-highlight';
      }
      homeCell.textContent = match.homeTeam.name;
      row.appendChild(homeCell);

      // Score
      const scoreCell = document.createElement('td');
      scoreCell.className = 'score-cell';
      if (isPast && match.status === 'complete') {
        scoreCell.textContent = `${match.homeScore} - ${match.awayScore}`;

        // Add result color
        const result = this.getMatchResult(match, teamId);
        scoreCell.classList.add(result.toLowerCase());
      } else {
        scoreCell.textContent = '-';
      }
      row.appendChild(scoreCell);

      // Away team
      const awayCell = document.createElement('td');
      if (parseInt(match.awayTeam.id) === parseInt(teamId)) {
        awayCell.className = 'team-highlight';
      }
      awayCell.textContent = match.awayTeam.name;
      row.appendChild(awayCell);

      // Result or Venue
      const lastCell = document.createElement('td');

      if (isPast && match.status === 'complete') {
        const result = this.getMatchResult(match, teamId);
        // Create inner span for result badge
        const badge = document.createElement('span');
        badge.textContent = result;
        badge.className = `result-badge result-${result}`;
        badge.style.display = 'inline-block';

        lastCell.appendChild(badge);
        lastCell.style.textAlign = 'center';
      } else {
        lastCell.className = 'venue-indicator';
        lastCell.textContent = isHome ? 'H' : 'A';
      }
      row.appendChild(lastCell);

      return row;
    }

    /**
     * Get match result from team perspective
     */
    getMatchResult(match, teamId) {
      const isHome = match.homeTeam.id === teamId;
      const homeScore = match.homeScore || 0;
      const awayScore = match.awayScore || 0;

      if (homeScore === awayScore) return 'D';

      if (isHome) {
        return homeScore > awayScore ? 'W' : 'L';
      } else {
        return awayScore > homeScore ? 'W' : 'L';
      }
    }

    /**
     * Get result color
     */
    getResultColor(result) {
      switch (result) {
        case 'W':
          return this.config.resultColors.win;
        case 'D':
          return this.config.resultColors.draw;
        case 'L':
          return this.config.resultColors.loss;
        default:
          return '#6b7280';
      }
    }

    /**
     * Update a specific element
     */
    updateElement(elementId, value) {
      const element = document.getElementById(elementId);
      if (element) {
        element.textContent = value;
      }
    }

    /**
     * Destroy the module
     */
    destroy() {
      // Remove event listeners
      if (global.TeamStatsEventBus) {
        global.TeamStatsEventBus.off('data:loaded');
        global.TeamStatsEventBus.off('filter:changed');
      }

      // Clear container
      const container = document.getElementById('matchesList');
      if (container) {
        container.innerHTML = '';
      }

      this.initialized = false;
    }
  }

  // Create singleton instance
  const matchesDisplay = new MatchesDisplay();

  // Auto-initialize if DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => matchesDisplay.initialize());
  } else {
    matchesDisplay.initialize();
  }

  // Export to global scope
  global.TeamStatsMatchesDisplay = matchesDisplay;
})(window);
