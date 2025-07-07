/**
 * Match Details Data Module
 * Handles data fetching and management for match details
 * Works with match-details-display module for rendering
 */

export class MatchDetailsData {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.matchId = null;
    this.matchData = null;
    this.apiClient = window.TeamStatsAPIClient ||
      window.APIClient || {
        get: async url => {
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
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
      this.eventBus.emit('data-error', { message: 'No match ID provided' });
      return;
    }

    // Attach event listeners
    this.attachEventListeners();

    // Load initial match data
    this.loadMatchData();
  }

  attachEventListeners() {
    // Listen for tab content requests
    this.eventBus.on('tab-content-requested', tabName => {
      if (this.matchData) {
        this.loadTabData(tabName);
      }
    });

    // Listen for data refresh requests
    this.eventBus.on('refresh-match-data', () => {
      this.loadMatchData();
    });
  }

  async loadMatchData() {
    try {
      this.eventBus.emit('data-loading', true);

      // Fetch match details from API
      const response = await this.apiClient.get(`/api/matches/${this.matchId}/details`);

      if (!response.success) {
        throw new Error(response.message || 'Failed to load match data');
      }

      this.matchData = response.data;

      // Fetch team forms if not available
      if (this.matchData.homeTeam && !this.matchData.homeTeam.homeForm) {
        await this.fetchTeamForm(this.matchData.homeTeam.id, 'home');
      }
      if (this.matchData.awayTeam && !this.matchData.awayTeam.awayForm) {
        await this.fetchTeamForm(this.matchData.awayTeam.id, 'away');
      }

      // Emit data loaded event
      this.eventBus.emit('match-data-loaded', this.matchData);

      // Load initial tab data
      this.loadTabData('overview');
    } catch (error) {
      console.error('Error loading match data:', error);
      this.eventBus.emit('data-error', {
        message: 'Failed to load match details. Please try again.',
        error,
      });
    } finally {
      this.eventBus.emit('data-loading', false);
    }
  }

  async fetchTeamForm(teamId, venue) {
    try {
      console.log(`Fetching ${venue} team form for ID: ${teamId}`);
      const response = await this.apiClient.get(`/api/teams/data?teamId=${teamId}`);

      if (response.success && response.data) {
        const teamData = response.data;
        console.log(`Team data received for ${venue}:`, teamData);

        let formData = '';

        // Try different possible form fields from the API
        if (teamData.statistics) {
          const stats = teamData.statistics;

          // Check for form data in various possible locations
          if (venue === 'home') {
            formData = stats.homeForm || stats.home_form || stats.form_home || '';
          } else if (venue === 'away') {
            formData = stats.awayForm || stats.away_form || stats.form_away || '';
          }

          // If no venue-specific form, try general form
          if (!formData) {
            formData =
              stats.form || stats.recent_form || stats.last5Form || stats.last_5_form || '';
          }
        }

        // Also check in teamInfo
        if (!formData && teamData.teamInfo) {
          const info = teamData.teamInfo;
          formData = info.form || info.recent_form || info.last5 || '';
        }

        // Update match data with form and recent matches
        if (this.matchData) {
          if (venue === 'home' && this.matchData.homeTeam) {
            if (formData) {
              console.log(`Setting ${venue} form:`, formData);
              this.matchData.homeTeam.homeForm = formData;
            }
            // Add recent matches data
            if (teamData.recentMatches) {
              this.matchData.homeTeam.recentMatches = teamData.recentMatches;
            } else if (teamData.allMatches) {
              this.matchData.homeTeam.recentMatches = teamData.allMatches.slice(0, 15); // Get last 15 matches
            }
          } else if (venue === 'away' && this.matchData.awayTeam) {
            if (formData) {
              console.log(`Setting ${venue} form:`, formData);
              this.matchData.awayTeam.awayForm = formData;
            }
            // Add recent matches data
            if (teamData.recentMatches) {
              this.matchData.awayTeam.recentMatches = teamData.recentMatches;
            } else if (teamData.allMatches) {
              this.matchData.awayTeam.recentMatches = teamData.allMatches.slice(0, 15); // Get last 15 matches
            }
          }
        }

        if (!formData) {
          console.log(`No form data found for ${venue} team`);
        }
      }
    } catch (error) {
      console.error(`Error fetching ${venue} team form:`, error);
      // Continue without form data
    }
  }

  loadTabData(tabName) {
    if (!this.matchData) {
      return;
    }

    // Emit tab-specific data based on tab name
    switch (tabName) {
      case 'overview':
        this.emitOverviewData();
        break;
      case 'h2h':
        this.emitH2HData();
        break;
      case 'statistics':
        this.emitStatisticsData();
        break;
      case 'lineups':
        this.emitLineupsData();
        break;
      case 'events':
        this.emitEventsData();
        break;
      case 'odds':
        this.emitOddsData();
        break;
    }
  }

  emitOverviewData() {
    const { statistics, homeTeam, awayTeam, goalTiming } = this.matchData;

    // Key stats
    const keyStats = this.processKeyStats(statistics);
    this.eventBus.emit('overview-key-stats', keyStats);

    // Recent form
    const recentForm = {
      home: {
        teamName: homeTeam.name,
        matches: homeTeam.recentMatches || [],
      },
      away: {
        teamName: awayTeam.name,
        matches: awayTeam.recentMatches || [],
      },
    };
    this.eventBus.emit('overview-recent-form', recentForm);

    // Goal timing
    this.eventBus.emit('overview-goal-timing', goalTiming || {});
  }

  emitH2HData() {
    // H2H data is now handled by the dedicated H2H module
    // Just emit the request event with necessary data
    const { homeTeam, awayTeam } = this.matchData;

    if (homeTeam?.id && awayTeam?.id) {
      this.eventBus.emit('request-h2h-data', {
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        matchId: this.matchId,
      });
    }
  }

  emitStatisticsData() {
    const { statistics } = this.matchData;

    if (!statistics) {
      this.eventBus.emit('match-statistics', null);
      return;
    }

    const processedStats = this.processMatchStatistics(statistics);
    this.eventBus.emit('match-statistics', processedStats);
  }

  emitLineupsData() {
    const { lineups, homeTeam, awayTeam } = this.matchData;

    if (!lineups) {
      this.eventBus.emit('lineups-data', null);
      return;
    }

    const lineupsData = {
      formations: {
        home: {
          teamName: homeTeam.name,
          formation: lineups.home.formation || 'TBA',
        },
        away: {
          teamName: awayTeam.name,
          formation: lineups.away.formation || 'TBA',
        },
      },
      startingXI: {
        home: {
          teamName: homeTeam.name,
          players: lineups.home.startingXI || [],
        },
        away: {
          teamName: awayTeam.name,
          players: lineups.away.startingXI || [],
        },
      },
      substitutes: {
        home: {
          teamName: homeTeam.name,
          players: lineups.home.substitutes || [],
        },
        away: {
          teamName: awayTeam.name,
          players: lineups.away.substitutes || [],
        },
      },
    };

    this.eventBus.emit('lineups-data', lineupsData);
  }

  emitEventsData() {
    const { events } = this.matchData;
    this.eventBus.emit('match-events', events || []);
  }

  emitOddsData() {
    const { odds } = this.matchData;
    this.eventBus.emit('odds-data', odds || []);
  }

  // Helper methods
  processKeyStats(statistics) {
    if (!statistics) {
      return [];
    }

    return [
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
  }

  processMatchStatistics(statistics) {
    if (!statistics) {
      return [];
    }

    return [
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
  }
}

// Module export
export default MatchDetailsData;
