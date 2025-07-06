const axios = require('axios');
const Logger = require('../utils/logger');

/**
 * Optimized Team Data Fetcher
 * Prioritizes /league-teams endpoint over /team endpoint for better performance
 */
class OptimizedTeamDataFetcher {
  constructor(apiKey, baseUrl) {
    this.logger = new Logger('OptimizedTeamDataFetcher');
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.leagueTeamsCache = new Map();
    this.CACHE_TTL = 15 * 60 * 1000; // 15 minutes
  }

  /**
   * Get team stats using the most efficient method available
   * @param {string} teamId - The team ID to fetch
   * @param {string} seasonId - The season ID (optional but recommended)
   * @returns {Object|null} Team data with full statistics
   */
  async getTeamStats(teamId, seasonId = null) {
    this.logger.info(`🚀 Optimized fetch for team ${teamId}${seasonId ? ` in season ${seasonId}` : ''}`);

    // If we have a season ID, try league-teams first (MUCH more efficient)
    if (seasonId) {
      const leagueTeamData = await this.getTeamFromLeagueEndpoint(teamId, seasonId);
      if (leagueTeamData) {
        this.logger.info(`✅ Team found via efficient league-teams endpoint`);
        return leagueTeamData;
      }
    }

    // Fallback to individual team endpoint only if necessary
    this.logger.info(`⚠️ Falling back to individual team endpoint`);
    return await this.getTeamFromTeamEndpoint(teamId, seasonId);
  }

  /**
   * Get team data from /league-teams endpoint (preferred method)
   * This fetches ALL teams in the league with one API call
   */
  async getTeamFromLeagueEndpoint(teamId, seasonId) {
    try {
      // Check cache first
      const cacheKey = `league_${seasonId}`;
      const cached = this.getCachedData(cacheKey);

      if (cached) {
        this.logger.info(`💾 Using cached league data for season ${seasonId}`);
        const team = cached.find(t => t.id?.toString() === teamId.toString());
        if (team) {
          // Add metadata to indicate data source
          team._dataSource = 'league-teams-cached';
          team._fetchedAt = new Date().toISOString();
          return team;
        }
      }

      // Fetch fresh data
      this.logger.info(`🌐 Fetching league-teams for season ${seasonId}`);
      const response = await axios.get(`${this.baseUrl}/league-teams`, {
        params: {
          key: this.apiKey,
          season_id: seasonId,
          include: 'stats', // This gives us full statistics
        },
        timeout: 10000,
      });

      if (response.data.success && response.data.data) {
        const teams = response.data.data;

        // Cache the entire league data
        this.setCachedData(cacheKey, teams);
        this.logger.info(`✅ Cached ${teams.length} teams for season ${seasonId}`);

        // Find our specific team
        const team = teams.find(t => t.id?.toString() === teamId.toString());
        if (team) {
          // Add metadata
          team._dataSource = 'league-teams-fresh';
          team._fetchedAt = new Date().toISOString();
          team._competitionType = 'league';
          return team;
        }
      }
    } catch (error) {
      if (error.response?.status !== 417) {
        // 417 = league not selected by user
        this.logger.error(`❌ Error fetching from league-teams: ${error.message}`);
      }
    }

    return null;
  }

  /**
   * Get team data from /team endpoint (fallback method)
   * This is less efficient as it requires one call per team
   */
  async getTeamFromTeamEndpoint(teamId, seasonId = null) {
    try {
      const params = {
        key: this.apiKey,
        team_id: teamId,
        include: 'stats',
      };

      if (seasonId) {
        params.season_id = seasonId;
      }

      this.logger.info(`🌐 Fetching individual team data for ${teamId}`);
      const response = await axios.get(`${this.baseUrl}/team`, {
        params,
        timeout: 10000,
      });

      if (response.data.success && response.data.data && response.data.data.length > 0) {
        const team = response.data.data[0];
        // Add metadata
        team._dataSource = 'team-endpoint';
        team._fetchedAt = new Date().toISOString();
        this.logger.info(`✅ Found team: ${team.name}`);
        return team;
      }

      // If no data with season ID, try without it
      if (seasonId && !response.data.data?.length) {
        this.logger.info(`⚠️ No data with season ${seasonId}, trying without season filter`);
        delete params.season_id;

        const fallbackResponse = await axios.get(`${this.baseUrl}/team`, {
          params,
          timeout: 10000,
        });

        if (fallbackResponse.data.success && fallbackResponse.data.data?.length > 0) {
          const team = fallbackResponse.data.data[0];
          team._dataSource = 'team-endpoint-no-season';
          team._fetchedAt = new Date().toISOString();
          return team;
        }
      }
    } catch (error) {
      this.logger.error(`❌ Error fetching from team endpoint: ${error.message}`);
    }

    return null;
  }

