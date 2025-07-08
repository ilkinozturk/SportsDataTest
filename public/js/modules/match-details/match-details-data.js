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

    // Listen for team stats request
    this.eventBus.on('request-team-stats', async ({ homeTeamId, awayTeamId }) => {
      await this.fetchTeamStatistics(homeTeamId, awayTeamId);
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
      const response = await this.apiClient.get(`/api/teams/data?teamId=${teamId}`);

      if (response.success && response.data) {
        const teamData = response.data;

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
          // Form data not found
        }
      }
    } catch (error) {
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

  /**
   * Fetch team statistics for comparison
   * @param {number} homeTeamId - Home team ID
   * @param {number} awayTeamId - Away team ID
   */
  async fetchTeamStatistics(homeTeamId, awayTeamId) {
    try {
      // Fetch both teams' statistics in parallel
      const [homeResponse, awayResponse] = await Promise.all([
        this.apiClient.get(`/api/teams/data?teamId=${homeTeamId}`),
        this.apiClient.get(`/api/teams/data?teamId=${awayTeamId}`),
      ]);

      const teamData = {
        homeTeam: null,
        awayTeam: null,
      };

      // Process home team data
      if (homeResponse.success && homeResponse.data) {
        const homeData = homeResponse.data;

        // Calculate form from matches if not available
        let overallForm =
          homeData.statistics?.recentForm ||
          homeData.statistics?.form ||
          homeData.statistics?.recent_form ||
          '';
        const homeForm = homeData.statistics?.homeForm || homeData.statistics?.home_form || '';
        const awayForm = homeData.statistics?.awayForm || homeData.statistics?.away_form || '';

        // If no form data, try to calculate from matches
        if (!overallForm && homeData.allMatches && homeData.allMatches.length > 0) {
          overallForm = this.calculateFormFromMatches(homeData.allMatches, homeTeamId);
        }

        teamData.homeTeam = {
          id: homeTeamId,
          name: homeData.teamInfo?.name || this.matchData?.homeTeam?.name || 'Home Team',
          logo:
            homeData.teamInfo?.image ||
            homeData.teamInfo?.logo ||
            this.matchData?.homeTeam?.logo ||
            '',
          league: homeData.teamInfo?.league || homeData.leagueInfo?.name || '',
          position:
            homeData.leaguePosition?.position ||
            homeData.teamInfo?.position ||
            homeData.teamInfo?.table_position ||
            '-',
          form: overallForm,
          homeForm: homeForm,
          awayForm: awayForm,
          ppg:
            homeData.statistics?.seasonPPG ||
            homeData.statistics?.pointsPerGame ||
            homeData.statistics?.ppg ||
            0,
          homePPG:
            homeData.statistics?.homePointsPerGame ||
            homeData.statistics?.seasonPPG_home ||
            homeData.statistics?.homePPG ||
            homeData.statistics?.home_ppg ||
            0,
          awayPPG:
            homeData.statistics?.awayPointsPerGame ||
            homeData.statistics?.seasonPPG_away ||
            homeData.statistics?.awayPPG ||
            homeData.statistics?.away_ppg ||
            0,
          stats: this.extractTeamStatistics(homeData.statistics || {}),
        };
      }

      // Process away team data
      if (awayResponse.success && awayResponse.data) {
        const awayData = awayResponse.data;

        // Calculate form from matches if not available
        let overallForm =
          awayData.statistics?.recentForm ||
          awayData.statistics?.form ||
          awayData.statistics?.recent_form ||
          '';
        const homeForm = awayData.statistics?.homeForm || awayData.statistics?.home_form || '';
        const awayForm = awayData.statistics?.awayForm || awayData.statistics?.away_form || '';

        // If no form data, try to calculate from matches
        if (!overallForm && awayData.allMatches && awayData.allMatches.length > 0) {
          overallForm = this.calculateFormFromMatches(awayData.allMatches, awayTeamId);
        }

        teamData.awayTeam = {
          id: awayTeamId,
          name: awayData.teamInfo?.name || this.matchData?.awayTeam?.name || 'Away Team',
          logo:
            awayData.teamInfo?.image ||
            awayData.teamInfo?.logo ||
            this.matchData?.awayTeam?.logo ||
            '',
          league: awayData.teamInfo?.league || awayData.leagueInfo?.name || '',
          position:
            awayData.leaguePosition?.position ||
            awayData.teamInfo?.position ||
            awayData.teamInfo?.table_position ||
            '-',
          form: overallForm,
          homeForm: homeForm,
          awayForm: awayForm,
          ppg:
            awayData.statistics?.seasonPPG ||
            awayData.statistics?.pointsPerGame ||
            awayData.statistics?.ppg ||
            0,
          homePPG:
            awayData.statistics?.homePointsPerGame ||
            awayData.statistics?.seasonPPG_home ||
            awayData.statistics?.homePPG ||
            awayData.statistics?.home_ppg ||
            0,
          awayPPG:
            awayData.statistics?.awayPointsPerGame ||
            awayData.statistics?.seasonPPG_away ||
            awayData.statistics?.awayPPG ||
            awayData.statistics?.away_ppg ||
            0,
          stats: this.extractTeamStatistics(awayData.statistics || {}),
        };
      }

      // Emit team statistics data
      this.eventBus.emit('team-stats-loaded', teamData);
    } catch (error) {
      // If there's an error, emit empty team data
      this.eventBus.emit('team-stats-loaded', {
        homeTeam: null,
        awayTeam: null,
      });
    }
  }

  /**
   * Extract relevant team statistics
   * @param {Object} stats - Raw statistics object
   * @returns {Object} - Processed statistics
   */
  extractTeamStatistics(stats) {
    return {
      // Win percentages - Calculate from wins/totalMatches if percentage not available
      winPercentage:
        stats.winPercentage_overall ||
        stats.winPercentage ||
        (stats.seasonWinsNum_overall && stats.seasonMatchesPlayed_overall
          ? Math.round((stats.seasonWinsNum_overall / stats.seasonMatchesPlayed_overall) * 100)
          : 0),
      homeWinPercentage:
        stats.winPercentage_home ||
        stats.homeWinPercentage ||
        (stats.seasonWinsNum_home && stats.seasonMatchesPlayed_home
          ? Math.round((stats.seasonWinsNum_home / stats.seasonMatchesPlayed_home) * 100)
          : 0),
      awayWinPercentage:
        stats.winPercentage_away ||
        stats.awayWinPercentage ||
        (stats.seasonWinsNum_away && stats.seasonMatchesPlayed_away
          ? Math.round((stats.seasonWinsNum_away / stats.seasonMatchesPlayed_away) * 100)
          : 0),

      // Goals per match (AVG) - API uses 'seasonScoredAVG' fields
      goalsPerMatch:
        stats.seasonScoredAVG_overall ||
        stats.seasonScoredAVG ||
        stats.goalsPerMatch ||
        stats.averageGoalsFor ||
        0,
      homeGoalsPerMatch:
        stats.seasonScoredAVG_home ||
        stats.homeGoalsPerMatch ||
        (stats.homeGoalsFor && stats.homeMatches
          ? (stats.homeGoalsFor / stats.homeMatches).toFixed(2)
          : 0),
      awayGoalsPerMatch:
        stats.seasonScoredAVG_away ||
        stats.awayGoalsPerMatch ||
        (stats.awayGoalsFor && stats.awayMatches
          ? (stats.awayGoalsFor / stats.awayMatches).toFixed(2)
          : 0),

      // Total goals scored
      goalsScored:
        stats.goalsFor ||
        stats.seasonGoals ||
        stats.seasonScoredNum_overall ||
        stats.goals_scored ||
        0,
      homeGoalsScored:
        stats.homeGoalsFor ||
        stats.seasonGoals_home ||
        stats.seasonScoredNum_home ||
        stats.home_goals_scored ||
        0,
      awayGoalsScored:
        stats.awayGoalsFor ||
        stats.seasonGoals_away ||
        stats.seasonScoredNum_away ||
        stats.away_goals_scored ||
        0,

      // Goals conceded
      goalsConceded:
        stats.goalsAgainst ||
        stats.seasonConceded ||
        stats.seasonConcededNum ||
        stats.seasonConcededNum_overall ||
        stats.goals_conceded ||
        0,
      homeGoalsConceded:
        stats.homeGoalsAgainst || stats.seasonConcededNum_home || stats.home_goals_conceded || 0,
      awayGoalsConceded:
        stats.awayGoalsAgainst || stats.seasonConcededNum_away || stats.away_goals_conceded || 0,

      // BTTS percentages - API uses 'bothTeamsScoredPercentage' fields
      bttsPercentage:
        stats.bothTeamsScoredPercentage ||
        stats.seasonBTTSPercentage_overall ||
        stats.btts ||
        stats.bttsPercentage ||
        0,
      homeBTTSPercentage:
        stats.homeBothTeamsScoredPercentage ||
        stats.seasonBTTSPercentage_home ||
        stats.homeBtts ||
        stats.bttsPercentage_home ||
        0,
      awayBTTSPercentage:
        stats.awayBothTeamsScoredPercentage ||
        stats.seasonBTTSPercentage_away ||
        stats.awayBtts ||
        stats.bttsPercentage_away ||
        0,

      // Clean sheet percentages
      cleanSheetPercentage:
        stats.cleanSheets ||
        stats.cleanSheetPercentage ||
        stats.seasonCSPercentage_overall ||
        stats.cleanSheetPercentage_overall ||
        stats.clean_sheet_percentage ||
        0,
      homeCleanSheetPercentage:
        stats.homeCleanSheets ||
        stats.cleanSheetPercentage_home ||
        stats.seasonCSPercentage_home ||
        stats.home_clean_sheet_percentage ||
        0,
      awayCleanSheetPercentage:
        stats.awayCleanSheets ||
        stats.cleanSheetPercentage_away ||
        stats.seasonCSPercentage_away ||
        stats.away_clean_sheet_percentage ||
        0,

      // Failed to score percentages
      failedToScorePercentage:
        stats.failedToScore ||
        stats.seasonFTSPercentage ||
        stats.seasonFTSPercentage_overall ||
        stats.failed_to_score_percentage ||
        0,
      homeFailedToScorePercentage:
        stats.homeFailedToScore ||
        stats.seasonFTSPercentage_home ||
        stats.home_failed_to_score_percentage ||
        0,
      awayFailedToScorePercentage:
        stats.awayFailedToScore ||
        stats.seasonFTSPercentage_away ||
        stats.away_failed_to_score_percentage ||
        0,

      // xG statistics
      xGFor:
        stats.xgFor || stats.xg_for || stats.seasonXGF_overall || stats.expected_goals_for || 0,
      homeXGFor:
        stats.homeXgFor ||
        stats.xg_for_home ||
        stats.seasonXGF_home ||
        stats.home_expected_goals_for ||
        0,
      awayXGFor:
        stats.awayXgFor ||
        stats.xg_for_away ||
        stats.seasonXGF_away ||
        stats.away_expected_goals_for ||
        0,

      xGAgainst:
        stats.xgAgainst ||
        stats.xg_against ||
        stats.seasonXGA_overall ||
        stats.expected_goals_against ||
        0,
      homeXGAgainst:
        stats.homeXgAgainst ||
        stats.xg_against_home ||
        stats.seasonXGA_home ||
        stats.home_expected_goals_against ||
        0,
      awayXGAgainst:
        stats.awayXgAgainst ||
        stats.xg_against_away ||
        stats.seasonXGA_away ||
        stats.away_expected_goals_against ||
        0,

      // PPG values (backup)
      ppg: stats.pointsPerGame || stats.seasonPPG || stats.ppg || 0,
      homePPG:
        stats.homePointsPerGame || stats.seasonPPG_home || stats.homePPG || stats.home_ppg || 0,
      awayPPG:
        stats.awayPointsPerGame || stats.seasonPPG_away || stats.awayPPG || stats.away_ppg || 0,
    };
  }

  /**
   * Calculate form string from matches
   * @param {Array} matches - Array of match objects
   * @param {number} teamId - Team ID to calculate form for
   * @returns {string} - Form string (e.g., "WWDLW")
   */
  calculateFormFromMatches(matches, teamId) {
    if (!matches || matches.length === 0) {
      return '';
    }

    // Get last 5 finished matches
    const finishedMatches = matches
      .filter(match => match.status === 'finished' || match.status === 'FINISHED')
      .slice(0, 5);

    if (finishedMatches.length === 0) {
      return '';
    }

    const form = finishedMatches
      .map(match => {
        const homeTeamId = match.homeTeam?.id || match.home_team_id || match.homeTeamId;
        const _awayTeamId = match.awayTeam?.id || match.away_team_id || match.awayTeamId;
        const homeScore = match.homeScore || match.home_score || match.score?.home || 0;
        const awayScore = match.awayScore || match.away_score || match.score?.away || 0;

        const isHome = homeTeamId === teamId;

        if (homeScore === awayScore) {
          return 'D';
        } else if (isHome) {
          return homeScore > awayScore ? 'W' : 'L';
        } else {
          return awayScore > homeScore ? 'W' : 'L';
        }
      })
      .join('');

    return form;
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
