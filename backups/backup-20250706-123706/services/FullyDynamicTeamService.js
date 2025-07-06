const axios = require('axios');
const getChosenLeagueSeasonIdsFinal = require('./getChosenLeagueSeasonIdsFinal');
const Logger = require('../utils/logger');

/**
 * Optimized Fully Dynamic Team Service
 * Finds teams efficiently by searching in specific leagues
 */
class FullyDynamicTeamService {
  constructor(apiKey, baseUrl) {
    this.logger = new Logger('FullyDynamicTeamService');
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.allTeamsCache = null;
    this.cacheTimestamp = null;
    this.CACHE_TTL = 60 * 60 * 1000; // 1 hour
    this.discoveryPromise = null;
    this.leagueTeamsCache = new Map(); // Cache for individual leagues
    this.leaguesCacheTime = new Map();
  }

  /**
   * Find a team by ID efficiently
   * First checks cache, then searches league by league
   */
  async getTeamById(teamId) {
    this.logger.info(`🔍 Searching for team ID: ${teamId}`);

    // Check if we have full cache
    if (
      this.allTeamsCache &&
      this.cacheTimestamp &&
      Date.now() - this.cacheTimestamp < this.CACHE_TTL
    ) {
      const cachedTeam = this.allTeamsCache.teams.find(t => t.id == teamId);
      if (cachedTeam) {
        this.logger.info(`💾 Team found in full cache`);
        return cachedTeam;
      }
    }

    // Search in individual league caches
    for (const [leagueKey, teams] of this.leagueTeamsCache) {
      const team = teams.find(t => t.id == teamId);
      if (team) {
        this.logger.info(`💾 Team found in league cache: ${leagueKey}`);
        return team;
      }
    }

    // If not in cache, search league by league
    this.logger.info(`🚀 Team not in cache, searching leagues...`);
    return await this._searchTeamInLeagues(teamId);
  }

  /**
   * Search for a team in leagues one by one
   * More efficient than loading all teams
   */
  async _searchTeamInLeagues(teamId) {
    try {
      // Get list of chosen leagues
      const chosenLeagues = await getChosenLeagueSeasonIdsFinal(this.apiKey, this.baseUrl);
      this.logger.info(`📊 Searching in ${chosenLeagues.length} leagues`);

      // Group leagues by country for smarter searching
      const leaguesByCountry = this._groupLeaguesByCountry(chosenLeagues);

      // Try to guess which country the team might be in based on ID patterns
      const priorityCountries = this._guessPriorityCountries(teamId, leaguesByCountry);

      // Search priority countries first
      for (const country of priorityCountries) {
        const leagues = leaguesByCountry[country] || [];
        for (const league of leagues) {
          const team = await this._searchTeamInLeague(teamId, league);
          if (team) {
            this.logger.info(`✅ Team found in ${league.country} ${league.league_name}`);
            return team;
          }
        }
      }

      // Search remaining countries
      for (const [country, leagues] of Object.entries(leaguesByCountry)) {
        if (priorityCountries.includes(country)) {
          continue;
        }

        for (const league of leagues) {
          const team = await this._searchTeamInLeague(teamId, league);
          if (team) {
            this.logger.info(`✅ Team found in ${league.country} ${league.league_name}`);
            return team;
          }
        }
      }

      this.logger.info(`❌ Team ${teamId} not found in any league`);
      return null;
    } catch (error) {
      this.logger.error(`❌ Error searching for team: ${error.message}`);
      return null;
    }
  }

