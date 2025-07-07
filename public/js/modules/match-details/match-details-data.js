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
    this.apiClient = window.TeamStatsAPIClient || window.APIClient || {
      get: async (url) => {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
      }
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
    this.eventBus.on('tab-content-requested', (tabName) => {
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
      
      // Emit data loaded event
      this.eventBus.emit('match-data-loaded', this.matchData);
      
      // Load initial tab data
      this.loadTabData('overview');
      
    } catch (error) {
      console.error('Error loading match data:', error);
      this.eventBus.emit('data-error', {
        message: 'Failed to load match details. Please try again.',
        error
      });
    } finally {
      this.eventBus.emit('data-loading', false);
    }
  }

  loadTabData(tabName) {
    if (!this.matchData) return;
    
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
        matches: homeTeam.recentMatches || []
      },
      away: {
        teamName: awayTeam.name,
        matches: awayTeam.recentMatches || []
      }
    };
    this.eventBus.emit('overview-recent-form', recentForm);
    
    // Goal timing
    this.eventBus.emit('overview-goal-timing', goalTiming || {});
  }

  emitH2HData() {
    const { h2h, homeTeam, awayTeam } = this.matchData;
    
    if (!h2h) {
      this.eventBus.emit('h2h-data', null);
      return;
    }
    
    const h2hData = {
      summary: {
        ...h2h.summary,
        homeTeamName: homeTeam.name,
        awayTeamName: awayTeam.name
      },
      matches: h2h.matches || []
    };
    
    this.eventBus.emit('h2h-data', h2hData);
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
          formation: lineups.home.formation || 'TBA'
        },
        away: {
          teamName: awayTeam.name,
          formation: lineups.away.formation || 'TBA'
        }
      },
      startingXI: {
        home: {
          teamName: homeTeam.name,
          players: lineups.home.startingXI || []
        },
        away: {
          teamName: awayTeam.name,
          players: lineups.away.startingXI || []
        }
      },
      substitutes: {
        home: {
          teamName: homeTeam.name,
          players: lineups.home.substitutes || []
        },
        away: {
          teamName: awayTeam.name,
          players: lineups.away.substitutes || []
        }
      }
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
    if (!statistics) return [];
    
    return [
      { label: 'Possession', home: statistics.home.possession, away: statistics.away.possession, suffix: '%' },
      { label: 'Total Shots', home: statistics.home.shots, away: statistics.away.shots },
      { label: 'Shots on Target', home: statistics.home.shotsOnTarget, away: statistics.away.shotsOnTarget },
      { label: 'Corners', home: statistics.home.corners, away: statistics.away.corners },
      { label: 'Fouls', home: statistics.home.fouls, away: statistics.away.fouls },
      { label: 'Yellow Cards', home: statistics.home.yellowCards, away: statistics.away.yellowCards }
    ];
  }

  processMatchStatistics(statistics) {
    if (!statistics) return [];
    
    return [
      { name: 'Possession', home: statistics.home.possession, away: statistics.away.possession, suffix: '%' },
      { name: 'Total Shots', home: statistics.home.shots, away: statistics.away.shots },
      { name: 'Shots on Target', home: statistics.home.shotsOnTarget, away: statistics.away.shotsOnTarget },
      { name: 'Shots off Target', home: statistics.home.shotsOffTarget, away: statistics.away.shotsOffTarget },
      { name: 'Blocked Shots', home: statistics.home.blockedShots, away: statistics.away.blockedShots },
      { name: 'Corners', home: statistics.home.corners, away: statistics.away.corners },
      { name: 'Offsides', home: statistics.home.offsides, away: statistics.away.offsides },
      { name: 'Fouls', home: statistics.home.fouls, away: statistics.away.fouls },
      { name: 'Yellow Cards', home: statistics.home.yellowCards, away: statistics.away.yellowCards },
      { name: 'Red Cards', home: statistics.home.redCards, away: statistics.away.redCards },
      { name: 'Saves', home: statistics.home.saves, away: statistics.away.saves },
      { name: 'Passes', home: statistics.home.passes, away: statistics.away.passes },
      { name: 'Pass Accuracy', home: statistics.home.passAccuracy, away: statistics.away.passAccuracy, suffix: '%' }
    ];
  }
}

// Module export
export default MatchDetailsData;