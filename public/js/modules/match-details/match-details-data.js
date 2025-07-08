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
    this.teamDataCache = new Map(); // Cache for team data
    // Get API delay from environment configuration
    this.apiCallDelay =
      (window.ENV && window.ENV.API_RATE_LIMIT_DELAY) || window.API_RATE_LIMIT_DELAY || 1500; // 1.5 seconds default
    this.lastApiCall = 0;

    // Cache TTL from environment
    this.cacheTTL = (window.ENV && window.ENV.CACHE_TTL) || 300000; // 5 minutes default

    this.apiClient = window.TeamStatsAPIClient ||
      window.APIClient || {
        get: async url => {
          // Rate limiting - wait if necessary
          const now = Date.now();
          const timeSinceLastCall = now - this.lastApiCall;
          if (timeSinceLastCall < this.apiCallDelay) {
            await new Promise(resolve =>
              setTimeout(resolve, this.apiCallDelay - timeSinceLastCall)
            );
          }
          this.lastApiCall = Date.now();

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

      // Add delay between team form requests
      if (
        this.matchData.awayTeam &&
        !this.matchData.awayTeam.awayForm &&
        this.matchData.homeTeam &&
        !this.matchData.homeTeam.homeForm
      ) {
        await new Promise(resolve => setTimeout(resolve, this.apiCallDelay));
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
      // Check cache first
      const cachedData = this.teamDataCache.get(teamId);
      let response;

      if (cachedData) {
        response = cachedData;
      } else {
        response = await this.apiClient.get(`/api/teams/data?teamId=${teamId}`);
        if (response.success) {
          this.teamDataCache.set(teamId, response);
        }
      }

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
      // Check cache first
      const cachedHomeData = this.teamDataCache.get(homeTeamId);
      const cachedAwayData = this.teamDataCache.get(awayTeamId);

      let homeResponse, awayResponse;

      // Fetch data sequentially to avoid rate limits
      if (cachedHomeData) {
        homeResponse = cachedHomeData;
      } else {
        homeResponse = await this.apiClient.get(`/api/teams/data?teamId=${homeTeamId}`);
        if (homeResponse.success) {
          this.teamDataCache.set(homeTeamId, homeResponse);
        }
      }

      // Add delay between requests
      if (!cachedHomeData && !cachedAwayData) {
        await new Promise(resolve => setTimeout(resolve, this.apiCallDelay));
      }

      if (cachedAwayData && awayTeamId !== homeTeamId) {
        awayResponse = cachedAwayData;
      } else if (awayTeamId === homeTeamId) {
        // If same team ID, we need to use the same response but should not happen in normal cases
        awayResponse = homeResponse;
      } else {
        awayResponse = await this.apiClient.get(`/api/teams/data?teamId=${awayTeamId}`);
        if (awayResponse.success) {
          this.teamDataCache.set(awayTeamId, awayResponse);
        }
      }

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
          stats: this.extractTeamStatistics(homeData.statistics || {}, homeData),
          additional_info: homeData.additional_info,
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
            awayData.statistics?.awayPointsPerPage ||
            awayData.statistics?.seasonPPG_away ||
            awayData.statistics?.awayPPG ||
            awayData.statistics?.away_ppg ||
            0,
          stats: this.extractTeamStatistics(awayData.statistics || {}, awayData),
          additional_info: awayData.additional_info,
        };
      }

      // Emit team statistics data
      this.eventBus.emit('team-stats-loaded', teamData);
    } catch (error) {
      console.error('Error in fetchTeamStatistics:', error);
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
   * @param {Object} teamData - Full team data object (optional, for additional_info)
   * @returns {Object} - Processed statistics
   */
  extractTeamStatistics(stats, teamData = null) {
    const additionalInfo = stats.additional_info || teamData?.additional_info || {};
    const extractedStats = {
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

      // Goals conceded - prioritize actual API field names
      goalsConceded:
        stats.goalsAgainst ||
        stats.seasonConcededNum_overall ||
        stats.seasonConcededNum ||
        stats.seasonConceded ||
        stats.goals_conceded ||
        0,
      homeGoalsConceded:
        stats.homeGoalsAgainst || stats.seasonConcededNum_home || stats.home_goals_conceded || 0,
      awayGoalsConceded:
        stats.awayGoalsAgainst || stats.seasonConcededNum_away || stats.away_goals_conceded || 0,

      // Goals conceded per match (for Goals Conceded Comparison display)
      goalsConcededPerMatch:
        stats.seasonConcededAVG_overall ||
        stats.seasonConcededAVG ||
        stats.goalsConcededAVG ||
        stats.goalsAgainstPerMatch ||
        stats.averageGoalsAgainst ||
        0,
      homeGoalsConcededPerMatch:
        stats.seasonConcededAVG_home ||
        stats.homeGoalsConcededAVG ||
        stats.homeGoalsAgainstPerMatch ||
        0,
      awayGoalsConcededPerMatch:
        stats.seasonConcededAVG_away ||
        stats.awayGoalsConcededAVG ||
        stats.awayGoalsAgainstPerMatch ||
        0,

      // Total goals conceded (alias for goalsConceded)
      totalGoalsConceded:
        stats.goalsAgainst ||
        stats.seasonConcededNum_overall ||
        stats.seasonConcededNum ||
        stats.seasonConceded ||
        stats.goals_conceded ||
        0,
      homeTotalGoalsConceded:
        stats.homeGoalsAgainst || stats.seasonConcededNum_home || stats.home_goals_conceded || 0,
      awayTotalGoalsConceded:
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

      // Clean sheet percentages - API field names (prioritize non-zero values)
      cleanSheetPercentage:
        stats.cleanSheetPercentage ||
        stats.cleanSheetsPercentage_overall ||
        stats.seasonCleanSheetPercentage_overall ||
        stats.seasonCleanSheetPercentage ||
        stats.seasonCSPercentage_overall ||
        stats.cleanSheetPercentage_overall ||
        stats.clean_sheet_percentage ||
        stats.cs_percentage ||
        stats.csPercentage ||
        0,
      homeCleanSheetPercentage:
        stats.homeCleanSheetPercentage ||
        stats.cleanSheetsPercentage_home ||
        stats.seasonCleanSheetPercentage_home ||
        stats.seasonCSPercentage_home ||
        stats.cleanSheetPercentage_home ||
        stats.home_clean_sheet_percentage ||
        stats.cs_percentage_home ||
        stats.csPercentageHome ||
        0,
      awayCleanSheetPercentage:
        stats.awayCleanSheetPercentage ||
        stats.cleanSheetsPercentage_away ||
        stats.seasonCleanSheetPercentage_away ||
        stats.seasonCSPercentage_away ||
        stats.cleanSheetPercentage_away ||
        stats.away_clean_sheet_percentage ||
        stats.cs_percentage_away ||
        stats.csPercentageAway ||
        0,

      // First Half Clean Sheet percentages
      firstHalfCleanSheetPercentage_home:
        stats.firstHalfCleanSheetPercentage_home ||
        stats.homeFirstHalfCleanSheet ||
        stats.seasonFirstHalfCSPercentage_home ||
        additionalInfo.firstHalfCleanSheetPercentage_home ||
        0,
      homeFirstHalfCleanSheet:
        stats.firstHalfCleanSheetPercentage_home ||
        stats.homeFirstHalfCleanSheet ||
        stats.seasonFirstHalfCSPercentage_home ||
        additionalInfo.firstHalfCleanSheetPercentage_home ||
        0,
      firstHalfCleanSheetPercentage_away:
        stats.firstHalfCleanSheetPercentage_away ||
        stats.awayFirstHalfCleanSheet ||
        stats.seasonFirstHalfCSPercentage_away ||
        additionalInfo.firstHalfCleanSheetPercentage_away ||
        0,
      awayFirstHalfCleanSheet:
        stats.firstHalfCleanSheetPercentage_away ||
        stats.awayFirstHalfCleanSheet ||
        stats.seasonFirstHalfCSPercentage_away ||
        additionalInfo.firstHalfCleanSheetPercentage_away ||
        0,

      // Second Half Clean Sheet percentages
      secondHalfCleanSheetPercentage_home:
        stats.secondHalfCleanSheetPercentage_home ||
        stats.homeSecondHalfCleanSheet ||
        stats.seasonSecondHalfCSPercentage_home ||
        additionalInfo.secondHalfCleanSheetPercentage_home ||
        0,
      homeSecondHalfCleanSheet:
        stats.secondHalfCleanSheetPercentage_home ||
        stats.homeSecondHalfCleanSheet ||
        stats.seasonSecondHalfCSPercentage_home ||
        additionalInfo.secondHalfCleanSheetPercentage_home ||
        0,
      secondHalfCleanSheetPercentage_away:
        stats.secondHalfCleanSheetPercentage_away ||
        stats.awaySecondHalfCleanSheet ||
        stats.seasonSecondHalfCSPercentage_away ||
        additionalInfo.secondHalfCleanSheetPercentage_away ||
        0,
      awaySecondHalfCleanSheet:
        stats.secondHalfCleanSheetPercentage_away ||
        stats.awaySecondHalfCleanSheet ||
        stats.seasonSecondHalfCSPercentage_away ||
        additionalInfo.secondHalfCleanSheetPercentage_away ||
        0,

      // Failed to score percentages - API field names (prioritize non-zero values)
      failedToScorePercentage:
        stats.failedToScorePercentage ||
        stats.seasonFailedToScorePercentage_overall ||
        stats.seasonFailedToScorePercentage ||
        stats.seasonFTSPercentage_overall ||
        stats.seasonFTSPercentage ||
        stats.failed_to_score_percentage ||
        stats.fts_percentage ||
        stats.ftsPercentage ||
        0,
      homeFailedToScorePercentage:
        stats.homeFailedToScorePercentage ||
        stats.seasonFailedToScorePercentage_home ||
        stats.seasonFTSPercentage_home ||
        stats.failedToScorePercentage_home ||
        stats.home_failed_to_score_percentage ||
        stats.fts_percentage_home ||
        stats.ftsPercentageHome ||
        0,
      awayFailedToScorePercentage:
        stats.awayFailedToScorePercentage ||
        stats.seasonFailedToScorePercentage_away ||
        stats.seasonFTSPercentage_away ||
        stats.failedToScorePercentage_away ||
        stats.away_failed_to_score_percentage ||
        stats.fts_percentage_away ||
        stats.ftsPercentageAway ||
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

      // First Half Goals Average
      scoredAVGHT_overall: stats.scoredAVGHT_overall || stats.firstHalfGoalsAVG_overall || 0,
      scoredAVGHT_home: stats.scoredAVGHT_home || stats.firstHalfGoalsAVG_home || 0,
      scoredAVGHT_away: stats.scoredAVGHT_away || stats.firstHalfGoalsAVG_away || 0,
      firstHalfGoalsAVG_overall: stats.firstHalfGoalsAVG_overall || stats.scoredAVGHT_overall || 0,
      firstHalfGoalsAVG_home: stats.firstHalfGoalsAVG_home || stats.scoredAVGHT_home || 0,
      firstHalfGoalsAVG_away: stats.firstHalfGoalsAVG_away || stats.scoredAVGHT_away || 0,

      // Second Half Goals Average
      scored_2hg_avg_overall:
        stats.scored_2hg_avg_overall ||
        stats.secondHalfGoalsAVG_overall ||
        stats.scoredAVG2H_overall ||
        0,
      scored_2hg_avg_home:
        stats.scored_2hg_avg_home || stats.secondHalfGoalsAVG_home || stats.scoredAVG2H_home || 0,
      scored_2hg_avg_away:
        stats.scored_2hg_avg_away || stats.secondHalfGoalsAVG_away || stats.scoredAVG2H_away || 0,
      secondHalfGoalsAVG_overall:
        stats.secondHalfGoalsAVG_overall ||
        stats.scored_2hg_avg_overall ||
        stats.scoredAVG2H_overall ||
        0,
      secondHalfGoalsAVG_home:
        stats.secondHalfGoalsAVG_home || stats.scored_2hg_avg_home || stats.scoredAVG2H_home || 0,
      secondHalfGoalsAVG_away:
        stats.secondHalfGoalsAVG_away || stats.scored_2hg_avg_away || stats.scoredAVG2H_away || 0,
      scoredAVG2H_overall:
        stats.scoredAVG2H_overall ||
        stats.secondHalfGoalsAVG_overall ||
        stats.scored_2hg_avg_overall ||
        0,
      scoredAVG2H_home:
        stats.scoredAVG2H_home || stats.secondHalfGoalsAVG_home || stats.scored_2hg_avg_home || 0,
      scoredAVG2H_away:
        stats.scoredAVG2H_away || stats.secondHalfGoalsAVG_away || stats.scored_2hg_avg_away || 0,

      // First Half Conceded Average
      firstHalfConcededAvg:
        stats.concededAVGHT_overall ||
        stats.firstHalfConcededAVG_overall ||
        stats.conceded_1hg_avg_overall ||
        0,
      homeFirstHalfConcededAvg:
        stats.concededAVGHT_home ||
        stats.firstHalfConcededAVG_home ||
        stats.conceded_1hg_avg_home ||
        0,
      awayFirstHalfConcededAvg:
        stats.concededAVGHT_away ||
        stats.firstHalfConcededAVG_away ||
        stats.conceded_1hg_avg_away ||
        0,

      // Second Half Conceded Average
      secondHalfConcededAvg:
        stats.concededAVG2H_overall ||
        stats.secondHalfConcededAVG_overall ||
        stats.conceded_2hg_avg_overall ||
        0,
      homeSecondHalfConcededAvg:
        stats.concededAVG2H_home ||
        stats.secondHalfConcededAVG_home ||
        stats.conceded_2hg_avg_home ||
        0,
      awaySecondHalfConcededAvg:
        stats.concededAVG2H_away ||
        stats.secondHalfConcededAVG_away ||
        stats.conceded_2hg_avg_away ||
        0,

      // Over/Under Goals Percentages
      over05GoalsPercentage:
        stats.seasonOver05Percentage_overall || stats.over05GoalsPercentage || 0,
      homeOver05GoalsPercentage:
        stats.seasonOver05Percentage_home || stats.over05GoalsPercentage_home || 0,
      awayOver05GoalsPercentage:
        stats.seasonOver05Percentage_away || stats.over05GoalsPercentage_away || 0,

      over15GoalsPercentage:
        stats.seasonOver15Percentage_overall || stats.over15GoalsPercentage || 0,
      homeOver15GoalsPercentage:
        stats.seasonOver15Percentage_home || stats.over15GoalsPercentage_home || 0,
      awayOver15GoalsPercentage:
        stats.seasonOver15Percentage_away || stats.over15GoalsPercentage_away || 0,

      over25GoalsPercentage:
        stats.seasonOver25Percentage_overall || stats.over25GoalsPercentage || 0,
      homeOver25GoalsPercentage:
        stats.seasonOver25Percentage_home || stats.over25GoalsPercentage_home || 0,
      awayOver25GoalsPercentage:
        stats.seasonOver25Percentage_away || stats.over25GoalsPercentage_away || 0,

      over35GoalsPercentage:
        stats.seasonOver35Percentage_overall || stats.over35GoalsPercentage || 0,
      homeOver35GoalsPercentage:
        stats.seasonOver35Percentage_home || stats.over35GoalsPercentage_home || 0,
      awayOver35GoalsPercentage:
        stats.seasonOver35Percentage_away || stats.over35GoalsPercentage_away || 0,

      // Scored Over Percentages (Team Scored Goals)
      scoredOver05Percentage:
        stats.seasonScoredOver05Percentage_overall ||
        additionalInfo.seasonScoredOver05Percentage_overall ||
        stats.scoredOver05Percentage ||
        0,
      homeScoredOver05Percentage:
        stats.seasonScoredOver05Percentage_home ||
        additionalInfo.seasonScoredOver05Percentage_home ||
        stats.scoredOver05Percentage_home ||
        0,
      awayScoredOver05Percentage:
        stats.seasonScoredOver05Percentage_away ||
        additionalInfo.seasonScoredOver05Percentage_away ||
        stats.scoredOver05Percentage_away ||
        0,

      scoredOver15Percentage:
        stats.seasonScoredOver15Percentage_overall ||
        additionalInfo.seasonScoredOver15Percentage_overall ||
        stats.scoredOver15Percentage ||
        0,
      homeScoredOver15Percentage:
        stats.seasonScoredOver15Percentage_home ||
        additionalInfo.seasonScoredOver15Percentage_home ||
        stats.scoredOver15Percentage_home ||
        0,
      awayScoredOver15Percentage:
        stats.seasonScoredOver15Percentage_away ||
        additionalInfo.seasonScoredOver15Percentage_away ||
        stats.scoredOver15Percentage_away ||
        0,

      scoredOver25Percentage:
        stats.seasonScoredOver25Percentage_overall ||
        additionalInfo.seasonScoredOver25Percentage_overall ||
        stats.scoredOver25Percentage ||
        0,
      homeScoredOver25Percentage:
        stats.seasonScoredOver25Percentage_home ||
        additionalInfo.seasonScoredOver25Percentage_home ||
        stats.scoredOver25Percentage_home ||
        0,
      awayScoredOver25Percentage:
        stats.seasonScoredOver25Percentage_away ||
        additionalInfo.seasonScoredOver25Percentage_away ||
        stats.scoredOver25Percentage_away ||
        0,

      scoredOver35Percentage:
        stats.seasonScoredOver35Percentage_overall ||
        additionalInfo.seasonScoredOver35Percentage_overall ||
        stats.scoredOver35Percentage ||
        0,
      homeScoredOver35Percentage:
        stats.seasonScoredOver35Percentage_home ||
        additionalInfo.seasonScoredOver35Percentage_home ||
        stats.scoredOver35Percentage_home ||
        0,
      awayScoredOver35Percentage:
        stats.seasonScoredOver35Percentage_away ||
        additionalInfo.seasonScoredOver35Percentage_away ||
        stats.scoredOver35Percentage_away ||
        0,

      // Over/Under Conceded Percentages (for Goals Conceded Comparison)
      // Use seasonConcededOver*Percentage_* from stats, not additional_info
      over05Conceded:
        stats.seasonConcededOver05Percentage_overall ||
        additionalInfo.seasonConcededOver05Percentage_overall ||
        additionalInfo.over05_conceded_percentage_overall ||
        stats.concededOver05Percentage ||
        0,
      homeOver05Conceded:
        stats.seasonConcededOver05Percentage_home ||
        additionalInfo.seasonConcededOver05Percentage_home ||
        additionalInfo.over05_conceded_percentage_home ||
        stats.concededOver05Percentage_home ||
        0,
      awayOver05Conceded:
        stats.seasonConcededOver05Percentage_away ||
        additionalInfo.seasonConcededOver05Percentage_away ||
        additionalInfo.over05_conceded_percentage_away ||
        stats.concededOver05Percentage_away ||
        0,

      over15Conceded:
        stats.seasonConcededOver15Percentage_overall ||
        additionalInfo.seasonConcededOver15Percentage_overall ||
        additionalInfo.over15_conceded_percentage_overall ||
        stats.concededOver15Percentage ||
        0,
      homeOver15Conceded:
        stats.seasonConcededOver15Percentage_home ||
        additionalInfo.seasonConcededOver15Percentage_home ||
        additionalInfo.over15_conceded_percentage_home ||
        stats.concededOver15Percentage_home ||
        0,
      awayOver15Conceded:
        stats.seasonConcededOver15Percentage_away ||
        additionalInfo.seasonConcededOver15Percentage_away ||
        additionalInfo.over15_conceded_percentage_away ||
        stats.concededOver15Percentage_away ||
        0,

      over25Conceded:
        stats.seasonConcededOver25Percentage_overall ||
        additionalInfo.seasonConcededOver25Percentage_overall ||
        additionalInfo.over25_conceded_percentage_overall ||
        stats.concededOver25Percentage ||
        0,
      homeOver25Conceded:
        stats.seasonConcededOver25Percentage_home ||
        additionalInfo.seasonConcededOver25Percentage_home ||
        additionalInfo.over25_conceded_percentage_home ||
        stats.concededOver25Percentage_home ||
        0,
      awayOver25Conceded:
        stats.seasonConcededOver25Percentage_away ||
        additionalInfo.seasonConcededOver25Percentage_away ||
        additionalInfo.over25_conceded_percentage_away ||
        stats.concededOver25Percentage_away ||
        0,

      over35Conceded:
        stats.seasonConcededOver35Percentage_overall ||
        additionalInfo.seasonConcededOver35Percentage_overall ||
        additionalInfo.over35_conceded_percentage_overall ||
        stats.concededOver35Percentage ||
        0,
      homeOver35Conceded:
        stats.seasonConcededOver35Percentage_home ||
        additionalInfo.seasonConcededOver35Percentage_home ||
        additionalInfo.over35_conceded_percentage_home ||
        stats.concededOver35Percentage_home ||
        0,
      awayOver35Conceded:
        stats.seasonConcededOver35Percentage_away ||
        additionalInfo.seasonConcededOver35Percentage_away ||
        additionalInfo.over35_conceded_percentage_away ||
        stats.concededOver35Percentage_away ||
        0,
    };

    return extractedStats;
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
