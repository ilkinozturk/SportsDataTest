/**
 * Dynamic Data Fetcher
 * Intelligently fetches and validates data from FootyStats API
 */

const axios = require('axios');
const DataValidator = require('./dataValidator');
const Logger = require('../utils/logger');

class DynamicDataFetcher {
  constructor(apiKey, baseUrl) {
    this.logger = new Logger('DynamicDataFetcher');
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.validator = new DataValidator();
    this.retryAttempts = 3;
    this.retryDelay = 1000;
  }

  /**
   * Fetch team data with automatic season detection and validation
   */
  async fetchTeamDataDynamic(teamId, options = {}) {
    const {
      expectedPosition = null,
      expectedPPG = null,
      forceRefresh = false,
      validateData = true,
    } = options;

    try {
      // Step 1: Try to get data with include=stats parameter
      const teamData = await this.fetchWithRetry('/team', {
        team_id: teamId,
        include: 'stats',
      });

      if (!teamData.success || !teamData.data || teamData.data.length === 0) {
        throw new Error('No team data returned from API');
      }

      const team = teamData.data[0];

      // Step 2: Validate the data if requested
      if (validateData) {
        const validation = this.validator.validateTeamData(team, {
          position: expectedPosition,
          ppg: expectedPPG,
        });

        if (!validation.isValid) {
          this.logger.warn('⚠️ Data validation failed:', validation.errors);

          // Try alternative approaches
          team = await this.tryAlternativeDataFetch(teamId, team);
        }
      }

      // Step 3: Check if we need to fetch from different season
      if (team.competition_id) {
        const currentSeasonId = await this.getCurrentSeasonId(team.country, team.competition_id);
        if (currentSeasonId && currentSeasonId !== team.competition_id) {
          this.logger.info(`🔄 Switching from season ${team.competition_id} to ${currentSeasonId}`);

          // Try to get data for current season
          const currentSeasonData = await this.fetchTeamInSeason(teamId, currentSeasonId);
          if (currentSeasonData) {
            team = currentSeasonData;
          }
        }
      }

      // Step 4: Enrich data with calculated fields
      team = this.enrichTeamData(team);

      // Step 5: Final validation and quality report
      const qualityReport = this.validator.generateQualityReport(team);
      this.logger.info(`📊 Data quality for ${team.name}: ${qualityReport.dataQuality}`);

      return {
        success: true,
        data: team,
        validation: validateData ? this.validator.validateTeamData(team) : null,
        quality: qualityReport,
        metadata: {
          fetchedAt: new Date().toISOString(),
          season: team.season,
          competitionId: team.competition_id,
        },
      };
    } catch (error) {
      this.logger.error(`❌ Failed to fetch dynamic team data: ${error.message}`);
      return {
        success: false,
        error: error.message,
        data: null,
      };
    }
  }

  /**
   * Try alternative methods to fetch team data
   */
  async tryAlternativeDataFetch(teamId, originalData) {
    this.logger.info('🔍 Trying alternative data fetch methods...');

    // Method 1: Try with different parameters
    try {
      const altData = await this.fetchWithRetry('/team', {
        team_id: teamId,
        include: 'stats,matches',
        season: 'current',
      });

      if (altData.success && altData.data && altData.data.length > 0) {
        return altData.data[0];
      }
    } catch (error) {
      this.logger.info('Alternative method 1 failed:', error.message);
    }

    // Method 2: Calculate from matches if available
    try {
      const matchesData = await this.fetchWithRetry('/team-matches', {
        team_id: teamId,
      });

      if (matchesData.success && matchesData.data) {
        return this.calculateStatsFromMatches(originalData, matchesData.data);
      }
    } catch (error) {
      this.logger.info('Alternative method 2 failed:', error.message);
    }

    // Return original data if all methods fail
    return originalData;
  }

  /**
   * Get current season ID for a league
   */
  async getCurrentSeasonId(country, competitionId) {
    try {
      const leagues = await this.fetchWithRetry('/league-list', {});

      if (leagues.success && leagues.data) {
        // Find all seasons for this competition
        const relevantLeagues = leagues.data.filter(
          league => league.country === country && league.name.includes(country)
        );

        // Sort by year and get the latest
        if (relevantLeagues.length > 0) {
          const sorted = relevantLeagues.sort((a, b) => {
            const yearA = parseInt(a.year) || 0;
            const yearB = parseInt(b.year) || 0;
            return yearB - yearA;
          });

          return sorted[0].id;
        }
      }
    } catch (error) {
      this.logger.error('Failed to get current season ID:', error.message);
    }

    return null;
  }