  /**
   * Search for a team in a specific league
   */
  async _searchTeamInLeague(teamId, league) {
    if (!league.season_id) {
      return null;
    }

    const cacheKey = `league_${league.season_id}`;

    // Check cache first
    const cached = this.leagueTeamsCache.get(cacheKey);
    const cacheTime = this.leaguesCacheTime.get(cacheKey);

    if (cached && cacheTime && Date.now() - cacheTime < this.CACHE_TTL) {
      this.logger.info(`💾 Using cached data for ${league.league_name}`);
      return cached.find(t => t.id == teamId);
    }

    // Fetch from API
    this.logger.info(`🔍 Checking ${league.league_name}...`);

    try {
      const response = await axios.get(`${this.baseUrl}/league-teams`, {
        params: {
          key: this.apiKey,
          season_id: league.season_id,
          include: 'stats',
        },
        timeout: 10000,
      });

      if (response.data.success && response.data.data) {
        const teams = response.data.data;

        // Process and cache teams
        const processedTeams = teams.map(team => ({
          id: team.id,
          name: team.name || team.cleanName,
          country: league.country,
          leagues: [
            {
              id: league.season_id,
              name: league.league_name,
              country: league.country,
            },
          ],
          fullInfo: team,
          // Add PPG directly from stats
          ppg: team.stats?.seasonPPG_overall || 0,
        }));

        // Cache the league teams
        this.leagueTeamsCache.set(cacheKey, processedTeams);
        this.leaguesCacheTime.set(cacheKey, Date.now());

        // Find the team
        const foundTeam = processedTeams.find(t => t.id == teamId);
        if (foundTeam) {
          return foundTeam;
        }
      }
    } catch (error) {
      if (error.response?.status === 417) {
        this.logger.info(`   ⚠️ ${league.league_name} not selected by user`);
      } else {
        this.logger.info(`   ❌ Error: ${error.message}`);
      }
    }

    return null;
  }

  /**
   * Group leagues by country for efficient searching
   */
  _groupLeaguesByCountry(leagues) {
    const grouped = {};
    for (const league of leagues) {
      if (!grouped[league.country]) {
        grouped[league.country] = [];
      }
      grouped[league.country].push(league);
    }
    return grouped;
  }

  /**
   * Guess which countries to search first based on team ID
   */
  _guessPriorityCountries(teamId, leaguesByCountry) {
    const priorities = [];

    // Known team ID patterns (from your data)
    if (teamId === 836) {
      priorities.push('China'); // Shanghai SIPG
    } else if (teamId >= 1000 && teamId < 2000) {
      priorities.push('USA', 'Brazil', 'China');
    } else if (teamId >= 2000 && teamId < 3000) {
      priorities.push('Japan', 'South Korea');
    }

    // Add countries with most leagues as secondary priority
    const countriesByLeagueCount = Object.entries(leaguesByCountry)
      .sort((a, b) => b[1].length - a[1].length)
      .map(([country]) => country);

    for (const country of countriesByLeagueCount) {
      if (!priorities.includes(country)) {
        priorities.push(country);
      }
    }

    return priorities;
  }

  /**
   * Get all teams in chosen leagues (backwards compatibility)
   * This is still slow but needed for some features
   */
  async getAllTeamsInChosenLeagues() {
    // Check cache
    if (
      this.allTeamsCache &&
      this.cacheTimestamp &&
      Date.now() - this.cacheTimestamp < this.CACHE_TTL
    ) {
      this.logger.info('💾 Using cached team list');
      return this.allTeamsCache;
    }

    // Check if discovery is in progress
    if (this.discoveryPromise) {
      this.logger.info('⏳ Team discovery in progress, waiting...');
      return this.discoveryPromise;
    }

    // Start new discovery
    this.logger.info('🚀 Starting full team discovery...');

    this.discoveryPromise = this._discoverAllTeams();

    try {
      const result = await this.discoveryPromise;
      this.discoveryPromise = null;
      return result;
    } catch (error) {
      this.discoveryPromise = null;
      throw error;
    }
  }

