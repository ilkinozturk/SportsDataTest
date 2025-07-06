const axios = require('axios');
const Logger = require('../utils/logger');

/**
 * Specialized module for fetching team matches with robust error handling
 */
class MatchesFetcher {
  constructor(apiKey, baseUrl) {
    this.logger = new Logger('MatchesFetcher');
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.cache = new Map();
    this.CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get matches for a team with comprehensive debugging
   */
  async getTeamMatches(teamId, seasonId) {
    const cacheKey = `matches_${teamId}_${seasonId}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      this.logger.info(`Matches cache hit for team ${teamId} in season ${seasonId}`);
      return cached.data;
    }

    this.logger.info(`Getting matches for team ${teamId} in season ${seasonId}`);

    try {
      // Step 1: Skip verification for now - directly fetch matches
      this.logger.debug('Skipping season verification, directly fetching matches');

      // Step 2: Get all matches for the season
      const allMatches = await this.fetchSeasonMatches(seasonId);
      this.logger.info(`Total matches in season: ${allMatches.length}`);

      if (allMatches.length === 0) {
        this.logger.warn(`No matches found for season ${seasonId}`);
        return [];
      }

      // Step 3: Filter matches for the specific team
      const teamMatches = this.filterTeamMatches(allMatches, teamId);
      this.logger.success(`Found ${teamMatches.length} matches for team ${teamId}`);

      // Step 4: Get team names for better display
      const teamNames = await this.getTeamNamesMap(seasonId);

      // Step 5: Process and format matches
      const processedMatches = this.processMatches(teamMatches, teamNames);

      // Cache the results
      this.cache.set(cacheKey, {
        data: processedMatches,
        timestamp: Date.now(),
      });

      return processedMatches;
    } catch (error) {
      this.logger.error(`MatchesFetcher error: ${error.message}`, error);
      return [];
    }
  }

  /**
   * Verify if season is accessible
   */
  async verifySeasonAccess(seasonId) {
    try {
      const response = await axios.get(`${this.baseUrl}/league-season`, {
        params: {
          key: this.apiKey,
          season_id: seasonId,
        },
        timeout: 5000,
      });

      if (response.data.success) {
        // Check both array and object response formats
        if (response.data.data) {
          if (Array.isArray(response.data.data) && response.data.data.length > 0) {
            const season = response.data.data[0];
            this.logger.info(`Season verified: ${season.name} - ${season.season}`);
            return true;
          } else if (
            typeof response.data.data === 'object' &&
            Object.keys(response.data.data).length > 0
          ) {
            this.logger.info(`Season ${seasonId} is accessible`);
            return true;
          }
        }

        // If success but no data, still try to fetch matches
        this.logger.warn(`Season ${seasonId} response has no data, but trying anyway`);
        return true;
      }

      return false;
    } catch (error) {
      if (error.response?.status === 417) {
        this.logger.error(`Season ${seasonId} not chosen by user`);
      } else {
        this.logger.error(`Error verifying season ${seasonId}: ${error.message}`, error);
      }
      return false;
    }
  }

  /**
   * Fetch all matches for a season
   */
  async fetchSeasonMatches(seasonId) {
    const allMatches = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      try {
        this.logger.debug(`Fetching page ${page} of matches for season ${seasonId}`);

        const response = await axios.get(`${this.baseUrl}/league-matches`, {
          params: {
            key: this.apiKey,
            season_id: seasonId,
            page: page,
            max_per_page: 1000,
          },
          timeout: 20000,
        });

        if (response.data.success && response.data.data) {
          const matches = response.data.data;
          allMatches.push(...matches);

          this.logger.debug(`Fetched ${matches.length} matches (total: ${allMatches.length})`);

          // Check if there are more pages
          const pager = response.data.pager;
          if (pager && page < pager.max_page) {
            page++;
          } else {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      } catch (error) {
        this.logger.error(`Error fetching page ${page}: ${error.message}`, error);
        hasMore = false;
      }
    }

    return allMatches;
  }

  /**
   * Filter matches for a specific team
   */
  filterTeamMatches(allMatches, teamId) {
    // Convert to string for consistent comparison
    const teamIdStr = String(teamId);

    const filtered = allMatches.filter(match => {
      const homeIdStr = String(match.homeID);
      const awayIdStr = String(match.awayID);
      return homeIdStr === teamIdStr || awayIdStr === teamIdStr;
    });

    // Debug: Show some match IDs if no matches found
    if (filtered.length === 0 && allMatches.length > 0) {
      this.logger.warn(`No matches found for team ${teamId}`, {
        sampleHomeIds: [...new Set(allMatches.slice(0, 10).map(m => m.homeID))],
        sampleAwayIds: [...new Set(allMatches.slice(0, 10).map(m => m.awayID))]
      });
    }

    return filtered;
  }

  /**
   * Get team names map for the season
   */
  async getTeamNamesMap(seasonId) {
    try {
      const response = await axios.get(`${this.baseUrl}/league-teams`, {
        params: {
          key: this.apiKey,
          season_id: seasonId,
        },
        timeout: 10000,
      });

      if (response.data.success && response.data.data) {
        const teams = {};
        response.data.data.forEach(team => {
          teams[team.id] = team.name || team.cleanName || `Team ${team.id}`;
        });
        return teams;
      }

      return {};
    } catch (error) {
      this.logger.error(`Could not fetch team names: ${error.message}`, error);
      return {};
    }
  }

  /**
   * Process and format matches
   */
  processMatches(matches, teamNames) {
    return matches
      .map(match => ({
        id: match.id,
        date: match.date_unix ? new Date(match.date_unix * 1000).toISOString() : null,
        status: match.status || 'complete',
        homeTeam: {
          id: match.homeID,
          name: teamNames[match.homeID] || `Team ${match.homeID}`,
        },
        awayTeam: {
          id: match.awayID,
          name: teamNames[match.awayID] || `Team ${match.awayID}`,
        },
        homeScore: match.homeGoalCount,
        awayScore: match.awayGoalCount,
        round: match.game_week,
        stadium: match.stadium_name,
        halfTime: match.half_time
          ? {
              home: match.half_time.team_a,
              away: match.half_time.team_b,
            }
          : null,
        stats: {
          corners: {
            home: match.team_a_corners,
            away: match.team_b_corners,
          },
          cards: {
            home: match.team_a_yellow_cards + match.team_a_red_cards,
            away: match.team_b_yellow_cards + match.team_b_red_cards,
          },
          possession: {
            home: match.team_a_possession,
            away: match.team_b_possession,
          },
        },
      }))
      .sort((a, b) => {
        if (!a.date || !b.date) {
          return 0;
        }
        return new Date(b.date) - new Date(a.date);
      });
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    this.logger.info('MatchesFetcher cache cleared');
  }
}

module.exports = MatchesFetcher;
