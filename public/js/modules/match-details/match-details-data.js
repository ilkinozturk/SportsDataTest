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

        // Debug API response
        console.log('[MatchDetailsData] Home team raw API offside fields:', {
          teamName: homeData.teamInfo?.name,
          statistics: homeData.statistics
            ? Object.keys(homeData.statistics)
                .filter(k => k.toLowerCase().includes('offside'))
                .sort()
            : [],
          sampleValues: {
            offsidesAVG_overall: homeData.statistics?.offsidesAVG_overall,
            offsidesAVG_home: homeData.statistics?.offsidesAVG_home,
            over25OffsidesPercentage_home: homeData.statistics?.over25OffsidesPercentage_home,
            over35OffsidesPercentage_home: homeData.statistics?.over35OffsidesPercentage_home,
          },
        });

        // Unused variables removed to fix ESLint errors
        // const stats = homeData.statistics || {};
        // const additionalInfo = homeData.additional_info || {};

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
          name: this.matchData?.homeTeam?.name || homeData.teamInfo?.name || 'Home Team',
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
            homeData.statistics?.homePointsPerPage ||
            homeData.statistics?.seasonPPG_home ||
            homeData.statistics?.homePPG ||
            homeData.statistics?.home_ppg ||
            0,
          awayPPG:
            homeData.statistics?.awayPointsPerPage ||
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

        // Debug API response
        console.log('[MatchDetailsData] Away team raw API offside fields:', {
          teamName: awayData.teamInfo?.name,
          statistics: awayData.statistics
            ? Object.keys(awayData.statistics)
                .filter(k => k.toLowerCase().includes('offside'))
                .sort()
            : [],
          sampleValues: {
            offsidesAVG_overall: awayData.statistics?.offsidesAVG_overall,
            offsidesAVG_away: awayData.statistics?.offsidesAVG_away,
            over25OffsidesPercentage_away: awayData.statistics?.over25OffsidesPercentage_away,
            over35OffsidesPercentage_away: awayData.statistics?.over35OffsidesPercentage_away,
          },
        });

        // Process away team statistics

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
          name: this.matchData?.awayTeam?.name || awayData.teamInfo?.name || 'Away Team',
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

      // Debug: Log team data before emitting
      console.log('[MatchDetailsData] Team data to emit:', {
        homeTeam: teamData.homeTeam
          ? {
              name: teamData.homeTeam.name,
              statsKeys: Object.keys(teamData.homeTeam.stats || {})
                .filter(k => k.includes('Card') || k.includes('card'))
                .slice(0, 20),
            }
          : null,
        awayTeam: teamData.awayTeam
          ? {
              name: teamData.awayTeam.name,
              statsKeys: Object.keys(teamData.awayTeam.stats || {})
                .filter(k => k.includes('Card') || k.includes('card'))
                .slice(0, 20),
            }
          : null,
      });

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
    // Use stats directly as it already contains the statistics
    const actualStats = stats;
    const additionalInfo = teamData?.additional_info || {};

    // Debug team stats extraction
    console.log(
      '[MatchDetailsData] Extracting stats for:',
      teamData?.teamInfo?.name || 'Unknown Team'
    );

    // Debug: Log raw offside data
    console.log('[MatchDetailsData] Raw offside fields in stats:', {
      teamName: teamData?.teamInfo?.name || 'Unknown Team',
      all_fields: Object.keys(actualStats)
        .filter(k => k.toLowerCase().includes('offside'))
        .sort(),
      offsidesTeamAVG_home: actualStats.offsidesTeamAVG_home,
      offsidesTeamAVG_away: actualStats.offsidesTeamAVG_away,
      offsidesTeamAVG_overall: actualStats.offsidesTeamAVG_overall,
      over25OffsidesPercentage_home: actualStats.over25OffsidesPercentage_home,
      over25OffsidesPercentage_away: actualStats.over25OffsidesPercentage_away,
      over35OffsidesPercentage_home: actualStats.over35OffsidesPercentage_home,
      over35OffsidesPercentage_away: actualStats.over35OffsidesPercentage_away,
      offsidesAvg: actualStats.offsidesAvg,
      homeOffsidesAvg: actualStats.homeOffsidesAvg,
      awayOffsidesAvg: actualStats.awayOffsidesAvg,
      matchOffsidesAvg: actualStats.matchOffsidesAvg,
      offsidesMatchTeamAVG_home: actualStats.offsidesMatchTeamAVG_home,
      offsidesMatchTeamAVG_away: actualStats.offsidesMatchTeamAVG_away,
    });

    // Debug card data
    console.log('[MatchDetailsData] Card data check:', {
      cardsOver25: actualStats.cardsOver25,
      cardsOver25_overall: actualStats.cardsOver25_overall,
      cardsOver25_home: actualStats.cardsOver25_home,
      cardsOver25_away: actualStats.cardsOver25_away,
      homeCardsOver25: actualStats.homeCardsOver25,
      awayCardsOver25: actualStats.awayCardsOver25,
    });

    // Debug offside data
    console.log('[MatchDetailsData] Offside data check:', {
      offsideAVG_overall: actualStats.offsideAVG_overall,
      offsidesAVG_overall: actualStats.offsidesAVG_overall,
      offsidesAVG_home: actualStats.offsidesAVG_home,
      offsidesAVG_away: actualStats.offsidesAVG_away,
      over25OffsidesPercentage_home: actualStats.over25OffsidesPercentage_home,
      over25OffsidesPercentage_away: actualStats.over25OffsidesPercentage_away,
      over35OffsidesPercentage_home: actualStats.over35OffsidesPercentage_home,
      over35OffsidesPercentage_away: actualStats.over35OffsidesPercentage_away,
      'ALL OFFSIDE FIELDS': Object.keys(actualStats)
        .filter(k => k.toLowerCase().includes('offside'))
        .sort(),
    });

    // Debug logging for all fields (removed to clean up code)

    // Corner and average field checks removed - no longer needed

    // Conceded field logging removed - no longer needed

    const extractedStats = {
      // Win percentages - Calculate from wins/totalMatches if percentage not available
      winPercentage:
        actualStats.winPercentage_overall ||
        actualStats.winPercentage ||
        (actualStats.seasonWinsNum_overall && actualStats.seasonMatchesPlayed_overall
          ? Math.round(
              (actualStats.seasonWinsNum_overall / actualStats.seasonMatchesPlayed_overall) * 100
            )
          : 0),
      homeWinPercentage:
        actualStats.winPercentage_home ||
        actualStats.homeWinPercentage ||
        (actualStats.seasonWinsNum_home && actualStats.seasonMatchesPlayed_home
          ? Math.round(
              (actualStats.seasonWinsNum_home / actualStats.seasonMatchesPlayed_home) * 100
            )
          : 0),
      awayWinPercentage:
        actualStats.winPercentage_away ||
        actualStats.awayWinPercentage ||
        (actualStats.seasonWinsNum_away && actualStats.seasonMatchesPlayed_away
          ? Math.round(
              (actualStats.seasonWinsNum_away / actualStats.seasonMatchesPlayed_away) * 100
            )
          : 0),

      // Goals per match (AVG) - API uses 'seasonScoredAVG' fields
      goalsPerMatch:
        actualStats.seasonScoredAVG_overall ||
        actualStats.seasonScoredAVG ||
        actualStats.goalsPerMatch ||
        actualStats.averageGoalsFor ||
        0,
      homeGoalsPerMatch:
        actualStats.seasonScoredAVG_home ||
        actualStats.homeGoalsPerMatch ||
        (actualStats.homeGoalsFor && actualStats.homeMatches
          ? (actualStats.homeGoalsFor / actualStats.homeMatches).toFixed(2)
          : 0),
      awayGoalsPerMatch:
        actualStats.seasonScoredAVG_away ||
        actualStats.awayGoalsPerMatch ||
        (actualStats.awayGoalsFor && actualStats.awayMatches
          ? (actualStats.awayGoalsFor / actualStats.awayMatches).toFixed(2)
          : 0),

      // Total goals scored
      goalsScored:
        actualStats.goalsFor ||
        actualStats.seasonGoals ||
        actualStats.seasonScoredNum_overall ||
        actualStats.goals_scored ||
        0,
      homeGoalsScored:
        actualStats.homeGoalsFor ||
        actualStats.seasonGoals_home ||
        actualStats.seasonScoredNum_home ||
        actualStats.home_goals_scored ||
        0,
      awayGoalsScored:
        actualStats.awayGoalsFor ||
        actualStats.seasonGoals_away ||
        actualStats.seasonScoredNum_away ||
        actualStats.away_goals_scored ||
        0,

      // Goals conceded - prioritize actual API field names
      goalsConceded:
        actualStats.goalsAgainst ||
        actualStats.seasonConcededNum_overall ||
        actualStats.seasonConcededNum ||
        actualStats.seasonConceded ||
        actualStats.goals_conceded ||
        0,
      homeGoalsConceded:
        actualStats.homeGoalsAgainst ||
        actualStats.seasonConcededNum_home ||
        actualStats.home_goals_conceded ||
        0,
      awayGoalsConceded:
        actualStats.awayGoalsAgainst ||
        actualStats.seasonConcededNum_away ||
        actualStats.away_goals_conceded ||
        0,

      // Goals conceded per match (for Goals Conceded Comparison display)
      goalsConcededPerMatch:
        actualStats.seasonConcededAVG_overall ||
        actualStats.seasonConcededAVG ||
        actualStats.goalsConcededAVG ||
        actualStats.goalsAgainstPerMatch ||
        actualStats.averageGoalsAgainst ||
        0,
      homeGoalsConcededPerMatch:
        actualStats.seasonConcededAVG_home ||
        actualStats.homeGoalsConcededAVG ||
        actualStats.homeGoalsAgainstPerMatch ||
        0,
      awayGoalsConcededPerMatch:
        actualStats.seasonConcededAVG_away ||
        actualStats.awayGoalsConcededAVG ||
        actualStats.awayGoalsAgainstPerMatch ||
        0,

      // Additional aliases for Goals Conceded module
      concededPerMatch:
        actualStats.seasonConcededAVG_overall ||
        actualStats.seasonConcededAVG ||
        actualStats.goalsConcededAVG ||
        actualStats.goalsAgainstPerMatch ||
        actualStats.averageGoalsAgainst ||
        0,
      goalsAgainstPerMatch:
        actualStats.seasonConcededAVG_overall ||
        actualStats.seasonConcededAVG ||
        actualStats.goalsConcededAVG ||
        actualStats.goalsAgainstPerMatch ||
        actualStats.averageGoalsAgainst ||
        0,
      homeConcededPerMatch:
        actualStats.seasonConcededAVG_home ||
        actualStats.homeGoalsConcededAVG ||
        actualStats.homeGoalsAgainstPerMatch ||
        0,
      homeGoalsAgainstPerMatch:
        actualStats.seasonConcededAVG_home ||
        actualStats.homeGoalsConcededAVG ||
        actualStats.homeGoalsAgainstPerMatch ||
        0,
      awayConcededPerMatch:
        actualStats.seasonConcededAVG_away ||
        actualStats.awayGoalsConcededAVG ||
        actualStats.awayGoalsAgainstPerMatch ||
        0,
      awayGoalsAgainstPerMatch:
        actualStats.seasonConcededAVG_away ||
        actualStats.awayGoalsConcededAVG ||
        actualStats.awayGoalsAgainstPerMatch ||
        0,

      // Total goals conceded (alias for goalsConceded)
      totalGoalsConceded:
        actualStats.goalsAgainst ||
        actualStats.seasonConcededNum_overall ||
        actualStats.seasonConcededNum ||
        actualStats.seasonConceded ||
        actualStats.goals_conceded ||
        0,
      homeTotalGoalsConceded:
        actualStats.homeGoalsAgainst ||
        actualStats.seasonConcededNum_home ||
        actualStats.home_goals_conceded ||
        0,
      awayTotalGoalsConceded:
        actualStats.awayGoalsAgainst ||
        actualStats.seasonConcededNum_away ||
        actualStats.away_goals_conceded ||
        0,

      // BTTS percentages - API uses 'bothTeamsScoredPercentage' fields
      bttsPercentage:
        actualStats.bothTeamsScoredPercentage ||
        actualStats.seasonBTTSPercentage_overall ||
        actualStats.btts ||
        actualStats.bttsPercentage ||
        0,
      homeBTTSPercentage:
        actualStats.homeBothTeamsScoredPercentage ||
        actualStats.seasonBTTSPercentage_home ||
        actualStats.homeBtts ||
        actualStats.bttsPercentage_home ||
        0,
      awayBTTSPercentage:
        actualStats.awayBothTeamsScoredPercentage ||
        actualStats.seasonBTTSPercentage_away ||
        actualStats.awayBtts ||
        actualStats.bttsPercentage_away ||
        0,

      // BTTS variations
      btts:
        actualStats.bothTeamsScoredPercentage ||
        actualStats.seasonBTTSPercentage_overall ||
        actualStats.btts ||
        actualStats.bttsPercentage ||
        0,

      // BTTS & Result combinations
      bttsWin:
        actualStats.bttsAndWinPercentage ||
        additionalInfo.btts_and_win_percentage ||
        additionalInfo.bttsWinPercentage ||
        actualStats.bttsWin ||
        0,
      bttsDraw:
        actualStats.bttsAndDrawPercentage ||
        additionalInfo.btts_and_draw_percentage ||
        additionalInfo.bttsDrawPercentage ||
        actualStats.bttsDraw ||
        0,
      bttsLose:
        actualStats.bttsAndLosePercentage ||
        additionalInfo.btts_and_lose_percentage ||
        additionalInfo.bttsLosePercentage ||
        actualStats.bttsLose ||
        0,

      homeBTTSWin:
        actualStats.bttsAndWinPercentage_home ||
        additionalInfo.btts_and_win_percentage_home ||
        actualStats.homeBttsWin ||
        0,
      awayBTTSWin:
        actualStats.bttsAndWinPercentage_away ||
        additionalInfo.btts_and_win_percentage_away ||
        actualStats.awayBttsWin ||
        0,

      // BTTS & Over combinations
      bttsAndOver25:
        actualStats.bttsAndOver25Percentage ||
        additionalInfo.btts_and_over25_percentage ||
        additionalInfo.bttsAndOver25 ||
        actualStats.bttsOver25 ||
        0,
      bttsNoAndOver25:
        actualStats.bttsNoAndOver25Percentage ||
        additionalInfo.btts_no_and_over25_percentage ||
        additionalInfo.bttsNoAndOver25 ||
        actualStats.bttsNoOver25 ||
        0,

      homeBTTSAndOver25:
        actualStats.bttsAndOver25Percentage_home ||
        additionalInfo.btts_and_over25_percentage_home ||
        additionalInfo.homeBttsAndOver25 ||
        0,
      awayBTTSAndOver25:
        actualStats.bttsAndOver25Percentage_away ||
        additionalInfo.btts_and_over25_percentage_away ||
        additionalInfo.awayBttsAndOver25 ||
        0,

      // Clean sheet percentages - API field names (prioritize non-zero values)
      cleanSheetPercentage:
        actualStats.cleanSheetPercentage ||
        actualStats.cleanSheetsPercentage_overall ||
        actualStats.seasonCleanSheetPercentage_overall ||
        actualStats.seasonCleanSheetPercentage ||
        actualStats.seasonCSPercentage_overall ||
        actualStats.cleanSheetPercentage_overall ||
        actualStats.clean_sheet_percentage ||
        actualStats.cs_percentage ||
        actualStats.csPercentage ||
        0,
      homeCleanSheetPercentage:
        actualStats.homeCleanSheetPercentage ||
        actualStats.cleanSheetsPercentage_home ||
        actualStats.seasonCleanSheetPercentage_home ||
        actualStats.seasonCSPercentage_home ||
        actualStats.cleanSheetPercentage_home ||
        actualStats.home_clean_sheet_percentage ||
        actualStats.cs_percentage_home ||
        actualStats.csPercentageHome ||
        0,
      awayCleanSheetPercentage:
        actualStats.awayCleanSheetPercentage ||
        actualStats.cleanSheetsPercentage_away ||
        actualStats.seasonCleanSheetPercentage_away ||
        actualStats.seasonCSPercentage_away ||
        actualStats.cleanSheetPercentage_away ||
        actualStats.away_clean_sheet_percentage ||
        actualStats.cs_percentage_away ||
        actualStats.csPercentageAway ||
        0,

      // First Half Clean Sheet percentages
      firstHalfCleanSheetPercentage_home:
        actualStats.firstHalfCleanSheetPercentage_home ||
        actualStats.homeFirstHalfCleanSheet ||
        actualStats.seasonFirstHalfCSPercentage_home ||
        additionalInfo.firstHalfCleanSheetPercentage_home ||
        0,
      homeFirstHalfCleanSheet:
        actualStats.firstHalfCleanSheetPercentage_home ||
        actualStats.homeFirstHalfCleanSheet ||
        actualStats.seasonFirstHalfCSPercentage_home ||
        additionalInfo.firstHalfCleanSheetPercentage_home ||
        0,
      firstHalfCleanSheetPercentage_away:
        actualStats.firstHalfCleanSheetPercentage_away ||
        actualStats.awayFirstHalfCleanSheet ||
        actualStats.seasonFirstHalfCSPercentage_away ||
        additionalInfo.firstHalfCleanSheetPercentage_away ||
        0,
      awayFirstHalfCleanSheet:
        actualStats.firstHalfCleanSheetPercentage_away ||
        actualStats.awayFirstHalfCleanSheet ||
        actualStats.seasonFirstHalfCSPercentage_away ||
        additionalInfo.firstHalfCleanSheetPercentage_away ||
        0,

      // Second Half Clean Sheet percentages
      secondHalfCleanSheetPercentage_home:
        actualStats.secondHalfCleanSheetPercentage_home ||
        actualStats.homeSecondHalfCleanSheet ||
        actualStats.seasonSecondHalfCSPercentage_home ||
        additionalInfo.secondHalfCleanSheetPercentage_home ||
        0,
      homeSecondHalfCleanSheet:
        actualStats.secondHalfCleanSheetPercentage_home ||
        actualStats.homeSecondHalfCleanSheet ||
        actualStats.seasonSecondHalfCSPercentage_home ||
        additionalInfo.secondHalfCleanSheetPercentage_home ||
        0,
      secondHalfCleanSheetPercentage_away:
        actualStats.secondHalfCleanSheetPercentage_away ||
        actualStats.awaySecondHalfCleanSheet ||
        actualStats.seasonSecondHalfCSPercentage_away ||
        additionalInfo.secondHalfCleanSheetPercentage_away ||
        0,
      awaySecondHalfCleanSheet:
        actualStats.secondHalfCleanSheetPercentage_away ||
        actualStats.awaySecondHalfCleanSheet ||
        actualStats.seasonSecondHalfCSPercentage_away ||
        additionalInfo.secondHalfCleanSheetPercentage_away ||
        0,

      // Failed to score percentages - API field names (prioritize non-zero values)
      failedToScorePercentage:
        actualStats.failedToScorePercentage ||
        actualStats.seasonFailedToScorePercentage_overall ||
        actualStats.seasonFailedToScorePercentage ||
        actualStats.seasonFTSPercentage_overall ||
        actualStats.seasonFTSPercentage ||
        actualStats.failed_to_score_percentage ||
        actualStats.fts_percentage ||
        actualStats.ftsPercentage ||
        0,
      homeFailedToScorePercentage:
        actualStats.homeFailedToScorePercentage ||
        actualStats.seasonFailedToScorePercentage_home ||
        actualStats.seasonFTSPercentage_home ||
        actualStats.failedToScorePercentage_home ||
        actualStats.home_failed_to_score_percentage ||
        actualStats.fts_percentage_home ||
        actualStats.ftsPercentageHome ||
        0,
      awayFailedToScorePercentage:
        actualStats.awayFailedToScorePercentage ||
        actualStats.seasonFailedToScorePercentage_away ||
        actualStats.seasonFTSPercentage_away ||
        actualStats.failedToScorePercentage_away ||
        actualStats.away_failed_to_score_percentage ||
        actualStats.fts_percentage_away ||
        actualStats.ftsPercentageAway ||
        0,

      // xG statistics
      xGFor:
        actualStats.xgFor ||
        actualStats.xg_for ||
        actualStats.seasonXGF_overall ||
        actualStats.expected_goals_for ||
        0,
      homeXGFor:
        actualStats.homeXgFor ||
        actualStats.xg_for_home ||
        actualStats.seasonXGF_home ||
        actualStats.home_expected_goals_for ||
        0,
      awayXGFor:
        actualStats.awayXgFor ||
        actualStats.xg_for_away ||
        actualStats.seasonXGF_away ||
        actualStats.away_expected_goals_for ||
        0,

      xGAgainst:
        actualStats.xgAgainst ||
        actualStats.xg_against ||
        actualStats.seasonXGA_overall ||
        actualStats.expected_goals_against ||
        0,
      homeXGAgainst:
        actualStats.homeXgAgainst ||
        actualStats.xg_against_home ||
        actualStats.seasonXGA_home ||
        actualStats.home_expected_goals_against ||
        0,
      awayXGAgainst:
        actualStats.awayXgAgainst ||
        actualStats.xg_against_away ||
        actualStats.seasonXGA_away ||
        actualStats.away_expected_goals_against ||
        0,

      // PPG values (backup)
      ppg: actualStats.pointsPerGame || actualStats.seasonPPG || actualStats.ppg || 0,
      homePPG:
        actualStats.homePointsPerGame ||
        actualStats.seasonPPG_home ||
        actualStats.homePPG ||
        actualStats.home_ppg ||
        0,
      awayPPG:
        actualStats.awayPointsPerGame ||
        actualStats.seasonPPG_away ||
        actualStats.awayPPG ||
        actualStats.away_ppg ||
        0,

      // First Half Goals Average
      scoredAVGHT_overall:
        actualStats.scoredAVGHT_overall || actualStats.firstHalfGoalsAVG_overall || 0,
      scoredAVGHT_home: actualStats.scoredAVGHT_home || actualStats.firstHalfGoalsAVG_home || 0,
      scoredAVGHT_away: actualStats.scoredAVGHT_away || actualStats.firstHalfGoalsAVG_away || 0,
      firstHalfGoalsAVG_overall:
        actualStats.firstHalfGoalsAVG_overall || actualStats.scoredAVGHT_overall || 0,
      firstHalfGoalsAVG_home:
        actualStats.firstHalfGoalsAVG_home || actualStats.scoredAVGHT_home || 0,
      firstHalfGoalsAVG_away:
        actualStats.firstHalfGoalsAVG_away || actualStats.scoredAVGHT_away || 0,

      // Second Half Goals Average
      scored_2hg_avg_overall:
        actualStats.scored_2hg_avg_overall ||
        actualStats.secondHalfGoalsAVG_overall ||
        actualStats.scoredAVG2H_overall ||
        0,
      scored_2hg_avg_home:
        actualStats.scored_2hg_avg_home ||
        actualStats.secondHalfGoalsAVG_home ||
        actualStats.scoredAVG2H_home ||
        0,
      scored_2hg_avg_away:
        actualStats.scored_2hg_avg_away ||
        actualStats.secondHalfGoalsAVG_away ||
        actualStats.scoredAVG2H_away ||
        0,
      secondHalfGoalsAVG_overall:
        actualStats.secondHalfGoalsAVG_overall ||
        actualStats.scored_2hg_avg_overall ||
        actualStats.scoredAVG2H_overall ||
        0,
      secondHalfGoalsAVG_home:
        actualStats.secondHalfGoalsAVG_home ||
        actualStats.scored_2hg_avg_home ||
        actualStats.scoredAVG2H_home ||
        0,
      secondHalfGoalsAVG_away:
        actualStats.secondHalfGoalsAVG_away ||
        actualStats.scored_2hg_avg_away ||
        actualStats.scoredAVG2H_away ||
        0,
      scoredAVG2H_overall:
        actualStats.scoredAVG2H_overall ||
        actualStats.secondHalfGoalsAVG_overall ||
        actualStats.scored_2hg_avg_overall ||
        0,
      scoredAVG2H_home:
        actualStats.scoredAVG2H_home ||
        actualStats.secondHalfGoalsAVG_home ||
        actualStats.scored_2hg_avg_home ||
        0,
      scoredAVG2H_away:
        actualStats.scoredAVG2H_away ||
        actualStats.secondHalfGoalsAVG_away ||
        actualStats.scored_2hg_avg_away ||
        0,

      // First Half Conceded Average
      firstHalfConcededAvg:
        actualStats.concededAVGHT_overall ||
        actualStats.firstHalfConcededAVG_overall ||
        actualStats.conceded_1hg_avg_overall ||
        0,
      homeFirstHalfConcededAvg:
        actualStats.concededAVGHT_home ||
        actualStats.firstHalfConcededAVG_home ||
        actualStats.conceded_1hg_avg_home ||
        0,
      awayFirstHalfConcededAvg:
        actualStats.concededAVGHT_away ||
        actualStats.firstHalfConcededAVG_away ||
        actualStats.conceded_1hg_avg_away ||
        0,

      // Second Half Conceded Average
      secondHalfConcededAvg:
        actualStats.concededAVG2H_overall ||
        actualStats.secondHalfConcededAVG_overall ||
        actualStats.conceded_2hg_avg_overall ||
        0,
      homeSecondHalfConcededAvg:
        actualStats.concededAVG2H_home ||
        actualStats.secondHalfConcededAVG_home ||
        actualStats.conceded_2hg_avg_home ||
        0,
      awaySecondHalfConcededAvg:
        actualStats.concededAVG2H_away ||
        actualStats.secondHalfConcededAVG_away ||
        actualStats.conceded_2hg_avg_away ||
        0,

      // Over/Under Goals Percentages
      over05GoalsPercentage:
        actualStats.seasonOver05Percentage_overall || actualStats.over05GoalsPercentage || 0,
      homeOver05GoalsPercentage:
        actualStats.seasonOver05Percentage_home || actualStats.over05GoalsPercentage_home || 0,
      awayOver05GoalsPercentage:
        actualStats.seasonOver05Percentage_away || actualStats.over05GoalsPercentage_away || 0,

      over15GoalsPercentage:
        actualStats.seasonOver15Percentage_overall || actualStats.over15GoalsPercentage || 0,
      homeOver15GoalsPercentage:
        actualStats.seasonOver15Percentage_home || actualStats.over15GoalsPercentage_home || 0,
      awayOver15GoalsPercentage:
        actualStats.seasonOver15Percentage_away || actualStats.over15GoalsPercentage_away || 0,

      over25GoalsPercentage:
        actualStats.seasonOver25Percentage_overall || actualStats.over25GoalsPercentage || 0,
      homeOver25GoalsPercentage:
        actualStats.seasonOver25Percentage_home || actualStats.over25GoalsPercentage_home || 0,
      awayOver25GoalsPercentage:
        actualStats.seasonOver25Percentage_away || actualStats.over25GoalsPercentage_away || 0,

      over35GoalsPercentage:
        actualStats.seasonOver35Percentage_overall || actualStats.over35GoalsPercentage || 0,
      homeOver35GoalsPercentage:
        actualStats.seasonOver35Percentage_home || actualStats.over35GoalsPercentage_home || 0,
      awayOver35GoalsPercentage:
        actualStats.seasonOver35Percentage_away || actualStats.over35GoalsPercentage_away || 0,

      // Add simplified field names for over-btts-comparison module
      over05:
        actualStats.seasonOver05Percentage_overall ||
        additionalInfo.seasonOver05Percentage_overall ||
        actualStats.over05GoalsPercentage ||
        additionalInfo.over_05_percentage ||
        0,
      over15:
        actualStats.seasonOver15Percentage_overall ||
        additionalInfo.seasonOver15Percentage_overall ||
        actualStats.over15GoalsPercentage ||
        additionalInfo.over_15_percentage ||
        0,
      over25:
        actualStats.seasonOver25Percentage_overall ||
        additionalInfo.seasonOver25Percentage_overall ||
        actualStats.over25GoalsPercentage ||
        additionalInfo.over_25_percentage ||
        0,
      over35:
        actualStats.seasonOver35Percentage_overall ||
        additionalInfo.seasonOver35Percentage_overall ||
        actualStats.over35GoalsPercentage ||
        additionalInfo.over_35_percentage ||
        0,
      over45:
        actualStats.seasonOver45Percentage_overall ||
        additionalInfo.seasonOver45Percentage_overall ||
        actualStats.over45GoalsPercentage ||
        additionalInfo.over_45_percentage ||
        0,

      // Venue-specific over/under
      homeOver05:
        actualStats.seasonOver05Percentage_home ||
        additionalInfo.seasonOver05Percentage_home ||
        actualStats.over05GoalsPercentage_home ||
        additionalInfo.over_05_percentage_home ||
        0,
      homeOver15:
        actualStats.seasonOver15Percentage_home ||
        additionalInfo.seasonOver15Percentage_home ||
        actualStats.over15GoalsPercentage_home ||
        additionalInfo.over_15_percentage_home ||
        0,
      homeOver25:
        actualStats.seasonOver25Percentage_home ||
        additionalInfo.seasonOver25Percentage_home ||
        actualStats.over25GoalsPercentage_home ||
        additionalInfo.over_25_percentage_home ||
        0,
      homeOver35:
        actualStats.seasonOver35Percentage_home ||
        additionalInfo.seasonOver35Percentage_home ||
        actualStats.over35GoalsPercentage_home ||
        additionalInfo.over_35_percentage_home ||
        0,
      homeOver45:
        actualStats.seasonOver45Percentage_home ||
        additionalInfo.seasonOver45Percentage_home ||
        actualStats.over45GoalsPercentage_home ||
        additionalInfo.over_45_percentage_home ||
        0,

      awayOver05:
        actualStats.seasonOver05Percentage_away ||
        additionalInfo.seasonOver05Percentage_away ||
        actualStats.over05GoalsPercentage_away ||
        additionalInfo.over_05_percentage_away ||
        0,
      awayOver15:
        actualStats.seasonOver15Percentage_away ||
        additionalInfo.seasonOver15Percentage_away ||
        actualStats.over15GoalsPercentage_away ||
        additionalInfo.over_15_percentage_away ||
        0,
      awayOver25:
        actualStats.seasonOver25Percentage_away ||
        additionalInfo.seasonOver25Percentage_away ||
        actualStats.over25GoalsPercentage_away ||
        additionalInfo.over_25_percentage_away ||
        0,
      awayOver35:
        actualStats.seasonOver35Percentage_away ||
        additionalInfo.seasonOver35Percentage_away ||
        actualStats.over35GoalsPercentage_away ||
        additionalInfo.over_35_percentage_away ||
        0,
      awayOver45:
        actualStats.seasonOver45Percentage_away ||
        additionalInfo.seasonOver45Percentage_away ||
        actualStats.over45GoalsPercentage_away ||
        additionalInfo.over_45_percentage_away ||
        0,

      // Scored Over Percentages (Team Scored Goals)
      scoredOver05Percentage:
        actualStats.seasonScoredOver05Percentage_overall ||
        additionalInfo.seasonScoredOver05Percentage_overall ||
        actualStats.scoredOver05Percentage ||
        0,
      homeScoredOver05Percentage:
        actualStats.seasonScoredOver05Percentage_home ||
        additionalInfo.seasonScoredOver05Percentage_home ||
        actualStats.scoredOver05Percentage_home ||
        0,
      awayScoredOver05Percentage:
        actualStats.seasonScoredOver05Percentage_away ||
        additionalInfo.seasonScoredOver05Percentage_away ||
        actualStats.scoredOver05Percentage_away ||
        0,

      scoredOver15Percentage:
        actualStats.seasonScoredOver15Percentage_overall ||
        additionalInfo.seasonScoredOver15Percentage_overall ||
        actualStats.scoredOver15Percentage ||
        0,
      homeScoredOver15Percentage:
        actualStats.seasonScoredOver15Percentage_home ||
        additionalInfo.seasonScoredOver15Percentage_home ||
        actualStats.scoredOver15Percentage_home ||
        0,
      awayScoredOver15Percentage:
        actualStats.seasonScoredOver15Percentage_away ||
        additionalInfo.seasonScoredOver15Percentage_away ||
        actualStats.scoredOver15Percentage_away ||
        0,

      scoredOver25Percentage:
        actualStats.seasonScoredOver25Percentage_overall ||
        additionalInfo.seasonScoredOver25Percentage_overall ||
        actualStats.scoredOver25Percentage ||
        0,
      homeScoredOver25Percentage:
        actualStats.seasonScoredOver25Percentage_home ||
        additionalInfo.seasonScoredOver25Percentage_home ||
        actualStats.scoredOver25Percentage_home ||
        0,
      awayScoredOver25Percentage:
        actualStats.seasonScoredOver25Percentage_away ||
        additionalInfo.seasonScoredOver25Percentage_away ||
        actualStats.scoredOver25Percentage_away ||
        0,

      scoredOver35Percentage:
        actualStats.seasonScoredOver35Percentage_overall ||
        additionalInfo.seasonScoredOver35Percentage_overall ||
        actualStats.scoredOver35Percentage ||
        0,
      homeScoredOver35Percentage:
        actualStats.seasonScoredOver35Percentage_home ||
        additionalInfo.seasonScoredOver35Percentage_home ||
        actualStats.scoredOver35Percentage_home ||
        0,
      awayScoredOver35Percentage:
        actualStats.seasonScoredOver35Percentage_away ||
        additionalInfo.seasonScoredOver35Percentage_away ||
        actualStats.scoredOver35Percentage_away ||
        0,

      // Over/Under Conceded Percentages (for Goals Conceded Comparison)
      // Use seasonConcededOver*Percentage_* from stats, not additional_info
      over05Conceded:
        actualStats.seasonConcededOver05Percentage_overall ||
        additionalInfo.seasonConcededOver05Percentage_overall ||
        additionalInfo.over05_conceded_percentage_overall ||
        actualStats.concededOver05Percentage ||
        0,
      homeOver05Conceded:
        actualStats.seasonConcededOver05Percentage_home ||
        additionalInfo.seasonConcededOver05Percentage_home ||
        additionalInfo.over05_conceded_percentage_home ||
        actualStats.concededOver05Percentage_home ||
        0,
      awayOver05Conceded:
        actualStats.seasonConcededOver05Percentage_away ||
        additionalInfo.seasonConcededOver05Percentage_away ||
        additionalInfo.over05_conceded_percentage_away ||
        actualStats.concededOver05Percentage_away ||
        0,

      over15Conceded:
        actualStats.seasonConcededOver15Percentage_overall ||
        additionalInfo.seasonConcededOver15Percentage_overall ||
        additionalInfo.over15_conceded_percentage_overall ||
        actualStats.concededOver15Percentage ||
        0,
      homeOver15Conceded:
        actualStats.seasonConcededOver15Percentage_home ||
        additionalInfo.seasonConcededOver15Percentage_home ||
        additionalInfo.over15_conceded_percentage_home ||
        actualStats.concededOver15Percentage_home ||
        0,
      awayOver15Conceded:
        actualStats.seasonConcededOver15Percentage_away ||
        additionalInfo.seasonConcededOver15Percentage_away ||
        additionalInfo.over15_conceded_percentage_away ||
        actualStats.concededOver15Percentage_away ||
        0,

      over25Conceded:
        actualStats.seasonConcededOver25Percentage_overall ||
        additionalInfo.seasonConcededOver25Percentage_overall ||
        additionalInfo.over25_conceded_percentage_overall ||
        actualStats.concededOver25Percentage ||
        0,
      homeOver25Conceded:
        actualStats.seasonConcededOver25Percentage_home ||
        additionalInfo.seasonConcededOver25Percentage_home ||
        additionalInfo.over25_conceded_percentage_home ||
        actualStats.concededOver25Percentage_home ||
        0,
      awayOver25Conceded:
        actualStats.seasonConcededOver25Percentage_away ||
        additionalInfo.seasonConcededOver25Percentage_away ||
        additionalInfo.over25_conceded_percentage_away ||
        actualStats.concededOver25Percentage_away ||
        0,

      over35Conceded:
        actualStats.seasonConcededOver35Percentage_overall ||
        additionalInfo.seasonConcededOver35Percentage_overall ||
        additionalInfo.over35_conceded_percentage_overall ||
        actualStats.concededOver35Percentage ||
        0,
      homeOver35Conceded:
        actualStats.seasonConcededOver35Percentage_home ||
        additionalInfo.seasonConcededOver35Percentage_home ||
        additionalInfo.over35_conceded_percentage_home ||
        actualStats.concededOver35Percentage_home ||
        0,
      awayOver35Conceded:
        actualStats.seasonConcededOver35Percentage_away ||
        additionalInfo.seasonConcededOver35Percentage_away ||
        additionalInfo.over35_conceded_percentage_away ||
        actualStats.concededOver35Percentage_away ||
        0,

      // BTTS statistics
      seasonBTTSPercentage_overall:
        actualStats.seasonBTTSPercentage_overall || actualStats.bothTeamsScoredPercentage || 0,
      seasonBTTSPercentage_home:
        actualStats.seasonBTTSPercentage_home || actualStats.homeBothTeamsScoredPercentage || 0,
      seasonBTTSPercentage_away:
        actualStats.seasonBTTSPercentage_away || actualStats.awayBothTeamsScoredPercentage || 0,

      // BTTS & Win
      BTTS_and_win_percentage_overall:
        actualStats.bttsAndWinPercentage || additionalInfo.BTTS_and_win_percentage_overall || 0,
      BTTS_and_win_percentage_home:
        actualStats.homeBttsAndWinPercentage || additionalInfo.BTTS_and_win_percentage_home || 0,
      BTTS_and_win_percentage_away:
        actualStats.awayBttsAndWinPercentage || additionalInfo.BTTS_and_win_percentage_away || 0,

      // BTTS & Draw
      BTTS_and_draw_percentage_overall:
        actualStats.bttsAndDrawPercentage || additionalInfo.BTTS_and_draw_percentage_overall || 0,
      BTTS_and_draw_percentage_home:
        actualStats.homeBttsAndDrawPercentage || additionalInfo.BTTS_and_draw_percentage_home || 0,
      BTTS_and_draw_percentage_away:
        actualStats.awayBttsAndDrawPercentage || additionalInfo.BTTS_and_draw_percentage_away || 0,

      // BTTS & Over 2.5
      BTTS_and_over_2_5_percentage_overall: additionalInfo.over25_and_btts_percentage_overall || 0,
      BTTS_and_over_2_5_percentage_home: additionalInfo.over25_and_btts_percentage_home || 0,
      BTTS_and_over_2_5_percentage_away: additionalInfo.over25_and_btts_percentage_away || 0,

      // BTTS No & Over 2.5
      BTTS_no_and_over_2_5_percentage_overall:
        additionalInfo.over25_and_no_btts_percentage_overall || 0,
      BTTS_no_and_over_2_5_percentage_home: additionalInfo.over25_and_no_btts_percentage_home || 0,
      BTTS_no_and_over_2_5_percentage_away: additionalInfo.over25_and_no_btts_percentage_away || 0,

      // Corner statistics - prioritize working fields first
      cornersForPerMatch:
        actualStats.cornersEarnedPerMatch ||
        actualStats.cornersAVG ||
        actualStats.cornersForPerMatch ||
        actualStats.cornersAVG_overall ||
        actualStats.cornersTotalAVG_overall ||
        actualStats.corners_for_per_match ||
        actualStats.seasonCornersForPerMatch ||
        (actualStats.cornersFor && actualStats.matchesPlayed
          ? (actualStats.cornersFor / actualStats.matchesPlayed).toFixed(2)
          : 0) ||
        0,
      cornersAgainstPerMatch:
        actualStats.cornersAgainstPerMatch ||
        actualStats.cornersAgainstAVG ||
        actualStats.cornersAgainstAVG_overall ||
        actualStats.corners_against_per_match ||
        actualStats.seasonCornersAgainstPerMatch ||
        0,
      homeCornersForPerMatch:
        actualStats.homeCornersAVG ||
        actualStats.homeCornersForPerMatch ||
        actualStats.cornersAVG_home ||
        actualStats.cornersTotalAVG_home ||
        actualStats.home_corners_for_per_match ||
        actualStats.seasonCornersForPerMatch_home ||
        (actualStats.homeCornersFor && actualStats.homeMatches
          ? (actualStats.homeCornersFor / actualStats.homeMatches).toFixed(2)
          : actualStats.cornersFor && actualStats.matchesPlayed
            ? (actualStats.cornersFor / actualStats.matchesPlayed).toFixed(2)
            : 0) ||
        0,
      homeCornersAgainstPerMatch:
        actualStats.homeCornersAgainstPerMatch ||
        actualStats.homeCornersAgainstAVG ||
        actualStats.cornersAgainstAVG_home ||
        actualStats.home_corners_against_per_match ||
        actualStats.seasonCornersAgainstPerMatch_home ||
        (actualStats.homeCornersAgainst && actualStats.homeMatches
          ? (actualStats.homeCornersAgainst / actualStats.homeMatches).toFixed(2)
          : actualStats.cornersAgainstPerMatch) ||
        0,
      awayCornersForPerMatch:
        actualStats.awayCornersAVG ||
        actualStats.awayCornersForPerMatch ||
        actualStats.cornersAVG_away ||
        actualStats.cornersTotalAVG_away ||
        actualStats.away_corners_for_per_match ||
        actualStats.seasonCornersForPerMatch_away ||
        (actualStats.awayCornersFor && actualStats.awayMatches
          ? (actualStats.awayCornersFor / actualStats.awayMatches).toFixed(2)
          : actualStats.cornersFor && actualStats.matchesPlayed
            ? (actualStats.cornersFor / actualStats.matchesPlayed).toFixed(2)
            : 0) ||
        0,
      awayCornersAgainstPerMatch:
        actualStats.awayCornersAgainstPerMatch ||
        actualStats.awayCornersAgainstAVG ||
        actualStats.cornersAgainstAVG_away ||
        actualStats.away_corners_against_per_match ||
        actualStats.seasonCornersAgainstPerMatch_away ||
        (actualStats.awayCornersAgainst && actualStats.awayMatches
          ? (actualStats.awayCornersAgainst / actualStats.awayMatches).toFixed(2)
          : actualStats.cornersAgainstPerMatch) ||
        0,

      // Corner over/under percentages - using actual API field names
      over25CornersFor:
        actualStats.over25CornersForPercentage_overall ||
        actualStats.over25CornersFor ||
        additionalInfo.over_2_5_corners_for_percentage_overall ||
        actualStats.over25CornersForPercentage ||
        0,
      over35CornersFor:
        actualStats.over35CornersForPercentage_overall ||
        actualStats.over35CornersFor ||
        additionalInfo.over_3_5_corners_for_percentage_overall ||
        actualStats.over35CornersForPercentage ||
        0,
      over45CornersFor:
        actualStats.over45CornersForPercentage_overall ||
        actualStats.over45CornersFor ||
        additionalInfo.over_4_5_corners_for_percentage_overall ||
        actualStats.over45CornersForPercentage ||
        0,
      over25CornersAgainst:
        actualStats.over25CornersAgainstPercentage_overall ||
        actualStats.over25CornersAgainst ||
        additionalInfo.over_2_5_corners_against_percentage_overall ||
        actualStats.over25CornersAgainstPercentage ||
        0,
      over35CornersAgainst:
        actualStats.over35CornersAgainstPercentage_overall ||
        actualStats.over35CornersAgainst ||
        additionalInfo.over_3_5_corners_against_percentage_overall ||
        actualStats.over35CornersAgainstPercentage ||
        0,
      over45CornersAgainst:
        actualStats.over45CornersAgainstPercentage_overall ||
        actualStats.over45CornersAgainst ||
        additionalInfo.over_4_5_corners_against_percentage_overall ||
        actualStats.over45CornersAgainstPercentage ||
        0,

      // Venue-specific corner over/under - using actual API field names
      homeOver25CornersFor:
        actualStats.over25CornersForPercentage_home ||
        actualStats.homeOver25CornersFor ||
        additionalInfo.over_2_5_corners_for_percentage_home ||
        actualStats.over25CornersForPercentage_home ||
        0,
      homeOver35CornersFor:
        actualStats.over35CornersForPercentage_home ||
        actualStats.homeOver35CornersFor ||
        additionalInfo.over_3_5_corners_for_percentage_home ||
        actualStats.over35CornersForPercentage_home ||
        0,
      homeOver45CornersFor:
        actualStats.over45CornersForPercentage_home ||
        actualStats.homeOver45CornersFor ||
        additionalInfo.over_4_5_corners_for_percentage_home ||
        actualStats.over45CornersForPercentage_home ||
        0,
      awayOver25CornersFor:
        actualStats.over25CornersForPercentage_away ||
        actualStats.awayOver25CornersFor ||
        additionalInfo.over_2_5_corners_for_percentage_away ||
        actualStats.over25CornersForPercentage_away ||
        0,
      awayOver35CornersFor:
        actualStats.over35CornersForPercentage_away ||
        actualStats.awayOver35CornersFor ||
        additionalInfo.over_3_5_corners_for_percentage_away ||
        actualStats.over35CornersForPercentage_away ||
        0,
      awayOver45CornersFor:
        actualStats.over45CornersForPercentage_away ||
        actualStats.awayOver45CornersFor ||
        additionalInfo.over_4_5_corners_for_percentage_away ||
        actualStats.over45CornersForPercentage_away ||
        0,

      // Total corners - using actual API field names
      cornersFor:
        actualStats.cornersTotal_overall ||
        actualStats.cornersFor ||
        actualStats.corners_for ||
        actualStats.seasonCornersFor ||
        0,
      cornersAgainst:
        actualStats.cornersAgainst_overall ||
        actualStats.cornersAgainst ||
        actualStats.corners_against ||
        actualStats.seasonCornersAgainst ||
        0,
      homeCornersFor:
        actualStats.cornersTotal_home ||
        actualStats.homeCornersFor ||
        actualStats.home_corners_for ||
        actualStats.seasonCornersFor_home ||
        0,
      homeCornersAgainst:
        actualStats.cornersAgainst_home ||
        actualStats.homeCornersAgainst ||
        actualStats.home_corners_against ||
        actualStats.seasonCornersAgainst_home ||
        0,
      awayCornersFor:
        actualStats.cornersTotal_away ||
        actualStats.awayCornersFor ||
        actualStats.away_corners_for ||
        actualStats.seasonCornersFor_away ||
        0,
      awayCornersAgainst:
        actualStats.cornersAgainst_away ||
        actualStats.awayCornersAgainst ||
        actualStats.away_corners_against ||
        actualStats.seasonCornersAgainst_away ||
        0,

      // Card statistics - prioritize working fields first
      cardsPerMatch:
        actualStats.cardsAVG ||
        actualStats.cardsPerMatch ||
        actualStats.cardsAVG_overall ||
        actualStats.cardsAverage ||
        actualStats.cards_avg_overall ||
        actualStats.yellowCardsAVG ||
        (actualStats.cardsFor && actualStats.matchesPlayed
          ? (actualStats.cardsFor / actualStats.matchesPlayed).toFixed(2)
          : 0) ||
        0,
      cardsAgainstPerMatch:
        actualStats.cardsAgainstAVG ||
        actualStats.cardsAgainstPerMatch ||
        actualStats.cardsAgainstAVG_overall ||
        actualStats.cards_against_per_match ||
        actualStats.seasonCardsAgainstPerMatch ||
        0,
      homeCardsPerMatch:
        actualStats.homeCardsAVG ||
        actualStats.homeCardsPerMatch ||
        actualStats.cardsAVG_home ||
        actualStats.homeCardsAverage ||
        actualStats.cards_avg_home ||
        (actualStats.homeCardsFor && actualStats.homeMatches
          ? (actualStats.homeCardsFor / actualStats.homeMatches).toFixed(2)
          : actualStats.cardsPerMatch) ||
        0,
      homeCardsAgainstPerMatch:
        actualStats.homeCardsAgainstAVG ||
        actualStats.homeCardsAgainstPerMatch ||
        actualStats.cardsAgainstAVG_home ||
        actualStats.home_cards_against_per_match ||
        actualStats.seasonCardsAgainstPerMatch_home ||
        (actualStats.homeCardsAgainst && actualStats.homeMatches
          ? (actualStats.homeCardsAgainst / actualStats.homeMatches).toFixed(2)
          : actualStats.cardsAgainstPerMatch) ||
        0,
      awayCardsPerMatch:
        actualStats.awayCardsAVG ||
        actualStats.awayCardsPerMatch ||
        actualStats.cardsAVG_away ||
        actualStats.awayCardsAverage ||
        actualStats.cards_avg_away ||
        (actualStats.awayCardsFor && actualStats.awayMatches
          ? (actualStats.awayCardsFor / actualStats.awayMatches).toFixed(2)
          : actualStats.cardsPerMatch) ||
        0,
      awayCardsAgainstPerMatch:
        actualStats.awayCardsAgainstAVG ||
        actualStats.awayCardsAgainstPerMatch ||
        actualStats.cardsAgainstAVG_away ||
        actualStats.away_cards_against_per_match ||
        actualStats.seasonCardsAgainstPerMatch_away ||
        (actualStats.awayCardsAgainst && actualStats.awayMatches
          ? (actualStats.awayCardsAgainst / actualStats.awayMatches).toFixed(2)
          : actualStats.cardsAgainstPerMatch) ||
        0,

      // Card over/under percentages - Match Total Cards (team-stats format)
      cardsOver15:
        actualStats.over15CardsPercentage_overall || additionalInfo.over15_cards_percentage || 0,
      cardsOver25:
        actualStats.over25CardsPercentage_overall || additionalInfo.over25_cards_percentage || 0,
      cardsOver35:
        actualStats.over35CardsPercentage_overall || additionalInfo.over35_cards_percentage || 0,
      cardsOver45:
        actualStats.over45CardsPercentage_overall || additionalInfo.over45_cards_percentage || 0,
      cardsOver55:
        actualStats.over55CardsPercentage_overall || additionalInfo.over55_cards_percentage || 0,
      cardsOver65:
        actualStats.over65CardsPercentage_overall || additionalInfo.over65_cards_percentage || 0,

      cardsOver15_overall:
        actualStats.over15CardsPercentage_overall || additionalInfo.over15_cards_percentage || 0,
      cardsOver25_overall:
        actualStats.over25CardsPercentage_overall || additionalInfo.over25_cards_percentage || 0,
      cardsOver35_overall:
        actualStats.over35CardsPercentage_overall || additionalInfo.over35_cards_percentage || 0,
      cardsOver45_overall:
        actualStats.over45CardsPercentage_overall || additionalInfo.over45_cards_percentage || 0,
      cardsOver55_overall:
        actualStats.over55CardsPercentage_overall || additionalInfo.over55_cards_percentage || 0,
      cardsOver65_overall:
        actualStats.over65CardsPercentage_overall || additionalInfo.over65_cards_percentage || 0,

      cardsOver15_home:
        actualStats.homeCardsOver15 ||
        actualStats.cardsOver15_home ||
        actualStats.over15CardsPercentage_home ||
        0,
      cardsOver25_home:
        actualStats.homeCardsOver25 ||
        actualStats.cardsOver25_home ||
        actualStats.over25CardsPercentage_home ||
        0,
      cardsOver35_home:
        actualStats.homeCardsOver35 ||
        actualStats.cardsOver35_home ||
        actualStats.over35CardsPercentage_home ||
        0,
      cardsOver45_home:
        actualStats.homeCardsOver45 ||
        actualStats.cardsOver45_home ||
        actualStats.over45CardsPercentage_home ||
        0,
      cardsOver55_home:
        actualStats.homeCardsOver55 ||
        actualStats.cardsOver55_home ||
        actualStats.over55CardsPercentage_home ||
        0,
      cardsOver65_home:
        actualStats.homeCardsOver65 ||
        actualStats.cardsOver65_home ||
        actualStats.over65CardsPercentage_home ||
        0,

      cardsOver15_away:
        actualStats.awayCardsOver15 ||
        actualStats.cardsOver15_away ||
        actualStats.over15CardsPercentage_away ||
        0,
      cardsOver25_away:
        actualStats.awayCardsOver25 ||
        actualStats.cardsOver25_away ||
        actualStats.over25CardsPercentage_away ||
        0,
      cardsOver35_away:
        actualStats.awayCardsOver35 ||
        actualStats.cardsOver35_away ||
        actualStats.over35CardsPercentage_away ||
        0,
      cardsOver45_away:
        actualStats.awayCardsOver45 ||
        actualStats.cardsOver45_away ||
        actualStats.over45CardsPercentage_away ||
        0,
      cardsOver55_away:
        actualStats.awayCardsOver55 ||
        actualStats.cardsOver55_away ||
        actualStats.over55CardsPercentage_away ||
        0,
      cardsOver65_away:
        actualStats.awayCardsOver65 ||
        actualStats.cardsOver65_away ||
        actualStats.over65CardsPercentage_away ||
        0,

      // Add percentage fields that cards-comparison.js is looking for
      // These are now mapped from the values above to avoid duplication

      // Card over/under percentages - Use correct API field names
      over15CardsFor:
        actualStats.over15CardsPercentage_overall ||
        actualStats.over15CardsForPercentage_overall ||
        actualStats.over15CardsFor ||
        additionalInfo.over_1_5_cards_for_percentage_overall ||
        actualStats.over15CardsForPercentage ||
        0,
      over25CardsFor:
        actualStats.over25CardsPercentage_overall ||
        actualStats.over25CardsForPercentage_overall ||
        actualStats.over25CardsFor ||
        additionalInfo.over_2_5_cards_for_percentage_overall ||
        actualStats.over25CardsForPercentage ||
        0,
      over35CardsFor:
        actualStats.over35CardsPercentage_overall ||
        actualStats.over35CardsForPercentage_overall ||
        actualStats.over35CardsFor ||
        additionalInfo.over_3_5_cards_for_percentage_overall ||
        actualStats.over35CardsForPercentage ||
        0,
      over45CardsFor:
        actualStats.over45CardsPercentage_overall ||
        actualStats.over45CardsForPercentage_overall ||
        actualStats.over45CardsFor ||
        additionalInfo.over_4_5_cards_for_percentage_overall ||
        actualStats.over45CardsForPercentage ||
        0,
      over55CardsFor:
        actualStats.over55CardsPercentage_overall ||
        actualStats.over55CardsForPercentage_overall ||
        actualStats.over55CardsFor ||
        additionalInfo.over_5_5_cards_for_percentage_overall ||
        actualStats.over55CardsForPercentage ||
        0,
      over65CardsFor:
        actualStats.over65CardsPercentage_overall ||
        actualStats.over65CardsForPercentage_overall ||
        actualStats.over65CardsFor ||
        additionalInfo.over_6_5_cards_for_percentage_overall ||
        actualStats.over65CardsForPercentage ||
        0,
      over15CardsAgainst:
        actualStats.over15CardsAgainstPercentage_overall ||
        actualStats.over15CardsAgainst ||
        additionalInfo.over_1_5_cards_against_percentage_overall ||
        actualStats.over15CardsAgainstPercentage ||
        0,
      over25CardsAgainst:
        actualStats.over25CardsAgainstPercentage_overall ||
        actualStats.over25CardsAgainst ||
        additionalInfo.over_2_5_cards_against_percentage_overall ||
        actualStats.over25CardsAgainstPercentage ||
        0,
      over35CardsAgainst:
        actualStats.over35CardsAgainstPercentage_overall ||
        actualStats.over35CardsAgainst ||
        additionalInfo.over_3_5_cards_against_percentage_overall ||
        actualStats.over35CardsAgainstPercentage ||
        0,
      over45CardsAgainst:
        actualStats.over45CardsAgainstPercentage_overall ||
        actualStats.over45CardsAgainst ||
        additionalInfo.over_4_5_cards_against_percentage_overall ||
        actualStats.over45CardsAgainstPercentage ||
        0,
      over55CardsAgainst:
        actualStats.over55CardsAgainstPercentage_overall ||
        actualStats.over55CardsAgainst ||
        additionalInfo.over_5_5_cards_against_percentage_overall ||
        actualStats.over55CardsAgainstPercentage ||
        0,
      over65CardsAgainst:
        actualStats.over65CardsAgainstPercentage_overall ||
        actualStats.over65CardsAgainst ||
        additionalInfo.over_6_5_cards_against_percentage_overall ||
        actualStats.over65CardsAgainstPercentage ||
        0,

      // Venue-specific card over/under - Use correct API field names
      homeOver15CardsFor:
        actualStats.over15CardsPercentage_home ||
        actualStats.over15CardsForPercentage_home ||
        actualStats.homeOver15CardsFor ||
        additionalInfo.over_1_5_cards_for_percentage_home ||
        0,
      homeOver25CardsFor:
        actualStats.over25CardsPercentage_home ||
        actualStats.over25CardsForPercentage_home ||
        actualStats.homeOver25CardsFor ||
        additionalInfo.over_2_5_cards_for_percentage_home ||
        0,
      homeOver35CardsFor:
        actualStats.over35CardsPercentage_home ||
        actualStats.over35CardsForPercentage_home ||
        actualStats.homeOver35CardsFor ||
        additionalInfo.over_3_5_cards_for_percentage_home ||
        0,
      homeOver45CardsFor:
        actualStats.over45CardsPercentage_home ||
        actualStats.over45CardsForPercentage_home ||
        actualStats.homeOver45CardsFor ||
        additionalInfo.over_4_5_cards_for_percentage_home ||
        0,
      homeOver55CardsFor:
        actualStats.over55CardsPercentage_home ||
        actualStats.over55CardsForPercentage_home ||
        actualStats.homeOver55CardsFor ||
        additionalInfo.over_5_5_cards_for_percentage_home ||
        0,
      homeOver65CardsFor:
        actualStats.over65CardsPercentage_home ||
        actualStats.over65CardsForPercentage_home ||
        actualStats.homeOver65CardsFor ||
        additionalInfo.over_6_5_cards_for_percentage_home ||
        0,
      awayOver15CardsFor:
        actualStats.over15CardsPercentage_away ||
        actualStats.over15CardsForPercentage_away ||
        actualStats.awayOver15CardsFor ||
        additionalInfo.over_1_5_cards_for_percentage_away ||
        0,
      awayOver25CardsFor:
        actualStats.over25CardsPercentage_away ||
        actualStats.over25CardsForPercentage_away ||
        actualStats.awayOver25CardsFor ||
        additionalInfo.over_2_5_cards_for_percentage_away ||
        0,
      awayOver35CardsFor:
        actualStats.over35CardsPercentage_away ||
        actualStats.over35CardsForPercentage_away ||
        actualStats.awayOver35CardsFor ||
        additionalInfo.over_3_5_cards_for_percentage_away ||
        0,
      awayOver45CardsFor:
        actualStats.over45CardsPercentage_away ||
        actualStats.over45CardsForPercentage_away ||
        actualStats.awayOver45CardsFor ||
        additionalInfo.over_4_5_cards_for_percentage_away ||
        0,
      awayOver55CardsFor:
        actualStats.over55CardsPercentage_away ||
        actualStats.over55CardsForPercentage_away ||
        actualStats.awayOver55CardsFor ||
        additionalInfo.over_5_5_cards_for_percentage_away ||
        0,
      awayOver65CardsFor:
        actualStats.over65CardsPercentage_away ||
        actualStats.over65CardsForPercentage_away ||
        actualStats.awayOver65CardsFor ||
        additionalInfo.over_6_5_cards_for_percentage_away ||
        0,

      // Total cards
      cardsFor:
        actualStats.cardsTotal_overall ||
        actualStats.cardsFor ||
        actualStats.cards_for ||
        actualStats.seasonCardsFor ||
        actualStats.yellowCards ||
        0,
      cardsAgainst:
        actualStats.cardsAgainst_overall ||
        actualStats.cardsAgainst ||
        actualStats.cards_against ||
        actualStats.seasonCardsAgainst ||
        0,
      homeCardsFor:
        actualStats.cardsTotal_home ||
        actualStats.homeCardsFor ||
        actualStats.home_cards_for ||
        actualStats.seasonCardsFor_home ||
        actualStats.homeYellowCards ||
        0,
      homeCardsAgainst:
        actualStats.cardsAgainst_home ||
        actualStats.homeCardsAgainst ||
        actualStats.home_cards_against ||
        actualStats.seasonCardsAgainst_home ||
        0,
      awayCardsFor:
        actualStats.cardsTotal_away ||
        actualStats.awayCardsFor ||
        actualStats.away_cards_for ||
        actualStats.seasonCardsFor_away ||
        actualStats.awayYellowCards ||
        0,
      awayCardsAgainst:
        actualStats.cardsAgainst_away ||
        actualStats.awayCardsAgainst ||
        actualStats.away_cards_against ||
        actualStats.seasonCardsAgainst_away ||
        0,

      // Over cards percentages - team cards
      over15CardsForPercentage_overall:
        actualStats.over15CardsForPercentage_overall || actualStats.over15CardsFor || 0,
      over25CardsForPercentage_overall:
        actualStats.over25CardsForPercentage_overall || actualStats.over25CardsFor || 0,
      over35CardsForPercentage_overall:
        actualStats.over35CardsForPercentage_overall || actualStats.over35CardsFor || 0,
      over45CardsForPercentage_overall:
        actualStats.over45CardsForPercentage_overall || actualStats.over45CardsFor || 0,

      over15CardsForPercentage_home:
        actualStats.over15CardsForPercentage_home || actualStats.homeOver15CardsFor || 0,
      over25CardsForPercentage_home:
        actualStats.over25CardsForPercentage_home || actualStats.homeOver25CardsFor || 0,
      over35CardsForPercentage_home:
        actualStats.over35CardsForPercentage_home || actualStats.homeOver35CardsFor || 0,
      over45CardsForPercentage_home:
        actualStats.over45CardsForPercentage_home || actualStats.homeOver45CardsFor || 0,

      over15CardsForPercentage_away:
        actualStats.over15CardsForPercentage_away || actualStats.awayOver15CardsFor || 0,
      over25CardsForPercentage_away:
        actualStats.over25CardsForPercentage_away || actualStats.awayOver25CardsFor || 0,
      over35CardsForPercentage_away:
        actualStats.over35CardsForPercentage_away || actualStats.awayOver35CardsFor || 0,
      over45CardsForPercentage_away:
        actualStats.over45CardsForPercentage_away || actualStats.awayOver45CardsFor || 0,

      // Over cards percentages - opponent cards
      over15CardsAgainstPercentage_overall:
        actualStats.over15CardsAgainstPercentage_overall || actualStats.over15CardsAgainst || 0,
      over25CardsAgainstPercentage_overall:
        actualStats.over25CardsAgainstPercentage_overall || actualStats.over25CardsAgainst || 0,
      over35CardsAgainstPercentage_overall:
        actualStats.over35CardsAgainstPercentage_overall || actualStats.over35CardsAgainst || 0,

      over15CardsAgainstPercentage_home:
        actualStats.over15CardsAgainstPercentage_home || actualStats.homeOver15CardsAgainst || 0,
      over25CardsAgainstPercentage_home:
        actualStats.over25CardsAgainstPercentage_home || actualStats.homeOver25CardsAgainst || 0,
      over35CardsAgainstPercentage_home:
        actualStats.over35CardsAgainstPercentage_home || actualStats.homeOver35CardsAgainst || 0,

      over15CardsAgainstPercentage_away:
        actualStats.over15CardsAgainstPercentage_away || actualStats.awayOver15CardsAgainst || 0,
      over25CardsAgainstPercentage_away:
        actualStats.over25CardsAgainstPercentage_away || actualStats.awayOver25CardsAgainst || 0,
      over35CardsAgainstPercentage_away:
        actualStats.over35CardsAgainstPercentage_away || actualStats.awayOver35CardsAgainst || 0,

      // Over cards percentages - total match cards
      over15CardsPercentage_overall:
        actualStats.over15CardsPercentage_overall || actualStats.over15Cards || 0,
      over25CardsPercentage_overall:
        actualStats.over25CardsPercentage_overall || actualStats.over25Cards || 0,
      over35CardsPercentage_overall:
        actualStats.over35CardsPercentage_overall || actualStats.over35Cards || 0,
      over45CardsPercentage_overall:
        actualStats.over45CardsPercentage_overall || actualStats.over45Cards || 0,
      over55CardsPercentage_overall:
        actualStats.over55CardsPercentage_overall || actualStats.over55Cards || 0,

      over15CardsPercentage_home:
        actualStats.over15CardsPercentage_home || actualStats.homeOver15Cards || 0,
      over25CardsPercentage_home:
        actualStats.over25CardsPercentage_home || actualStats.homeOver25Cards || 0,
      over35CardsPercentage_home:
        actualStats.over35CardsPercentage_home || actualStats.homeOver35Cards || 0,
      over45CardsPercentage_home:
        actualStats.over45CardsPercentage_home || actualStats.homeOver45Cards || 0,
      over55CardsPercentage_home:
        actualStats.over55CardsPercentage_home || actualStats.homeOver55Cards || 0,

      over15CardsPercentage_away:
        actualStats.over15CardsPercentage_away || actualStats.awayOver15Cards || 0,
      over25CardsPercentage_away:
        actualStats.over25CardsPercentage_away || actualStats.awayOver25Cards || 0,
      over35CardsPercentage_away:
        actualStats.over35CardsPercentage_away || actualStats.awayOver35Cards || 0,
      over45CardsPercentage_away:
        actualStats.over45CardsPercentage_away || actualStats.awayOver45Cards || 0,
      over55CardsPercentage_away:
        actualStats.over55CardsPercentage_away || actualStats.awayOver55Cards || 0,

      // Offside statistics - Use correct API field names
      offsidePerMatch:
        actualStats.offsidesAvg ||
        actualStats.matchOffsidesAvg ||
        actualStats.offsidesTeamAVG_overall ||
        actualStats.offsidesAVG_overall ||
        actualStats.offsideAVG_overall ||
        actualStats.offsidesPerMatch ||
        actualStats.offsidePerMatch ||
        actualStats.offsideAVG ||
        actualStats.offside_avg_overall ||
        (actualStats.totalOffsides && actualStats.matchesPlayed
          ? (actualStats.totalOffsides / actualStats.matchesPlayed).toFixed(2)
          : 0) ||
        0,
      homeOffsidePerMatch:
        actualStats.homeMatchOffsidesAvg || // Primary field for total match offsides
        actualStats.homeOffsidesAvg ||
        actualStats.offsidesTeamAVG_home ||
        actualStats.homeOffsidePerMatch ||
        actualStats.offsidesAVG_home ||
        actualStats.offsideAVG_home ||
        actualStats.homeOffsidesPerMatch ||
        actualStats.homeOffsideAVG ||
        actualStats.offside_avg_home ||
        (actualStats.homeTotalOffsides && actualStats.homeMatches
          ? (actualStats.homeTotalOffsides / actualStats.homeMatches).toFixed(2)
          : actualStats.offsidePerMatch) ||
        0,
      awayOffsidePerMatch:
        actualStats.awayMatchOffsidesAvg || // Primary field for total match offsides
        actualStats.awayOffsidesAvg ||
        actualStats.offsidesTeamAVG_away ||
        actualStats.awayOffsidePerMatch ||
        actualStats.offsidesAVG_away ||
        actualStats.offsideAVG_away ||
        actualStats.awayOffsidesPerMatch ||
        actualStats.awayOffsideAVG ||
        actualStats.offside_avg_away ||
        (actualStats.awayTotalOffsides && actualStats.awayMatches
          ? (actualStats.awayTotalOffsides / actualStats.awayMatches).toFixed(2)
          : actualStats.offsidePerMatch) ||
        0,

      // Offside over/under percentages - Include all venue-specific fields
      // Home venue statistics
      over25OffsidesPercentage_home:
        actualStats.over25OffsidesPercentage_home ||
        actualStats.homeMatchOffsidesOver2_5 || // Primary field from API
        actualStats.homeOffsidesOver2_5 ||
        0,
      over35OffsidesPercentage_home:
        actualStats.over35OffsidesPercentage_home ||
        actualStats.homeMatchOffsidesOver3_5 || // Primary field from API
        actualStats.homeOffsidesOver3_5 ||
        0,

      // Away venue statistics
      over25OffsidesPercentage_away:
        actualStats.over25OffsidesPercentage_away ||
        actualStats.awayMatchOffsidesOver2_5 || // Primary field from API
        actualStats.awayOffsidesOver2_5 ||
        0,
      over35OffsidesPercentage_away:
        actualStats.over35OffsidesPercentage_away ||
        actualStats.awayMatchOffsidesOver3_5 || // Primary field from API
        actualStats.awayOffsidesOver3_5 ||
        0,

      // Keep old fields for backward compatibility but mark as deprecated
      homeOffsideOver25:
        actualStats.over25OffsidesPercentage_home ||
        actualStats.homeOffsidesOver2_5 ||
        actualStats.homeMatchOffsidesOver2_5 ||
        actualStats.homeOffsideOver25 ||
        0,
      homeOffsideOver35:
        actualStats.over35OffsidesPercentage_home ||
        actualStats.homeOffsidesOver3_5 ||
        actualStats.homeMatchOffsidesOver3_5 ||
        actualStats.homeOffsideOver35 ||
        0,
      awayOffsideOver25:
        actualStats.over25OffsidesPercentage_away ||
        actualStats.awayOffsidesOver2_5 ||
        actualStats.awayMatchOffsidesOver2_5 ||
        actualStats.awayOffsideOver25 ||
        0,
      awayOffsideOver35:
        actualStats.over35OffsidesPercentage_away ||
        actualStats.awayOffsidesOver3_5 ||
        actualStats.awayMatchOffsidesOver3_5 ||
        actualStats.awayOffsideOver35 ||
        0,

      // Total offsides
      totalOffsides:
        actualStats.totalOffsides ||
        actualStats.totalOffside ||
        actualStats.offsides_total ||
        actualStats.offside_total ||
        0,
      homeTotalOffsides:
        actualStats.homeTotalOffsides ||
        actualStats.homeTotalOffside ||
        actualStats.home_offsides_total ||
        actualStats.homeOffsides ||
        0,
      awayTotalOffsides:
        actualStats.awayTotalOffsides ||
        actualStats.awayTotalOffside ||
        actualStats.away_offsides_total ||
        actualStats.awayOffsides ||
        0,
    };

    // Debug before return
    console.log('[MatchDetailsData] extractedStats card fields:', {
      cardsOver25: extractedStats.cardsOver25,
      cardsOver25_home: extractedStats.cardsOver25_home,
      cardsOver25_away: extractedStats.cardsOver25_away,
    });

    console.log(
      '[MatchDetailsData] extractedStats offside fields for',
      teamData?.teamInfo?.name,
      ':',
      {
        offsidePerMatch: extractedStats.offsidePerMatch,
        homeOffsidePerMatch: extractedStats.homeOffsidePerMatch,
        awayOffsidePerMatch: extractedStats.awayOffsidePerMatch,
        venue_specific_percentages: {
          over25OffsidesPercentage_home: extractedStats.over25OffsidesPercentage_home,
          over25OffsidesPercentage_away: extractedStats.over25OffsidesPercentage_away,
          over35OffsidesPercentage_home: extractedStats.over35OffsidesPercentage_home,
          over35OffsidesPercentage_away: extractedStats.over35OffsidesPercentage_away,
        },
        deprecated_fields: {
          homeOffsideOver25: extractedStats.homeOffsideOver25,
          awayOffsideOver25: extractedStats.awayOffsideOver25,
          homeOffsideOver35: extractedStats.homeOffsideOver35,
          awayOffsideOver35: extractedStats.awayOffsideOver35,
        },
        raw_values: {
          awayOffsidePerMatch: actualStats.awayOffsidePerMatch,
          homeOffsidePerMatch: actualStats.homeOffsidePerMatch,
          offsidesAvg: actualStats.offsidesAvg,
          matchOffsidesAvg: actualStats.matchOffsidesAvg,
          awayOffsidesAvg: actualStats.awayOffsidesAvg,
          homeOffsidesAvg: actualStats.homeOffsidesAvg,
          homeOffsidesOver2_5: actualStats.homeOffsidesOver2_5,
          awayOffsidesOver2_5: actualStats.awayOffsidesOver2_5,
        },
      }
    );

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