  /**
   * Fetch team data for specific season
   */
  async fetchTeamInSeason(teamId, seasonId) {
    try {
      // First get teams in the season
      const seasonTeams = await this.fetchWithRetry('/league-teams', {
        league_id: seasonId,
      });

      if (seasonTeams.success && seasonTeams.data) {
        // Find our team in the season data
        const teamInSeason = seasonTeams.data.find(t => t.id === teamId);
        if (teamInSeason) {
          return teamInSeason;
        }
      }
    } catch (error) {
      this.logger.error('Failed to fetch team in season:', error.message);
    }

    return null;
  }

  /**
   * Calculate stats from match history
   */
  calculateStatsFromMatches(teamData, matches) {
    const stats = {
      seasonMatchesPlayed_overall: 0,
      seasonWinsNum_overall: 0,
      seasonDrawsNum_overall: 0,
      seasonLossesNum_overall: 0,
      seasonGoals_overall: 0,
      seasonConceded_overall: 0,
    };

    matches.forEach(match => {
      if (match.status === 'complete' || match.status === 'finished') {
        stats.seasonMatchesPlayed_overall++;

        const isHome = match.home_id === teamData.id;
        const goalsFor = isHome ? match.homeGoalCount : match.awayGoalCount;
        const goalsAgainst = isHome ? match.awayGoalCount : match.homeGoalCount;

        stats.seasonGoals_overall += goalsFor;
        stats.seasonConceded_overall += goalsAgainst;

        if (goalsFor > goalsAgainst) {
          stats.seasonWinsNum_overall++;
        } else if (goalsFor === goalsAgainst) {
          stats.seasonDrawsNum_overall++;
        } else {
          stats.seasonLossesNum_overall++;
        }
      }
    });

    // Calculate derived stats
    stats.seasonPoints_overall = stats.seasonWinsNum_overall * 3 + stats.seasonDrawsNum_overall;
    stats.seasonPPG_overall =
      stats.seasonMatchesPlayed_overall > 0
        ? stats.seasonPoints_overall / stats.seasonMatchesPlayed_overall
        : 0;

    // Merge with original data
    return {
      ...teamData,
      stats: {
        ...teamData.stats,
        ...stats,
      },
    };
  }

  /**
   * Enrich team data with calculated fields
   */
  enrichTeamData(team) {
    if (!team.stats) {
      team.stats = {};
    }

    const stats = team.stats;

    // Ensure basic calculations
    if (!stats.seasonPoints_overall && stats.seasonWinsNum_overall !== undefined) {
      stats.seasonPoints_overall =
        stats.seasonWinsNum_overall * 3 + (stats.seasonDrawsNum_overall || 0);
    }

    if (!stats.seasonPPG_overall && stats.seasonMatchesPlayed_overall > 0) {
      stats.seasonPPG_overall = stats.seasonPoints_overall / stats.seasonMatchesPlayed_overall;
    }

    // Add data freshness indicator
    team.dataFreshness = this.calculateDataFreshness(team);

    return team;
  }

  /**
   * Calculate how fresh the data is
   */
  calculateDataFreshness(team) {
    // Simple heuristic based on matches played and current date
    const currentMonth = new Date().getMonth();
    const isInSeason = currentMonth >= 7 || currentMonth <= 4; // Aug-Apr

    if (!isInSeason) {
      return 'off-season';
    }

    const matchesPlayed = team.stats?.seasonMatchesPlayed_overall || 0;
    const expectedMatches = this.getExpectedMatches(currentMonth);

    if (matchesPlayed >= expectedMatches - 2) {
      return 'current';
    } else if (matchesPlayed >= expectedMatches - 5) {
      return 'recent';
    } else {
      return 'outdated';
    }
  }

  /**
   * Get expected matches based on current month
   */
  getExpectedMatches(month) {
    // Rough estimate - adjust based on league
    const monthsIntoSeason = month >= 7 ? month - 7 : month + 5;
    return Math.floor(monthsIntoSeason * 3.5); // ~3.5 matches per month
  }

  /**
   * Fetch with retry logic
   */
  async fetchWithRetry(endpoint, params, attempt = 1) {
    try {
      const response = await axios.get(`${this.baseUrl}${endpoint}`, {
        params: { key: this.apiKey, ...params },
        timeout: 10000,
      });

      return response.data;
    } catch (error) {
      if (attempt < this.retryAttempts) {
        this.logger.info(`⚠️ Retry attempt ${attempt} for ${endpoint}`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
        return this.fetchWithRetry(endpoint, params, attempt + 1);
      }
      throw error;
    }
  }
}

module.exports = DynamicDataFetcher;