  /**
   * Discover all teams (full scan - use sparingly)
   */
  async _discoverAllTeams() {
    const allTeams = [];
    const teamIdToLeagueMap = new Map();

    try {
      const chosenLeagues = await getChosenLeagueSeasonIdsFinal(this.apiKey, this.baseUrl);
      this.logger.info(`📊 ${chosenLeagues.length} leagues to scan`);

      // Process leagues in batches
      const batchSize = 5;
      for (let i = 0; i < chosenLeagues.length; i += batchSize) {
        const batch = chosenLeagues.slice(i, i + batchSize);
        const promises = batch.map(league => this._fetchLeagueTeams(league));
        const results = await Promise.all(promises);

        // Process results
        results.forEach((teams, index) => {
          const league = batch[index];
          if (teams) {
            teams.forEach(team => {
              const existingTeam = allTeams.find(t => t.id === team.id);

              if (existingTeam) {
                existingTeam.leagues.push({
                  id: league.season_id,
                  name: league.league_name,
                  country: league.country,
                });
              } else {
                allTeams.push(team);
              }

              if (!teamIdToLeagueMap.has(team.id)) {
                teamIdToLeagueMap.set(team.id, []);
              }
              teamIdToLeagueMap.get(team.id).push(league.season_id);
            });
          }
        });
      }

      // Update cache
      this.allTeamsCache = {
        teams: allTeams,
        teamIdToLeagueMap: teamIdToLeagueMap,
        totalTeams: allTeams.length,
        uniqueTeams: new Set(allTeams.map(t => t.id)).size,
      };
      this.cacheTimestamp = Date.now();

      this.logger.info(`✅ Total ${this.allTeamsCache.uniqueTeams} unique teams discovered`);

      return this.allTeamsCache;
    } catch (error) {
      this.logger.error('❌ Team discovery error:', error.message);
      return null;
    }
  }

  /**
   * Fetch teams from a single league
   */
  async _fetchLeagueTeams(league) {
    if (!league.season_id) {
      return null;
    }

    const cacheKey = `league_${league.season_id}`;

    // Check cache
    const cached = this.leagueTeamsCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await axios.get(`${this.baseUrl}/league-teams`, {
        params: {
          key: this.apiKey,
          season_id: league.season_id,
          include: 'stats',
        },
        timeout: 10000,
      });

      if (response.data.success && response.data.data) {
        const teams = response.data.data.map(team => ({
          id: team.id,
          name: team.name || team.cleanName,
          country: league.country,
          leagues: [
            {
              id: league.season_id,
              name: league.league_name,
              country: league.country,
            },
          ],
          fullInfo: team,
          ppg: team.stats?.seasonPPG_overall || 0,
        }));

        // Cache the result
        this.leagueTeamsCache.set(cacheKey, teams);
        this.leaguesCacheTime.set(cacheKey, Date.now());

        this.logger.info(`✅ ${league.league_name}: ${teams.length} teams`);
        return teams;
      }
    } catch (error) {
      if (error.response?.status !== 417) {
        this.logger.info(`❌ ${league.league_name}: ${error.message}`);
      }
    }

    return null;
  }

  /**
   * Search team by name
   */
  async searchTeamByName(searchTerm) {
    const search = searchTerm.toLowerCase();
    const results = [];

    // Search in cached leagues first
    for (const [leagueKey, teams] of this.leagueTeamsCache) {
      const matches = teams.filter(t => t.name.toLowerCase().includes(search));
      results.push(...matches);
    }

    // Remove duplicates
    const uniqueResults = [];
    const seen = new Set();

    for (const team of results) {
      if (!seen.has(team.id)) {
        seen.add(team.id);
        uniqueResults.push(team);
      }
    }

    return uniqueResults;
  }

  /**
   * Get teams by country
   */
  async getTeamsByCountry(country) {
    const results = [];

    // Get leagues for this country
    const chosenLeagues = await getChosenLeagueSeasonIdsFinal(this.apiKey, this.baseUrl);
    const countryLeagues = chosenLeagues.filter(l => l.country === country);

    for (const league of countryLeagues) {
      const teams = await this._fetchLeagueTeams(league);
      if (teams) {
        results.push(...teams);
      }
    }

    return results;
  }

  /**
   * Get teams by league
   */
  async getTeamsByLeague(seasonId) {
    const cacheKey = `league_${seasonId}`;
    const cached = this.leagueTeamsCache.get(cacheKey);

    if (cached) {
      return cached;
    }

    // Find league info
    const chosenLeagues = await getChosenLeagueSeasonIdsFinal(this.apiKey, this.baseUrl);
    const league = chosenLeagues.find(l => l.season_id === seasonId);

    if (league) {
      const teams = await this._fetchLeagueTeams(league);
      return teams || [];
    }

    return [];
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.allTeamsCache = null;
    this.cacheTimestamp = null;
    this.leagueTeamsCache.clear();
    this.leaguesCacheTime.clear();
    this.logger.info('🧹 Team cache cleared');
  }
}

module.exports = FullyDynamicTeamService;