  /**
   * Batch fetch multiple teams efficiently
   * @param {Array} teamIds - Array of team IDs to fetch
   * @param {string} seasonId - The season ID
   * @returns {Map} Map of teamId -> teamData
   */
  async batchFetchTeams(teamIds, seasonId) {
    this.logger.info(`🚀 Batch fetching ${teamIds.length} teams for season ${seasonId}`);

    const results = new Map();

    // First, try to get all from league-teams (one API call!)
    if (seasonId) {
      const leagueData = await this.getLeagueTeams(seasonId);

      if (leagueData) {
        teamIds.forEach(teamId => {
          const team = leagueData.find(t => t.id?.toString() === teamId.toString());
          if (team) {
            results.set(teamId, team);
          }
        });

        this.logger.info(`✅ Found ${results.size}/${teamIds.length} teams via league-teams`);

        // If we found all teams, we're done!
        if (results.size === teamIds.length) {
          return results;
        }
      }
    }

    // For any remaining teams, fetch individually (but this should be rare)
    const missingTeams = teamIds.filter(id => !results.has(id));
    if (missingTeams.length > 0) {
      this.logger.info(`⚠️ Fetching ${missingTeams.length} remaining teams individually`);

      for (const teamId of missingTeams) {
        const teamData = await this.getTeamFromTeamEndpoint(teamId, seasonId);
        if (teamData) {
          results.set(teamId, teamData);
        }
      }
    }

    return results;
  }

  /**
   * Get all teams in a league (cached)
   */
  async getLeagueTeams(seasonId) {
    const cacheKey = `league_${seasonId}`;
    const cached = this.getCachedData(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      const response = await axios.get(`${this.baseUrl}/league-teams`, {
        params: {
          key: this.apiKey,
          season_id: seasonId,
          include: 'stats',
        },
        timeout: 10000,
      });

      if (response.data.success && response.data.data) {
        this.setCachedData(cacheKey, response.data.data);
        return response.data.data;
      }
    } catch (error) {
      this.logger.error(`❌ Error fetching league teams: ${error.message}`);
    }

    return null;
  }

  /**
   * Warm up cache for frequently accessed leagues
   */
  async warmUpCache(seasonIds) {
    this.logger.info(`🔥 Warming up cache for ${seasonIds.length} leagues`);

    for (const seasonId of seasonIds) {
      await this.getLeagueTeams(seasonId);
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.logger.info(`✅ Cache warmed up`);
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const stats = {
      totalCachedLeagues: 0,
      totalCachedTeams: 0,
      cacheKeys: [],
    };

    this.leagueTeamsCache.forEach((value, key) => {
      if (!this.isExpired(value.timestamp)) {
        stats.totalCachedLeagues++;
        stats.totalCachedTeams += value.data.length;
        stats.cacheKeys.push({
          key,
          teams: value.data.length,
          age: `${Math.floor((Date.now() - value.timestamp) / 1000)}s`,
        });
      }
    });

    return stats;
  }

  // Cache helper methods
  getCachedData(key) {
    const cached = this.leagueTeamsCache.get(key);
    if (cached && !this.isExpired(cached.timestamp)) {
      return cached.data;
    }
    return null;
  }

  setCachedData(key, data) {
    this.leagueTeamsCache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  isExpired(timestamp) {
    return Date.now() - timestamp > this.CACHE_TTL;
  }

  clearCache() {
    this.leagueTeamsCache.clear();
    this.logger.info('🧹 Cache cleared');
  }
}

module.exports = OptimizedTeamDataFetcher;
